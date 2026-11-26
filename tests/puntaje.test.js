// Pruebas de la regla de puntaje (js/puntaje.js) y de la nómina (backend/Panel.gs).
// Se ejecuta con   node tests/puntaje.test.js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const raiz = path.join(__dirname, "..");
const leer = f => fs.readFileSync(path.join(raiz, f), "utf8");
let grupos = 0;
const grupo = (nombre, fn) => { fn(); grupos++; console.log("ok    " + nombre); };

// La copia del servidor debe ser idéntica a la del sitio.
grupo("backend/Puntaje.gs es copia exacta de js/puntaje.js", () => {
  assert.strictEqual(leer("backend/Puntaje.gs"), leer("js/puntaje.js"));
});

const ctx = vm.createContext({});
vm.runInContext(leer("js/puntaje.js"), ctx);
const { puntosRendimiento, puntosRsh, puntosVulnerabilidad, calcularPuntaje, compararPostulantes } = ctx;

grupo("rendimiento de primer año (NEM)", () => {
  assert.strictEqual(puntosRendimiento(1, 5.9), null);
  assert.strictEqual(puntosRendimiento(1, "6,0"), 50);
  assert.strictEqual(puntosRendimiento(1, 6.2), 50);
  assert.strictEqual(puntosRendimiento(1, 6.3), 75);
  assert.strictEqual(puntosRendimiento(1, 6.5), 75);
  assert.strictEqual(puntosRendimiento(1, 6.6), 100); // criterio de lectura 2
  assert.strictEqual(puntosRendimiento(1, 7), 100);
  assert.strictEqual(puntosRendimiento(1, 7.1), null);
  assert.strictEqual(puntosRendimiento(1, ""), null);
});

grupo("rendimiento desde segundo año (promedio de carrera)", () => {
  assert.strictEqual(puntosRendimiento(2, 4.9), null);
  assert.strictEqual(puntosRendimiento(2, 5.0), 50);
  assert.strictEqual(puntosRendimiento(3, 5.1), 75);
  assert.strictEqual(puntosRendimiento(5, "5,5"), 75);
  assert.strictEqual(puntosRendimiento(2, 5.6), 100);
  assert.strictEqual(puntosRendimiento(2, 5.54), 75);  // se lee con un decimal
  assert.strictEqual(puntosRendimiento(2, 5.55), 100);
});

grupo("tramo del Registro Social de Hogares", () => {
  assert.deepStrictEqual(["40%", 50, "60", "70%", "80%", "90%", "100%"].map(puntosRsh), [100, 75, 50, 25, 10, 0, 0]);
  assert.strictEqual(puntosRsh("45%"), null);
  assert.strictEqual(puntosRsh(""), null);
});

grupo("condición de vulnerabilidad", () => {
  assert.strictEqual(puntosVulnerabilidad({}), 0);
  assert.strictEqual(puntosVulnerabilidad({ discapacidadFamiliar: true }), 75);
  assert.strictEqual(puntosVulnerabilidad({ cuidador: true }), 100);
  assert.strictEqual(puntosVulnerabilidad({ familias: true, discapacidadFamiliar: true }), 100);
});

grupo("puntaje final ponderado", () => {
  const e = calcularPuntaje({ anio: 1, promedio: "6,4", tramo: "40%" });
  assert.strictEqual(e.total, 75);                       // 30 + 45 + 0, ejemplo del sitio
  assert.strictEqual(calcularPuntaje({ anio: 1, promedio: 7, tramo: "40%", discapacidad: true }).total, 100);
  assert.strictEqual(calcularPuntaje({ anio: 2, promedio: 5.0, tramo: "100%" }).total, 20);
  assert.strictEqual(calcularPuntaje({ anio: 2, promedio: 5.3, tramo: "80%", discapacidadFamiliar: true }).total, 45.75); // 30 + 4,5 + 11,25
  assert.strictEqual(calcularPuntaje({ anio: 1, promedio: 5.5, tramo: "40%" }).valido, false);
  assert.strictEqual(calcularPuntaje({ anio: 2, promedio: 6, tramo: "33%" }).valido, false);
});

grupo("orden y desempate del artículo 17", () => {
  const base = { total: 75 };
  const cred = { ...base, discapacidad: true }, fam = { ...base, familias: true }, rural = { ...base, rural: true };
  assert.ok(compararPostulantes({ total: 80 }, { total: 75, discapacidad: true }) < 0);
  assert.ok(compararPostulantes(cred, fam) < 0);
  assert.ok(compararPostulantes(fam, rural) < 0);
  assert.ok(compararPostulantes(rural, base) < 0);
  assert.strictEqual(compararPostulantes({ ...base }, { ...base }), 0);
});

