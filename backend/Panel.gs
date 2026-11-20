/**
 * Beca Municipal Rengo. Panel interno de admisibilidad y nómina.
 *
 * Qué hace
 *   Trabaja sobre la misma hoja de cálculo donde Code.gs registra las postulaciones.
 *   1. prepararRevision() agrega tres columnas para el equipo de DIDECO:
 *      «Admisible» (Sí o No), «Motivo de inadmisibilidad» y «Residencia rural» (Sí o No).
 *   2. generarNomina() calcula el puntaje de cada postulación admisible con la regla de
 *      Puntaje.gs (artículo 16), ordena de mayor a menor, aplica el desempate del artículo 17
 *      y escribe tres pestañas: «Nómina», «Inadmisibles» y «Pendientes».
 *
 * Lo que NO hace
 *   No decide la admisibilidad: esa revisión la hacen los profesionales (artículo 12) y la comisión.
 *   No realiza sorteos: cuando el empate es total lo indica para que la comisión lo resuelva.
 *   No envía correos ni modifica las postulaciones.
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

const COLUMNAS_REVISION = ['Admisible', 'Motivo de inadmisibilidad', 'Residencia rural'];
const HOJA_NOMINA = 'Nómina';
const HOJA_INADMISIBLES = 'Inadmisibles';
const HOJA_PENDIENTES = 'Pendientes';

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Beca Municipal')
      .addItem('1. Preparar columnas de revisión', 'prepararRevision')
      .addItem('2. Generar nómina con puntajes', 'generarNomina')
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
