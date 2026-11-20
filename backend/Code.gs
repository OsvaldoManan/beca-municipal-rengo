/**
 * Beca Municipal Rengo. Recepción de postulaciones en línea.
 *
 * Qué hace
 *   Recibe cada postulación enviada desde el sitio web, vuelve a validar todos los datos y documentos,
 *   crea una carpeta por postulante en Google Drive, guarda allí los documentos, registra los datos en
 *   una hoja de cálculo, envía un comprobante al postulante y remite copia con los adjuntos a la casilla
 *   becaestudiantil@munirengo.cl (artículo 12 de la ordenanza).
 *
 * Puesta en marcha (una sola vez, con una cuenta institucional @munirengo.cl)
 *   1. Crear en Drive una carpeta para las postulaciones y copiar su identificador en CARPETA_ID.
 *   2. Crear una hoja de cálculo vacía y copiar su identificador en HOJA_ID. No escriba encabezados,
 *      el programa los crea en la primera hoja del libro al recibir la primera postulación.
 *   3. En script.google.com crear un proyecto, pegar este archivo completo y guardar.
 *      En Configuración del proyecto, fijar la zona horaria (GMT-04:00) Santiago.
 *   4. Implementar > Nueva implementación > Aplicación web.
 *      Ejecutar como: Yo.   Quién tiene acceso: Cualquier usuario.
 *      Google pedirá autorizar el acceso a Drive, Hojas de cálculo y envío de correo. Aceptar.
 *   5. Copiar la URL que termina en /exec y pegarla en la constante ENDPOINT del archivo js/app.js del sitio.
 *   6. Abrir esa misma URL en el navegador. Debe mostrar {"ok":true, ... "configurado":true}.
 *
 * Los identificadores son el tramo de la dirección entre /folders/ o /d/ y la barra siguiente.
 *
 * Mantención
 *   Cada cambio de este archivo exige Implementar > Administrar implementaciones > Editar > Versión nueva.
 *   Si no se hace, la URL sigue ejecutando la versión anterior.
 *   No cambie el orden de las columnas A (Folio) y E (RUT) de la hoja. Con ellas se calcula el folio
 *   siguiente y se impide la doble postulación.
 *   Los errores quedan en el menú Ejecuciones del proyecto.
 *   Los límites de archivos y la lista de documentos deben coincidir con los de js/app.js.
 */

const CARPETA_ID = 'PEGAR_ID_DE_LA_CARPETA';
const HOJA_ID = 'PEGAR_ID_DE_LA_HOJA';
const CORREO_BECA = 'becaestudiantil@munirengo.cl';
const ANIO_PROCESO = 2027;
// Plazo del artículo 9. Con CONTROLAR_PLAZO en true se rechazan envíos fuera del 1 al 30 de marzo
// de ANIO_PROCESO, según la hora de Chile continental.
const CONTROLAR_PLAZO = false;
const ZONA_HORARIA = 'America/Santiago';

const MAX_BYTES = 5 * 1024 * 1024;          // por archivo
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;   // todos los archivos de una postulación
// Los correos no admiten más de 25 MB incluida la codificación. Sobre este peso la copia interna
// se envía sin adjuntos y solo con el enlace a la carpeta.
const MAX_ADJUNTOS_CORREO = 17 * 1024 * 1024;
const MAX_CUERPO = 40 * 1024 * 1024;        // caracteres de la solicitud completa
const TIPOS = ['application/pdf', 'image/jpeg', 'image/png'];
const EXTENSION = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' };

// Documentos del artículo 7 y del Anexo 1.
const OBLIGATORIOS = ['cedula', 'alumno_regular', 'notas', 'rsh', 'residencia', 'declaracion'];
const DE_MENOR = ['cedula_tutor', 'autorizacion', 'declaracion_tutor'];
const CLAVES = OBLIGATORIOS.concat(['discapacidad', 'cuidador', 'fud'], DE_MENOR);

