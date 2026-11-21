/**
 * Beca Municipal Rengo. Panel interno de admisibilidad y nómina.
 *
 * Qué hace
 *   Trabaja sobre la misma hoja de cálculo donde Code.gs registra las postulaciones.
 *   1. prepararRevision() agrega cuatro columnas para el equipo de DIDECO:
 *      «Admisible» (Sí o No), «Motivo de inadmisibilidad», «Residencia rural» (Sí o No) y «Resultado».
 *   2. generarNomina() calcula el puntaje de cada postulación admisible con la regla de
 *      Puntaje.gs (artículo 16), ordena de mayor a menor, aplica el desempate del artículo 17
 *      y escribe tres pestañas: «Nómina», «Inadmisibles» y «Pendientes».
 *
 * Lo que NO hace
 *   No decide la admisibilidad: esa revisión la hacen los profesionales (artículo 12) y la comisión.
 *   No realiza sorteos: cuando el empate es total lo indica para que la comisión lo resuelva.
 *   No envía correos por sí solo: prepara borradores y envía únicamente los que el equipo marque.
 *
 * Cómo se usa
 *   Requiere Code.gs y Puntaje.gs en el mismo proyecto de Apps Script.
 *   Si el proyecto se creó desde la hoja (Extensiones > Apps Script) aparece el menú «Beca Municipal».
 *   Si es un proyecto independiente, ejecute las funciones desde el editor.
 *   El puntaje usa los datos declarados en el formulario. Si al revisar los documentos un dato
 *   no está acreditado (por ejemplo una credencial), corrija la celda en la hoja antes de generar la nómina.
 */

// Número de becas disponibles según el presupuesto del año. Con 0 no se marca a nadie como seleccionado.
const CUPOS = 0;
const MONTO_BECA = 400000;

// COLUMNAS_REVISION está definida en Code.gs.
// Con false, la publicación de resultados lleva folio y puntaje, sin nombres.
const PUBLICAR_NOMBRES = false;
const HOJA_CORREOS = 'Correos';
const HOJA_PUBLICACION = 'Publicación';
const HOJA_NOMINA = 'Nómina';
const HOJA_INADMISIBLES = 'Inadmisibles';
const HOJA_PENDIENTES = 'Pendientes';

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Beca Municipal')
      .addItem('Actualizar resumen de postulaciones', 'prepararResumen')
      .addSeparator()
      .addItem('1. Preparar columnas de revisión', 'prepararRevision')
      .addItem('2. Generar nómina con puntajes', 'generarNomina')
      .addItem('3. Registrar resultados en la hoja', 'registrarResultados')
      .addItem('4. Preparar correos de resultado', 'prepararCorreos')
      .addItem('5. Enviar correos marcados', 'enviarCorreos')
      .addItem('6. Preparar publicación de resultados', 'prepararPublicacion')
      .addToUi();
  } catch (x) { /* proyecto independiente: no hay menú */ }
}

function prepararRevision() {
  const hoja = SpreadsheetApp.openById(HOJA_ID).getSheets()[0];
  if (hoja.getLastRow() === 0) hoja.appendRow(COLUMNAS);
  const inicio = COLUMNAS.length + 1;
  hoja.getRange(1, inicio, 1, COLUMNAS_REVISION.length).setValues([COLUMNAS_REVISION]);
  const filas = Math.max(hoja.getMaxRows() - 1, 1);
  const siNo = SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).setAllowInvalid(false).build();
  hoja.getRange(2, inicio, filas, 1).setDataValidation(siNo);
  hoja.getRange(2, inicio + 2, filas, 1).setDataValidation(siNo);
  const resultados = SpreadsheetApp.newDataValidation().requireValueInList(['Seleccionado', 'Lista de espera', 'No seleccionado'], true).setAllowInvalid(false).build();
  hoja.getRange(2, inicio + 3, filas, 1).setDataValidation(resultados);
  hoja.setFrozenRows(1);
}

