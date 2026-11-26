// Pruebas de la lógica de backend/Code.gs con servicios de Google SIMULADOS.
// Se ejecuta con   node tests/backend.test.js
// Importante: esto no reemplaza la prueba en Google Apps Script. Aquí Drive, la hoja de cálculo, el correo
// y el candado son objetos de mentira. Sirve para verificar validaciones, folios, duplicados y manejo de fallas.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Las pruebas fijan CONTROLAR_PLAZO en false para no depender de la fecha. El caso del plazo lo activa aparte.
const CODIGO_REAL = fs.readFileSync(path.join(__dirname, "..", "backend", "Code.gs"), "utf8");
const CODIGO = CODIGO_REAL.replace(/const CONTROLAR_PLAZO = (true|false);/, "const CONTROLAR_PLAZO = false;");
const PDF = Buffer.from("%PDF-1.4\nprueba\n%%EOF\n").toString("base64");
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const OBLIGATORIOS = ["cedula", "alumno_regular", "notas", "rsh", "residencia", "declaracion"];

// Crea un entorno nuevo con hoja, carpeta y correo vacíos.
function entorno(opc = {}) {
  const m = { filas: [], carpetas: [], correos: [], logs: [], candados: 0, liberados: 0 };
  const hoja = {
    getLastRow: () => m.filas.length,
    appendRow: f => { if (opc.fallaHoja && m.filas.length >= 1) throw new Error("hoja no disponible"); m.filas.push(f.slice()); },
    getRange: (r, c, nr, nc) => ({
      // Como en Google Sheets, el apóstrofo inicial no forma parte del valor leído.
      getValues: () => m.filas.slice(r - 1, r - 1 + nr).map(f => f.slice(c - 1, c - 1 + nc).map(x => typeof x === "string" ? x.replace(/^'/, "") : x)),
      setValue: x => { m.filas[r - 1][c - 1] = x; }
    })
  };
  m.pestanas = {};
  const pestana = datos => ({ getLastRow: () => datos.length, appendRow: f => datos.push(f.slice()),
    getRange: (r, c, nr, nc) => ({ getValues: () => datos.slice(r - 1, r - 1 + nr).map(f => f.slice(c - 1, c - 1 + nc)), setValue: x => { datos[r - 1][c - 1] = x; } }) });
  const ctx = {
    console: { error: (...a) => m.logs.push(a.join(" ")), log() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => { if (opc.ocupado) return false; m.candados++; return true; }, releaseLock: () => { m.liberados++; } }) },
    SpreadsheetApp: { openById: () => ({ getSheets: () => [hoja],
      getSheetByName: n => m.pestanas[n] ? pestana(m.pestanas[n]) : null,
      insertSheet: n => { m.pestanas[n] = []; return pestana(m.pestanas[n]); } }), flush() {} },
    DriveApp: { getFolderById: () => ({ createFolder: nombre => {
      const c = { nombre, archivos: [], papelera: false, getName: () => c.nombre, setName: n => { c.nombre = n; }, setTrashed: t => { c.papelera = t; },
        getUrl: () => "https://drive.example/" + m.carpetas.length, createFile: b => { c.archivos.push(b.getName()); } };
      m.carpetas.push(c); return c; } }) },
    MailApp: { getRemainingDailyQuota: () => opc.cuota === undefined ? 100 : opc.cuota, sendEmail: c => { if (opc.fallaCorreo) throw new Error("cuota de correo agotada"); m.correos.push(c); } },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: t => ({ texto: t, setMimeType() { return this; } }) },
    Utilities: {
      base64Decode: t => { if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t)) throw new Error("base64"); return Array.from(new Int8Array(Buffer.from(t, "base64"))); },
      newBlob: (bytes, tipo, nombre) => ({ getName: () => nombre, getBytes: () => bytes, tipo }),
      formatDate: (f, zona, patron = "yyyy-M-d") => { const p = new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(f);
        const g = t => Number(p.find(x => x.type === t).value), dos = n => (n < 10 ? "0" : "") + n;
        if (patron === "yyyy-MM-dd") return g("year") + "-" + dos(g("month")) + "-" + dos(g("day"));
        return g("year") + "-" + g("month") + "-" + g("day"); }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(opc.codigo || CODIGO, ctx, { filename: "Code.gs" });
  m.post = cuerpo => JSON.parse(ctx.doPost({ postData: { contents: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) } }).texto);
  m.ctx = ctx;
  return m;
}
// Postulación válida con datos ficticios. "cambios" permite alterar datos y archivos.
const lista = nombre => JSON.parse(new RegExp("const " + nombre + " = (\\[[^\\]]*\\]);").exec(CODIGO_REAL)[1].replace(/'/g, '"').replace(/\s+/g, " "));
const SECTOR = lista("SECTORES")[0];
// Valor de una columna de la hoja simulada, buscada por su encabezado.
const celdaDe = (m, i, nombre) => m.filas[i][m.filas[0].indexOf(nombre)];
function postulacion(cambios = {}, claves = OBLIGATORIOS) {
  return {
    datos: Object.assign({ nombres: "Postulante de Prueba", apellidos: "Ficticio Ejemplo", rut: "11.111.111-1", telefono: "+56 9 0000 0000",
      domicilio: "Calle Falsa 123, Rengo", correo: "prueba@example.com", tutorNombre: "", tutorRut: "", titular: "Postulante", banco: "Banco de Prueba",
      tipoCuenta: "Cuenta vista", numCuenta: "000123456", institucion: "Universidad de Prueba", carrera: "Carrera Ficticia", anio: "2", promedio: "5.5",
      tramo: "40%", fechaNacimiento: "2005-05-10", sector: SECTOR, tipoInstitucion: "Universidad", areaCarrera: "Salud", menor: false, credDiscapacidad: false, credDiscapacidadFamiliar: false, credCuidador: false, programaFamilias: false,
      gastos: ["Matrícula o arancel", "Traslados"] }, cambios),
    familia: [["Persona Uno", "22.222.222-2", "Madre", "50", "Comerciante"]],
    archivos: claves.map((k, i) => i % 2 ? { clave: k, nombre: k + ".png", tipo: "image/png", contenido: PNG } : { clave: k, nombre: k + ".pdf", tipo: "application/pdf", contenido: PDF })
  };
}
const rechazo = (m, cuerpo, patron) => {
  const antes = m.filas.length, r = m.post(cuerpo);
  assert.strictEqual(r.ok, false, JSON.stringify(r)); assert.match(r.error, patron);
  assert.strictEqual(m.filas.length, antes, "un rechazo no debe agregar filas");
  assert.strictEqual(m.candados, m.liberados, "el candado debe quedar liberado");
};

let n = 0;
const caso = (nombre, fn) => { fn(); n++; console.log("ok   " + nombre); };

caso("postulación válida: folio, carpeta, archivos, fila y dos correos", () => {
  const m = entorno(), r = m.post(postulacion());
  assert.deepStrictEqual(r, { ok: true, folio: "BMR-2027-0001", comprobante: true });
  assert.strictEqual(m.filas.length, 2);
  assert.strictEqual(m.filas[0][0], "Folio"); assert.strictEqual(m.filas[0].length, m.filas[1].length);
  const f = m.filas[1];
  assert.strictEqual(f[0], "BMR-2027-0001"); assert.strictEqual(f[4], "11111111-1");
  assert.strictEqual(f[5], "'+56 9 0000 0000", "el teléfono con + se guarda como texto");
  assert.strictEqual(celdaDe(m, 1, "N° de cuenta"), "'000123456", "la cuenta conserva los ceros iniciales");
  assert.strictEqual(celdaDe(m, 1, "Promedio"), 5.5); assert.strictEqual(celdaDe(m, 1, "Gastos a cubrir"), "Matrícula o arancel, Traslados");
  assert.strictEqual(m.carpetas[0].nombre, "BMR-2027-0001 Ficticio Ejemplo Postulante de Prueba");
  assert.deepStrictEqual(m.carpetas[0].archivos, ["cedula.pdf", "alumno_regular.png", "notas.pdf", "rsh.png", "residencia.pdf", "declaracion.png"]);
  assert.deepStrictEqual(m.correos.map(c => c.to), ["prueba@example.com", "becaestudiantil@munirengo.cl"]);
  assert.match(m.correos[0].subject, /BMR-2027-0001/); assert.strictEqual(m.correos[1].attachments.length, 6);
  assert.strictEqual(m.candados, 1); assert.strictEqual(m.liberados, 1);
});
caso("RUT duplicado se rechaza aunque venga escrito de otra forma, y el folio siguiente es correlativo", () => {
  const m = entorno(); m.post(postulacion());
  rechazo(m, postulacion({ rut: "111111111" }), /Ya existe una postulación registrada con este RUT \(folio BMR-2027-0001\)/);
  assert.strictEqual(m.carpetas.length, 1, "no se crea carpeta para un duplicado");
  assert.strictEqual(m.post(postulacion({ rut: "22.222.222-2" })).folio, "BMR-2027-0002");
  m.filas.splice(1, 1);   // se borra a mano la primera postulación en la hoja
  assert.strictEqual(m.post(postulacion({ rut: "12.345.678-5" })).folio, "BMR-2027-0003", "el folio no se repite si se borran filas");
});
caso("datos obligatorios, RUT, correo, teléfono y listas cerradas", () => {
  const m = entorno();
  rechazo(m, "", /llegó vacía/); rechazo(m, "{no es json", /formato esperado/); rechazo(m, "[]", /formato esperado/);
  rechazo(m, { archivos: [] }, /Faltan los datos/);
  [["nombres", "", /Falta los nombres/], ["nombres", "   ", /Falta los nombres/], ["rut", "11.111.111-2", /RUT informado no es válido/], ["correo", "sin-arroba", /correo/],
   ["telefono", "123", /teléfono/], ["titular", "Otro", /titular/], ["tipoCuenta", "Cuenta RUT x", /tipo de cuenta/], ["anio", "9", /año que cursa/],
   ["tramo", "10%", /tramo/], ["gastos", [], /en qué usará/], ["gastos", ["Combustible"], /en qué usará/], ["numCuenta", "", /número de cuenta/],
   ["nombres", { a: 1 }, /Falta los nombres/]].forEach(([k, x, p]) => rechazo(m, postulacion({ [k]: x }), p));
  assert.strictEqual(m.filas.length, 0); assert.strictEqual(m.carpetas.length, 0); assert.strictEqual(m.correos.length, 0);
});
caso("promedio mínimo del artículo 7 d", () => {
  const m = entorno();
  rechazo(m, postulacion({ anio: "1", promedio: "5.9" }), /mínimo de 6,0/);
  rechazo(m, postulacion({ anio: "2", promedio: "4,9" }), /mínimo de 5,0/);
  rechazo(m, postulacion({ promedio: "8" }), /entre 1,0 y 7,0/); rechazo(m, postulacion({ promedio: "seis" }), /entre 1,0 y 7,0/);
  assert.strictEqual(m.post(postulacion({ anio: "1", promedio: "6,0" })).ok, true);
  assert.strictEqual(m.post(postulacion({ rut: "22.222.222-2", anio: "3", promedio: "5.0" })).ok, true);
});
caso("documentos: obligatorios, condicionales, claves, tipos, tamaños y contenido", () => {
  const m = entorno();
  rechazo(m, postulacion({}, OBLIGATORIOS.slice(1)), /Faltan documentos obligatorios/);
  rechazo(m, postulacion({ credDiscapacidadFamiliar: true }), /Faltan documentos obligatorios/);
  rechazo(m, postulacion({ credCuidador: true }), /Faltan documentos obligatorios/);
  rechazo(m, postulacion({ programaFamilias: true }), /Faltan documentos obligatorios/);
  rechazo(m, postulacion({ menor: true, fechaNacimiento: "2010-01-01", tutorNombre: "Tutor de Prueba", tutorRut: "22.222.222-2" }), /Faltan documentos obligatorios/);
  rechazo(m, postulacion({}, OBLIGATORIOS.concat("fud")), /no corresponde a lo declarado/);
  rechazo(m, postulacion({}, OBLIGATORIOS.concat("otro")), /no corresponde a la postulación/);
  rechazo(m, postulacion({}, OBLIGATORIOS.concat("cedula")), /repetido/);
  const con = fn => { const p = postulacion(); fn(p.archivos[0]); return p; };
  rechazo(m, con(a => { a.tipo = "application/zip"; }), /PDF, JPG o PNG/);
  rechazo(m, con(a => { a.tipo = "image/png"; }), /no corresponde a un archivo PDF, JPG o PNG válido/);      // dice PNG, es PDF
  rechazo(m, con(a => { a.contenido = Buffer.from("<script>").toString("base64"); }), /no corresponde a un archivo/);
  rechazo(m, con(a => { a.contenido = "###"; }), /dañado/);
  rechazo(m, con(a => { a.contenido = ""; }), /vacío/);
  rechazo(m, con(a => { a.contenido = Buffer.concat([Buffer.from("%PDF"), Buffer.alloc(5 * 1048576)]).toString("base64"); }), /supera los 5 MB/);
  rechazo(m, { datos: postulacion().datos }, /Faltan los documentos/);
  assert.strictEqual(m.filas.length, 0); assert.strictEqual(m.carpetas.length, 0);
  const todo = OBLIGATORIOS.concat("discapacidad", "cuidador", "fud", "cedula_tutor", "autorizacion", "declaracion_tutor");
  const r = m.post(postulacion({ credDiscapacidad: true, credCuidador: true, programaFamilias: true, menor: true, fechaNacimiento: "2010-01-01", tutorNombre: "Tutor de Prueba", tutorRut: "22.222.222-2" }, todo));
  assert.strictEqual(r.ok, true); assert.strictEqual(m.carpetas[0].archivos.length, 12);
  assert.strictEqual(celdaDe(m, 1, "RUT tutor"), "22222222-2");
});
caso("tope total de 25 MB", () => {
  const m = entorno(), p = postulacion();
  const grande = Buffer.concat([Buffer.from("%PDF"), Buffer.alloc(Math.floor(4.9 * 1048576))]).toString("base64");
  p.archivos.forEach(a => { a.tipo = "application/pdf"; a.contenido = grande; });   // 6 x 4,9 MB = 29,4 MB
  rechazo(m, p, /supera los 25 MB/);
});
caso("menor de edad: exige tutor con RUT válido y distinto", () => {
  const m = entorno(), claves = OBLIGATORIOS.concat("cedula_tutor", "autorizacion", "declaracion_tutor");
  rechazo(m, postulacion({ menor: true, fechaNacimiento: "2010-01-01" }, claves), /nombre del padre, madre o tutor/);
  rechazo(m, postulacion({ menor: true, fechaNacimiento: "2010-01-01", tutorNombre: "Tutor", tutorRut: "1-1" }, claves), /RUT del tutor no es válido/);
  rechazo(m, postulacion({ menor: true, fechaNacimiento: "2010-01-01", tutorNombre: "Tutor", tutorRut: "11111111-1" }, claves), /no puede ser el mismo/);
});
caso("inyección de fórmulas y nombre de carpeta", () => {
  const m = entorno();
  const r = m.post(postulacion({ nombres: '=HYPERLINK("http://x","y")', apellidos: "../../Otro/Lugar: *?", domicilio: "@SUM(A1)", banco: "-1+1", carrera: "+cmd|' /C calc'!A0", institucion: "Línea 1\nLínea 2\t=2+2" }));
  assert.strictEqual(r.ok, true);
  const f = m.filas[1];
  f.forEach((x, i) => { if (typeof x === "string") assert.ok(!/^[=+\-@]/.test(x), "la columna " + (i + 1) + " podría interpretarse como fórmula: " + x); });
  assert.strictEqual(f[2], "'=HYPERLINK(\"http://x\",\"y\")"); assert.strictEqual(celdaDe(m, 1, "Institución"), "Línea 1 Línea 2 =2+2");
  assert.ok(!/[\\\/:*?"<>|]/.test(m.carpetas[0].nombre), m.carpetas[0].nombre);
  m.correos.forEach(c => assert.ok(!/[\r\n]/.test(c.subject), "el asunto no debe contener saltos de línea"));
  // Grupo familiar con fórmula en la primera celda.
  const p = postulacion({ rut: "22.222.222-2" }); p.familia = [["=1+1", "", "", "", ""], ["", "", "", "", ""]];
  m.post(p); assert.strictEqual(celdaDe(m, 2, "Grupo familiar"), "'=1+1 |  |  |  | ");
});
caso("falla al escribir la hoja: no queda registro a medias, se avisa y se anota en el registro de errores", () => {
  const m = entorno({ fallaHoja: true }), r = m.post(postulacion());
  assert.strictEqual(r.ok, false); assert.match(r.error, /No fue posible registrar su postulación/);
  assert.ok(!/hoja no disponible/.test(r.error), "el detalle técnico no se muestra al postulante");
  assert.strictEqual(m.filas.length, 1, "solo el encabezado");
  assert.strictEqual(m.carpetas[0].papelera, true); assert.match(m.carpetas[0].nombre, /^INCOMPLETA /);
  assert.strictEqual(m.correos.length, 0, "no se envía comprobante de algo no registrado");
  assert.ok(m.logs.some(l => /BMR-2027-0001 NO registrada/.test(l)));
  assert.strictEqual(m.candados, 1); assert.strictEqual(m.liberados, 1);
});
caso("falla del correo: la postulación queda registrada y se informa sin afirmar que se envió el comprobante", () => {
  const m = entorno({ fallaCorreo: true }), r = m.post(postulacion());
  assert.deepStrictEqual(r, { ok: true, folio: "BMR-2027-0001", comprobante: false });
  assert.strictEqual(m.filas.length, 2); assert.match(celdaDe(m, 1, "Observaciones"), /No se envió el comprobante.*No se envió la copia/);
  assert.strictEqual(m.logs.length, 2);
});
caso("candado ocupado: se pide reintentar y no se registra nada", () => {
  const m = entorno({ ocupado: true }), r = m.post(postulacion());
  assert.strictEqual(r.ok, false); assert.match(r.error, /Intente nuevamente en un minuto/);
  assert.strictEqual(m.filas.length, 0); assert.strictEqual(m.liberados, 0);
});
caso("período de postulación en hora de Chile y control activable", () => {
  const m = entorno(), en = t => m.ctx.enPlazo(new Date(t));
  assert.match(CODIGO_REAL, /const PLAZO_INICIO = '2026-11-26';/); assert.match(CODIGO_REAL, /const PLAZO_FIN = '2027-01-01';/);
  const sitio = fs.readFileSync(path.join(__dirname, "..", "js", "complementos.js"), "utf8");
  assert.match(sitio, /var PLAZO_INICIO = "2026-11-26";/, "el sitio y el servicio deben usar el mismo período");
  assert.match(sitio, /var PLAZO_FIN = "2027-01-01";/, "el sitio y el servicio deben usar el mismo período");
  assert.strictEqual(en("2026-11-26T03:00:00Z"), true, "26 de noviembre 00:00 en Chile");
  assert.strictEqual(en("2026-11-26T02:59:00Z"), false, "25 de noviembre 23:59 en Chile");
  assert.strictEqual(en("2026-12-31T15:00:00Z"), true, "31 de diciembre");
  assert.strictEqual(en("2027-01-02T02:59:00Z"), true, "1 de enero 23:59 en Chile");
  assert.strictEqual(en("2027-01-02T03:01:00Z"), false, "2 de enero en Chile");
  assert.strictEqual(en("2027-03-15T15:00:00Z"), false, "marzo queda fuera de este período");
  assert.strictEqual(m.ctx.fechaLarga("2027-01-01"), "1 de enero de 2027");
  assert.ok(/const CONTROLAR_PLAZO = (true|false);/.test(CODIGO_REAL));
  const activo = entorno({ codigo: CODIGO.replace(/const CONTROLAR_PLAZO = (true|false);/, "const CONTROLAR_PLAZO = true;") });
  const r = activo.post(postulacion()), hoyEnPlazo = activo.ctx.enPlazo(new Date());
  assert.strictEqual(r.ok, hoyEnPlazo); if (!hoyEnPlazo) assert.match(r.error, /26 de noviembre de 2026 al 1 de enero de 2027/);
});
caso("doGet entrega un estado breve sin datos", () => {
  const m = entorno(), j = JSON.parse(m.ctx.doGet().texto);
  assert.strictEqual(j.ok, true); assert.strictEqual(j.configurado, false, "con los identificadores de ejemplo debe decir que falta configurar");
  assert.deepStrictEqual(Object.keys(j).sort(), ["configurado", "controlDePlazo", "enPlazo", "ok", "proceso", "servicio"]);
});

caso("control de documentos: una fila por postulación con Sí, No aplica y el total, y comprobante con la lista", () => {
  const m = entorno(), r = m.post(postulacion());
  assert.strictEqual(r.ok, true);
  const d = m.pestanas["Documentos"];
  assert.strictEqual(d.length, 2);
  assert.deepStrictEqual(Array.from(d[0].slice(0, 5)), ["Folio", "Fecha de recepción", "Postulante", "RUT", "Cédula de identidad"]);
  assert.strictEqual(d[1][0], "BMR-2027-0001");
  assert.deepStrictEqual(Array.from(d[1].slice(4, 10)), ["Sí", "Sí", "Sí", "Sí", "Sí", "Sí"]);          // los seis obligatorios
  assert.ok(d[1].slice(10, 16).every(x => x === "No aplica"));
  assert.strictEqual(d[1][16], 6);
  assert.match(m.correos[0].body, /Documentos recibidos \(6\):[\s\S]*Cartola Registro Social de Hogares[\s\S]*Conserve este correo/);
});
caso("aviso de apertura: guarda el correo una vez y lo envía solo dentro del plazo", () => {
  const m = entorno();
  assert.strictEqual(m.post({ tipo: "recordatorio", correo: "no-es-correo" }).ok, false);
  assert.deepStrictEqual(m.post({ tipo: "recordatorio", correo: "Estudiante@Example.com" }), { ok: true });
  assert.strictEqual(m.post({ tipo: "recordatorio", correo: "estudiante@example.com" }).repetido, true);
  const h = m.pestanas["Recordatorios"];
  assert.strictEqual(h.length, 2, "encabezado y un correo");
  assert.strictEqual(h[1][1], "estudiante@example.com");
  assert.strictEqual(m.candados, m.liberados, "el candado debe quedar liberado");
  m.ctx.enPlazo = () => false;
  assert.match(m.ctx.enviarRecordatorios(), /no está abierta/); assert.strictEqual(m.correos.length, 0);
  m.ctx.enPlazo = () => true;
  assert.match(m.ctx.enviarRecordatorios(), /enviados: 1\. Pendientes: 0/);
  assert.strictEqual(m.correos[0].to, "estudiante@example.com");
  assert.match(m.correos[0].body, /26 de noviembre de 2026 al 1 de enero de 2027/);
  assert.strictEqual(Object.prototype.toString.call(h[1][2]), "[object Date]", "queda la fecha de envío");
  assert.match(m.ctx.enviarRecordatorios(), /enviados: 0\./, "no se envía dos veces");
  const sinCuota = entorno({ cuota: 20 });
  sinCuota.post({ tipo: "recordatorio", correo: "otra@example.com" }); sinCuota.ctx.enPlazo = () => true;
  assert.match(sinCuota.ctx.enviarRecordatorios(), /enviados: 0\. Pendientes: 1/, "respeta la reserva de cuota");
});
caso("cifras públicas: solo totales, sin datos personales y con grupos pequeños ocultos", () => {
  const m = entorno();
  const ruts = ["11.111.111-1", "22.222.222-2", "33.333.333-3", "44.444.444-4", "55.555.555-5", "66.666.666-6"];
  ruts.forEach((rut, i) => { const r = m.post(postulacion({ rut, tramo: i < 5 ? "40%" : "60%", areaCarrera: i < 5 ? "Salud" : "Derecho", fechaNacimiento: i < 5 ? "2005-05-10" : "1990-01-01" })); assert.strictEqual(r.ok, true, r.error); });
  const j = JSON.parse(m.ctx.doGet({ parameter: { cifras: "1" } }).texto);
  assert.strictEqual(j.ok, true); assert.strictEqual(j.total, 6); assert.strictEqual(j.umbral, 5);
  assert.strictEqual(j.porTramo["40%"], 5); assert.strictEqual(j.porTramo["60%"], null, "un grupo de 1 persona se oculta"); assert.strictEqual(j.porTramo["70%"], 0);
  assert.strictEqual(j.porArea.Salud, 5); assert.strictEqual(j.porArea.Derecho, null);
  assert.strictEqual(j.porSector[SECTOR], 6); assert.strictEqual(j.porTipoInstitucion.Universidad, 6);
  assert.strictEqual(j.porEdad["20 a 24 años"] + (j.porEdad["18 y 19 años"] || 0) + (j.porEdad["17 años o menos"] || 0), 5);
  assert.strictEqual(j.porEdad["30 años o más"], null);
  assert.strictEqual(Object.values(j.porDia).reduce((a, b) => a + b, 0), 6);
  assert.ok(!/11\.111|Postulante de Prueba|example\.com|2005-05-10|1990/.test(JSON.stringify(j)), "no expone datos personales ni fechas de nacimiento");
});
caso("campos nuevos: listas cerradas, fecha de nacimiento y coherencia con la casilla de menor", () => {
  const m = entorno();
  rechazo(m, postulacion({ sector: "Otro lugar" }), /unidad vecinal/);
  rechazo(m, postulacion({ tipoInstitucion: "Liceo" }), /tipo de institución/);
  rechazo(m, postulacion({ areaCarrera: "Otra" }), /área de la carrera/);
  rechazo(m, postulacion({ fechaNacimiento: "2005-02-30" }), /fecha de nacimiento/);
  rechazo(m, postulacion({ fechaNacimiento: "" }), /Falta la fecha de nacimiento/);
  rechazo(m, postulacion({ fechaNacimiento: "2015-01-01" }), /fecha de nacimiento|menos de 18/);
  rechazo(m, postulacion({ menor: true, tutorNombre: "Tutor de Prueba", tutorRut: "22.222.222-2" }), /indica 18 o más/);
  assert.strictEqual(m.ctx.edadEn("2008-11-27", "2026-11-26"), 17); assert.strictEqual(m.ctx.edadEn("2008-11-26", "2026-11-26"), 18);
  assert.strictEqual(m.ctx.rangoEdad(19), "18 y 19 años"); assert.strictEqual(m.ctx.rangoEdad(30), "30 años o más");
  const r = m.post(postulacion());
  assert.strictEqual(r.ok, true, r.error);
  const C = m.filas[0], f = m.filas[1];
  assert.strictEqual(f[C.indexOf("Sector")], SECTOR); assert.strictEqual(f[C.indexOf("Tipo de institución")], "Universidad");
  assert.strictEqual(f[C.indexOf("Área de la carrera")], "Salud"); assert.strictEqual(String(f[C.indexOf("Fecha de nacimiento")]).replace(/^'/, ""), "2005-05-10");
  assert.strictEqual(f[C.indexOf("Tramo RSH")], "'40%", "el tramo se guarda como texto para que Sheets no lo convierta en 0,4");
  assert.strictEqual(m.ctx.tramoComoTexto(0.4), "40%"); assert.strictEqual(m.ctx.tramoComoTexto("'60%"), "60%"); assert.strictEqual(m.ctx.tramoComoTexto(1), "100%");
  f[C.indexOf("Tramo RSH")] = 0.4;   // así queda si Sheets lo convierte en número
  const j = JSON.parse(m.ctx.doGet({ parameter: { cifras: "1" } }).texto);
  assert.strictEqual(j.porTramo["40%"], null, "el 0,4 cuenta como tramo 40% (oculto por ser menos de 5)");
});
caso("las listas del formulario coinciden con las del servicio", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const opciones = id => [...new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>').exec(html)[1].matchAll(/<option(?: value="([^"]*)")?>([^<]*)<\/option>/g)]
    .map(x => x[1] !== undefined ? x[1] : x[2]).filter(Boolean);
  assert.deepStrictEqual(opciones("sector"), lista("SECTORES"));
  assert.deepStrictEqual(opciones("tipoInstitucion"), lista("TIPOS_INSTITUCION"));
  assert.deepStrictEqual(opciones("areaCarrera"), lista("AREAS_CARRERA"));
  assert.ok(lista("SECTORES").length > 0, "falta la lista de sectores");
});
console.log("\n" + n + " grupos de pruebas correctos");
