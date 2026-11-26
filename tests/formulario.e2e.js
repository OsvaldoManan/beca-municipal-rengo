// Prueba de extremo a extremo del formulario de postulación, con Playwright y Chromium.
// Se ejecuta con   node tests/formulario.e2e.js
// No envía nada a servidores reales. El servicio de recepción se simula interceptando la red.
// Los elementos se buscan solo por id, de modo que la prueba no dependa del diseño de la página.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const RAIZ = path.join(__dirname, "..");
// El portal muestra una vista a la vez. Estas pruebas abren directamente la de postulación.
const PAGINA = "file://" + path.join(RAIZ, "index.html") + "#postular";
const FALSO = "https://recepcion-de-prueba.invalid/exec";   // dominio reservado, no existe
const FOLIO = "BMR-2027-0001";

// Datos evidentemente ficticios.
const DATOS = {
  nombres: "Postulante de Prueba", apellidos: "Ficticio Ejemplo", rut: "11111111-1", telefono: "+56 9 0000 0000",
  domicilio: "Calle Falsa 123, Rengo", correo: "prueba@example.com",
  banco: "Banco de Prueba", numCuenta: "000123456", institucion: "Universidad de Prueba", carrera: "Carrera Ficticia", promedio: "6,2"
};
const SELECTORES = { titular: "Postulante", tipoCuenta: "Cuenta vista", anio: "2", tramo: "40%" };
const OBLIGATORIOS = ["cedula", "alumno_regular", "notas", "rsh", "residencia", "declaracion"];
const PDF = Buffer.from("%PDF-1.4\n% archivo de prueba\n%%EOF\n");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