function generarNomina() {
  const libro = SpreadsheetApp.openById(HOJA_ID);
  const hoja = libro.getSheets()[0];
  const n = hoja.getLastRow() - 1;
  const ancho = COLUMNAS.length + COLUMNAS_REVISION.length;
  const filas = n > 0 ? hoja.getRange(2, 1, n, ancho).getValues() : [];
  const r = armarNomina(filas, CUPOS);
  const fecha = Utilities.formatDate(new Date(), ZONA_HORARIA, 'dd-MM-yyyy HH:mm');

  escribirPestana(libro, HOJA_NOMINA,
    ['Beca Municipal Rengo ' + ANIO_PROCESO + '. Nómina de postulantes admisibles ordenada por puntaje. Generada el ' + fecha +
      '. Cupos: ' + (CUPOS || 'sin definir') + '.'],
    ['Lugar', 'Folio', 'Nombre completo', 'RUT', 'Año que cursa', 'Promedio', 'Puntos rendimiento', 'Tramo RSH', 'Puntos RSH',
      'Puntos vulnerabilidad', 'Puntaje final', 'Desempate', 'Estado', 'Monto'],
    r.nomina.map(function (p) {
      return [p.lugar, p.folio, p.nombre, p.rut, p.anio, p.promedio, p.rendimiento, p.tramo, p.rsh, p.vulnerabilidad,
        p.total, p.desempate, p.estado, p.estado === 'Seleccionado' ? MONTO_BECA : ''];
    }));
  escribirPestana(libro, HOJA_INADMISIBLES,
    ['Postulaciones inadmisibles. Generada el ' + fecha + '. Las razones deben comunicarse por correo (artículo 14 letra c).'],
    ['Folio', 'Nombre completo', 'RUT', 'Correo', 'Motivo'],
    r.inadmisibles.map(function (p) { return [p.folio, p.nombre, p.rut, p.correo, p.motivo]; }));
  escribirPestana(libro, HOJA_PENDIENTES,
    ['Postulaciones sin revisar: falta completar la columna «Admisible». Generada el ' + fecha + '.'],
    ['Folio', 'Nombre completo', 'RUT'],
    r.pendientes.map(function (p) { return [p.folio, p.nombre, p.rut]; }));
  return { admisibles: r.nomina.length, inadmisibles: r.inadmisibles.length, pendientes: r.pendientes.length, sorteos: r.sorteos };
}

function escribirPestana(libro, nombre, titulo, encabezados, filas) {
  var h = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
  h.clearContents();
  h.getRange(1, 1).setValue(titulo[0]);
  h.getRange(3, 1, 1, encabezados.length).setValues([encabezados]);
  if (filas.length) h.getRange(4, 1, filas.length, encabezados.length).setValues(filas);
  h.setFrozenRows(3);
}

/**
 * Lógica pura de la nómina, sin servicios de Google (se prueba en tests/puntaje.test.js).
 * filas: valores de la hoja principal sin encabezado, con las columnas de COLUMNAS seguidas de COLUMNAS_REVISION.
 * Devuelve {nomina, inadmisibles, pendientes, sorteos}.
 */
