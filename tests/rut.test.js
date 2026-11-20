// Pruebas de las funciones puras de js/app.js (RUT, correo, teléfono, notas y tipo de archivo).
// Se ejecuta con   node tests/rut.test.js
// app.js es un archivo de navegador. Aquí se evalúa en un contexto aislado sin "document",
// por lo que solo quedan definidas sus funciones y no se ejecuta nada de la página.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const codigo = fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8");
const app = vm.createContext({});
vm.runInContext(codigo, app, { filename: "app.js" });

let n = 0;
const caso = (nombre, fn) => { fn(); n++; console.log("ok   " + nombre); };

caso("rutValido acepta RUT correctos en distintos formatos", () => {
  ["12.345.678-5", "12345678-5", "123456785", " 12.345.678-5 ", "11.111.111-1", "22.222.222-2",
   "5.126.663-3", "9.999.999-3", "15.000.000-9", "24.965.885-5"].forEach(r => assert.strictEqual(app.rutValido(r), true, r));
});
caso("rutValido acepta dígito verificador K (mayúscula o minúscula) y 0", () => {
  ["10.000.013-K", "10000013-k", "1.000.005-K", "6.000.000-k", "20.347.878-K", "10.000.004-0"]
    .forEach(r => assert.strictEqual(app.rutValido(r), true, r));
});
caso("rutValido rechaza dígito verificador incorrecto", () => {
  ["12.345.678-9", "12.345.678-K", "11.111.111-2", "10.000.013-0", "10.000.004-K", "5.126.663-4"]
    .forEach(r => assert.strictEqual(app.rutValido(r), false, r));
});
caso("rutValido rechaza textos que no son un RUT", () => {
  ["", " ", "abc", "12.345.678", "123", "123456-7", "1234567890-1", "12.345.678-55", "K2.345.678-5",
   "12,345,678-5", "12.345.678_5", "=12345678-5"].forEach(r => assert.strictEqual(app.rutValido(r), false, JSON.stringify(r)));
});
caso("rutFormato entrega 12.345.678-9 y no altera lo que no es RUT", () => {
  assert.strictEqual(app.rutFormato("123456785"), "12.345.678-5");
  assert.strictEqual(app.rutFormato("12345678-5"), "12.345.678-5");
  assert.strictEqual(app.rutFormato(" 12.345.678-5 "), "12.345.678-5");
  assert.strictEqual(app.rutFormato("10000013k"), "10.000.013-K");
  assert.strictEqual(app.rutFormato("51266633"), "5.126.663-3");
  assert.strictEqual(app.rutFormato("hola "), "hola");
  assert.strictEqual(app.rutFormato(""), "");
});
caso("rutLimpio permite comparar dos RUT escritos de forma distinta", () => {
  assert.strictEqual(app.rutLimpio("12.345.678-5"), app.rutLimpio("12345678 5"));
  assert.strictEqual(app.rutLimpio("10.000.013-k"), "10000013K");
});
caso("correoValido", () => {
  ["nombre@correo.cl", "a.b+c@sub.dominio.com"].forEach(c => assert.strictEqual(app.correoValido(c), true, c));
  ["", "nombre", "nombre@", "nombre@correo", "nombre@correo.", "nombre@.cl", "a b@correo.cl", "a@b@c.cl", "nombre@correo..cl"]
    .forEach(c => assert.strictEqual(app.correoValido(c), false, c));
});
caso("telefonoValido", () => {
  ["+56 9 1234 5678", "912345678", "(72) 235 8000", "72-2358000", "+56912345678"].forEach(t => assert.strictEqual(app.telefonoValido(t), true, t));
  ["", "12345", "nueve", "9 1234 5678 ext 2", "1234567890123", "56+912345678"].forEach(t => assert.strictEqual(app.telefonoValido(t), false, t));
});
caso("aNota acepta coma o punto decimal", () => {
  assert.strictEqual(app.aNota("5,5"), 5.5);
  assert.strictEqual(app.aNota("5.5"), 5.5);
  assert.strictEqual(app.aNota(" 6 "), 6);
  assert.strictEqual(app.aNota("6,25"), 6.25);
  ["", "seis", "5,5,5", "55", "-5", "5,", "1e1"].forEach(t => assert.ok(Number.isNaN(app.aNota(t)), t));
});
caso("notaMinima sigue el artículo 7 d de la ordenanza", () => {
  assert.strictEqual(app.notaMinima("1"), 6.0);
  ["2", "3", "4", "5"].forEach(a => assert.strictEqual(app.notaMinima(a), 5.0));
});
caso("tipoArchivo usa el tipo informado y, si viene vacío, la extensión", () => {
  assert.strictEqual(app.tipoArchivo({ type: "application/pdf", name: "x.pdf" }), "application/pdf");
  assert.strictEqual(app.tipoArchivo({ type: "image/jpg", name: "x.jpg" }), "image/jpeg");
  assert.strictEqual(app.tipoArchivo({ type: "", name: "Cedula.PDF" }), "application/pdf");
  assert.strictEqual(app.tipoArchivo({ type: "", name: "foto.JPEG" }), "image/jpeg");
  assert.strictEqual(app.tipoArchivo({ type: "", name: "foto.png" }), "image/png");
  assert.strictEqual(app.tipoArchivo({ type: "", name: "carta.docx" }), "");
  assert.strictEqual(app.tipoArchivo({ type: "", name: "sinextension" }), "");
  assert.strictEqual(app.tipoArchivo({ type: "application/msword", name: "truco.pdf" }), "");
});

console.log("\n" + n + " grupos de pruebas correctos");