const TITULARES = ['Postulante', 'Tutor legal'];
const TIPOS_CUENTA = ['Cuenta vista', 'Cuenta corriente'];
const ANIOS = ['1', '2', '3', '4', '5'];
const TRAMOS = ['40%', '50%', '60%', '70%', '80%', '90%', '100%'];
const GASTOS = ['Matrícula o arancel', 'Insumos y materiales', 'Traslados', 'Arriendo'];

const COLUMNAS = ['Folio', 'Fecha de recepción', 'Nombres', 'Apellidos', 'RUT', 'Teléfono', 'Domicilio', 'Correo',
  'Menor de edad', 'Tutor', 'RUT tutor', 'Titular cuenta', 'Banco', 'Tipo de cuenta', 'N° de cuenta',
  'Institución', 'Carrera', 'Año que cursa', 'Promedio', 'Gastos a cubrir', 'Tramo RSH',
  'Credencial discapacidad', 'Credencial discapacidad familiar', 'Credencial cuidador', 'Programa Familias',
  'Grupo familiar', 'Documentos recibidos', 'Carpeta', 'Observaciones'];

const MSJ_INTERNO = 'No fue posible registrar su postulación por un problema del sistema. ' +
  'Intente nuevamente en unos minutos y, si el problema continúa, escriba a ' + CORREO_BECA + '.';

/** Comprobación de funcionamiento. Se abre la URL /exec en el navegador. No expone datos. */
function doGet() {
  return responder({
    ok: true,
    servicio: 'Beca Municipal Rengo. Recepción de postulaciones',
    proceso: ANIO_PROCESO,
    configurado: CARPETA_ID.indexOf('PEGAR_') !== 0 && HOJA_ID.indexOf('PEGAR_') !== 0,
    controlDePlazo: CONTROLAR_PLAZO,
    enPlazo: enPlazo(new Date())
  });
}

