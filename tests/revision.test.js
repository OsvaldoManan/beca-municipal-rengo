// Pruebas de la lógica pura de la revisión automática (backend/Revision.gs). El OCR no se ejecuta aquí.
// Se ejecuta con   node tests/revision.test.js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
let grupos = 0;
const grupo = (n, fn) => { fn(); grupos++; console.log("ok    " + n); };

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "backend", "Revision.gs"), "utf8") +
  "\nthis.COMPROBACIONES = COMPROBACIONES; this.REVISION_AUTOMATICA = REVISION_AUTOMATICA;", ctx);

grupo("viene desactivada", () => assert.strictEqual(ctx.REVISION_AUTOMATICA, false));

grupo("RUT con y sin puntos, guion o espacios", () => {
  assert.ok(ctx.rutEnTexto("RUN: 11.111.111-1", "11111111-1"));
  assert.ok(ctx.rutEnTexto("RUT 11111111-1 nombre", "11.111.111-1"));
  assert.ok(ctx.rutEnTexto("Run 11 111 111 - 1", "11.111.111-1"));
  assert.ok(ctx.rutEnTexto("RUN 9.876.543-k", "9876543-K"));
  assert.ok(!ctx.rutEnTexto("RUN 11.111.112-1", "11.111.111-1"));
  assert.ok(!ctx.rutEnTexto("", "11.111.111-1"));
});

grupo("tramo de la cartola", () => {
  assert.strictEqual(ctx.tramoEnTexto("Tramo de Calificación Socioeconómica: 40%"), "40%");
  assert.strictEqual(ctx.tramoEnTexto("El hogar se ubica en el tramo del 0 al 40 %"), "40%");
  assert.strictEqual(ctx.tramoEnTexto("Calificación 60% de mayor vulnerabilidad"), "60%");
  assert.strictEqual(ctx.tramoEnTexto("sin datos"), "");
});

grupo("promedio con coma o punto", () => {
  assert.ok(ctx.promedioEnTexto("Promedio de notas 6,2", 6.2));
  assert.ok(ctx.promedioEnTexto("NEM 6.20", "6.2"));
  assert.ok(!ctx.promedioEnTexto("Promedio 5,9", 6.2));
  assert.ok(!ctx.promedioEnTexto("año 2026", 6.2));
});

grupo("institución por palabras significativas", () => {
  assert.ok(ctx.institucionEnTexto("UNIVERSIDAD DE TALCA certifica que", "Universidad de Talca"));
  assert.ok(ctx.institucionEnTexto("Instituto Profesional AIEP sede Rancagua", "IP AIEP"));
  assert.ok(!ctx.institucionEnTexto("Universidad de Chile", "Universidad de Talca"));
});

grupo("comprobaciones de una postulación y su resumen", () => {
  const d = { rut: "11.111.111-1", tramo: "40%", promedio: 6.2, institucion: "Universidad de Prueba del Maule", anioProceso: 2027 };
  const relleno = " texto suficiente para considerarlo un documento legible con varias palabras ";
  const textos = {
    cedula: "CEDULA DE IDENTIDAD RUN 11.111.111-1" + relleno,
    alumno_regular: "La Universidad de Prueba del Maule certifica que 11.111.111-1 es alumno regular el año académico 2027" + relleno,
    notas: "Concentración de notas. Promedio 6,2" + relleno,
    rsh: "Cartola Hogar. RUN 11111111-1. Tramo de Calificación Socioeconómica: 40%" + relleno,
    residencia: "La junta de vecinos certifica domicilio en la comuna de Rengo" + relleno,
    declaracion: null
  };
  const r = JSON.parse(JSON.stringify(ctx.revisarTextos(textos, d)));
  assert.deepStrictEqual(Object.keys(r), JSON.parse(JSON.stringify(ctx.COMPROBACIONES.map(c => c[1]))), "una respuesta por comprobación, en orden");
  assert.ok(Object.entries(r).filter(([k]) => k !== "Declaración legible").every(([, v]) => v === "Sí"), JSON.stringify(r));
  assert.strictEqual(r["Declaración legible"], "No se pudo leer");
  assert.strictEqual(ctx.resumenRevision(r), "Revisar: Declaración legible (No se pudo leer)");
  const r2 = ctx.revisarTextos(Object.assign({}, textos, { rsh: textos.rsh.replace("40%", "60%"), declaracion: "Declaro" + relleno, notas: undefined }), d);
  assert.strictEqual(r2["Cartola con el tramo"], "No");
  assert.strictEqual(r2["Notas legibles"], "Sin archivo");
  assert.strictEqual(ctx.revisarTextos({ cedula: "RUN 11.111.111-1" }, d)["Cédula con RUT"], "No se pudo leer", "muy poco texto");
  const todoSi = {}; ctx.COMPROBACIONES.forEach(c => { todoSi[c[1]] = "Sí"; });
  assert.strictEqual(ctx.resumenRevision(todoSi), "Sin alertas");
});

grupo("archivo vigente de cada documento", () => {
  const e = JSON.parse(JSON.stringify(ctx.elegirArchivos(["rsh.pdf", "cedula.jpg", "rsh-reemplazo-20270305-1010.png", "rsh-reemplazo-20270302-0900.pdf", "otro.txt"])));
  assert.deepStrictEqual(e, { cedula: "cedula.jpg", rsh: "rsh-reemplazo-20270305-1010.png" });
});

console.log("\n" + grupos + " grupos de pruebas correctos");