function armarNomina(filas, cupos) {
  var col = function (nombre) {
    var i = COLUMNAS.indexOf(nombre);
    return i >= 0 ? i : COLUMNAS.length + COLUMNAS_REVISION.indexOf(nombre);
  };
  var si = function (x) { return String(x === null || x === undefined ? '' : x).trim().toLowerCase().replace('í', 'i') === 'si'; };
  var txt = function (x) { return String(x === null || x === undefined ? '' : x).trim(); };
  var nomina = [], inadmisibles = [], pendientes = [];

  filas.forEach(function (f) {
    if (!txt(f[col('Folio')])) return;
    var p = {
      folio: txt(f[col('Folio')]), nombre: (txt(f[col('Nombres')]) + ' ' + txt(f[col('Apellidos')])).trim(),
      rut: txt(f[col('RUT')]), correo: txt(f[col('Correo')]),
      anio: Number(f[col('Año que cursa')]), promedio: f[col('Promedio')], tramo: txt(f[col('Tramo RSH')]),
      discapacidad: si(f[col('Credencial discapacidad')]), discapacidadFamiliar: si(f[col('Credencial discapacidad familiar')]),
      cuidador: si(f[col('Credencial cuidador')]), familias: si(f[col('Programa Familias')]),
      rural: si(f[col('Residencia rural')])
    };
    var admisible = txt(f[col('Admisible')]);
    if (admisible === '') { pendientes.push(p); return; }
    if (!si(admisible)) { p.motivo = txt(f[col('Motivo de inadmisibilidad')]) || 'Sin motivo registrado'; inadmisibles.push(p); return; }
    var c = calcularPuntaje(p);
    if (!c.valido) { p.motivo = c.motivo; inadmisibles.push(p); return; }
    p.rendimiento = c.rendimiento; p.rsh = c.rsh; p.vulnerabilidad = c.vulnerabilidad; p.total = c.total;
    nomina.push(p);
  });

  // Orden estable: puntaje, desempate del artículo 17 y, solo para presentar, el folio.
  nomina.sort(function (a, b) { return compararPostulantes(a, b) || (a.folio < b.folio ? -1 : a.folio > b.folio ? 1 : 0); });

  // Grupos de empate total: mismo puntaje y misma clave de desempate. Comparten lugar.
  var sorteos = 0, i = 0;
  while (i < nomina.length) {
    var j = i;
    while (j + 1 < nomina.length && compararPostulantes(nomina[i], nomina[j + 1]) === 0) j++;
    var mismoPuntaje = nomina.filter(function (x) { return x.total === nomina[i].total; }).length > 1;
    var empateTotal = j > i;
    // El sorteo solo es necesario cuando el grupo empatado cruza el límite de cupos.
    var cruzaCorte = cupos > 0 && empateTotal && i < cupos && j >= cupos;
    if (cruzaCorte) sorteos++;
    for (var k = i; k <= j; k++) {
      var p = nomina[k];
      p.lugar = i + 1;
      p.desempate = !mismoPuntaje ? '' : empateTotal ? 'Empate total con ' + (j - i) + ' postulación(es)' : 'Resuelto por artículo 17';
      if (!(cupos > 0)) p.estado = 'Admisible';
      else if (cruzaCorte) p.estado = 'Requiere sorteo';
      else p.estado = k < cupos ? 'Seleccionado' : 'Lista de espera';
    }
    i = j + 1;
  }
  return { nomina: nomina, inadmisibles: inadmisibles, pendientes: pendientes, sorteos: sorteos };
}

/* ───────── resultados, correos y publicación ───────── */

function leerNomina() {
  const hoja = SpreadsheetApp.openById(HOJA_ID).getSheets()[0];
  const n = hoja.getLastRow() - 1;
  const filas = n > 0 ? hoja.getRange(2, 1, n, COLUMNAS.length + COLUMNAS_REVISION.length).getValues() : [];
  return { hoja: hoja, filas: filas, r: armarNomina(filas, CUPOS) };
}

/**
 * Copia el estado final de cada postulación a la columna «Resultado» de la hoja principal.
 * Esa columna es la que lee la consulta de estado del sitio. No actúa si falta definir cupos o hay sorteos pendientes.
 */
function registrarResultados() {
  const x = leerNomina();
  if (!(CUPOS > 0)) throw new Error('Defina CUPOS antes de registrar resultados.');
  if (x.r.sorteos > 0) throw new Error('Hay empates que requieren sorteo. Resuélvalos antes de registrar resultados.');
  const estados = {};
  x.r.nomina.forEach(function (p) { estados[p.folio] = p.estado; });
  const col = COLUMNAS.length + COLUMNAS_REVISION.indexOf('Resultado') + 1;
  x.filas.forEach(function (f, i) {
    const e = estados[String(f[0]).trim()];
    if (e) x.hoja.getRange(i + 2, col).setValue(e);
  });
  return Object.keys(estados).length;
}

/**
 * Redacta los correos de resultado. Lógica pura (se prueba en tests/gestion.test.js).
 * Solo incluye estados definitivos: seleccionados, lista de espera e inadmisibles.
 */