function doPost(e) {
  var candado = null;
  var conCandado = false;
  try {
    if (CONTROLAR_PLAZO && !enPlazo(new Date())) {
      return rechazar('El período de postulación es del 1 al 30 de marzo de ' + ANIO_PROCESO + '.');
    }

    // 1. Validación completa antes de tocar Drive o la hoja. Los errores de Rechazo se muestran al postulante.
    var p = leerSolicitud(e);
    var d = validarDatos(p.datos);
    var familia = validarFamilia(p.familia);
    var adjuntos = validarArchivos(p.archivos, d);

    // 2. Registro. El candado impide que dos envíos simultáneos obtengan el mismo folio o dupliquen un RUT.
    candado = LockService.getScriptLock();
    conCandado = candado.tryLock(30000);
    if (!conCandado) {
      return rechazar('El sistema está recibiendo muchas postulaciones en este momento. Intente nuevamente en un minuto.');
    }

    var hoja = SpreadsheetApp.openById(HOJA_ID).getSheets()[0];
    if (hoja.getLastRow() === 0) hoja.appendRow(COLUMNAS);
    var numero = 1;
    var filas = hoja.getLastRow() - 1;
    if (filas > 0) {
      var previos = hoja.getRange(2, 1, filas, 5).getValues();   // columnas A (folio) a E (RUT)
      var rutBuscado = rutLimpio(d.rut);
      for (var i = 0; i < previos.length; i++) {
        if (rutLimpio(previos[i][4]) === rutBuscado) {
          return rechazar('Ya existe una postulación registrada con este RUT (folio ' + previos[i][0] +
            '). Si necesita corregirla, escriba a ' + CORREO_BECA + '.');
        }
        var m = /-(\d+)$/.exec(String(previos[i][0]));
        if (m && Number(m[1]) >= numero) numero = Number(m[1]) + 1;
      }
    }
    var folio = 'BMR-' + ANIO_PROCESO + '-' + ('000' + numero).slice(-4);

    var carpeta = null;
    var fila = 0;
    try {
      carpeta = DriveApp.getFolderById(CARPETA_ID).createFolder(nombreCarpeta(folio + ' ' + d.apellidos + ' ' + d.nombres));
      adjuntos.forEach(function (b) { carpeta.createFile(b); });
      hoja.appendRow([folio, new Date(), d.nombres, d.apellidos, d.rut, d.telefono, d.domicilio, d.correo,
        siNo(d.menor), d.tutorNombre, d.tutorRut, d.titular, d.banco, d.tipoCuenta, "'" + d.numCuenta,
        d.institucion, d.carrera, Number(d.anio), d.promedio, d.gastos.join(', '), d.tramo,
        siNo(d.credDiscapacidad), siNo(d.credDiscapacidadFamiliar), siNo(d.credCuidador), siNo(d.programaFamilias),
        familia.map(function (f) { return f.join(' | '); }).join('\n'),
        adjuntos.map(function (b) { return b.getName(); }).join(', '), carpeta.getUrl(), ''].map(celda));
      SpreadsheetApp.flush();
      fila = hoja.getLastRow();
    } catch (err) {
      // La postulación no alcanzó a quedar en la hoja. Se retira la carpeta para no dejar un registro a medias
      // y se informa al postulante que debe enviar otra vez.
      console.error('Postulación ' + folio + ' NO registrada. RUT ' + d.rut + '. Causa: ' + (err && err.stack || err));
      if (carpeta) {
        try {
          carpeta.setName('INCOMPLETA ' + carpeta.getName());
          carpeta.setTrashed(true);
        } catch (x) {
          console.error('No se pudo retirar la carpeta incompleta de ' + folio + ': ' + x);
        }
      }
      return rechazar(MSJ_INTERNO);
    }
    candado.releaseLock();
    conCandado = false;

    // 3. Correos. La postulación ya está registrada, por eso una falla aquí no la anula.
    //    Se anota en la columna Observaciones y se informa en la respuesta.
    var notas = [];
    var comprobante = true;
    try {
      MailApp.sendEmail({
        to: d.correo,
        replyTo: CORREO_BECA,
        subject: 'Beca Municipal Rengo. Postulación recibida, folio ' + folio,
        body: 'Estimado(a) ' + d.nombres + ' ' + d.apellidos + ':\n\n' +
          'Hemos recibido su postulación a la Beca Municipal Rengo ' + ANIO_PROCESO + ' con el folio ' + folio + '.\n' +
          'Documentos recibidos: ' + adjuntos.length + '.\n\n' +
          'La revisión de admisibilidad se realiza durante abril y los resultados se publican en mayo en los ' +
          'medios oficiales del municipio. Para consultas escriba a ' + CORREO_BECA + ' indicando su folio.\n\n' +
          'Dirección de Desarrollo Comunitario\nIlustre Municipalidad de Rengo'
      });
    } catch (err) {
      comprobante = false;
      notas.push('No se envió el comprobante al postulante');
      console.error('Folio ' + folio + '. Falló el comprobante al postulante: ' + err);
    }
    try {
      var peso = adjuntos.reduce(function (s, b) { return s + b.getBytes().length; }, 0);
      var conAdjuntos = peso <= MAX_ADJUNTOS_CORREO;
      var copia = {
        to: CORREO_BECA,
        replyTo: d.correo,
        subject: 'Postulación ' + folio + ' ' + d.apellidos + ' ' + d.nombres + ' ' + d.rut,
        body: 'Postulación recibida por el sitio web.\nCarpeta: ' + carpeta.getUrl() +
          '\nInstitución: ' + d.institucion + '\nCarrera: ' + d.carrera + '\nTramo RSH: ' + d.tramo +
          (conAdjuntos ? '' : '\n\nLos documentos superan el peso que admite un correo. Están disponibles en la carpeta.')
      };
      if (conAdjuntos) copia.attachments = adjuntos;
      MailApp.sendEmail(copia);
    } catch (err) {
      notas.push('No se envió la copia a ' + CORREO_BECA);
      console.error('Folio ' + folio + '. Falló la copia interna: ' + err);
    }
    if (notas.length) {
      try { hoja.getRange(fila, COLUMNAS.length).setValue(notas.join('. ')); } catch (x) { console.error(x); }
    }

    return responder({ ok: true, folio: folio, comprobante: comprobante });
  } catch (err) {
    if (err instanceof Rechazo) return rechazar(err.message);
    console.error('Error no previsto: ' + (err && err.stack || err));
    return rechazar(MSJ_INTERNO);
  } finally {
    if (conCandado) { try { candado.releaseLock(); } catch (x) {} }
  }
}

