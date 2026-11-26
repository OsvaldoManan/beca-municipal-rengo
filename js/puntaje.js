/**
 * Regla de puntaje de la Beca Municipal Rengo (artículos 16 y 17 de la ordenanza).
 *
 * Este archivo es la única fuente de la regla. backend/Puntaje.gs es una copia idéntica
 * (tests/puntaje.test.js lo comprueba), de modo que el simulador del sitio y la nómina
 * que genera DIDECO siempre calculan lo mismo. Si la ordenanza cambia, edite este archivo
 * y cópielo sobre backend/Puntaje.gs.
 *
 * Criterios de lectura adoptados donde la tabla del artículo 16 no es explícita.
 * Deben ser confirmados por el Comité Técnico Evaluador.
 *   1. Los promedios se comparan con un decimal (6,45 se lee como 6,5).
 *   2. Un NEM de 6,6 se asigna al tramo superior (100 puntos). La tabla dice «sobre 6,6»
 *      y el tramo anterior termina en 6,5, por lo que 6,6 quedaría sin puntaje.
 *      Para la lectura contraria cambie PUNTAJE_NEM_TRAMO_SUPERIOR a 67.
 *   3. Los tramos 90% y 100% del Registro Social de Hogares reciben 0 puntos.
 *   4. En vulnerabilidad se asigna el puntaje más alto que corresponda, sin sumar.
 */
var PUNTAJE_PESOS = { rendimiento: 0.40, rsh: 0.45, vulnerabilidad: 0.15 };
var PUNTAJE_NEM_TRAMO_SUPERIOR = 66; // en décimas: 66 equivale a 6,6
var PUNTAJE_RSH = { 40: 100, 50: 75, 60: 50, 70: 25, 80: 10, 90: 0, 100: 0 };

/** Convierte "6,4", "6.4" o 6.4 en décimas enteras (64). Devuelve null si no es una nota válida. */
function puntajeDecimas(nota) {
  var n = typeof nota === 'number' ? nota : Number(String(nota === null || nota === undefined ? '' : nota).trim().replace(',', '.'));
  if (!isFinite(n) || n < 1 || n > 7) return null;
  return Math.round(n * 10 + 1e-9);
}

/** Puntos por rendimiento. anio 1 usa el NEM; desde segundo año, el promedio de la carrera. null si no cumple el mínimo. */
function puntosRendimiento(anio, nota) {
  var d = puntajeDecimas(nota);
  if (d === null) return null;
  if (Number(anio) === 1) {
    if (d < 60) return null;
    if (d <= 62) return 50;
    if (d < PUNTAJE_NEM_TRAMO_SUPERIOR) return 75;
    return 100;
  }
  if (d < 50) return null;
  if (d === 50) return 50;
  if (d <= 55) return 75;
  return 100;
}

/**
 * Puntos por tramo del Registro Social de Hogares. Acepta 40, "40", "40%" y también 0,4, que es como Google Sheets
 * guarda «40%» cuando lo convierte en número. null si el tramo no existe.
 */
function puntosRsh(tramo) {
  var n = Number(String(tramo === null || tramo === undefined ? '' : tramo).replace('%', '').replace(',', '.').trim());
  if (n > 0 && n <= 1) n = n * 100;
  var t = Math.round(n);
  return n === t && PUNTAJE_RSH.hasOwnProperty(t) ? PUNTAJE_RSH[t] : null;
}

/** Puntos por condición de vulnerabilidad. c = {discapacidad, cuidador, familias, discapacidadFamiliar}. */
function puntosVulnerabilidad(c) {
  c = c || {};
  if (c.discapacidad || c.cuidador || c.familias) return 100;
  if (c.discapacidadFamiliar) return 75;
  return 0;
}

/**
 * Puntaje final. p = {anio, promedio, tramo, discapacidad, cuidador, familias, discapacidadFamiliar}.
 * Devuelve {valido, motivo, rendimiento, rsh, vulnerabilidad, aporte:{...}, total}.
 */
function calcularPuntaje(p) {
  p = p || {};
  var r = puntosRendimiento(p.anio, p.promedio);
  var s = puntosRsh(p.tramo);
  var v = puntosVulnerabilidad(p);
  if (r === null) {
    return { valido: false, motivo: 'El promedio no alcanza el mínimo exigido o no es una nota válida.', rendimiento: null, rsh: s, vulnerabilidad: v, total: null };
  }
  if (s === null) {
    return { valido: false, motivo: 'El tramo del Registro Social de Hogares no es válido.', rendimiento: r, rsh: null, vulnerabilidad: v, total: null };
  }
  var aporte = {
    rendimiento: Math.round(r * PUNTAJE_PESOS.rendimiento * 100) / 100,
    rsh: Math.round(s * PUNTAJE_PESOS.rsh * 100) / 100,
    vulnerabilidad: Math.round(v * PUNTAJE_PESOS.vulnerabilidad * 100) / 100
  };
  return { valido: true, motivo: '', rendimiento: r, rsh: s, vulnerabilidad: v, aporte: aporte,
    total: Math.round((aporte.rendimiento + aporte.rsh + aporte.vulnerabilidad) * 100) / 100 };
}

/**
 * Clave de desempate del artículo 17, de mayor a menor prioridad:
 * credencial de discapacidad o de cuidador, programa Familias, residencia rural.
 */
function claveDesempate(p) {
  return [(p.discapacidad || p.cuidador) ? 1 : 0, p.familias ? 1 : 0, p.rural ? 1 : 0];
}

/** Orden de la nómina: puntaje de mayor a menor y luego el desempate. 0 significa empate total (sorteo). */
function compararPostulantes(a, b) {
  if (a.total !== b.total) return b.total - a.total;
  var ka = claveDesempate(a), kb = claveDesempate(b);
  for (var i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
  return 0;
}
