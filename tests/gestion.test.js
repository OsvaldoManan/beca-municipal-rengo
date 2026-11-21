// Pruebas de las funciones de gestión: plazo, estado por folio, registro de consultas, correos y publicación.
// Se ejecuta con   node tests/gestion.test.js   (servicios de Google simulados)
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const leer = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
let grupos = 0;
const grupo = (n, fn) => { fn(); grupos++; console.log("ok    " + n); };

// ── Plazo (js/complementos.js) ──
const sitio = vm.createContext({});
vm.runInContext(leer("js/complementos.js"), sitio);
grupo("plazo: antes, durante y después del 1 al 30 de marzo", () => {
  const e = (a, m, d) => { const r = sitio.estadoPlazo({ anio: a, mes: m, dia: d }, 2027); return [r.fase, r.dias]; };
  assert.deepStrictEqual(e(2026, 11, 20), ["antes", 101]);
  assert.deepStrictEqual(e(2027, 2, 28), ["antes", 1]);
  assert.deepStrictEqual(e(2027, 3, 1), ["abierto", 29]);
  assert.deepStrictEqual(e(2027, 3, 30), ["abierto", 0]);
  assert.deepStrictEqual(e(2027, 3, 31), ["cerrado", 1]);
});

grupo("cuenta regresiva hacia el 1 de marzo, hora de Chile", () => {
  const meta = sitio.aperturaPostulacion(2027);
  assert.strictEqual(new Date(meta).toISOString(), "2027-03-01T03:00:00.000Z");
  const t = sitio.tiempoRestante(Date.UTC(2027, 1, 27, 1, 59, 30), meta);                // 26 de febrero, 22:59:30 en Chile
  assert.deepStrictEqual([t.dias, t.horas, t.minutos, t.segundos], [2, 1, 0, 30]);
  assert.strictEqual(sitio.tiempoRestante(meta + 5000, meta).total, 0);
});

// ── Servicio (Code.gs + Puntaje.gs + Panel.gs) con una hoja simulada ──
function servicio(filas, opciones = {}) {
  const pestanas = {}, correos = [], archivos = [];
  const hoja = datos => ({
    getLastRow: () => datos.length, appendRow: f => datos.push(f.slice()), clearContents: () => { datos.length = 0; }, setFrozenRows() {},
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (datos[r - 1 + i] || [])[c - 1 + j]; return v === undefined ? "" : v; })),
      setValue: v => { while (datos.length < r) datos.push([]); datos[r - 1][c - 1] = v; },
      setValues: vs => vs.forEach((f, i) => { while (datos.length < r + i) datos.push([]); f.forEach((v, j) => { datos[r - 1 + i][c - 1 + j] = v; }); })
    })
  });
  const principal = hoja(filas);
  const libro = { getSheets: () => [principal], getSheetByName: n => pestanas[n] ? hoja(pestanas[n]) : null, insertSheet: n => { pestanas[n] = []; return hoja(pestanas[n]); } };
  const ctx = vm.createContext({
    console: { error() {}, log() {} }, SpreadsheetApp: { openById: () => libro }, MailApp: { sendEmail: m => correos.push(m) },
    Utilities: { formatDate: () => "2027-05-10", base64Decode: b => Array.from(Buffer.from(b, "base64")), newBlob: (bytes, tipo, nombre) => ({ bytes, tipo, getName: () => nombre }) },
    DriveApp: { getFolderById: id => ({ createFile: blob => { archivos.push({ carpeta: id, nombre: blob.getName() }); } }) }, ContentService: { createTextOutput: t => ({ setMimeType: () => t }), MimeType: { JSON: "json" } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) }
  });
  let codigo = leer("backend/Code.gs") + "\n" + leer("backend/Puntaje.gs") + "\n" + leer("backend/Panel.gs");
  if (opciones.registrar) codigo = codigo.replace("const REGISTRAR_CONSULTAS = false;", "const REGISTRAR_CONSULTAS = true;");
  if (opciones.subsanacion) codigo = codigo.replace("const SUBSANACION_ACTIVA = false;", "const SUBSANACION_ACTIVA = true;");
  if (opciones.cupos) codigo = codigo.replace("const CUPOS = 0;", "const CUPOS = " + opciones.cupos + ";");
  vm.runInContext(codigo + "\nthis.api = { doPost, registrarResultados, prepararCorreos, enviarCorreos, prepararPublicacion, enviarAvisosSubsanacion, prepararInformeCierre, COLUMNAS, COLUMNAS_REVISION, COLUMNAS_SUBSANACION };", ctx);
  const post = cuerpo => JSON.parse(ctx.api.doPost({ postData: { contents: JSON.stringify(cuerpo) } }));
  return { api: ctx.api, post, filas, pestanas, correos, archivos };
}
function hojaDePrueba(s) {
  const C = [...s.api.COLUMNAS, ...s.api.COLUMNAS_REVISION];
  const fila = d => C.map(c => d[c] === undefined ? "" : d[c]);
  const p = (folio, rut, promedio, tramo, extra = {}) => fila({ Folio: folio, Nombres: "Nombre", Apellidos: folio, RUT: rut, Correo: folio.toLowerCase() + "@correo.cl",
    "Año que cursa": 1, Promedio: promedio, "Tramo RSH": tramo, "Credencial discapacidad": "No", "Credencial discapacidad familiar": "No", "Credencial cuidador": "No", "Programa Familias": "No", ...extra });
  return [C.slice(),
    p("BMR-2027-0001", "11111111-1", 6.8, "40%", { Admisible: "Sí" }),
    p("BMR-2027-0002", "22222222-2", 6.1, "70%", { Admisible: "Sí" }),
    p("BMR-2027-0003", "12345678-5", 6.4, "40%", { Admisible: "No", "Motivo de inadmisibilidad": "Falta el certificado de residencia" }),
    p("BMR-2027-0004", "9876543-3", 6.4, "40%")];
}

