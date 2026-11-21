// Vistas del portal. Agrupa las secciones en páginas (Inicio, Requisitos y documentos, Puntaje, etc.)
// y muestra una a la vez según la dirección, por ejemplo  index.html#puntaje .
// Todo el portal sigue siendo un solo archivo: se puede abrir sin servidor y cada vista tiene su propia dirección.
// Sin JavaScript se ven todas las secciones seguidas, como un documento.
var PORTAL_VISTAS = [
  { id: "inicio", nombre: "Inicio", secciones: ["inicio", "accesos", "fundamento", "fechas"] },
  { id: "requisitos", nombre: "Requisitos y documentos", secciones: ["requisitos", "documentos", "guia"] },
  { id: "puntaje", nombre: "Puntaje", secciones: ["puntaje"] },
  { id: "uso", nombre: "Uso y rendición", secciones: ["uso"] },
  { id: "postular", nombre: "Postular", secciones: ["postular"] },
  { id: "estado", nombre: "Estado y resultados", secciones: ["estado"] },
  { id: "ayuda", nombre: "Ayuda", secciones: ["ayuda", "preguntas"] }
];

/** Vista a la que pertenece un identificador cualquiera de la página. Lógica pura sobre un mapa id → sección. */
function portalVistaDe(id, seccionDe) {
  var sec = seccionDe(id);
  for (var i = 0; i < PORTAL_VISTAS.length; i++) if (PORTAL_VISTAS[i].secciones.indexOf(sec) >= 0) return PORTAL_VISTAS[i];
  return null;
}

(function () {
  if (typeof document === "undefined") return;
  var TITULO = document.title;
  var el = function (id) { return document.getElementById(id); };
  var acc = document.querySelector(".accesos"); if (acc && !acc.id) acc.id = "accesos";
  // Bloque de primer nivel (sección, cabecera o accesos) que contiene a un elemento.
  var seccionDe = function (id) {
    var e = el(id); if (!e) return null;
    for (var i = 0; i < PORTAL_VISTAS.length; i++) for (var j = 0; j < PORTAL_VISTAS[i].secciones.length; j++) {
      var s = el(PORTAL_VISTAS[i].secciones[j]);
      if (s && (s === e || s.contains(e))) return s.id;
    }
    return null;
  };
  var main = document.querySelector("main"); if (!main) return;
  var pie = document.createElement("nav"); pie.className = "vista-nav"; pie.setAttribute("aria-label", "Páginas anterior y siguiente");
  main.appendChild(pie);
  var actual = null;

  function mostrar(evento) {
    var id = decodeURIComponent(location.hash.slice(1)) || "inicio";
    var vista = portalVistaDe(id, seccionDe) || (id === "contenido" && actual) || PORTAL_VISTAS[0];
    if (id === "contenido") { return; }
    var cambia = vista !== actual; actual = vista;
    PORTAL_VISTAS.forEach(function (v) { v.secciones.forEach(function (s) { var e = el(s); if (e) e.hidden = v !== vista; }); });
    [].forEach.call(document.querySelectorAll(".navegacion a"), function (a) {
      if (a.getAttribute("href") === "#" + vista.id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = vista.id === "inicio" ? TITULO : vista.nombre + " · " + TITULO;
    // Enlaces a la vista anterior y a la siguiente
    var i = PORTAL_VISTAS.indexOf(vista); pie.textContent = "";
    [[i - 1, "Anterior"], [i + 1, "Siguiente"]].forEach(function (par) {
      var v = PORTAL_VISTAS[par[0]]; if (!v) return;
      var a = document.createElement("a"), sm = document.createElement("small");
      a.href = "#" + v.id; sm.textContent = par[1]; a.append(sm, document.createTextNode(v.nombre)); pie.appendChild(a);
    });
    var destino = el(id);
    var inicioDeVista = id === vista.id || !destino;
    if (inicioDeVista) {
      if (cambia || evento) window.scrollTo({ top: vista.id === "inicio" ? 0 : Math.max(0, (document.querySelector(".menu") || main).offsetTop), behavior: "instant" });
    } else {
      var abrir = destino.closest("details"); if (abrir) abrir.open = true;
      destino.scrollIntoView({ block: "start", behavior: "instant" });
    }
    if (evento && cambia && vista.id !== "inicio") {
      var h = el(vista.secciones[0]) && el(vista.secciones[0]).querySelector("h2");
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }
  }
  window.addEventListener("hashchange", mostrar);
  mostrar();
})();
