// Prueba del portal: menú, accesos rápidos y formulario paso a paso.
// Se ejecuta con   node tests/pasos.e2e.js   (requiere Playwright con Chromium)
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const BASE = "file://" + path.join(__dirname, "..", "index.html");
(async () => {
  const b = await chromium.launch();
  let hechas = 0;
  const caso = async (nombre, ancho, fn, vista = "#postular") => {
    const page = await b.newPage({ viewport: { width: ancho, height: 900 } });
    const errores = []; page.on("pageerror", e => errores.push(String(e)));
    // Las pruebas corren en modo de revisión: se vacía ENDPOINT para no enviar nada al servicio real.
    await page.route("**/js/app.js", route => route.fulfill({ contentType: "text/javascript",
      body: fs.readFileSync(path.join(__dirname, "..", "js", "app.js"), "utf8").replace(/const ENDPOINT = "[^"]*";/, 'const ENDPOINT = "";') }));
    await page.goto(BASE + vista); await page.waitForSelector("#pasosModo", { state: "attached" });
    await fn(page);
    assert.deepStrictEqual(errores, []);
    assert.strictEqual(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, "desborde horizontal");
    await page.close(); hechas++; console.log("ok    " + nombre);
  };
  const visibles = page => page.$$eval("#f fieldset", fs => fs.filter(f => f.offsetParent !== null).map(f => f.id));

  await caso("formulario paso a paso: un paso visible, avance y retroceso", 1280, async page => {
    assert.deepStrictEqual(await visibles(page), ["p1"]);
    assert.strictEqual(await page.isVisible("#enviar"), false, "el envío solo aparece en el último paso");
    await page.click("#pasoSiguiente"); assert.deepStrictEqual(await visibles(page), ["p2"]);
    await page.click("#pasoAnterior"); assert.deepStrictEqual(await visibles(page), ["p1"]);
    await page.click(".pasos-lista li:nth-child(6) button"); assert.deepStrictEqual(await visibles(page), ["p6"]);
    assert.strictEqual(await page.isVisible("#enviar"), true);
    assert.strictEqual(await page.isVisible("#pasoSiguiente"), false);
  });
  await caso("envío con faltas desde el último paso: vuelve al primer paso con problemas", 1280, async page => {
    await page.click(".pasos-lista li:nth-child(6) button");
    await page.click("#enviar");
    await page.waitForTimeout(100);
    assert.deepStrictEqual(await visibles(page), ["p1"]);
    assert.strictEqual(await page.evaluate(() => document.activeElement.id), "nombres");
    assert.ok(await page.isVisible("#salida .aviso.error"));
  });
  await caso("un paso completo queda marcado como hecho", 1280, async page => {
    await page.click(".pasos-lista li:nth-child(2) button");
    await page.selectOption("#titular", "Postulante"); await page.fill("#banco", "Banco de prueba");
    await page.selectOption("#tipoCuenta", "Cuenta vista"); await page.fill("#numCuenta", "123456");
    assert.ok(await page.$eval(".pasos-lista li:nth-child(2)", li => li.classList.contains("hecho")));
    assert.ok(!(await page.$eval(".pasos-lista li:nth-child(1)", li => li.classList.contains("hecho"))));
  });
  await caso("vista completa: muestra los seis pasos y permite volver", 1280, async page => {
    await page.click("#pasosModo"); assert.strictEqual((await visibles(page)).length, 6);
    await page.click("#pasosModo"); assert.strictEqual((await visibles(page)).length, 1);
  });
  await caso("menú en teléfono: se abre, navega y se cierra", 400, async page => {
    assert.strictEqual(await page.isVisible("#menuLista"), false);
    await page.click("#menuBoton"); assert.strictEqual(await page.isVisible("#menuLista"), true);
    await page.click('#menuLista a[href="#puntaje"]');
    await page.waitForSelector("#simulador", { state: "visible" });
    assert.strictEqual(await page.isVisible("#menuLista"), false);
    assert.strictEqual(await page.isVisible("#f"), false);
  });
  await caso("accesos rápidos: seis entradas y la consulta abre el asistente", 1280, async page => {
    assert.strictEqual((await page.$$(".acceso")).length, 6);
    await page.click(".acceso[data-asistente]");
    assert.strictEqual(await page.isVisible("#asistente"), true);
  }, "");
  const visiblesSec = page => page.$$eval("main > section", ss => ss.filter(s => !s.hidden).map(s => s.id));
  await caso("vistas: cada dirección muestra solo sus secciones y marca el menú", 1280, async page => {
    assert.deepStrictEqual(await visiblesSec(page), ["fundamento", "fechas"]);
    assert.strictEqual(await page.isVisible("#inicio"), true);
    await page.click('#menuLista a[href="#requisitos"]');
    await page.waitForSelector("#requisitos", { state: "visible" });
    assert.deepStrictEqual(await visiblesSec(page), ["requisitos", "documentos", "guia"]);
    assert.strictEqual(await page.isVisible("#inicio"), false);
    assert.strictEqual(await page.getAttribute('#menuLista a[href="#requisitos"]', "aria-current"), "page");
    assert.match(await page.title(), /^Requisitos y documentos/);
    await page.click(".vista-nav a:last-child");                       // Siguiente
    await page.waitForSelector("#puntaje", { state: "visible" });
    assert.deepStrictEqual(await visiblesSec(page), ["puntaje"]);
    await page.goBack();
    await page.waitForSelector("#requisitos", { state: "visible" });
    assert.deepStrictEqual(await visiblesSec(page), ["requisitos", "documentos", "guia"]);
  }, "");
  await caso("vistas: un enlace a un elemento interno abre su vista y lo deja a la vista", 1280, async page => {
    assert.deepStrictEqual(await visiblesSec(page), ["puntaje"]);
    assert.strictEqual(await page.isVisible("#simulador"), true);
    await page.evaluate(() => { location.hash = "#reemplazo"; });
    await page.waitForTimeout(100);
    assert.deepStrictEqual(await visiblesSec(page), ["estado"]);
    assert.strictEqual(await page.isVisible("#reemplazoForm"), true, "el bloque plegable se abre al llegar por enlace");
  }, "#simulador");
  await caso("buscador: encuentra contenido del portal y la respuesta de la ordenanza", 1280, async page => {
    await page.fill("#buscarTexto", "certificado de residencia"); await page.click("#buscador button");
    assert.ok((await page.$$(".buscar-res")).length >= 3);
    assert.match(await page.textContent(".buscar-res.directa b"), /residencia/i);
    await page.click(".buscar-res:not(.directa)");
    await page.waitForTimeout(100);
    assert.ok((await visiblesSec(page)).length > 0 && !(await visiblesSec(page)).includes("ayuda"), "el resultado lleva a otra vista");
    await page.goBack();
    await page.fill("#buscarTexto", "xyzzy qwerty"); await page.click("#buscador button");
    assert.match(await page.textContent("#buscarResultados"), /No encontramos resultados/);
  }, "#ayuda");
  await caso("reemplazo de documento: valida antes de enviar y no envía en modo de revisión", 1280, async page => {
    await page.click("#reemplazo summary");
    await page.click("#reemplazoForm button");
    assert.match(await page.textContent("#reemplazoResultado"), /Revise el folio/);
    await page.fill("#reFolio", "BMR-2027-0001"); await page.fill("#reRut", "11.111.111-1"); await page.selectOption("#reClave", "rsh");
    await page.setInputFiles("#reArchivo", { name: "cartola.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 prueba") });
    await page.click("#reemplazoForm button");
    assert.match(await page.textContent("#reemplazoResultado"), /aún no disponible/);
  }, "#estado");
  await b.close();
  console.log(hechas + " de 10 pruebas correctas");
})().catch(e => { console.error(e); process.exit(1); });
