// Prueba del portal: menú, accesos rápidos y formulario paso a paso.
// Se ejecuta con   node tests/pasos.e2e.js   (requiere Playwright con Chromium)
const assert = require("assert");
const path = require("path");
const { chromium } = require("playwright");
const PAGINA = "file://" + path.join(__dirname, "..", "index.html");
(async () => {
  const b = await chromium.launch();
  let hechas = 0;
  const caso = async (nombre, ancho, fn) => {
    const page = await b.newPage({ viewport: { width: ancho, height: 900 } });
    const errores = []; page.on("pageerror", e => errores.push(String(e)));
    await page.goto(PAGINA); await page.waitForSelector("#pasosModo");
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
    assert.strictEqual(await page.isVisible("#menuLista"), false);
  });
  await caso("accesos rápidos: seis entradas y la consulta abre el asistente", 1280, async page => {
    assert.strictEqual((await page.$$(".acceso")).length, 6);
    await page.click(".acceso[data-asistente]");
    assert.strictEqual(await page.isVisible("#asistente"), true);
  });
  await b.close();
  console.log(hechas + " de 6 pruebas correctas");
})().catch(e => { console.error(e); process.exit(1); });