async function abrir(browser, { endpoint, respuesta, ancho } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho || 1280, height: 900 } });
  const page = await ctx.newPage();
  const errores = [], envios = [];
  page.on("pageerror", e => errores.push(String(e)));
  // El formulario se prueba siempre abierto, aunque hoy esté fuera del plazo del artículo 9.
  await page.route("**/js/complementos.js", route => route.fulfill({ contentType: "text/javascript",
    body: fs.readFileSync(path.join(RAIZ, "js", "complementos.js"), "utf8").replace(/var PLAZO_CERRAR_FORMULARIO = (true|false);/, "var PLAZO_CERRAR_FORMULARIO = false;") }));
  // ENDPOINT es una constante, por eso se reemplaza en el archivo mientras se carga.
  // Siempre se reemplaza, para que las pruebas nunca envíen datos al servicio real.
  await page.route("**/js/app.js", route => {
    const js = fs.readFileSync(path.join(RAIZ, "js", "app.js"), "utf8");
    assert.ok(/const ENDPOINT = "[^"]*";/.test(js), "app.js no contiene la constante ENDPOINT");
    route.fulfill({ contentType: "text/javascript", body: js.replace(/const ENDPOINT = "[^"]*";/, 'const ENDPOINT = "' + (endpoint || "") + '";') });
  });
  if (endpoint) {
    await page.route(endpoint, route => {
      envios.push(route.request());
      route.fulfill(Object.assign({ status: 200, headers: { "access-control-allow-origin": "*" } }, respuesta()));
    });
  }
  // Cualquier otra salida a internet (que no sean fuentes o archivos locales) queda registrada.
  // La consulta de cifras públicas (GET ?cifras=1, sin datos personales) se hace sola durante el período, por eso no cuenta como envío.
  page.on("request", r => { if (/^https?:/.test(r.url()) && r.url() !== endpoint && r.url() !== endpoint + "?cifras=1" && !/fonts\.(googleapis|gstatic)\.com/.test(r.url())) envios.push(r); });
  await page.goto(PAGINA);
  await page.waitForSelector("#doc_cedula", { state: "attached" });
  // El formulario abre paso a paso. Estas pruebas recorren todos los campos, por eso usan la vista completa
  // que el sitio ofrece al postulante. El recorrido por pasos tiene su propia prueba en tests/pasos.e2e.js.
  if (await page.$("#pasosModo")) await page.click("#pasosModo");
  return { ctx, page, errores, envios };
}

async function llenar(page) {
  for (const [id, valor] of Object.entries(DATOS)) await page.fill("#" + id, valor);
  for (const [id, valor] of Object.entries(SELECTORES)) await page.selectOption("#" + id, valor);
  await page.check("#gastos input >> nth=0");
  for (const [i, k] of OBLIGATORIOS.entries()) {
    await page.setInputFiles("#doc_" + k, i % 2
      ? { name: k + ".png", mimeType: "image/png", buffer: PNG }
      : { name: k + ".pdf", mimeType: "application/pdf", buffer: PDF });
  }
  for (const id of ["d1", "d2", "d3", "d4"]) await page.check("#" + id);
}
const texto = (page, sel) => page.locator(sel).innerText();

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba("a) envío vacío: aviso de error, campos marcados y foco en el primer problema", async b => {
  const { page, errores, envios } = await abrir(b);
  assert.strictEqual(await page.locator("#modo").isHidden(), false, "el aviso de modo de revisión debe verse");
  await page.click("#enviar");
  await page.waitForSelector("#salida .aviso.error");
  assert.match(await texto(page, "#salida"), /Todavía no se puede enviar/);
  assert.match(await texto(page, "#salida"), /6 documentos sin adjuntar/);
  assert.strictEqual(await page.getAttribute("#nombres", "aria-invalid"), "true");
  assert.strictEqual(await page.getAttribute("#nombres", "aria-describedby"), "msj_nombres");
  assert.strictEqual(await texto(page, "#msj_nombres"), "Falta este dato.");
  assert.strictEqual(await page.evaluate(() => document.activeElement.id), "nombres", "el foco debe ir al primer campo con error");
  assert.strictEqual(await page.locator("#gastosMsj").isHidden(), false);
  // Al corregir, el error del campo desaparece.
  await page.fill("#nombres", "Postulante de Prueba");
  assert.strictEqual(await page.getAttribute("#nombres", "aria-invalid"), null);
  assert.strictEqual(await page.locator("#msj_nombres").count(), 0);
  assert.deepStrictEqual(errores, []); assert.strictEqual(envios.length, 0);
});

prueba("b) modo de revisión: formulario completo no envía nada y muestra «Formulario completo»", async b => {
  const { page, errores, envios } = await abrir(b);
  await llenar(page);
  assert.strictEqual(await page.inputValue("#rut"), "11.111.111-1", "el RUT se formatea al salir del campo");
  assert.match(await texto(page, "#cuenta"), /6 de 6/);
  assert.strictEqual(await page.locator("#pasos li.ok").count(), await page.locator("#pasos li[data-p]").count(), "todos los pasos deben quedar completos");
  await page.click("#enviar");
  await page.waitForSelector("#salida .aviso.info");
  assert.match(await texto(page, "#salida"), /Formulario completo/);
  assert.strictEqual(await page.locator("#f [aria-invalid]").count(), 0);
  assert.deepStrictEqual(errores, []); assert.strictEqual(envios.length, 0, "en modo de revisión no debe salir ninguna solicitud");
});

prueba("validaciones: RUT, tutor, promedio mínimo, teléfono, correo y archivos", async b => {
  const { page, errores } = await abrir(b);
  await llenar(page);
  await page.fill("#rut", "11.111.111-2");
  await page.fill("#telefono", "123");
  await page.fill("#correo", "sin-arroba");
  await page.selectOption("#anio", "1");               // primer año exige 6,0
  await page.fill("#promedio", "5,9");
  await page.check("#menor");
  await page.fill("#tutorNombre", "Tutor de Prueba");
  await page.fill("#tutorRut", "22.222.222-2");
  await page.click("#enviar");
  await page.waitForSelector("#salida .aviso.error");
  assert.match(await texto(page, "#msj_rut"), /RUT no es válido/);
  assert.match(await texto(page, "#msj_telefono"), /teléfono válido/);
  assert.match(await texto(page, "#msj_correo"), /correo válido/);
  assert.match(await texto(page, "#msj_promedio"), /mínimo de 6,0/);
  assert.match(await texto(page, "#salida"), /3 documentos sin adjuntar/, "ser menor de edad agrega tres documentos");
  assert.strictEqual(await page.evaluate(() => document.activeElement.id), "rut");
  // RUT del tutor igual al del postulante.
  await page.fill("#rut", "22222222-2");
  await page.click("#enviar");
  assert.match(await texto(page, "#msj_tutorRut"), /no puede ser el mismo/);
  // Promedio con punto y con coma sobre el mínimo.
  await page.fill("#promedio", "6.0");
  await page.click("#enviar");
  assert.strictEqual(await page.locator("#msj_promedio").count(), 0);
  // Archivo de tipo no permitido y archivo de más de 5 MB.
  await page.setInputFiles("#doc_cedula", { name: "carta.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from("x") });
  assert.match(await texto(page, "#det_cedula"), /PDF, JPG o PNG/);
  await page.setInputFiles("#doc_cedula", { name: "grande.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1048576 + 1, 37) });
  assert.match(await texto(page, "#det_cedula"), /supera los 5 MB/);
  // Tipo vacío: se acepta por la extensión.
  await page.setInputFiles("#doc_cedula", { name: "cedula.PDF", mimeType: "", buffer: PDF });
  assert.match(await texto(page, "#det_cedula"), /Cargado: cedula\.PDF/);
  // Tope total de 25 MB: cinco archivos de 4,9 MB caben, el sexto no.
  const casi5 = Buffer.alloc(Math.floor(4.9 * 1048576), 37);
  for (const k of ["cedula", "alumno_regular", "notas", "rsh", "residencia"]) await page.setInputFiles("#doc_" + k, { name: k + ".pdf", mimeType: "application/pdf", buffer: casi5 });
  await page.setInputFiles("#doc_declaracion", { name: "declaracion.pdf", mimeType: "application/pdf", buffer: casi5 });
  assert.match(await texto(page, "#det_declaracion"), /supera los 25 MB/);
  assert.deepStrictEqual(errores, []);
});

prueba("teclado y lectores de pantalla: los campos de archivo reciben foco y tienen nombre", async b => {
  const { page } = await abrir(b);
  for (const k of OBLIGATORIOS) {
    const r = await page.evaluate(k => {
      const i = document.getElementById("doc_" + k), boton = i.parentNode.querySelector('[role=button][tabindex="0"]');
      const c = boton || i; c.focus();
      return { foco: document.activeElement === c, nombre: c.getAttribute("aria-label"), desc: !!document.getElementById(c.getAttribute("aria-describedby")) };
    }, k);
    assert.ok(r.foco, "el control de " + k + " debe poder recibir el foco");
    assert.match(r.nombre, /^Adjuntar .+PDF, JPG o PNG/);
    assert.ok(r.desc);
  }
});

prueba("borrador: se recupera al recargar, sin datos bancarios, y se puede borrar", async b => {
  const { page } = await abrir(b);
  await llenar(page);
  await page.waitForFunction(() => { const s = localStorage.getItem("becaRengo.borrador.v1"); return s && s.includes("Carrera Ficticia"); });
  const guardado = await page.evaluate(() => localStorage.getItem("becaRengo.borrador.v1"));
  assert.ok(!guardado.includes("000123456") && !guardado.includes("Banco de Prueba"), "el borrador no debe contener datos bancarios");
  await page.reload();
  await page.waitForSelector("#doc_cedula", { state: "attached" });
  assert.strictEqual(await page.inputValue("#nombres"), DATOS.nombres);
  assert.strictEqual(await page.inputValue("#anio"), "2");
  assert.strictEqual(await page.inputValue("#numCuenta"), "");
  assert.strictEqual(await page.inputValue("#banco"), "");
  assert.match(await texto(page, "#cuenta"), /0 de 6/, "los archivos no se guardan");
  await page.click("#borradorAviso button");
  assert.strictEqual(await page.inputValue("#nombres"), "");
  assert.strictEqual(await page.evaluate(() => localStorage.getItem("becaRengo.borrador.v1")), null);
});

prueba("c) envío con servicio simulado: muestra el folio y envía el JSON esperado", async b => {
  const { page, errores, envios } = await abrir(b, { endpoint: FALSO, respuesta: () => ({ contentType: "application/json", body: JSON.stringify({ ok: true, folio: FOLIO }) }) });
  assert.strictEqual(await page.locator("#modo").isHidden(), true, "con ENDPOINT definido no se muestra el modo de revisión");
  await llenar(page);
  await page.click("#enviar");
  await page.waitForSelector("#exito");
  assert.match(await texto(page, "#exito"), new RegExp("Postulación recibida\\. Folio " + FOLIO));
  assert.match(await texto(page, "#exito"), /prueba@example\.com/);
  assert.strictEqual(await page.locator("#f").isVisible(), false, "el formulario se oculta tras el envío");
  assert.strictEqual(envios.length, 1, "debe haber exactamente un envío");
  const req = envios[0];
  assert.strictEqual(req.method(), "POST");
  assert.match(req.headers()["content-type"] || "", /^text\/plain/, "cuerpo text/plain, sin consulta previa CORS");
  const j = JSON.parse(req.postData());
  assert.deepStrictEqual(Object.keys(j).sort(), ["archivos", "datos", "familia"]);
  assert.deepStrictEqual(Object.keys(j.datos).sort(), ["anio", "apellidos", "banco", "carrera", "correo", "credCuidador", "credDiscapacidad",
    "credDiscapacidadFamiliar", "domicilio", "gastos", "institucion", "menor", "nombres", "numCuenta", "programaFamilias", "promedio",
    "rut", "telefono", "tipoCuenta", "titular", "tramo", "tutorNombre", "tutorRut"]);
  assert.strictEqual(j.datos.rut, "11.111.111-1");
  assert.strictEqual(j.datos.promedio, "6.2", "la coma decimal se envía como punto");
  assert.strictEqual(j.datos.menor, false);
  assert.strictEqual(j.datos.gastos.length, 1);
  assert.ok(Array.isArray(j.familia));
  assert.deepStrictEqual(j.archivos.map(a => a.clave), OBLIGATORIOS);
  j.archivos.forEach(a => {
    assert.deepStrictEqual(Object.keys(a).sort(), ["clave", "contenido", "nombre", "tipo"]);
    assert.ok(["application/pdf", "image/png"].includes(a.tipo));
    assert.ok(Buffer.from(a.contenido, "base64").equals(a.tipo === "image/png" ? PNG : PDF), "el contenido debe llegar íntegro en base64");
  });
  assert.strictEqual(await page.evaluate(() => localStorage.getItem("becaRengo.borrador.v1")), null, "el borrador se borra tras un envío correcto");
  assert.deepStrictEqual(errores, []);
});

prueba("c) errores del servicio: nunca se informa éxito y el formulario queda disponible", async b => {
  let cuerpo;
  const { page, errores, envios } = await abrir(b, { endpoint: FALSO, respuesta: () => cuerpo });
  await llenar(page);
  const casos = [
    [{ contentType: "application/json", body: JSON.stringify({ ok: false, error: "Ya existe una postulación registrada con este RUT." }) }, /Ya existe una postulación registrada con este RUT/],
    [{ contentType: "text/html", body: "<html>Error</html>" }, /respondió de una forma inesperada/],
    [{ status: 500, contentType: "text/plain", body: "fallo" }, /respondió de una forma inesperada/],
    [{ contentType: "application/json", body: JSON.stringify({ ok: true }) }, /respondió de una forma inesperada/],       // sin folio
    [{ contentType: "application/json", body: JSON.stringify({ ok: "true", folio: FOLIO }) }, /respondió de una forma inesperada/]
  ];
  for (const [resp, esperado] of casos) {
    cuerpo = resp;
    await page.click("#enviar");
    await page.waitForFunction(() => { const e = document.getElementById("enviar"); return !e.disabled; });
    await page.waitForSelector("#salida .aviso.error");
    const t = await texto(page, "#salida");
    assert.match(t, /No pudimos recibir su postulación/); assert.match(t, esperado); assert.match(t, /becaestudiantil@munirengo\.cl/);
    assert.strictEqual(await page.locator("#exito").count(), 0);
    assert.strictEqual(await page.locator("#f").isVisible(), true);
    assert.strictEqual(await page.inputValue("#nombres"), DATOS.nombres);
  }
  assert.strictEqual(envios.length, casos.length);
  // Sin conexión.
  await page.unroute(FALSO);
  await page.route(FALSO, r => r.abort("internetdisconnected"));
  await page.click("#enviar");
  await page.waitForFunction(() => /No fue posible conectar/.test(document.getElementById("salida").textContent));
  assert.strictEqual(await page.locator("#exito").count(), 0);
  assert.deepStrictEqual(errores, []);
});

prueba("c) doble clic: se envía una sola vez", async b => {
  const { page, envios } = await abrir(b, { endpoint: FALSO, respuesta: () => ({ contentType: "application/json", body: JSON.stringify({ ok: true, folio: FOLIO }) }) });
  await llenar(page);
  await page.evaluate(() => { const f = document.getElementById("f"); f.requestSubmit(); f.requestSubmit(); f.requestSubmit(); });
  await page.waitForSelector("#exito");
  assert.strictEqual(envios.length, 1);
});

prueba("sin desborde horizontal a 400 px de ancho", async b => {
  const { page, errores } = await abrir(b, { ancho: 400 });
  const medir = () => page.evaluate(() => ({ contenido: document.documentElement.scrollWidth, ventana: document.documentElement.clientWidth }));
  let m = await medir();
  assert.ok(m.contenido <= m.ventana, "desborde al cargar: " + JSON.stringify(m));
  await page.check("#menor");
  await page.click("#enviar");                       // con todos los mensajes de error visibles
  await page.waitForSelector("#salida .aviso.error");
  m = await medir();
  assert.ok(m.contenido <= m.ventana, "desborde con errores visibles: " + JSON.stringify(m));
  assert.deepStrictEqual(errores, []);
});

(async () => {
  const browser = await chromium.launch();
  let fallas = 0;
  for (const [nombre, fn] of pruebas) {
    try { await fn(browser); console.log("ok    " + nombre); }
    catch (e) { fallas++; console.log("FALLA " + nombre + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); }
    for (const c of browser.contexts()) await c.close();
  }
  await browser.close();
  console.log("\n" + (pruebas.length - fallas) + " de " + pruebas.length + " pruebas correctas");
  process.exit(fallas ? 1 : 0);
})();
