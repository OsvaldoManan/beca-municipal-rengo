// Buscador interno. Recorre el texto de las secciones del portal y las respuestas del asistente.
// Todo ocurre en el navegador: lo que se busca no se guarda ni se envía.
/** Puntúa un bloque de texto para una consulta ya separada en raíces. Lógica pura. */
function buscadorPuntaje(raicesConsulta, raicesBloque, raicesTitulo) {
  var s = 0;
  raicesConsulta.forEach(function (r) {
    if (raicesTitulo.indexOf(r) >= 0) s += 3;
    if (raicesBloque.indexOf(r) >= 0) s += 1;
  });
  return s;
}

(function () {
  if (typeof document === "undefined") return;
  var form = document.getElementById("buscador"), salida = document.getElementById("buscarResultados");
  if (!form || !salida || typeof asistentePalabras !== "function") return;
  var indice = null;
  function armar() {
    indice = [];
    [].forEach.call(document.querySelectorAll("main > section"), function (sec) {
      if (sec.id === "ayuda") return;
      var h2 = sec.querySelector("h2"), tituloSeccion = h2 ? h2.textContent.trim() : "";
      var bloques = sec.querySelectorAll(".prosa p, .razon, .guia li, tbody tr, details, .col, .ejemplo > p, .formatos li, ol.etapas li, fieldset legend");
      [].forEach.call(bloques, function (b) {
        if (b.closest("#famBody") || b.closest("form#f") && b.tagName !== "LEGEND") return;
        var texto = (b.tagName === "TR" ? [].map.call(b.children, function (c) { return c.textContent.trim(); }).filter(Boolean).join(". ") : b.textContent).replace(/\s+/g, " ").trim();
        if (texto.length < 25 && b.tagName !== "LEGEND") return;
        var cab = b.querySelector("h3, summary, th, b");
        var titulo = cab ? cab.textContent.trim() : tituloSeccion;
        if (!b.id) b.id = "b-" + sec.id + "-" + indice.length;
        indice.push({ id: b.id, seccion: tituloSeccion, titulo: titulo, texto: texto, raices: asistentePalabras(texto), raicesTitulo: asistentePalabras(titulo + " " + tituloSeccion) });
      });
    });
  }
  var crear = function (t, txt) { var e = document.createElement(t); if (txt) e.textContent = txt; return e; };
  function resultado(clase, sobre, titulo, extracto, destino) {
    var a = crear("a"); a.className = "buscar-res" + (clase ? " " + clase : ""); a.href = destino;
    if (!/^#/.test(destino)) { a.target = "_blank"; a.rel = "noopener"; }
    a.append(crear("small", sobre), crear("b", titulo), crear("span", extracto));
    return a;
  }
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var q = document.getElementById("buscarTexto").value.trim();
    salida.textContent = "";
    if (q.length < 2) { salida.append(crear("p", "Escriba al menos una palabra.")); return; }
    if (!indice) armar();
    var raices = asistentePalabras(q).filter(function (r, i, a) { return a.indexOf(r) === i; });
    var hallados = indice.map(function (b) { return { b: b, s: buscadorPuntaje(raices, b.raices, b.raicesTitulo) }; })
      .filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
    var directa = typeof asistenteBuscar === "function" ? asistenteBuscar(q).entrada : null;
    if (!hallados.length && !directa) {
      salida.append(crear("p", "No encontramos resultados para «" + q + "». Pruebe con otra palabra o escriba a becaestudiantil@munirengo.cl."));
      return;
    }
    salida.append(crear("p", (hallados.length + (directa ? 1 : 0)) + " resultados para «" + q + "»"));
    if (directa) {
      var enlace = !directa.e ? null : Array.isArray(directa.e[0]) ? directa.e[0] : directa.e;
      salida.append(resultado("directa", "Respuesta según la ordenanza", directa.t, directa.r, enlace ? enlace[1] : "#preguntas"));
    }
    hallados.forEach(function (x) {
      var t = x.b.texto; salida.append(resultado("", x.b.seccion, x.b.titulo, t.length > 190 ? t.slice(0, 190).replace(/\s\S*$/, "") + "…" : t, "#" + x.b.id));
    });
  });
})();
