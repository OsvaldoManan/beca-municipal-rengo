// Complementos del sitio: aviso de plazo, lista de verificación, accesibilidad, estado por folio y resultados.
// Cada bloque funciona solo si su marcado existe en la página, de modo que quitar una sección no rompe el resto.

// Año del proceso que se muestra en los avisos. Debe coincidir con ANIO_PROCESO de backend/Code.gs.
var PLAZO_ANIO = 2027;
// Con true, el formulario se oculta fuera del 1 al 30 de marzo (artículo 9). Debe ir junto con CONTROLAR_PLAZO en backend/Code.gs.
var PLAZO_CERRAR_FORMULARIO = true;

// Con true se muestra el aviso «Próxima apertura» con la cuenta regresiva, hasta la apertura del 1 de marzo.
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
/** Días del 1 al 30 de marzo con su cantidad de postulaciones. porDia = {"2027-03-05": 4, ...}. */
function serieMarzo(porDia, anio) {
  var dias = [];
  for (var d = 1; d <= 30; d++) {
    var k = anio + "-03-" + (d < 10 ? "0" + d : d);
    dias.push({ dia: d, n: (porDia && porDia[k]) || 0 });
  }
  return dias;
}

/** Dibuja las cifras públicas: total, barras por tramo, columnas por día y la tabla equivalente. */
function pintarCifras(j) {
  var $ = function (id) { return document.getElementById(id); };
  var mil = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  $("cifCuerpo").hidden = false;
  $("cifTotal").textContent = mil(j.total);
  // Barras por tramo: una sola serie, un solo color, con el valor escrito junto a cada barra.
  var tramos = $("cifTramos"); tramos.textContent = "";
  var claves = Object.keys(j.porTramo || {});
  var maxT = Math.max.apply(null, claves.map(function (k) { return j.porTramo[k]; }).concat([1]));
  claves.forEach(function (k) {
    var n = j.porTramo[k], li = document.createElement("li");
    var rot = document.createElement("span"); rot.className = "cif-rot"; rot.textContent = "Tramo " + k;
    var pista = document.createElement("span"); pista.className = "cif-pista";
    var barra = document.createElement("span"); barra.className = "cif-barra"; barra.style.width = (n / maxT * 100) + "%";
    pista.append(barra);
    var val = document.createElement("span"); val.className = "cif-val"; val.textContent = mil(n);
    li.append(rot, pista, val); tramos.append(li);
  });
  // Columnas por día de marzo y su tabla equivalente.
  var serie = serieMarzo(j.porDia, j.proceso), maxD = Math.max.apply(null, serie.map(function (x) { return x.n; }).concat([1]));
  var cols = $("cifDias"), tabla = $("cifTabla"); cols.textContent = ""; tabla.textContent = "";
  serie.forEach(function (x) {
    var c = document.createElement("span"); c.className = "cif-col" + (x.n ? "" : " vacia");
    c.style.height = (x.n ? Math.max(4, x.n / maxD * 100) : 0) + "%";
    c.dataset.tip = x.dia + " de marzo: " + x.n; cols.append(c);
    var tr = document.createElement("tr"), a = document.createElement("td"), b = document.createElement("td");
    a.textContent = x.dia + " de marzo"; b.textContent = mil(x.n); tr.append(a, b); tabla.append(tr);
  });
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

  /* ── Menú principal en pantallas angostas ── */
  var menuBoton = $("menuBoton"), menuLista = $("menuLista");
  if (menuBoton && menuLista) {
    var angosto = window.matchMedia("(max-width:1080px)");
    var cerrarMenu = function () { menuLista.hidden = angosto.matches; menuBoton.setAttribute("aria-expanded", "false"); };
    menuBoton.addEventListener("click", function () {
      menuLista.hidden = !menuLista.hidden;
      menuBoton.setAttribute("aria-expanded", menuLista.hidden ? "false" : "true");
    });
    menuLista.addEventListener("click", function (ev) { if (ev.target.closest("a")) cerrarMenu(); });
    if (angosto.addEventListener) angosto.addEventListener("change", cerrarMenu);
    cerrarMenu();
  }

  /* ── Aviso de plazo ── */
  var avisos = document.querySelectorAll("[data-plazo]");
  if (avisos.length) {
    var e = estadoPlazo(hoyEnChile(), PLAZO_ANIO), texto;
    if (e.fase === "antes") texto = "La postulación " + PLAZO_ANIO + " abre el 1 de marzo. Faltan " + dias(e.dias) + ".";
    else if (e.fase === "abierto") texto = e.dias === 0 ? "Hoy es el último día para postular." : "Postulación abierta. Quedan " + dias(e.dias) + " para el cierre del 30 de marzo.";
    else texto = "La postulación " + PLAZO_ANIO + " cerró el 30 de marzo.";
    var cerrado = PLAZO_CERRAR_FORMULARIO && e.fase !== "abierto";
    if (cerrado) texto += e.fase === "antes" ? " El formulario estará disponible desde ese día." : " El formulario ya no recibe postulaciones.";
    avisos.forEach(function (a) { a.textContent = texto; a.hidden = false; a.dataset.fase = e.fase; });
    var zona = document.querySelector(".zona");
    if (cerrado && zona) zona.hidden = true;

    /* Aviso por correo para la apertura: solo antes del 1 de marzo y con la recepción conectada */
    var avisoForm = $("avisoForm");
    var conServicio = typeof ENDPOINT !== "undefined" && !!ENDPOINT;
    if (avisoForm && e.fase === "antes" && conServicio) {
      avisoForm.hidden = false;
      var avisoSalida = $("avisoResultado"), avisoBoton = avisoForm.querySelector("button");
      var decirAviso = function (tipo, msj) { avisoSalida.className = "aviso " + tipo; avisoSalida.textContent = msj; avisoSalida.hidden = false; };
      avisoForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var correo = $("avisoCorreo").value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) { decirAviso("error", "Revise el correo electrónico. Debe tener la forma nombre@correo.cl."); $("avisoCorreo").focus(); return; }
        avisoBoton.disabled = true; decirAviso("info", "Registrando su correo…");
        fetch(ENDPOINT, { method: "POST", body: JSON.stringify({ tipo: "recordatorio", correo: correo }) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && j.ok) { decirAviso("exito", j.repetido ? "Ese correo ya estaba registrado. Le escribiremos el 1 de marzo." : "Listo. Le escribiremos a " + correo + " el 1 de marzo."); avisoForm.reset(); }
            else decirAviso("error", (j && j.error) || "No fue posible registrar su correo. Intente nuevamente.");
          })
          .catch(function () { decirAviso("error", "No fue posible conectarse. Revise su conexión e intente nuevamente."); })
          .then(function () { avisoBoton.disabled = false; });
      });
    }
    document.querySelectorAll(".obra-enlace").forEach(function (a) { a.hidden = !(e.fase === "antes" && conServicio); });

    /* Cifras públicas del proceso: totales sin datos personales, leídos del servicio */
    var cifras = $("cifras");
    if (cifras && conServicio) {
      cifras.hidden = false;
      var nota = $("cifNota");
      if (e.fase === "antes") {
        nota.textContent = "Las cifras se publican aquí desde el 1 de marzo, cuando abre la postulación.";
      } else {
        nota.textContent = "Cargando cifras…";
        fetch(ENDPOINT + "?cifras=1").then(function (r) { return r.json(); }).then(function (j) {
          if (!j || !j.ok) { nota.textContent = "Las cifras no están disponibles en este momento."; return; }
          pintarCifras(j);
          nota.textContent = "Actualizado el " + j.actualizado + ". Solo se muestran totales, sin datos de las personas.";
        }).catch(function () { nota.textContent = "Las cifras no están disponibles en este momento."; });
      }
    }
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

  /* ── Reemplazo de un documento solicitado por el municipio ── */
  var fr = $("reemplazoForm");
  if (fr) {
    var rr = $("reemplazoResultado");
    var decir = function (clase, titulo, detalle) {
      rr.className = "aviso " + clase; rr.textContent = "";
      var b = document.createElement("b"); b.textContent = titulo; var s = document.createElement("span"); s.textContent = detalle;
      rr.append(b, s); rr.hidden = false;
    };
    fr.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var folio = $("reFolio").value.trim().toUpperCase(), rut = $("reRut").value.trim(), clave = $("reClave").value, archivo = $("reArchivo").files[0];
      if (!/^BMR-\d{4}-\d{4}$/.test(folio)) return decir("error", "Revise el folio", "Tiene la forma BMR-" + PLAZO_ANIO + "-0001 y viene en su comprobante.");
      if (typeof rutValido === "function" && !rutValido(rut)) return decir("error", "Revise el RUT", "Escriba el RUT del postulante con su dígito verificador.");
      if (!clave) return decir("error", "Falta indicar el documento", "Seleccione cuál documento está reemplazando.");
      if (!archivo) return decir("error", "Falta el archivo", "Adjunte el documento corregido.");
      var tipo = archivo.type || ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" })[(archivo.name.split(".").pop() || "").toLowerCase()] || "";
      if (["application/pdf", "image/jpeg", "image/png"].indexOf(tipo) < 0) return decir("error", "Formato no admitido", "El archivo debe ser PDF, JPG o PNG.");
      if (archivo.size > 5 * 1048576) return decir("error", "Archivo demasiado grande", "El máximo es de 5 MB. Reduzca su tamaño y vuelva a adjuntarlo.");
      if (typeof ENDPOINT === "undefined" || !ENDPOINT) return decir("info", "Envío aún no disponible", "Se activará cuando el municipio conecte la recepción de postulaciones.");
      var boton = fr.querySelector("button"); boton.disabled = true;
      var lector = new FileReader();
      lector.onerror = function () { boton.disabled = false; decir("error", "No fue posible leer el archivo", "Vuelva a adjuntarlo e intente nuevamente."); };
      lector.onload = function () {
        fetch(ENDPOINT, { method: "POST", body: JSON.stringify({ tipo: "reemplazo", folio: folio, rut: rut, clave: clave, archivo: { tipo: tipo, contenido: String(lector.result).split(",")[1] } }) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && j.ok) { decir("exito", "Documento recibido", "Quedó asociado a su postulación " + folio + ". El equipo de la beca lo revisará."); fr.reset(); }
            else decir("error", "No fue posible recibir el documento", (j && j.error) || "Intente nuevamente en unos minutos.");
          })
          .catch(function () { decir("error", "No fue posible enviar", "Revise su conexión e intente nuevamente."); })
          .then(function () { boton.disabled = false; });
      };
      lector.readAsDataURL(archivo);
    });
  }

  /* ── Encuesta breve después de postular (aparece junto al mensaje de éxito que crea js/app.js) ── */
  var zonaPostular = $("postular");
  if (zonaPostular && typeof MutationObserver === "function") {
    new MutationObserver(function () {
      var exito = $("exito");
      if (!exito || $("encuesta")) return;
      var f = document.createElement("form"); f.id = "encuesta"; f.className = "encuesta"; f.noValidate = true;
      var h = document.createElement("h3"); h.textContent = "Ayúdenos a mejorar este trámite";
      var p = document.createElement("p"); p.className = "ayuda"; p.textContent = "Son tres preguntas y la respuesta es anónima. No se asocia a su postulación.";
      f.append(h, p);
      [["encFacilidad", "¿Qué tan fácil fue completar la postulación?", "Muy difícil", "Muy fácil"],
       ["encClaridad", "¿Qué tan clara fue la información sobre requisitos y documentos?", "Nada clara", "Muy clara"]].forEach(function (q) {
        var fs = document.createElement("fieldset"), lg = document.createElement("legend"), es = document.createElement("div");
        lg.textContent = q[1] + " (1 es " + q[2].toLowerCase() + " y 5 es " + q[3].toLowerCase() + ")"; es.className = "escala";
        for (var n = 1; n <= 5; n++) {
          var l = document.createElement("label"), r = document.createElement("input");
          r.type = "radio"; r.name = q[0]; r.value = n; l.append(r, document.createTextNode(String(n))); es.append(l);
        }
        fs.append(lg, es); f.append(fs);
      });
      var lc = document.createElement("label"); lc.htmlFor = "encComentario"; lc.textContent = "¿Qué mejoraría? (opcional)";
      var ta = document.createElement("textarea"); ta.id = "encComentario"; ta.maxLength = 500;
      var bt = document.createElement("button"); bt.type = "submit"; bt.className = "btn sec"; bt.textContent = "Enviar respuesta";
      f.append(lc, ta, bt);
      exito.parentNode.insertBefore(f, exito.nextSibling);
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var val = function (n) { var r = f.querySelector('input[name="' + n + '"]:checked'); return r ? +r.value : null; };
        var datos = { tipo: "encuesta", facilidad: val("encFacilidad"), claridad: val("encClaridad"), comentario: ta.value.trim().slice(0, 500) };
        var fin = function (texto) { var g = document.createElement("p"); g.className = "aviso info"; g.id = "encuestaFin"; g.textContent = texto; f.replaceWith(g); };
        if (!datos.facilidad && !datos.claridad && !datos.comentario) return;
        if (typeof ENDPOINT === "undefined" || !ENDPOINT) return fin("Gracias por su respuesta.");
        fetch(ENDPOINT, { method: "POST", body: JSON.stringify(datos) }).catch(function () {}).then(function () { fin("Gracias. Su respuesta ayuda a mejorar el proceso."); });
      });
    }).observe(zonaPostular, { childList: true, subtree: true });
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
