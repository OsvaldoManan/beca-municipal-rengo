// Pruebas del asistente de consultas: cada pregunta debe llevar a la respuesta esperada de js/ordenanza.js.
// Se ejecuta con   node tests/asistente.test.js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "ordenanza.js"), "utf8") +
  "\nthis.asistenteBuscar = asistenteBuscar; this.ORDENANZA_BASE = ORDENANZA_BASE;", ctx);

const casos = [
  ["¿Cuánta plata entregan?", "monto"],
  ["cuanto es el monto de la beca", "monto"],
  ["¿Hasta cuándo puedo postular?", "fechas"],
  ["cuando abren las postulaciones", "fechas"],
  ["¿Qué documentos tengo que subir?", "documentos"],
  ["que papeles piden", "documentos"],
  ["¿Cuáles son los requisitos?", "requisitos"],
  ["qué promedio necesito", "notas"],
  ["tengo NEM 5,8 me alcanza?", "notas"],
  ["¿Puedo postular si tengo gratuidad?", "otras-becas"],
  ["tengo el CAE, puedo igual?", "otras-becas"],
  ["mi mamá trabaja en la municipalidad", "funcionarios"],
  ["soy funcionario a honorarios", "funcionarios"],
  ["ya tengo un título técnico", "titulo"],
  ["estoy haciendo un magíster", "titulo"],
  ["¿Cómo calculan el puntaje?", "puntaje"],
  ["qué pasa si hay empate", "empate"],
  ["¿Quién evalúa las postulaciones?", "comite"],
  ["¿Cuándo salen los resultados?", "resultados"],
  ["donde publican la lista de seleccionados", "resultados"],
  ["no quedé seleccionado, ¿por qué?", "no-seleccionado"],
  ["¿Cuándo depositan?", "pago"],
  ["¿En qué puedo gastar la beca?", "gastos"],
  ["puedo comprar un notebook", "gastos"],
  ["sirve para pagar la bencina del auto", "traslados"],
  ["puedo pagar el arriendo de mi pieza", "arriendo"],
  ["¿Dónde entrego la rendición?", "rendicion"],
  ["hasta cuando tengo plazo para rendir", "rendicion"],
  ["qué boletas sirven", "respaldos"],
  ["pagué con tarjeta de crédito", "tarjeta"],
  ["me sobró dinero, qué hago", "reintegro"],
  ["¿Qué pasa si no rindo?", "no-rendir"],
  ["tengo 17 años", "menores"],
  ["sirve la cuenta rut", "cuenta"],
  ["no tengo el registro social de hogares en Rengo", "rsh"],
  ["estudio en Santiago pero vivo en Rengo", "residencia"],
  ["tengo credencial de discapacidad", "vulnerabilidad"],
  ["soy cuidadora de mi abuela", "vulnerabilidad"],
  ["la declaración jurada es ante notario?", "declaracion"],
  ["¿Cuántos cupos hay?", "cupos"],
  ["se renueva automáticamente el próximo año", "renovacion"],
  ["no tengo internet para postular", "apoyo"],
  ["a qué correo escribo mis dudas", "contacto"],
  ["dónde descargo la ordenanza", "texto"],
  ["¿Puedo postular en papel?", "como-postular"],
  ["estudio en un CFT", "quienes"],
  ["¿Qué es la beca?", "que-es"],
  ["habrá ceremonia de entrega", "ceremonia"]
];
let fallas = 0;
for (const [pregunta, esperado] of casos) {
  const r = ctx.asistenteBuscar(pregunta);
  const obtenido = r.entrada ? r.entrada.id : null;
  if (obtenido !== esperado) { fallas++; console.log("FALLA  «" + pregunta + "» → " + obtenido + " (se esperaba " + esperado + ")"); }
}
// Preguntas ajenas a la ordenanza: el asistente debe reconocer que no tiene respuesta.
for (const pregunta of ["¿Cómo está el clima hoy?", "quién ganó el partido", "", "hola", "asdf qwerty", "recomiéndame una película"]) {
  const r = ctx.asistenteBuscar(pregunta);
  if (r.entrada) { fallas++; console.log("FALLA  «" + pregunta + "» no debía responder y dio " + r.entrada.id); }
}
// Integridad de la base: ids únicos, respuesta, artículo y enlaces con destino.
const ids = new Set();
for (const x of ctx.ORDENANZA_BASE) {
  assert.ok(x.id && !ids.has(x.id), "id repetido o vacío: " + x.id); ids.add(x.id);
  assert.ok(x.t && x.a && x.k && x.r, "entrada incompleta: " + x.id);
  assert.ok(/^(Artículo|Artículos)/.test(x.a), "falta el artículo en " + x.id);
  if (x.e) assert.ok(x.e.length === 2 && x.e[0] && x.e[1], "enlace incompleto en " + x.id);
}
assert.strictEqual(fallas, 0, fallas + " pregunta(s) no llevaron a la respuesta esperada");
console.log(casos.length + " preguntas llevan a la respuesta esperada, " + ctx.ORDENANZA_BASE.length + " respuestas en la base");
