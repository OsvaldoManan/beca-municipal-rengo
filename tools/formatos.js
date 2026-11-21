// Genera los formatos imprimibles de documentos/formatos/ a partir de los textos de la ordenanza.
// Uso:  node tools/formatos.js   (requiere Playwright con Chromium)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");
const logo = f => "data:image/webp;base64," + fs.readFileSync(path.join(raiz, "assets", f)).toString("base64");
const linea = (ancho = "100%") => `<span class="l" style="width:${ancho}"></span>`;

const base = (titulo, cuerpo) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@page{size:Letter;margin:22mm 24mm}
body{font:12pt/1.7 "Times New Roman","Liberation Serif",Times,serif;color:#000;margin:0}
header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #000;padding-bottom:8pt;margin-bottom:26pt}
header img{height:38pt;filter:grayscale(1) brightness(.35)}
header span{font-size:9pt;letter-spacing:.08em;text-transform:uppercase}
h1{font-size:14pt;text-align:center;margin:0 0 22pt;letter-spacing:.03em}
p{margin:0 0 12pt;text-align:justify}
.l{display:inline-block;border-bottom:1px solid #000;height:1em;vertical-align:baseline}
.campo{display:flex;gap:6pt;align-items:baseline;margin-bottom:10pt}.campo .l{flex:1}
.firma{margin-top:44pt;width:60%;margin-inline:auto;text-align:center;border-top:1px solid #000;padding-top:4pt}
table{border-collapse:collapse;width:100%;margin:10pt 0}th,td{border:1px solid #000;padding:5pt 6pt;text-align:left;font-size:11pt}th{font-weight:bold}td{height:15pt}
.n{text-align:right}.nota{font-size:9.5pt;line-height:1.4;margin-top:16pt}
footer{font-size:8.5pt;text-align:center;color:#333;margin-top:26pt}
</style></head><body>
<header><img src="${logo("logo-municipalidad-rengo.webp")}" alt=""><span>Dirección de Desarrollo Comunitario</span><img src="${logo("logo-contigo-rengo.webp")}" alt=""></header>
<h1>${titulo}</h1>${cuerpo}
<footer>Beca Municipal Rengo · Ordenanza aprobada por Decreto Alcaldicio N° 340 de 26 de febrero de 2026</footer>
</body></html>`;

const fecha = `<p>En Rengo, a ${linea("28pt")} de ${linea("110pt")} de 20${linea("22pt")}.</p>`;
const formatos = {
  "declaracion-jurada-simple": base("DECLARACIÓN JURADA SIMPLE", `
    <div class="campo">Yo, ${linea()}</div>
    <div class="campo">RUT ${linea("130pt")}, domiciliado(a) en ${linea()}</div>
    <p>comuna de Rengo, en calidad de postulante a la Beca Municipal Rengo, declaro bajo juramento que:</p>
    <p>He leído y conozco en su totalidad el contenido de la Ordenanza para la Postulación y Entrega de la Beca Municipal Rengo de la Ilustre Municipalidad de Rengo, aceptando expresamente todas las condiciones, requisitos y obligaciones que esta establece.</p>
    <p>Firmo la presente declaración de manera libre y voluntaria, para los fines que estime pertinentes la Ilustre Municipalidad de Rengo.</p>
    ${fecha}<div class="firma">Firma del postulante</div>`),
  "declaracion-jurada-menores-de-edad": base("DECLARACIÓN JURADA SIMPLE PARA MENORES DE EDAD", `
    <div class="campo">Nombre del postulante ${linea()}</div>
    <div class="campo">RUT del postulante ${linea("150pt")}</div>
    <div class="campo" style="margin-top:14pt">Yo, ${linea()}</div>
    <p>RUT ${linea("130pt")}, en calidad de tutor(a) del postulante antes individualizado, declaro bajo juramento conocer en su totalidad la Ordenanza para la Postulación y Entrega de la Beca Municipal de la Ilustre Municipalidad de Rengo, aceptando expresamente todas las condiciones, requisitos y obligaciones que esta establece.</p>
    <p>Asimismo, declaro que la cuenta bancaria para el depósito de la beca corresponde a:</p>
    <div class="campo">Tipo de cuenta ${linea()}</div><div class="campo">Número de cuenta ${linea()}</div><div class="campo">Banco ${linea()}</div>
    <p>Firmo la presente declaración de manera libre y voluntaria, para los fines que estime pertinentes la Ilustre Municipalidad de Rengo.</p>
    ${fecha}<div class="firma">Firma del tutor</div><div class="campo" style="margin-top:14pt">Nombre completo ${linea()}</div>`),
  "autorizacion-simple-tutor": base("AUTORIZACIÓN SIMPLE DE POSTULACIÓN", `
    <div class="campo">Yo, ${linea()}</div>
    <div class="campo">RUT ${linea("130pt")}, en mi calidad de (padre, madre o tutor) ${linea()}</div>
    <div class="campo">de ${linea()}</div>
    <div class="campo">RUT ${linea("130pt")}, menor de 18 años, autorizo y respaldo su postulación a la</div>
    <p>Beca Municipal Rengo, conforme al artículo 7 letra b) de la Ordenanza de Postulación y Entrega de la Beca Municipal Rengo.</p>
    <p>Adjunto fotocopia de mi cédula de identidad.</p>
    ${fecha}<div class="firma">Firma del padre, madre o tutor</div>
    <p class="nota">La ordenanza exige una autorización simple y no fija su redacción. Este formato es una propuesta de apoyo para el postulante.</p>`),
  "planilla-rendicion": base("RENDICIÓN BECA MUNICIPAL RENGO", `<style>footer{display:none}</style>
    <div class="campo">Fecha ${linea("130pt")}</div><div class="campo">Nombre ${linea()}</div>
    <div class="campo">RUT ${linea("150pt")}</div><div class="campo">Beneficio ${linea()}</div>
    <table><thead><tr><th style="width:18%">Fecha</th><th>Detalle del gasto</th><th style="width:22%" class="n">Total</th></tr></thead><tbody>
    ${"<tr><td></td><td></td><td></td></tr>".repeat(7)}
    <tr><th colspan="2" class="n">Total gasto</th><td></td></tr>
    <tr><th colspan="2" class="n">Total aporte beca</th><td></td></tr>
    <tr><th colspan="2" class="n">Total cobertura recursos propios</th><td></td></tr></tbody></table>
    <div class="firma">Firma</div>
    <p class="nota">Anexo 2 de la ordenanza. Se entrega en papel en la Oficina de Partes de la municipalidad hasta el 30 de noviembre, con las boletas o facturas originales, sin enmiendas ni tachaduras.</p>`)
};

// Resumen de una página para entregar impreso en juntas de vecinos, liceos y oficinas municipales.
const resumen = base("BECA MUNICIPAL RENGO 2027", `<style>
    @page{margin:16mm 20mm}body{font-size:10.5pt;line-height:1.4}h1{margin-bottom:6pt;font-size:17pt}h2{font-size:11pt;margin:11pt 0 3pt;border-bottom:1px solid #000;padding-bottom:2pt;text-transform:uppercase;letter-spacing:.05em}
    p{margin:0 0 5pt}ul{margin:0;padding-left:14pt}li{margin-bottom:1.5pt}.dos{display:grid;grid-template-columns:1fr 1fr;gap:0 20pt}
    .caja{border:1.5pt solid #000;padding:7pt 10pt;margin:8pt 0;display:grid;grid-template-columns:repeat(4,1fr);gap:8pt;text-align:center}
    .caja b{display:block;font-size:13pt}.caja span{font-size:8.5pt;text-transform:uppercase;letter-spacing:.05em}header{margin-bottom:10pt}footer{display:none}.pie{font-size:8.5pt;text-align:center;margin-top:8pt}
    td,th{font-size:9.5pt;padding:2.5pt 5pt;height:auto}</style>
    <p style="text-align:center">Aporte de la Ilustre Municipalidad de Rengo para estudiantes de la comuna en educación superior</p>
    <div class="caja"><div><b>$400.000</b><span>Monto, en una cuota</span></div><div><b>1 al 30 de marzo</b><span>Postulación</span></div><div><b>Mayo</b><span>Resultados y pago</span></div><div><b>30 de noviembre</b><span>Plazo para rendir</span></div></div>
    <div class="dos"><div>
    <h2>Quiénes pueden postular</h2><ul>
      <li>Estudiantes que viven en Rengo y cursan una carrera en una universidad, instituto profesional o centro de formación técnica acreditado.</li>
      <li>Promedio NEM 6,0 o superior si ingresa a primer año. Promedio 5,0 o superior desde segundo año.</li>
      <li>Registro Social de Hogares actualizado en la comuna.</li>
      <li>Cuenta bancaria a nombre del estudiante o de su tutor legal.</li>
      <li>Correo electrónico personal.</li></ul>
    <h2>No pueden postular</h2><ul>
      <li>Quienes ya tienen título profesional o grado de licenciado, o cursan un postgrado.</li>
      <li>Funcionarios municipales y prestadores de servicios a honorarios. Sus familiares sí pueden.</li></ul>
    <h2>En qué se puede usar</h2><ul><li>Matrícula o arancel.</li><li>Materiales e insumos de la carrera.</li><li>Pasajes. No se acepta combustible.</li><li>Arriendo de hospedaje, con contrato.</li></ul>
    </div><div>
    <h2>Documentos que debe reunir</h2><ul>
      <li>Cédula de identidad por ambos lados.</li><li>Certificado de alumno regular.</li>
      <li>Concentración de notas de enseñanza media, o certificado de notas del último año aprobado.</li>
      <li>Cartola del Registro Social de Hogares.</li><li>Certificado de residencia de la junta de vecinos.</li><li>Declaración jurada simple firmada.</li></ul>
    <p style="margin-top:4pt"><b>Según su caso.</b> Credencial de discapacidad, credencial de cuidador, Formulario Único de Derivación del programa Familias, Seguridades y Oportunidades. Menores de 18 años, cédula y autorización del padre, madre o tutor.</p>
    <h2>Cómo se asigna</h2>
    <table><tr><th>Criterio</th><th class="n">Peso</th></tr><tr><td>Rendimiento académico</td><td class="n">40%</td></tr><tr><td>Tramo del Registro Social de Hogares</td><td class="n">45%</td></tr><tr><td>Condición de vulnerabilidad</td><td class="n">15%</td></tr></table>
    <p>Las becas se asignan de mayor a menor puntaje, según los recursos del presupuesto municipal.</p>
    </div></div>
    <h2>Cómo postular</h2>
    <p>La postulación es solo en línea, del 1 al 30 de marzo. No se reciben documentos en papel. Si no cuenta con computador o internet, la Oficina de Organizaciones Comunitarias de DIDECO dispone de un espacio y un profesional de apoyo. Consultas a <b>becaestudiantil@munirengo.cl</b>.</p>
    <p><b>Rendición.</b> Quien recibe la beca debe rendir sus gastos con boletas originales en la Oficina de Partes, a más tardar el 30 de noviembre. No rendir impide acceder a beneficios municipales por dos años.</p>
    <p class="pie">Ordenanza de Postulación y Entrega de la Beca Municipal Rengo, Decreto Alcaldicio N° 340 de 26 de febrero de 2026</p>`);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [nombre, html] of Object.entries(formatos)) {
    await p.setContent(html);
    await p.pdf({ path: path.join(raiz, "documentos", "formatos", nombre + ".pdf"), format: "Letter", printBackground: true });
    console.log("ok  " + nombre + ".pdf");
  }
  await p.setContent(resumen);
  await p.pdf({ path: path.join(raiz, "documentos", "resumen-beca-municipal-rengo.pdf"), format: "Letter", printBackground: true });
  console.log("ok  resumen-beca-municipal-rengo.pdf");
  await b.close();
})();