/* ---------------------------------------- Validación ---------------------------------------- */

/** Error cuyo mensaje se puede mostrar al postulante. Cualquier otro error se responde con MSJ_INTERNO. */
function Rechazo(mensaje) { this.message = mensaje; }
Rechazo.prototype = Object.create(Error.prototype);
Rechazo.prototype.name = 'Rechazo';

function leerSolicitud(e) {
  var texto = e && e.postData && e.postData.contents;
  if (!texto || typeof texto !== 'string') throw new Rechazo('La solicitud llegó vacía. Recargue la página e intente nuevamente.');
  if (texto.length > MAX_CUERPO) throw new Rechazo('El envío supera el tamaño permitido. Reduzca el tamaño de sus documentos.');
  var p;
  try { p = JSON.parse(texto); } catch (x) { p = null; }
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Rechazo('La solicitud no tiene el formato esperado. Recargue la página e intente nuevamente.');
  return p;
}

/** Devuelve solo los campos conocidos, ya limpios. Lo que el sitio no envía se ignora. */
function validarDatos(x) {
  if (!x || typeof x !== 'object') throw new Rechazo('Faltan los datos del postulante.');
  var d = {};
  var exigidos = { nombres: 'los nombres', apellidos: 'los apellidos', rut: 'el RUT', telefono: 'el teléfono',
    domicilio: 'el domicilio', correo: 'el correo electrónico', titular: 'el titular de la cuenta', banco: 'el banco',
    tipoCuenta: 'el tipo de cuenta', numCuenta: 'el número de cuenta', institucion: 'la institución',
    carrera: 'la carrera', anio: 'el año que cursa', promedio: 'el promedio de notas', tramo: 'el tramo del Registro Social de Hogares' };
  Object.keys(exigidos).forEach(function (k) {
    d[k] = texto(x[k], k === 'correo' ? 120 : 150);
    if (!d[k]) throw new Rechazo('Falta ' + exigidos[k] + '.');
  });

  if (!rutValido(d.rut)) throw new Rechazo('El RUT informado no es válido.');
  d.rut = rutCanonico(d.rut);
  if (!/^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(d.correo)) throw new Rechazo('El correo electrónico no es válido.');
  var digitos = d.telefono.replace(/\D/g, '').length;
  if (!/^\+?[\d\s()-]+$/.test(d.telefono) || digitos < 8 || digitos > 12) throw new Rechazo('El teléfono no es válido.');
  if (TITULARES.indexOf(d.titular) < 0) throw new Rechazo('El titular de la cuenta no es válido.');
  if (TIPOS_CUENTA.indexOf(d.tipoCuenta) < 0) throw new Rechazo('El tipo de cuenta no es válido.');
  if (ANIOS.indexOf(d.anio) < 0) throw new Rechazo('El año que cursa no es válido.');
  if (TRAMOS.indexOf(d.tramo) < 0) throw new Rechazo('El tramo del Registro Social de Hogares no es válido.');

  // Artículo 7 d. Promedio NEM 6,0 para primer año y 5,0 desde segundo año.
  var nota = d.promedio.replace(',', '.');
  if (!/^\d(\.\d{1,2})?$/.test(nota) || Number(nota) < 1 || Number(nota) > 7) throw new Rechazo('El promedio debe estar entre 1,0 y 7,0.');
  d.promedio = Number(nota);
  var minimo = d.anio === '1' ? 6.0 : 5.0;
  if (d.promedio < minimo) {
    throw new Rechazo('La ordenanza exige un promedio mínimo de ' + minimo.toFixed(1).replace('.', ',') + ' para el año que cursa.');
  }

  if (!Array.isArray(x.gastos)) throw new Rechazo('Indique en qué usará la beca.');
  d.gastos = GASTOS.filter(function (g) { return x.gastos.indexOf(g) >= 0; });
  if (!d.gastos.length || d.gastos.length !== x.gastos.length) throw new Rechazo('Indique en qué usará la beca.');

  d.menor = x.menor === true;
  d.credDiscapacidad = x.credDiscapacidad === true;
  d.credDiscapacidadFamiliar = x.credDiscapacidadFamiliar === true;
  d.credCuidador = x.credCuidador === true;
  d.programaFamilias = x.programaFamilias === true;

  d.tutorNombre = '';
  d.tutorRut = '';
  if (d.menor) {
    d.tutorNombre = texto(x.tutorNombre, 150);
    if (!d.tutorNombre) throw new Rechazo('Falta el nombre del padre, madre o tutor.');
    if (!rutValido(x.tutorRut)) throw new Rechazo('El RUT del tutor no es válido.');
    d.tutorRut = rutCanonico(x.tutorRut);
    if (d.tutorRut === d.rut) throw new Rechazo('El RUT del tutor no puede ser el mismo del postulante.');
  }
  return d;
}

