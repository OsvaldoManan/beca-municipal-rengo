/**
 * Beca Municipal Rengo. Revisión automática de documentos con OCR (prototipo).
 *
 * Qué hace
 *   Lee el texto de los documentos de cada postulación con el OCR de Google Drive y comprueba datos simples:
 *   que el documento tenga texto, que aparezca el RUT del postulante, que el tramo del Registro Social de
 *   Hogares y el promedio coincidan con lo declarado, que el certificado de alumno regular sea del año y de la
 *   institución declarada y que el certificado de residencia mencione Rengo.
 *   El resultado queda en la pestaña «Revisión automática», una fila por postulación.
 *
 * Lo que NO hace
 *   No decide la admisibilidad. Esa revisión la hacen los profesionales de DIDECO (artículo 12).
 *   Un «No» o «No se pudo leer» es una alerta para revisar a mano, no un rechazo.
 *   No comprueba firmas ni la autenticidad de un documento.
 *   No envía los documentos fuera de Google. El texto se obtiene con una copia temporal en Google Docs
 *   que se borra de inmediato.
 *
 * Cómo se usa
 *   1. En el editor, Servicios (+) > Drive API (versión v3) > Agregar. El identificador debe ser «Drive».
 *   2. probarOCR('ID_DE_UNA_CARPETA') lee los archivos de una carpeta de prueba y muestra en el registro
 *      el texto obtenido, el tiempo y las comprobaciones. Sirve para medir el OCR sin tocar la hoja.
 *   3. Con REVISION_AUTOMATICA en true, revisarPendientes() revisa las postulaciones que aún no tienen fila
 *      en la pestaña. instalarRevisionAutomatica() la deja programada cada 15 minutos.
 */

// Viene desactivada. Actívela solo después de probarla y con el visto bueno de DIDECO.
const REVISION_AUTOMATICA = false;
const HOJA_REVISION = 'Revisión automática';
// Tiempo máximo de una ejecución, por debajo del límite de 6 minutos de Apps Script.
const REVISION_MAX_MS = 4.5 * 60 * 1000;
// Un documento con menos letras que esto se considera ilegible o en blanco.
const MIN_LETRAS_LEGIBLE = 40;

// Documentos que se revisan y comprobaciones de cada uno, en el orden de las columnas de la pestaña.
const COMPROBACIONES = [
  ['cedula', 'Cédula legible'], ['cedula', 'Cédula con RUT'],
  ['alumno_regular', 'Alumno regular con RUT'], ['alumno_regular', 'Alumno regular del año'], ['alumno_regular', 'Alumno regular de la institución'],
  ['notas', 'Notas legibles'], ['notas', 'Notas con el promedio'],
  ['rsh', 'Cartola con RUT'], ['rsh', 'Cartola con el tramo'],
  ['residencia', 'Residencia en Rengo'],
  ['declaracion', 'Declaración legible']
];

/* ───────── lógica pura (se prueba en Node con tests/revision.test.js) ───────── */

/** Minúsculas, sin tildes y con espacios simples. */
function normalizarTexto(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function letras(t) { return (String(t || '').match(/[a-záéíóúñ]/gi) || []).length; }

/** Verdadero si el RUT aparece en el texto con o sin puntos, guion o espacios. */
function rutEnTexto(texto, rut) {
  var r = String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (r.length < 2) return false;
  var cuerpo = r.slice(0, -1), dv = r.slice(-1);
  var plano = String(texto || '').toUpperCase().replace(/[.\s]/g, '').replace(/[‐‑–—]/g, '-');
  return plano.indexOf(cuerpo + '-' + dv) >= 0 || plano.indexOf(cuerpo + dv) >= 0;
}

/** Tramo del Registro Social de Hogares que declara la cartola, por ejemplo «40%». Vacío si no se encuentra. */
function tramoEnTexto(texto) {
  var t = normalizarTexto(texto);
  var m = /tramo[^%]{0,120}?(\d{2,3}) ?%/.exec(t) || /(\d{2,3}) ?% (?:de|mas)[^.]{0,40}vulnerab/.exec(t);
  return m ? Number(m[1]) + '%' : '';
}

/** Verdadero si el promedio declarado aparece en el texto, con coma o punto, con uno o dos decimales. */
function promedioEnTexto(texto, promedio) {
  var p = Number(String(promedio).replace(',', '.'));
  if (!(p >= 1 && p <= 7)) return false;
  var numeros = String(texto || '').match(/\b[1-7][.,]\d{1,2}\b/g) || [];
  return numeros.some(function (n) { return Math.abs(Number(n.replace(',', '.')) - p) < 0.051; });
}

/** Parte de las palabras significativas del nombre de la institución que aparece en el texto. */
function institucionEnTexto(texto, institucion) {
  var vacias = ['de', 'del', 'la', 'las', 'los', 'el', 'y', 'en', 'universidad', 'instituto', 'profesional', 'centro', 'formacion', 'tecnica'];
  var palabras = normalizarTexto(institucion).split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2 && vacias.indexOf(w) < 0; });
  if (!palabras.length) return true;
  var t = normalizarTexto(texto);
  var halladas = palabras.filter(function (w) { return t.indexOf(w) >= 0; }).length;
  return halladas / palabras.length >= 0.6;
}

