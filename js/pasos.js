// Formulario por pasos: muestra un paso a la vez con barra de avance y botones Anterior y Siguiente.
// El postulante puede pasar a «Ver todos los pasos» si prefiere el formulario completo.
// No cambia la validación ni el envío, que siguen en js/app.js.
(function () {
  var form = document.getElementById("f");
  if (!form) return;
  var pasos = [].slice.call(form.querySelectorAll("fieldset[id^=p]"));
  if (pasos.length < 2) return;
  var crear = function (t, cl, txt) { var e = document.createElement(t); if (cl) e.className = cl; if (txt) e.textContent = txt; return e; };
  var actual = 0, completo = false;

  var barra = crear("div", "pasos-barra");
  var lista = crear("ol", "pasos-lista");
  pasos.forEach(function (fs, i) {
    var li = crear("li"), b = crear("button"); b.type = "button";
    var leyenda = fs.querySelector("legend");
    var nombre = leyenda ? leyenda.textContent.replace(/^\s*Paso\s*\d+\s*/i, "").trim() : "";
    b.append(crear("small", "", "Paso " + (i + 1)), crear("span", "", nombre));
    b.addEventListener("click", function () { ir(i); });
    li.append(b); lista.append(li);
  });
  var modo = crear("button", "enlace pasos-modo", "Ver todos los pasos en una sola página"); modo.type = "button"; modo.id = "pasosModo";
  barra.append(lista, modo);
  var zona = form.closest(".zona");
  if (zona) zona.parentNode.insertBefore(barra, zona); else form.parentNode.insertBefore(barra, form);

  var nav = crear("div", "pasos-nav");
  var antes = crear("button", "btn sec", "Anterior"); antes.type = "button"; antes.id = "pasoAnterior";
  var despues = crear("button", "btn", "Siguiente"); despues.type = "button"; despues.id = "pasoSiguiente";
  nav.append(antes, despues);
  var acciones = form.querySelector(".acciones");
  form.insertBefore(nav, acciones || null);

  // Un paso está incompleto si le falta un dato obligatorio, un ítem de gasto o un documento.
  function faltantes(fs) {
    var campos = [].filter.call(fs.querySelectorAll("input,select"), function (c) {
      if (c.type === "file" || c.closest("#famBody")) return false;
      var exigido = c.required || (c.dataset.cond && document.getElementById(c.dataset.cond) && document.getElementById(c.dataset.cond).checked);
      if (!exigido) return false;
      return c.type === "checkbox" ? !c.checked : c.value.trim() === "";
    });
    var n = campos.length;
    if (fs.querySelector("#gastos") && !fs.querySelector("#gastos input:checked")) n++;
    var docs = fs.querySelector("#docs");
    if (docs) n += docs.children.length ? fs.querySelectorAll(".doc:not(.ok)").length : 1;
    return n;
  }
  function pintar() {
    form.classList.toggle("por-pasos", !completo);
    form.classList.toggle("ultimo", actual === pasos.length - 1);
    pasos.forEach(function (fs, i) {
      fs.classList.toggle("visible", i === actual);
      var li = lista.children[i];
      li.classList.toggle("actual", !completo && i === actual);
      li.classList.toggle("hecho", faltantes(fs) === 0);
      li.firstChild.setAttribute("aria-current", !completo && i === actual ? "step" : "false");
    });
    nav.hidden = completo;
    antes.disabled = actual === 0;
    despues.hidden = actual === pasos.length - 1;
    modo.textContent = completo ? "Volver al formulario paso a paso" : "Ver todos los pasos en una sola página";
  }
  function ir(i, enfocar) {
    actual = Math.max(0, Math.min(pasos.length - 1, i));
    pintar();
    if (completo) { pasos[actual].scrollIntoView({ block: "start" }); return; }
    if (enfocar !== false) {
      barra.scrollIntoView({ block: "start" });
      var primero = pasos[actual].querySelector("input:not([type=file]),select");
      if (primero) primero.focus({ preventScroll: true });
    }
  }
  antes.addEventListener("click", function () { ir(actual - 1); });
  despues.addEventListener("click", function () { ir(actual + 1); });
  modo.addEventListener("click", function () { completo = !completo; pintar(); });
  form.addEventListener("input", pintar);
  form.addEventListener("change", function () { setTimeout(pintar, 0); });

  // Si el envío encuentra problemas, se abre el primer paso que tiene alguno.
  form.addEventListener("submit", function () {
    setTimeout(function () {
      if (completo) return;
      for (var i = 0; i < pasos.length; i++) {
        var problema = pasos[i].querySelector(".campo.err, .doc.err, [aria-invalid='true']");
        if (problema) {
          if (i !== actual) ir(i, false);
          var foco = problema.matches("input,select") ? problema : problema.querySelector("input:not([type=file]),select");
          if (foco) foco.focus();
          return;
        }
      }
    }, 0);
  });
  // La lista de documentos la dibuja js/app.js. Se observa para actualizar el avance cuando cambia.
  var docs = document.getElementById("docs");
  if (docs && typeof MutationObserver === "function") new MutationObserver(pintar).observe(docs, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  pintar();
})();
