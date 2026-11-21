// Complementos del sitio: aviso de plazo, lista de verificación, accesibilidad, estado por folio y resultados.
// Cada bloque funciona solo si su marcado existe en la página, de modo que quitar una sección no rompe el resto.

// Año del proceso que se muestra en los avisos. Debe coincidir con ANIO_PROCESO de backend/Code.gs.
var PLAZO_ANIO = 2027;
// Con true, el formulario se oculta fuera del 1 al 30 de marzo. Déjelo en false mientras el sitio esté en revisión.
var PLAZO_CERRAR_FORMULARIO = false;

// Con true se muestra el banner «Sitio en construcción» con la cuenta regresiva, hasta la apertura del 1 de marzo.
// Cámbielo a false para retirarlo antes.
var SITIO_EN_CONSTRUCCION = true;

/** Tiempo que falta entre dos instantes (milisegundos), separado en días, horas, minutos y segundos. */
function tiempoRestante(ahora, meta) {
  var s = Math.max(0, Math.floor((meta - ahora) / 1000));
  return { dias: Math.floor(s / 86400), horas: Math.floor(s % 86400 / 3600), minutos: Math.floor(s % 3600 / 60), segundos: s % 60, total: s };
}
/** Instante de apertura: 1 de marzo a las 00:00 en Chile continental, que en esa fecha corresponde a UTC-3. */
function aperturaPostulacion(anio) { return Date.UTC(anio, 2, 1, 3, 0, 0); }

/**
 * Estado del período de postulación (artículo 9) para una fecha dada en hora de Chile.
 * hoy = {anio, mes, dia}. Devuelve {fase: "antes" | "abierto" | "cerrado", dias}.
 */
function estadoPlazo(hoy, anio) {
  var dia = function (a, m, d) { return Math.round(Date.UTC(a, m - 1, d) / 86400000); };
  var h = dia(hoy.anio, hoy.mes, hoy.dia), abre = dia(anio, 3, 1), cierra = dia(anio, 3, 30);
  if (h < abre) return { fase: "antes", dias: abre - h };
  if (h <= cierra) return { fase: "abierto", dias: cierra - h };
  return { fase: "cerrado", dias: h - cierra };
}
function hoyEnChile() {
  try {
    var p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).split("-");
    return { anio: +p[0], mes: +p[1], dia: +p[2] };
  } catch (x) { var d = new Date(); return { anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() }; }
}

