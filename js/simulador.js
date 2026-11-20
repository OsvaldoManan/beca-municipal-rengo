// Simulador de puntaje de la sección «puntaje». Usa la regla de js/puntaje.js.
// Es una estimación para el postulante. No guarda ni envía ningún dato.
(function () {
  var caja = document.getElementById("simulador");
  if (!caja || typeof calcularPuntaje !== "function") return;
  var $ = function (id) { return document.getElementById(id); };
  var coma = function (n) { return String(n).replace(".", ","); };

  function pintar() {
    var primero = $("simAnio").value === "1";
    $("simPromLabel").textContent = primero ? "Promedio NEM (1° a 4° medio)" : "Promedio del último año aprobado";
    var r = calcularPuntaje({
      anio: $("simAnio").value, promedio: $("simProm").value, tramo: $("simTramo").value,
      discapacidad: $("simDisc").checked, cuidador: $("simCuid").checked,
      familias: $("simFam").checked, discapacidadFamiliar: $("simDiscFam").checked
    });
    var filas = [["simR", "rendimiento", "Rendimiento", "0,40"], ["simS", "rsh", "Registro Social de Hogares", "0,45"], ["simV", "vulnerabilidad", "Vulnerabilidad", "0,15"]];
    filas.forEach(function (f) {
      var pts = r[f[1]];
      $(f[0] + "t").textContent = f[2] + (pts === null ? "" : ", " + pts + " puntos por " + f[3]);
      $(f[0]).textContent = r.valido ? coma(r.aporte[f[1]]) : "–";
    });
    $("simTotal").textContent = r.valido ? coma(r.total) : "–";
    var aviso = $("simAviso");
    if (r.valido) { aviso.hidden = true; }
    else {
      aviso.hidden = false;
      aviso.textContent = $("simProm").value.trim() === "" ? "Escriba su promedio para calcular."
        : "Con este promedio no se cumple el mínimo de " + (primero ? "6,0" : "5,0") + " que exige la ordenanza para postular.";
    }
  }
  ["simAnio", "simProm", "simTramo", "simDisc", "simCuid", "simFam", "simDiscFam"].forEach(function (id) {
    $(id).addEventListener("input", pintar); $(id).addEventListener("change", pintar);
  });
  pintar();
})();