grupo("estado por folio y RUT: etapas y resguardo de datos", () => {
  const s = servicio([]); hojaDePrueba(s).forEach(f => s.filas.push(f));
  assert.strictEqual(s.post({ tipo: "estado", folio: "BMR-2027-0001", rut: "11.111.111-1" }).estado, "Admisible, en evaluación");
  assert.strictEqual(s.post({ tipo: "estado", folio: "bmr-2027-0003", rut: "12345678-5" }).estado, "No admisible");
  assert.strictEqual(s.post({ tipo: "estado", folio: "BMR-2027-0004", rut: "9.876.543-3" }).estado, "Recibida, en revisión");
  const ajeno = s.post({ tipo: "estado", folio: "BMR-2027-0001", rut: "22222222-2" });     // folio de otra persona
  assert.strictEqual(ajeno.ok, false);
  assert.strictEqual(s.post({ tipo: "estado", folio: "0001", rut: "11111111-1" }).ok, false);
  const r = s.post({ tipo: "estado", folio: "BMR-2027-0001", rut: "11111111-1" });
  assert.deepStrictEqual(Object.keys(r).sort(), ["detalle", "estado", "folio", "ok"]);             // nunca nombre, correo ni puntaje
});

grupo("consultas sin respuesta: apagado por defecto, y registro solo del texto", () => {
  let s = servicio([]);
  assert.strictEqual(s.post({ tipo: "consulta", texto: "¿puedo postular desde otra comuna?" }).ok, false);
  assert.deepStrictEqual(s.pestanas, {});
  s = servicio([], { registrar: true });
  assert.strictEqual(s.post({ tipo: "consulta", texto: "=HYPERLINK(\"x\") ¿puedo postular desde otra comuna?" }).ok, true);
  const h = s.pestanas["Consultas sin respuesta"];
  assert.strictEqual(h.length, 2);
  assert.strictEqual(h[1].length, 2);
  assert.ok(String(h[1][1]).startsWith("'="));                                                     // sin fórmulas
});

grupo("resultados, correos y publicación", () => {
  const s = servicio([], { cupos: 1 }); hojaDePrueba(s).forEach(f => s.filas.push(f));
  assert.strictEqual(s.api.registrarResultados(), 2);
  const colResultado = s.api.COLUMNAS.length + 3;
  assert.strictEqual(s.filas[1][colResultado], "Seleccionado");
  assert.strictEqual(s.filas[2][colResultado], "Lista de espera");
  assert.strictEqual(s.post({ tipo: "estado", folio: "BMR-2027-0001", rut: "11111111-1" }).estado, "Seleccionado");

  assert.strictEqual(s.api.prepararCorreos(), 3);                                                   // seleccionado, lista de espera e inadmisible
  const c = s.pestanas["Correos"];
  assert.ok(c[3][3].includes("fue seleccionada") && c[5][3].includes("Falta el certificado de residencia"));
  assert.strictEqual(s.api.enviarCorreos(), 0);                                                     // nada marcado, nada enviado
  c[3][4] = "Sí";
  assert.strictEqual(s.api.enviarCorreos(), 1);
  assert.strictEqual(s.correos[0].to, "bmr-2027-0001@correo.cl");
  assert.strictEqual(s.api.enviarCorreos(), 0);                                                     // no se repite el envío

  const d = s.api.prepararPublicacion();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(d.cifras)), { postulaciones: 4, admisibles: 2, seleccionados: 1, montoTotal: 400000 });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(d.nomina)), [{ folio: "BMR-2027-0001", puntaje: 85 }]);    // sin nombres por defecto
  assert.ok(!JSON.stringify(d).includes("11111111"));
});