/**
 * Comprobaciones de una postulación a partir del texto de cada documento.
 * textos = {cedula: '...', rsh: null, ...}; null significa que el archivo no se pudo leer o no está.
 * d = {rut, tramo, promedio, institucion, anioProceso}. Devuelve {Nombre de comprobación: 'Sí' | 'No' | 'No se pudo leer' | 'Sin archivo'}.
 */
function revisarTextos(textos, d) {
  var r = {};
  var poner = function (clave, nombre, fn) {
    var t = textos[clave];
    if (t === undefined) r[nombre] = 'Sin archivo';
    else if (t === null || letras(t) < MIN_LETRAS_LEGIBLE) r[nombre] = 'No se pudo leer';
    else r[nombre] = fn(t) ? 'Sí' : 'No';
  };
  var anios = [String(d.anioProceso - 1), String(d.anioProceso)];
  poner('cedula', 'Cédula legible', function () { return true; });
  poner('cedula', 'Cédula con RUT', function (t) { return rutEnTexto(t, d.rut); });
  poner('alumno_regular', 'Alumno regular con RUT', function (t) { return rutEnTexto(t, d.rut); });
  poner('alumno_regular', 'Alumno regular del año', function (t) { return anios.some(function (a) { return t.indexOf(a) >= 0; }); });
  poner('alumno_regular', 'Alumno regular de la institución', function (t) { return institucionEnTexto(t, d.institucion); });
  poner('notas', 'Notas legibles', function () { return true; });
  poner('notas', 'Notas con el promedio', function (t) { return promedioEnTexto(t, d.promedio); });
  poner('rsh', 'Cartola con RUT', function (t) { return rutEnTexto(t, d.rut); });
  poner('rsh', 'Cartola con el tramo', function (t) { return tramoEnTexto(t) === d.tramo; });
  poner('residencia', 'Residencia en Rengo', function (t) { return normalizarTexto(t).indexOf('rengo') >= 0; });
  poner('declaracion', 'Declaración legible', function () { return true; });
  return r;
}

/** Resumen de una fila: «Sin alertas» o la lista de comprobaciones que no dieron «Sí». */
function resumenRevision(r) {
  var alertas = Object.keys(r).filter(function (k) { return r[k] !== 'Sí'; });
  return alertas.length ? 'Revisar: ' + alertas.map(function (k) { return k + ' (' + r[k] + ')'; }).join(', ') : 'Sin alertas';
}

/** Archivo vigente de cada documento en la carpeta. Un reemplazo posterior gana sobre el original. */
function elegirArchivos(nombres) {
  var elegido = {}, marca = {};
  nombres.forEach(function (n) {
    var m = /^([a-z_]+?)(?:-reemplazo-([^.]*))?\.(pdf|jpg|png)$/.exec(n);
    if (!m) return;
    var k = m[1], t = m[2] || '';     // el original no tiene marca y pierde frente a cualquier reemplazo
    if (!(k in elegido) || t > marca[k]) { elegido[k] = n; marca[k] = t; }
  });
  return elegido;
}

/* ───────── Google Apps Script ───────── */

/** Texto de un archivo de Drive con OCR, o null si no se pudo leer. Usa una copia temporal que se borra. */
function textoOCR(archivo) {
  var temporal = null;
  try {
    temporal = Drive.Files.create({ name: 'OCR temporal ' + archivo.getName(), mimeType: MimeType.GOOGLE_DOCS },
      archivo.getBlob(), { ocrLanguage: 'es', fields: 'id' });
    return DocumentApp.openById(temporal.id).getBody().getText();
  } catch (x) {
    console.error('OCR de ' + archivo.getName() + ': ' + x);
    return null;
  } finally {
    if (temporal) { try { Drive.Files.remove(temporal.id); } catch (x) { console.error('No se borró la copia temporal ' + temporal.id + ': ' + x); } }
  }
}

function idCarpeta(url) { var m = /folders\/([\w-]+)/.exec(String(url)); return m ? m[1] : ''; }