// Nómina: se carga Panel.gs junto a las constantes de Code.gs que necesita.
const columnas = /const COLUMNAS = \[[\s\S]*?\];/.exec(leer("backend/Code.gs"))[0];
const revision = /const COLUMNAS_REVISION = \[[\s\S]*?\];/.exec(leer("backend/Code.gs"))[0];
const tramoTexto = /function tramoComoTexto\([\s\S]*?\n\}/.exec(leer("backend/Code.gs"))[0];
const panel = vm.createContext({});
vm.runInContext(columnas + "\n" + revision + "\n" + tramoTexto + "\nconst MONTO_X=0, HOJA_ID='x', ZONA_HORARIA='America/Santiago', ANIO_PROCESO=2027;\n" + leer("backend/Puntaje.gs") + "\n" + leer("backend/Panel.gs") +
  "\nthis.armarNomina = armarNomina; this.COLUMNAS = COLUMNAS; this.COLUMNAS_REVISION = COLUMNAS_REVISION;", panel);
const C = [...panel.COLUMNAS, ...panel.COLUMNAS_REVISION];
const fila = d => C.map(c => d[c] === undefined ? "" : d[c]);
const post = (folio, anio, promedio, tramo, extra = {}) => fila({
  Folio: folio, Nombres: "Nombre", Apellidos: folio, RUT: "11111111-1", Correo: "a@b.cl", "Año que cursa": anio, Promedio: promedio, "Tramo RSH": tramo,
  "Credencial discapacidad": "No", "Credencial discapacidad familiar": "No", "Credencial cuidador": "No", "Programa Familias": "No", Admisible: "Sí", ...extra });

grupo("nómina: clasificación, orden y lugares", () => {
  const r = panel.armarNomina([
    post("F1", 1, 6.4, "40%"),                                   // 75
    post("F2", 2, 5.8, "40%", { "Credencial cuidador": "Sí" }),  // 100
    post("F3", 2, 5.0, "100%"),                                  // 20
    post("F4", 1, 6.8, "40%", { Admisible: "No", "Motivo de inadmisibilidad": "Sin certificado de residencia" }),
    post("F5", 1, 6.8, "40%", { Admisible: "" }),
    post("F6", 1, 5.0, "40%"),                                   // admisible marcado, pero NEM bajo el mínimo
    fila({})                                                     // fila vacía
  ], 0);
  assert.deepStrictEqual(Array.from(r.nomina, p => p.folio), ["F2", "F1", "F3"]);
  assert.deepStrictEqual(Array.from(r.nomina, p => p.lugar), [1, 2, 3]);
  assert.deepStrictEqual(Array.from(r.nomina, p => p.total), [100, 75, 20]);
  assert.ok(r.nomina.every(p => p.estado === "Admisible" && p.desempate === ""));
  assert.deepStrictEqual(Array.from(r.inadmisibles, p => p.folio), ["F4", "F6"]);
  assert.strictEqual(r.inadmisibles[0].motivo, "Sin certificado de residencia");
  assert.deepStrictEqual(Array.from(r.pendientes, p => p.folio), ["F5"]);
});

grupo("nómina: cupos, desempate y sorteo en el corte", () => {
  const filas = [
    post("A", 1, 6.4, "40%"),                                        // 75 sin prioridad
    post("B", 1, 6.4, "40%", { "Residencia rural": "Sí" }),          // 75 rural
    post("C", 1, 6.4, "40%"),                                        // 75 sin prioridad, empate total con A
    post("D", 1, 7.0, "40%")                                         // 85
  ];
  let r = panel.armarNomina(filas, 2);
  assert.deepStrictEqual(Array.from(r.nomina, p => [p.folio, p.lugar, p.estado]),
    [["D", 1, "Seleccionado"], ["B", 2, "Seleccionado"], ["A", 3, "Lista de espera"], ["C", 3, "Lista de espera"]]);
  assert.strictEqual(r.nomina[1].desempate, "Resuelto por artículo 17");
  assert.strictEqual(r.sorteos, 0);

  r = panel.armarNomina(filas, 3);                                    // el corte cae dentro del empate A y C
  assert.deepStrictEqual(Array.from(r.nomina, p => p.estado), ["Seleccionado", "Seleccionado", "Requiere sorteo", "Requiere sorteo"]);
  assert.strictEqual(r.sorteos, 1);

  r = panel.armarNomina(filas, 4);                                    // alcanzan los cupos, no hay sorteo
  assert.ok(r.nomina.every(p => p.estado === "Seleccionado"));
  assert.strictEqual(r.sorteos, 0);
});

grupo("tramo guardado por Sheets como número", () => {
  assert.strictEqual(puntosRsh(0.4), puntosRsh("40%"));
  assert.strictEqual(puntosRsh("0,6"), puntosRsh("60%"));
  assert.strictEqual(puntosRsh(1), puntosRsh("100%"));
  assert.strictEqual(puntosRsh(0.45), null);
  assert.strictEqual(puntosRsh("45%"), null);
});

console.log(grupos + " grupos de pruebas correctos");