function validarFamilia(x) {
  if (x === undefined || x === null) return [];
  if (!Array.isArray(x) || x.length > 30) throw new Rechazo('El grupo familiar no tiene el formato esperado.');
  return x.map(function (f) {
    if (!Array.isArray(f)) throw new Rechazo('El grupo familiar no tiene el formato esperado.');
    return f.slice(0, 5).map(function (c) { return texto(c, 100); });
  }).filter(function (f) { return f.some(function (c) { return c; }); });
}

/** Revisa claves, tipos, tamaños y contenido. Devuelve los archivos como blobs listos para guardar. */
function validarArchivos(x, d) {
  if (!Array.isArray(x)) throw new Rechazo('Faltan los documentos de la postulación.');
  var exigidos = OBLIGATORIOS.slice();
  if (d.credDiscapacidad || d.credDiscapacidadFamiliar) exigidos.push('discapacidad');
  if (d.credCuidador) exigidos.push('cuidador');
  if (d.programaFamilias) exigidos.push('fud');
  if (d.menor) exigidos = exigidos.concat(DE_MENOR);

  var vistos = {};
  var total = 0;
  var blobs = [];
  x.forEach(function (a) {
    if (!a || typeof a !== 'object' || CLAVES.indexOf(a.clave) < 0) throw new Rechazo('Se recibió un documento que no corresponde a la postulación.');
    if (exigidos.indexOf(a.clave) < 0) throw new Rechazo('Se recibió un documento que no corresponde a lo declarado en el formulario.');
    if (vistos[a.clave]) throw new Rechazo('Un documento llegó repetido. Recargue la página e intente nuevamente.');
    vistos[a.clave] = true;
    if (TIPOS.indexOf(a.tipo) < 0) throw new Rechazo('Los documentos deben ser PDF, JPG o PNG.');
    if (typeof a.contenido !== 'string' || !a.contenido) throw new Rechazo('Un documento llegó vacío. Vuelva a adjuntarlo.');
    // Control previo por largo del texto, para no decodificar archivos desmedidos.
    if (a.contenido.length > MAX_BYTES * 1.4) throw new Rechazo('Un archivo supera los 5 MB.');
    var bytes;
    try { bytes = Utilities.base64Decode(a.contenido); } catch (err) { throw new Rechazo('Un documento llegó dañado. Vuelva a adjuntarlo.'); }
    if (!bytes.length) throw new Rechazo('Un documento llegó vacío. Vuelva a adjuntarlo.');
    if (bytes.length > MAX_BYTES) throw new Rechazo('Un archivo supera los 5 MB.');
    total += bytes.length;
    if (total > MAX_TOTAL_BYTES) throw new Rechazo('El conjunto de documentos supera los 25 MB. Reduzca el tamaño de sus archivos.');
    if (!firmaCorrecta(bytes, a.tipo)) throw new Rechazo('Un documento no corresponde a un archivo PDF, JPG o PNG válido. Vuelva a generarlo y adjúntelo otra vez.');
    // El nombre del archivo lo define el sistema. El nombre original no se usa.
    blobs.push(Utilities.newBlob(bytes, a.tipo, a.clave + EXTENSION[a.tipo]));
  });
  exigidos.forEach(function (k) {
    if (!vistos[k]) throw new Rechazo('Faltan documentos obligatorios. Revise el paso 5 del formulario.');
  });
  return blobs;
}