/** Lee los documentos de una carpeta de postulación y devuelve {textos, tiempos}. */
function leerCarpeta(carpeta) {
  var archivos = {}, it = carpeta.getFiles();
  while (it.hasNext()) { var f = it.next(); archivos[f.getName()] = f; }
  var elegidos = elegirArchivos(Object.keys(archivos)), textos = {}, tiempos = {};
  COMPROBACIONES.map(function (c) { return c[0]; }).filter(function (k, i, a) { return a.indexOf(k) === i; }).forEach(function (k) {
    if (!elegidos[k]) return;
    var t0 = Date.now();
    textos[k] = textoOCR(archivos[elegidos[k]]);
    tiempos[k] = Date.now() - t0;
  });
  return { textos: textos, tiempos: tiempos };
}

/** Revisa las postulaciones que aún no tienen fila en la pestaña «Revisión automática». */
function revisarPendientes() {
  if (!REVISION_AUTOMATICA) return 'La revisión automática está desactivada (REVISION_AUTOMATICA).';
  var inicio = Date.now(), libro = SpreadsheetApp.openById(HOJA_ID), hoja = libro.getSheets()[0];
  var h = libro.getSheetByName(HOJA_REVISION) || libro.insertSheet(HOJA_REVISION);
  var nombres = COMPROBACIONES.map(function (c) { return c[1]; });
  if (h.getLastRow() === 0) { h.appendRow(['Folio', 'Fecha de revisión', 'Resultado'].concat(nombres)); h.setFrozenRows(1); }
  var hechos = {};
  if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 1).getValues().forEach(function (f) { hechos[String(f[0])] = true; });
  var n = hoja.getLastRow() - 1, revisadas = 0, pendientes = 0;
  if (n < 1) return 'No hay postulaciones.';
  var col = function (x) { return COLUMNAS.indexOf(x); };
  hoja.getRange(2, 1, n, COLUMNAS.length).getValues().forEach(function (f) {
    var folio = String(f[0]);
    if (!/^BMR-/.test(folio) || hechos[folio]) return;
    if (Date.now() - inicio > REVISION_MAX_MS) { pendientes++; return; }
    var id = idCarpeta(f[col('Carpeta')]);
    if (!id) return;
    var lectura = leerCarpeta(DriveApp.getFolderById(id));
    var r = revisarTextos(lectura.textos, { rut: String(f[col('RUT')]), tramo: String(f[col('Tramo RSH')]),
      promedio: f[col('Promedio')], institucion: String(f[col('Institución')]), anioProceso: ANIO_PROCESO });
    h.appendRow([folio, new Date(), resumenRevision(r)].concat(nombres.map(function (k) { return r[k]; })));
    revisadas++;
  });
  return 'Revisadas: ' + revisadas + '. Quedan para la próxima ejecución: ' + pendientes + '.';
}

/** Programa revisarPendientes() cada 15 minutos. Ejecútela una vez. */
function instalarRevisionAutomatica() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'revisarPendientes') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('revisarPendientes').timeBased().everyMinutes(15).create();
  return 'Revisión automática programada cada 15 minutos.';
}

/**
 * Prueba del OCR sobre una carpeta, sin tocar la hoja. Muestra en el registro, por archivo, el peso,
 * el tiempo, las letras leídas y un extracto. d permite indicar los datos declarados de la prueba.
 */
function probarOCR(carpetaId, d) {
  carpetaId = carpetaId || CARPETA_PRUEBA_OCR;
  d = d || { rut: '11.111.111-1', tramo: '40%', promedio: 6.2, institucion: 'Universidad de Prueba del Maule', anioProceso: ANIO_PROCESO };
  var carpeta = DriveApp.getFolderById(carpetaId), it = carpeta.getFiles(), filas = [];
  while (it.hasNext()) {
    var f = it.next(), t0 = Date.now(), texto = textoOCR(f);
    filas.push({ archivo: f.getName(), kb: Math.round(f.getSize() / 1024), ms: Date.now() - t0,
      letras: texto === null ? 'error' : letras(texto), extracto: texto === null ? '' : texto.replace(/\s+/g, ' ').slice(0, 160) });
  }
  filas.sort(function (a, b) { return a.archivo < b.archivo ? -1 : 1; });
  filas.forEach(function (x) { console.log(JSON.stringify(x)); });
  var lectura = leerCarpeta(carpeta), r = revisarTextos(lectura.textos, d);
  console.log('Comprobaciones: ' + JSON.stringify(r));
  console.log('Resultado: ' + resumenRevision(r));
  return filas;
}
// Carpeta de prueba para probarOCR() sin argumentos. Se completa solo para la prueba y no se sube al repositorio con valor.
const CARPETA_PRUEBA_OCR = '';
