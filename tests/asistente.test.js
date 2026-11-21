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
  ["habrá ceremonia de entrega", "ceremonia"],
  ["dónde descargo los formatos", "formatos"],
  ["necesito la plantilla para imprimir", "formatos"],
  ["¿por qué piden tantos papeles?", "por-que"],
  ["para qué solicitan todo esto", "por-que"],
  ["por qué piden el registro social de hogares", "rsh"],
  ["por qué me piden la cuenta bancaria", "cuenta"],
  ["todavía no tengo el certificado de alumno regular", "alumno-regular"],
  ["mi carnet está vencido", "cedula"],
  ["por qué piden los datos de mi familia", "grupo-familiar"],
  ["no tengo correo electrónico", "correo"],
  ["el archivo pesa mucho y no sube", "archivos"],
  ["puedo subir fotos del celular", "archivos"],
  ["¿me llega un correo de confirmación?", "comprobante"],
  ["cómo sé que recibieron mi postulación", "comprobante"],
  ["cómo va mi postulación", "estado"],
  ["me equivoqué en un dato, puedo corregir", "corregir"],
  ["quién ve mis datos personales", "privacidad"],
  ["cómo consigo la cartola", "rsh"],
  ["cómo consigo los documentos", "conseguir"],
  ["dónde saco la planilla de rendición", "rendicion"]
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
  assert.ok(/^(Artículo|Artículos|Sitio|Formulario)/.test(x.a), "falta la fuente en " + x.id);
  const enlaces = !x.e ? [] : Array.isArray(x.e[0]) ? x.e : [x.e];
  for (const par of enlaces) {
    assert.ok(par.length === 2 && par[0] && par[1], "enlace incompleto en " + x.id);
    // Los archivos enlazados deben existir en el repositorio.
    if (!par[1].startsWith("#")) assert.ok(fs.existsSync(path.join(__dirname, "..", par[1])), "no existe " + par[1]);
  }
}
assert.strictEqual(fallas, 0, fallas + " pregunta(s) no llevaron a la respuesta esperada");
console.log(casos.length + " preguntas llevan a la respuesta esperada, " + ctx.ORDENANZA_BASE.length + " respuestas en la base");