(function () {
  if (typeof document === "undefined") return;
  var $ = function (id) { return document.getElementById(id); };
  var dias = function (n) { return n === 1 ? "1 día" : n + " días"; };

  /* ── Sitio en construcción y cuenta regresiva ── */
  var obra = $("obra");
  if (obra) {
    var meta = aperturaPostulacion(PLAZO_ANIO), reloj = null;
    var dos = function (n) { return n < 10 ? "0" + n : String(n); };
    var tic = function () {
      var t = tiempoRestante(Date.now(), meta);
      if (!SITIO_EN_CONSTRUCCION || t.total === 0) { obra.hidden = true; if (reloj) clearInterval(reloj); return; }
      $("crDias").textContent = t.dias; $("crHoras").textContent = dos(t.horas); $("crMin").textContent = dos(t.minutos); $("crSeg").textContent = dos(t.segundos);
    };
    tic();
    if (!obra.hidden) reloj = setInterval(tic, 1000);
  }

  /* ── Aviso de plazo ── */
  var avisos = document.querySelectorAll("[data-plazo]");
  if (avisos.length) {
    var e = estadoPlazo(hoyEnChile(), PLAZO_ANIO), texto;
    if (e.fase === "antes") texto = "La postulación " + PLAZO_ANIO + " abre el 1 de marzo. Faltan " + dias(e.dias) + ".";
    else if (e.fase === "abierto") texto = e.dias === 0 ? "Hoy es el último día para postular." : "Postulación abierta. Quedan " + dias(e.dias) + " para el cierre del 30 de marzo.";
    else texto = "La postulación " + PLAZO_ANIO + " cerró el 30 de marzo.";
    avisos.forEach(function (a) { a.textContent = texto; a.hidden = false; a.dataset.fase = e.fase; });
    var zona = document.querySelector(".zona");
    if (PLAZO_CERRAR_FORMULARIO && e.fase !== "abierto" && zona) zona.hidden = true;
  }

  /* ── Lista de verificación previa ── */
  var lista = $("verifica");
  if (lista) {
    var casillas = lista.querySelectorAll("input[type=checkbox]"), salida = $("verificaResultado");
    var revisar = function () {
      var faltan = [].filter.call(casillas, function (c) { return !c.checked; }).length;
      salida.className = "aviso " + (faltan ? "info" : "exito");
      salida.textContent = faltan === casillas.length ? "Marque lo que ya tiene para saber si está en condiciones de postular."
        : faltan ? "Le " + (faltan === 1 ? "falta 1 punto" : "faltan " + faltan + " puntos") + " por reunir antes de comenzar el formulario."
        : "Tiene todo lo necesario. Puede completar el formulario.";
    };
    [].forEach.call(casillas, function (c) { c.addEventListener("change", revisar); });
    revisar();
  }

  /* ── Accesibilidad: tamaño de letra y alto contraste ── */
  var raiz = document.documentElement, ESCALAS = [100, 112.5, 125, 140];
  var pref = { letra: 0, contraste: false };
  try { pref = Object.assign(pref, JSON.parse(localStorage.getItem("becaRengo.accesibilidad") || "{}")); } catch (x) {}
  var aplicar = function () {
    pref.letra = Math.max(0, Math.min(ESCALAS.length - 1, pref.letra | 0));
    raiz.style.fontSize = pref.letra ? ESCALAS[pref.letra] + "%" : "";
    raiz.classList.toggle("contraste", !!pref.contraste);
    var c = $("accContraste"); if (c) c.setAttribute("aria-pressed", pref.contraste ? "true" : "false");
    try { localStorage.setItem("becaRengo.accesibilidad", JSON.stringify(pref)); } catch (x) {}
  };
  var enlazar = function (id, fn) { var b = $(id); if (b) b.addEventListener("click", function () { fn(); aplicar(); }); };
  enlazar("accMenos", function () { pref.letra--; });
  enlazar("accMas", function () { pref.letra++; });
  enlazar("accContraste", function () { pref.contraste = !pref.contraste; });
  aplicar();

  /* ── Estado de la postulación por folio y RUT ── */
  var fe = $("estadoForm");
  if (fe) {
    var res = $("estadoResultado");
    var mostrar = function (clase, titulo, detalle) {
      res.className = "aviso " + clase; res.textContent = "";
      var b = document.createElement("b"); b.textContent = titulo;
      var s = document.createElement("span"); s.textContent = detalle;
      res.append(b, s); res.hidden = false;
    };
    fe.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var folio = $("estadoFolio").value.trim().toUpperCase(), rut = $("estadoRut").value.trim();
      if (!/^BMR-\d{4}-\d{4}$/.test(folio)) return mostrar("error", "Revise el folio", "Tiene la forma BMR-" + PLAZO_ANIO + "-0001 y viene en el comprobante que recibió por correo.");
      if (typeof rutValido === "function" && !rutValido(rut)) return mostrar("error", "Revise el RUT", "Escriba el RUT del postulante con su dígito verificador.");
      if (typeof ENDPOINT === "undefined" || !ENDPOINT) return mostrar("info", "Consulta aún no disponible", "Se activará cuando el municipio conecte la recepción de postulaciones.");
      var boton = fe.querySelector("button"); boton.disabled = true;
      fetch(ENDPOINT, { method: "POST", body: JSON.stringify({ tipo: "estado", folio: folio, rut: rut }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.ok && j.estado) mostrar("exito", j.folio + ". " + j.estado, j.detalle || "");
          else mostrar("error", "No fue posible mostrar el estado", (j && j.error) || "Intente nuevamente en unos minutos.");
        })
        .catch(function () { mostrar("error", "No fue posible consultar", "Revise su conexión e intente nuevamente. Si el problema continúa, escriba a becaestudiantil@munirengo.cl."); })
        .then(function () { boton.disabled = false; });
    });
  }

  /* ── Resultados publicados (datos/resultados.json) ── */
  var caja = $("resultadosCaja");
  if (caja && typeof fetch === "function") {
    fetch("datos/resultados.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.publicado || !d.cifras) return;
      var pesos = function (n) { return "$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
      var crear = function (t, txt, cl) { var e = document.createElement(t); if (txt !== undefined) e.textContent = txt; if (cl) e.className = cl; return e; };
      caja.textContent = "";
      caja.append(crear("p", "Resultados del proceso " + d.anio + (d.fecha ? ", publicados el " + d.fecha.split("-").reverse().join("-") : "") + ".", "nota"));
      var dl = crear("dl", undefined, "cifras");
      [["Postulaciones recibidas", d.cifras.postulaciones], ["Postulaciones admisibles", d.cifras.admisibles],
        ["Becas asignadas", d.cifras.seleccionados], ["Monto total", pesos(d.cifras.montoTotal)]].forEach(function (c) {
        var div = crear("div"); div.append(crear("dt", c[0]), crear("dd", String(c[1]))); dl.append(div);
      });
      caja.append(dl);
      if (d.nomina && d.nomina.length) {
        var conNombre = d.nomina.some(function (n) { return n.nombre; });
        var env = crear("div", undefined, "tabla"), t = crear("table"), th = crear("thead"), tr = crear("tr"), tb = crear("tbody");
        ["Folio"].concat(conNombre ? ["Nombre"] : [], ["Puntaje"]).forEach(function (h, i, a) { tr.append(crear("th", h, i === a.length - 1 ? "n" : "")); });
        th.append(tr);
        d.nomina.forEach(function (n) {
          var f = crear("tr"); f.append(crear("td", n.folio));
          if (conNombre) f.append(crear("td", n.nombre || ""));
          f.append(crear("td", String(n.puntaje).replace(".", ","), "n")); tb.append(f);
        });
        t.append(th, tb); env.append(t); caja.append(env);
      }
    }).catch(function () { /* sin archivo de resultados: queda el texto inicial */ });
  }
})();