/** Compara los primeros bytes con la firma del formato declarado. Los bytes de Apps Script tienen signo. */
function firmaCorrecta(bytes, tipo) {
  var firmas = {
    'application/pdf': [0x25, 0x50, 0x44, 0x46],   // %PDF
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47]
  };
  var f = firmas[tipo];
  if (!f || bytes.length < f.length) return false;
  for (var i = 0; i < f.length; i++) { if ((bytes[i] & 0xFF) !== f[i]) return false; }
  return true;
}

/* ---------------------------------------- Utilidades ---------------------------------------- */

/** Texto de una línea, sin caracteres de control, sin espacios repetidos y con largo acotado. */
function texto(x, max) {
  if (typeof x !== 'string' && typeof x !== 'number') return '';
  return String(x).replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Evita la inyección de fórmulas. Una celda que empieza con = + - o @ se interpretaría como fórmula,
 * por eso se antepone un apóstrofo, que la hoja trata como marca de texto literal.
 */
function celda(x) {
  if (typeof x !== 'string') return x;
  return /^[=+\-@]/.test(x) ? "'" + x : x;
}

/** Nombre de carpeta sin caracteres problemáticos para Drive o para una descarga a Windows. */
function nombreCarpeta(x) {
  return String(x).replace(/[\\\/:*?"<>|\u0000-\u001F\u007F]/g, ' ').replace(/\.+/g, '.').replace(/\s+/g, ' ').trim().slice(0, 90);
}

function siNo(x) { return x ? 'Sí' : 'No'; }

/** Verdadero entre el 1 y el 30 de marzo de ANIO_PROCESO, hora de Chile (artículo 9). */
function enPlazo(fecha) {
  var p = Utilities.formatDate(fecha, ZONA_HORARIA, 'yyyy-M-d').split('-');
  return Number(p[0]) === ANIO_PROCESO && Number(p[1]) === 3 && Number(p[2]) >= 1 && Number(p[2]) <= 30;
}

function rutLimpio(r) { return String(r === null || r === undefined ? '' : r).replace(/[.\s-]/g, '').toUpperCase(); }

/** RUT como 12345678-9, forma única en que se guarda en la hoja. */
function rutCanonico(r) { r = rutLimpio(r); return r.slice(0, -1) + '-' + r.slice(-1); }

function rutValido(r) {
  r = rutLimpio(r);
  if (!/^\d{7,8}[\dK]$/.test(r)) return false;
  var s = 0, m = 2;
  for (var i = r.length - 2; i >= 0; i--) { s += Number(r[i]) * m; m = m === 7 ? 2 : m + 1; }
  var dv = 11 - (s % 11);
  return r.slice(-1) === (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv));
}

function rechazar(mensaje) { return responder({ ok: false, error: mensaje }); }

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
