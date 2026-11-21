// Asistente de consultas sobre la ordenanza. Ventana de conversación que responde con js/ordenanza.js.
// No usa inteligencia artificial generativa ni servicios externos: todo ocurre en el navegador
// y las preguntas no se guardan ni se envían a ningún servidor.
(function () {
  if (typeof asistenteBuscar !== "function" || !document.body) return;
  var crear = function (etiqueta, clase, texto) {
    var e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto) e.textContent = texto;
    return e;
  };
  // Con true, las consultas sin respuesta se envían al servicio para mejorar la base (solo el texto, sin identificar a la persona).
  // Requiere REGISTRAR_CONSULTAS en backend/Code.gs y cambia el aviso inicial del asistente.
  var REGISTRAR_CONSULTAS = false;
  function registrar(texto) {
    if (!REGISTRAR_CONSULTAS || typeof ENDPOINT === "undefined" || !ENDPOINT || typeof fetch !== "function") return;
    try { fetch(ENDPOINT, { method: "POST", body: JSON.stringify({ tipo: "consulta", texto: String(texto).slice(0, 200) }) }).catch(function () {}); } catch (x) {}
  }
  var SUGERIDAS = ["fechas", "documentos", "monto", "puntaje", "gastos", "rendicion"];

  var boton = crear("button", "asis-boton", "Consultas sobre la ordenanza");
  boton.type = "button"; boton.setAttribute("aria-expanded", "false"); boton.setAttribute("aria-controls", "asistente");

  var panel = crear("section", "asis-panel"); panel.id = "asistente"; panel.hidden = true;
  panel.setAttribute("aria-label", "Asistente de consultas sobre la ordenanza");
  var cab = crear("div", "asis-cab");
  var titulo = crear("div");
  titulo.append(crear("strong", "", "Asistente de la ordenanza"), crear("span", "", "Responde con el texto de la ordenanza de la beca"));
  var cerrar = crear("button", "asis-cerrar", "Cerrar"); cerrar.type = "button";
  cab.append(titulo, cerrar);
  var registro = crear("div", "asis-registro"); registro.setAttribute("role", "log"); registro.setAttribute("aria-live", "polite");
  var formulario = crear("form", "asis-form");
  var rotulo = crear("label", "asis-oculto", "Escriba su consulta"); rotulo.htmlFor = "asisPregunta";
  var campo = crear("input"); campo.type = "text"; campo.id = "asisPregunta"; campo.autocomplete = "off"; campo.maxLength = 200;
  campo.placeholder = "Escriba su consulta";
  var enviar = crear("button", "", "Preguntar"); enviar.type = "submit";
  formulario.append(rotulo, campo, enviar);
  panel.append(cab, registro, formulario);
  document.body.append(boton, panel);

  function bajar() { registro.scrollTop = registro.scrollHeight; }
  function sugerencias(entradas) {
    var caja = crear("div", "asis-sugeridas");
    entradas.forEach(function (x) {
      var b = crear("button", "", x.t); b.type = "button";
      b.addEventListener("click", function () { preguntar(x.t, x); });
      caja.append(b);
    });
    return caja;
  }
  function decir(texto, clase) { var m = crear("div", "asis-msj " + clase); m.append(crear("p", "", texto)); registro.append(m); return m; }

  function responder(entrada, relacionadas) {
    if (!entrada) {
      var n = decir("No encontré una respuesta a esa consulta en la ordenanza. Puede revisar el texto completo o escribir a " + ORDENANZA_CORREO + ".", "asis-bot");
      var a = crear("a", "", "Descargar la ordenanza"); a.href = ORDENANZA_PDF; a.target = "_blank"; a.rel = "noopener";
      n.append(a);
      registro.append(sugerencias(SUGERIDAS.map(porId)));
      return;
    }
    var m = decir(entrada.r, "asis-bot");
    m.append(crear("span", "asis-fuente", "Fuente: " + entrada.a.charAt(0).toLowerCase() + entrada.a.slice(1) + " de la ordenanza"));
    if (entrada.e) {
      var enlace = crear("a", "", entrada.e[0]); enlace.href = entrada.e[1];
      if (entrada.e[1].charAt(0) === "#") enlace.addEventListener("click", cerrarPanel);
      else { enlace.target = "_blank"; enlace.rel = "noopener"; }
      m.append(enlace);
    }
    if (relacionadas && relacionadas.length) registro.append(sugerencias(relacionadas));
  }
  function porId(id) { for (var i = 0; i < ORDENANZA_BASE.length; i++) if (ORDENANZA_BASE[i].id === id) return ORDENANZA_BASE[i]; }

  function preguntar(texto, entradaDirecta) {
    texto = String(texto || "").trim();
    if (!texto) return;
    decir(texto, "asis-yo");
    if (entradaDirecta) responder(entradaDirecta, []);
    else { var r = asistenteBuscar(texto); if (!r.entrada) registrar(texto); responder(r.entrada, r.relacionadas); }
    bajar();
  }

  function abrir() {
    panel.hidden = false; boton.setAttribute("aria-expanded", "true"); boton.hidden = true;
    if (!registro.childNodes.length) {
      decir("Puedo responder consultas sobre requisitos, fechas, documentos, puntaje, uso de la beca y rendición, siempre según la ordenanza. No reemplazo la orientación de DIDECO ni resuelvo casos particulares." + (REGISTRAR_CONSULTAS ? " Las consultas que no pueda responder se registran, sin identificarle, para mejorar este servicio. No escriba datos personales." : ""), "asis-bot");
      registro.append(sugerencias(SUGERIDAS.map(porId)));
    }
    campo.focus();
  }
  function cerrarPanel() { panel.hidden = true; boton.hidden = false; boton.setAttribute("aria-expanded", "false"); }

  boton.addEventListener("click", abrir);
  cerrar.addEventListener("click", function () { cerrarPanel(); boton.focus(); });
  panel.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { cerrarPanel(); boton.focus(); } });
  formulario.addEventListener("submit", function (ev) { ev.preventDefault(); preguntar(campo.value); campo.value = ""; campo.focus(); });
})();