grupo("sin cupos definidos no se registran resultados ni se preparan correos", () => {
  const s = servicio([]); hojaDePrueba(s).forEach(f => s.filas.push(f));
  assert.throws(() => s.api.registrarResultados(), /CUPOS/);
  assert.throws(() => s.api.prepararCorreos(), /CUPOS/);
});

grupo("encuesta: anónima, con notas de 1 a 5 y sin fórmulas en el comentario", () => {
  const s = servicio([]);
  assert.strictEqual(s.post({ tipo: "encuesta", facilidad: 4, claridad: 9, comentario: "=1+1 muy claro" }).ok, true);
  const h = s.pestanas["Encuesta"];
  assert.strictEqual(h[1].length, 4);
  assert.deepStrictEqual(Array.from(h[1].slice(1)), [4, "", "'=1+1 muy claro"]);
  assert.strictEqual(s.post({ tipo: "encuesta" }).ok, false);
});

const PDF = Buffer.from("%PDF-1.4 documento de prueba").toString("base64");
const reemplazo = (extra = {}) => ({ tipo: "reemplazo", folio: "BMR-2027-0001", rut: "11111111-1", clave: "rsh", archivo: { tipo: "application/pdf", contenido: PDF }, ...extra });
grupo("reemplazo de documento: desactivado por defecto", () => {
  const s = servicio([]); hojaDePrueba(s).forEach(f => s.filas.push(f));
  const r = s.post(reemplazo());
  assert.strictEqual(r.ok, false); assert.match(r.error, /no está habilitado/);
  assert.strictEqual(s.archivos.length, 0);
});
grupo("reemplazo de documento: solo con solicitud pendiente, folio y RUT correctos", () => {
  const s = servicio([], { subsanacion: true }); hojaDePrueba(s).forEach(f => s.filas.push(f));
  const colCarpeta = s.api.COLUMNAS.indexOf("Carpeta");
  s.filas[1][colCarpeta] = "https://drive.google.com/drive/folders/CARPETA_0001";
  assert.match(s.post(reemplazo()).error, /No hay una solicitud de reemplazo pendiente/);          // nadie lo pidió
  s.pestanas["Subsanaciones"] = [Array.from(s.api.COLUMNAS_SUBSANACION), ["BMR-2027-0001", "Cartola Registro Social de Hogares", "Ilegible", "Sí", "", ""]];
  assert.strictEqual(s.api.enviarAvisosSubsanacion(), 1);
  assert.match(s.correos[0].body, /Cartola Registro Social de Hogares[\s\S]*Ilegible[\s\S]*Me pidieron reemplazar un documento/);
  assert.strictEqual(s.api.enviarAvisosSubsanacion(), 0);                                           // no repite el aviso
  assert.match(s.post(reemplazo({ rut: "22222222-2" })).error, /No encontramos/);                   // RUT de otra persona
  assert.match(s.post(reemplazo({ clave: "cedula" })).error, /No hay una solicitud/);               // otro documento
  assert.match(s.post(reemplazo({ archivo: { tipo: "application/pdf", contenido: Buffer.from("no es pdf").toString("base64") } })).error, /no corresponde/);
  assert.strictEqual(s.archivos.length, 0);
  assert.strictEqual(s.post(reemplazo()).ok, true);
  assert.strictEqual(s.archivos.length, 1);
  assert.strictEqual(s.archivos[0].carpeta, "CARPETA_0001");
  assert.match(s.archivos[0].nombre, /^rsh-reemplazo-.*\.pdf$/);
  assert.ok(s.pestanas["Subsanaciones"][1][5] instanceof Date || s.pestanas["Subsanaciones"][1][5]);
  assert.match(s.post(reemplazo()).error, /No hay una solicitud/);                                  // ya fue recibido
});

grupo("informe de cierre: cifras agregadas y sin datos personales", () => {
  const s = servicio([], { cupos: 1 }); hojaDePrueba(s).forEach(f => s.filas.push(f));
  assert.ok(s.api.prepararInformeCierre() > 20);
  const h = s.pestanas["Informe de cierre"], valor = r => (h.find(f => f[0] === r) || [])[1];
  assert.strictEqual(valor("Postulaciones recibidas"), 4);
  assert.strictEqual(valor("Postulaciones admisibles"), 2);
  assert.strictEqual(valor("Postulaciones inadmisibles"), 1);
  assert.strictEqual(valor("Postulaciones sin revisar"), 1);
  assert.strictEqual(valor("Becas asignadas"), 1);
  assert.strictEqual(valor("Monto ejecutado ($)"), 400000);
  assert.strictEqual(valor("Puntaje de corte (último seleccionado)"), 85);
  assert.strictEqual(valor("40%"), 3);
  assert.strictEqual(valor("Falta el certificado de residencia"), 1);
  const todo = JSON.stringify(h);
  assert.ok(!/11111111|correo\.cl|Nombre BMR/.test(todo));
});

console.log(grupos + " grupos de pruebas correctos");