function armarCorreos(r, anio, correoBeca) {
  var firma = '\n\nDirección de Desarrollo Comunitario\nIlustre Municipalidad de Rengo';
  var filas = [];
  r.nomina.forEach(function (p) {
    if (p.estado === 'Seleccionado') {
      filas.push([p.folio, p.correo, 'Beca Municipal Rengo ' + anio + '. Resultado de su postulación, folio ' + p.folio,
        'Estimado(a) ' + p.nombre + ':\n\nLe informamos que su postulación a la Beca Municipal Rengo ' + anio + ' fue seleccionada, con un puntaje de ' +
        String(p.total).replace('.', ',') + ' puntos.\n\nEl aporte de $400.000 se paga en una cuota durante el mes de mayo, por transferencia a la cuenta que usted indicó. ' +
        'Recuerde que debe rendir los gastos en la Oficina de Partes de la municipalidad a más tardar el 30 de noviembre, con la planilla de rendición y los comprobantes originales.\n\n' +
        'Para consultas escriba a ' + correoBeca + ' indicando su folio.' + firma]);
    } else if (p.estado === 'Lista de espera') {
      filas.push([p.folio, p.correo, 'Beca Municipal Rengo ' + anio + '. Resultado de su postulación, folio ' + p.folio,
        'Estimado(a) ' + p.nombre + ':\n\nSu postulación a la Beca Municipal Rengo ' + anio + ' fue declarada admisible y obtuvo ' + String(p.total).replace('.', ',') +
        ' puntos. Las becas se asignan de mayor a menor puntaje según los recursos disponibles, y en esta oportunidad su puntaje no alcanzó uno de los cupos del año.\n\n' +
        'Para consultas escriba a ' + correoBeca + ' indicando su folio.' + firma]);
    }
  });
  r.inadmisibles.forEach(function (p) {
    filas.push([p.folio, p.correo, 'Beca Municipal Rengo ' + anio + '. Resultado de su postulación, folio ' + p.folio,
      'Estimado(a) ' + p.nombre + ':\n\nSu postulación a la Beca Municipal Rengo ' + anio + ' no fue admitida por la siguiente razón: ' + p.motivo +
      '.\n\nPara consultas escriba a ' + correoBeca + ' indicando su folio.' + firma]);
  });
  return filas;
}

/** Escribe los borradores en la pestaña «Correos» para que el equipo los revise. No envía nada. */
function prepararCorreos() {
  const x = leerNomina();
  if (!(CUPOS > 0)) throw new Error('Defina CUPOS antes de preparar los correos.');
  if (x.r.sorteos > 0) throw new Error('Hay empates que requieren sorteo. Resuélvalos antes de preparar los correos.');
  const filas = armarCorreos(x.r, ANIO_PROCESO, CORREO_BECA).map(function (f) { return f.concat(['No', '']); });
  escribirPestana(SpreadsheetApp.openById(HOJA_ID), HOJA_CORREOS,
    ['Borradores de correos de resultado. Revise cada texto, cambie «Enviar» a Sí en los que correspondan y luego use «Enviar correos marcados».'],
    ['Folio', 'Destinatario', 'Asunto', 'Mensaje', 'Enviar', 'Enviado'], filas);
  return filas.length;
}

/** Envía solo las filas con «Enviar» en Sí y sin fecha en «Enviado». Anota la fecha para no repetir envíos. */
function enviarCorreos() {
  const h = SpreadsheetApp.openById(HOJA_ID).getSheetByName(HOJA_CORREOS);
  if (!h || h.getLastRow() < 4) throw new Error('Primero prepare los correos.');
  const filas = h.getRange(4, 1, h.getLastRow() - 3, 6).getValues();
  var enviados = 0;
  filas.forEach(function (f, i) {
    if (String(f[4]).trim().toLowerCase().replace('í', 'i') !== 'si' || f[5]) return;
    MailApp.sendEmail({ to: String(f[1]), replyTo: CORREO_BECA, subject: String(f[2]), body: String(f[3]) });
    h.getRange(i + 4, 6).setValue(new Date());
    enviados++;
  });
  return enviados;
}

/** Datos para la sección de resultados del sitio. Lógica pura. Sin RUT, correo ni datos del hogar. */
function armarPublicacion(r, total, anio, fecha, conNombres) {
  var seleccionados = r.nomina.filter(function (p) { return p.estado === 'Seleccionado'; });
  var tramos = {};
  seleccionados.forEach(function (p) { tramos[p.tramo] = (tramos[p.tramo] || 0) + 1; });
  return {
    anio: anio, publicado: true, fecha: fecha,
    cifras: { postulaciones: total, admisibles: r.nomina.length, seleccionados: seleccionados.length, montoTotal: seleccionados.length * MONTO_BECA },
    porTramo: Object.keys(tramos).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); }).map(function (t) { return { tramo: t, seleccionados: tramos[t] }; }),
    nomina: seleccionados.map(function (p) {
      var fila = { folio: p.folio, puntaje: p.total };
      if (conNombres) fila.nombre = p.nombre;
      return fila;
    })
  };
}

/** Deja en la pestaña «Publicación» el texto que Informática debe guardar como datos/resultados.json en el sitio. */
function prepararPublicacion() {
  const x = leerNomina();
  if (!(CUPOS > 0)) throw new Error('Defina CUPOS antes de preparar la publicación.');
  if (x.r.sorteos > 0) throw new Error('Hay empates que requieren sorteo. Resuélvalos antes de publicar.');
  const total = x.r.nomina.length + x.r.inadmisibles.length + x.r.pendientes.length;
  const datos = armarPublicacion(x.r, total, ANIO_PROCESO, Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy-MM-dd'), PUBLICAR_NOMBRES);
  var h = SpreadsheetApp.openById(HOJA_ID).getSheetByName(HOJA_PUBLICACION) || SpreadsheetApp.openById(HOJA_ID).insertSheet(HOJA_PUBLICACION);
  h.clearContents();
  h.getRange(1, 1).setValue('Copie el contenido de la celda A3 en el archivo datos/resultados.json del sitio.');
  h.getRange(3, 1).setValue(JSON.stringify(datos, null, 1));
  return datos;
}

/* ───────── resumen del proceso ───────── */

/**
 * Fórmulas de la pestaña «Resumen». Lógica pura. Devuelve filas [rótulo, fórmula].
 * Los conteos se actualizan solos cada vez que llega una postulación.
 */
function armarResumen(nombrePrincipal) {
  var p = "'" + String(nombrePrincipal).replace(/'/g, "''") + "'!", d = "'" + HOJA_DOCUMENTOS + "'!";
  var letra = function (n) { var s = ''; while (n > 0) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); } return s; };
  var filas = [
    ['Postulaciones recibidas', '=COUNTA(' + p + 'A2:A)'],
    ['Primera postulación', '=IF(COUNT(' + p + 'B2:B)=0,"",MIN(' + p + 'B2:B))'],
    ['Última postulación', '=IF(COUNT(' + p + 'B2:B)=0,"",MAX(' + p + 'B2:B))'],
    ['Documentos recibidos en total', '=SUM(' + d + letra(5 + CLAVES.length) + '2:' + letra(5 + CLAVES.length) + ')'],
    ['', ''], ['Documentos recibidos por tipo', '']
  ];
  CLAVES.forEach(function (k, i) { var c = letra(5 + i); filas.push([NOMBRES_DOCUMENTOS[k], '=COUNTIF(' + d + c + '2:' + c + ',"Sí")']); });
  filas.push(['', ''], ['Postulaciones por tramo del Registro Social de Hogares', '']);
  var colTramo = letra(COLUMNAS.indexOf('Tramo RSH') + 1);
  ['40%', '50%', '60%', '70%', '80%', '90%', '100%'].forEach(function (t) { filas.push(['Tramo ' + t, '=COUNTIF(' + p + colTramo + '2:' + colTramo + ',"' + t + '")']); });
  filas.push(['', ''], ['Revisión de admisibilidad', '']);
  var colAdm = letra(COLUMNAS.length + 1);
  filas.push(['Admisibles', '=COUNTIF(' + p + colAdm + '2:' + colAdm + ',"Sí")'], ['Inadmisibles', '=COUNTIF(' + p + colAdm + '2:' + colAdm + ',"No")'],
    ['Pendientes de revisión', '=COUNTA(' + p + 'A2:A)-COUNTIF(' + p + colAdm + '2:' + colAdm + ',"Sí")-COUNTIF(' + p + colAdm + '2:' + colAdm + ',"No")']);
  return filas;
}

/** Crea o actualiza la pestaña «Resumen» con los conteos del proceso. */
function prepararResumen() {
  const libro = SpreadsheetApp.openById(HOJA_ID);
  const principal = libro.getSheets()[0];
  if (!libro.getSheetByName(HOJA_DOCUMENTOS)) {
    libro.insertSheet(HOJA_DOCUMENTOS).appendRow(['Folio', 'Fecha de recepción', 'Postulante', 'RUT'].concat(CLAVES.map(function (k) { return NOMBRES_DOCUMENTOS[k]; }), ['Total de documentos']));
  }
  var h = libro.getSheetByName('Resumen') || libro.insertSheet('Resumen');
  h.clearContents();
  h.getRange(1, 1).setValue('Beca Municipal Rengo ' + ANIO_PROCESO + '. Resumen de postulaciones');
  const filas = armarResumen(principal.getName());
  h.getRange(3, 1, filas.length, 1).setValues(filas.map(function (f) { return [f[0]]; }));
  filas.forEach(function (f, i) { if (f[1]) h.getRange(3 + i, 2).setFormula(f[1]); });
  return filas.length;
}
