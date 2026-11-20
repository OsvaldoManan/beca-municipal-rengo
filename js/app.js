// Beca Municipal Rengo. Lógica del formulario de postulación.
// Archivo de navegador sin dependencias. No usa módulos ni requiere compilación.
//
// Dirección del servicio que recibe las postulaciones (aplicación web de Google Apps Script).
// Mientras esté vacía, el sitio funciona en modo de revisión y no envía nada.
const ENDPOINT = "";

// Límites de los adjuntos. Deben coincidir con los de backend/Code.gs.
const MAX_MB = 5, MAX_TOTAL_MB = 25, MB = 1048576;
const TIPOS = ["application/pdf","image/jpeg","image/png"];
// Tiempo máximo de espera de la respuesta del servidor, en milisegundos.
const ESPERA_MS = 90000;
const CORREO_BECA = "becaestudiantil@munirengo.cl";

// Borrador local. Solo se guardan estos campos. Nunca la cuenta bancaria, el grupo familiar,
// las declaraciones ni los archivos.
const CLAVE_BORRADOR = "becaRengo.borrador.v1";
const BORRADOR_TEXTO = ["nombres","apellidos","rut","telefono","domicilio","correo","tutorNombre","tutorRut","institucion","carrera","anio","promedio","tramo"];
const BORRADOR_CHECKS = ["menor","cDisc","cDiscFam","cCuid","cFam"];
const BORRADOR_DIAS = 7;

// Documentos del artículo 7 y del Anexo 1 de la ordenanza. Los que tienen "si" solo se piden
// cuando el postulante marca la condición correspondiente.
const DOCS = [
  {k:"cedula", n:"Cédula de identidad", d:"Ambos lados, vigente y legible."},
  {k:"alumno_regular", n:"Certificado de alumno regular", d:"Emitido por su institución de educación superior."},
  {k:"notas", n:"Certificado de notas", d:"Concentración de notas de enseñanza media si cursa primer año. Notas del último año aprobado en los demás casos."},
  {k:"rsh", n:"Cartola del Registro Social de Hogares", d:"Actualizada en la comuna de Rengo."},
  {k:"residencia", n:"Certificado de residencia", d:"De la junta de vecinos de su sector."},
  {k:"declaracion", n:"Declaración jurada simple", d:"Formato del municipio, firmado."},
  {k:"discapacidad", n:"Credencial de discapacidad", d:"Suya o del integrante de su familia.", si:()=>v("cDisc")||v("cDiscFam")},
  {k:"cuidador", n:"Credencial de cuidador", d:"O certificado del Registro Nacional de Cuidadores.", si:()=>v("cCuid")},
  {k:"fud", n:"Formulario Único de Derivación", d:"Emitido por la jefatura del programa Familias, Seguridades y Oportunidades.", si:()=>v("cFam")},
  {k:"cedula_tutor", n:"Cédula del padre, madre o tutor", d:"Ambos lados.", si:()=>v("menor")},
  {k:"autorizacion", n:"Autorización simple del tutor", d:"Respalda su postulación.", si:()=>v("menor")},
  {k:"declaracion_tutor", n:"Declaración jurada para menores de edad", d:"Firmada por el tutor.", si:()=>v("menor")}
];

/* ------------------------------------------------------------------------------------------
   Funciones puras. No tocan la página, por eso se pueden probar con Node (tests/rut.test.js).
   ------------------------------------------------------------------------------------------ */

// Deja el RUT sin puntos, espacios ni guion y con la K en mayúscula.
function rutLimpio(r){ return String(r==null?"":r).replace(/[.\s-]/g,"").toUpperCase(); }

// Valida el dígito verificador con el algoritmo de módulo 11.
function rutValido(r){
  r = rutLimpio(r);
  if(!/^\d{7,8}[\dK]$/.test(r)) return false;
  let s=0, m=2;
  for(let i=r.length-2;i>=0;i--){ s += +r[i]*m; m = m===7?2:m+1; }
  const dv = 11-(s%11);
  return r.slice(-1) === (dv===11?"0":dv===10?"K":String(dv));
}

// Presenta el RUT como 12.345.678-9. Si no tiene forma de RUT lo devuelve tal como se escribió.
function rutFormato(r){
  const l = rutLimpio(r);
  if(!/^\d{7,8}[\dK]$/.test(l)) return String(r==null?"":r).trim();
  return l.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,".")+"-"+l.slice(-1);
}

function correoValido(c){ return /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(String(c||"").trim()); }

// Validación liviana. Acepta dígitos, espacios, paréntesis, guiones y un + inicial, con 8 a 12 dígitos.
function telefonoValido(t){
  t = String(t||"").trim();
  if(!/^\+?[\d\s()-]+$/.test(t)) return false;
  const n = t.replace(/\D/g,"").length;
  return n>=8 && n<=12;
}

// Convierte "5,5" o "5.5" en número. Devuelve NaN si el texto no es una nota.
function aNota(t){
  t = String(t==null?"":t).trim().replace(",",".");
  return /^\d(\.\d{1,2})?$/.test(t) ? parseFloat(t) : NaN;
}
// Mínimo del artículo 7 d. 6,0 de NEM en primer año y 5,0 desde segundo año.
function notaMinima(anio){ return String(anio)==="1" ? 6.0 : 5.0; }
function conComa(n){ return n.toFixed(1).replace(".",","); }

// Tipo del archivo. Algunos navegadores entregan el tipo vacío o con nombres antiguos,
// en ese caso se decide por la extensión. Devuelve "" si el archivo no es PDF, JPG ni PNG.
function tipoArchivo(a){
  const t = String((a&&a.type)||"").toLowerCase();
  if(TIPOS.includes(t)) return t;
  const alias = {"image/jpg":"image/jpeg","image/pjpeg":"image/jpeg","image/x-png":"image/png","application/x-pdf":"application/pdf"};
  if(alias[t]) return alias[t];
  if(t) return "";
  const ext = (String((a&&a.name)||"").toLowerCase().match(/\.([a-z0-9]+)$/)||[])[1];
  return ({pdf:"application/pdf",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png"})[ext] || "";
}
function enMB(bytes){ return (bytes/MB).toFixed(1).replace(".",","); }

/* ------------------------------------------------------------------------------------------
   Página
   ------------------------------------------------------------------------------------------ */

const $ = id => document.getElementById(id);
const v = id => { const e=$(id); return !!(e && e.checked); };   // casilla marcada
const val = id => { const e=$(id); return e ? e.value.trim() : ""; };
const archivos = {};                                              // clave del documento -> File
const aplican = () => DOCS.filter(d=>!d.si||d.si());
const pesoTotal = (menos) => Object.keys(archivos).reduce((s,k)=>k===menos?s:s+archivos[k].size,0);
let enviando = false;

// ---------- Paso 5. Documentos ----------

function pintarDocs(foco){
  const cont = $("docs"); if(!cont) return;
  cont.textContent = "";
  DOCS.forEach(doc=>{
    if(doc.si && !doc.si()){ delete archivos[doc.k]; return; }
    const f = archivos[doc.k];
    const el = document.createElement("div"); el.className = "doc"+(f?" ok":""); el.dataset.k = doc.k;
    const nom = document.createElement("span"); nom.className="nom"; nom.textContent = doc.n;
    if(doc.si){ const c=document.createElement("span"); c.className="cond"; c.textContent=" · según su caso"; nom.append(c); }
    const lab = document.createElement("label");
    const inp = document.createElement("input"); inp.type="file"; inp.id="doc_"+doc.k; inp.accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
    const det = document.createElement("span"); det.className="det"; det.id="det_"+doc.k;
    // Nombre accesible completo. El lector de pantalla anuncia qué documento es y qué se acepta.
    inp.setAttribute("aria-label",(f?"Cambiar archivo de ":"Adjuntar ")+doc.n+". PDF, JPG o PNG de hasta "+MAX_MB+" MB");
    inp.setAttribute("aria-describedby",det.id);
    const bot = document.createElement("span"); bot.className="elegir"; bot.textContent = f?"Cambiar":"Adjuntar";
    lab.append(inp,bot);
    det.textContent = f ? "Cargado: "+f.name+" ("+enMB(f.size)+" MB)" : doc.d;
    inp.addEventListener("change",()=>{
      const a = inp.files[0]; if(!a) return;
      const rechazo = motivoRechazo(a, doc.k);
      if(rechazo){ delete archivos[doc.k]; pintarDocs(doc.k); marcar(doc.k,rechazo); return; }
      archivos[doc.k]=a; pintarDocs(doc.k);
    });
    el.append(nom,lab,det); cont.append(el);
    // Si la hoja de estilos oculta por completo el campo de archivo, el botón visible pasa a ser
    // el control de teclado (Enter o barra espaciadora).
    const cs = window.getComputedStyle ? getComputedStyle(inp) : null;
    if(cs && (cs.display==="none" || cs.visibility==="hidden")){
      bot.setAttribute("role","button"); bot.tabIndex=0;
      bot.setAttribute("aria-label",inp.getAttribute("aria-label")); bot.setAttribute("aria-describedby",det.id);
      bot.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); inp.click(); } });
    }
  });
  if(foco) enfocarDoc(foco);
  avance();
}
// Devuelve el texto del problema o "" si el archivo se puede aceptar.
function motivoRechazo(a, clave){
  if(!tipoArchivo(a)) return "El archivo debe ser PDF, JPG o PNG.";
  if(a.size===0) return "El archivo está vacío. Elija otro archivo.";
  if(a.size > MAX_MB*MB) return "El archivo supera los "+MAX_MB+" MB. Reduzca su tamaño y vuelva a adjuntarlo.";
  if(pesoTotal(clave)+a.size > MAX_TOTAL_MB*MB) return "Con este archivo el conjunto de documentos supera los "+MAX_TOTAL_MB+" MB que admite el envío. Reduzca el tamaño de sus archivos y vuelva a adjuntarlo.";
  return "";
}
function marcar(k,texto){
  const el = document.querySelector('.doc[data-k="'+k+'"]'); if(!el) return;
  el.classList.add("err");
  const det = el.querySelector(".det"); if(det){ det.setAttribute("role","alert"); det.textContent = texto; }
  const inp = el.querySelector("input[type=file]"); if(inp) inp.setAttribute("aria-invalid","true");
}
function enfocarDoc(k){
  const el = document.querySelector('.doc[data-k="'+k+'"]'); if(!el) return;
  const c = el.querySelector('.elegir[tabindex="0"]') || el.querySelector("input[type=file]");
  if(c) c.focus();
}

// ---------- Avance por pasos ----------

function avance(){
  const req = aplican(), listos = req.filter(d=>archivos[d.k]).length;
  const cuenta = $("cuenta"); if(cuenta) cuenta.textContent = "("+listos+" de "+req.length+")";
  document.querySelectorAll("#pasos li[data-p]").forEach(li=>{
    const fs = $(li.dataset.p); if(!fs) return;
    let ok;
    if(li.dataset.p==="p5") ok = listos===req.length;
    else{
      ok = [...fs.querySelectorAll("input,select")].every(c=>{
        if(c.type==="checkbox") return !c.required || c.checked;
        if(c.type==="file" || c.closest("#famBody")) return true;
        const exigido = c.required || (c.dataset.cond && v(c.dataset.cond));
        return !exigido || c.value.trim()!=="";
      });
      if(li.dataset.p==="p3") ok = ok && !!document.querySelector("#gastos input:checked");
    }
    li.classList.toggle("ok",ok);
  });
}

// ---------- Paso 4. Grupo familiar ----------

function filaFamilia(){
  const cuerpo = $("famBody"); if(!cuerpo) return;
  const tr = document.createElement("tr");
  ["Nombre y apellido","RUT","Parentesco","Edad","Actividad u oficio"].forEach((p,i)=>{
    const td=document.createElement("td"), inp=document.createElement("input");
    inp.type = i===3?"number":"text"; inp.setAttribute("aria-label",p+" de la persona "+(cuerpo.rows.length+1)); if(i===3){inp.min=0;inp.max=120}
    td.append(inp); tr.append(td);
  });
  const td=document.createElement("td"), b=document.createElement("button");
  b.type="button"; b.className="quitar"; b.textContent="Quitar"; b.setAttribute("aria-label","Quitar a la persona "+(cuerpo.rows.length+1));
  b.addEventListener("click",()=>{ tr.remove(); const s=$("famAdd"); if(s) s.focus(); });
  td.append(b); tr.append(td); cuerpo.append(tr);
}

// ---------- Validación ----------

function error(campo,texto){
  campo.setAttribute("aria-invalid","true");
  const c = campo.closest(".campo"); if(!c) return;
  c.classList.add("err");
  const m=document.createElement("span"); m.className="msj"; m.dataset.gen="1"; m.textContent=texto;
  if(campo.id){
    // El mensaje queda asociado al campo para que el lector de pantalla lo lea junto con él.
    m.id = "msj_"+campo.id;
    if(campo.dataset.desc===undefined) campo.dataset.desc = campo.getAttribute("aria-describedby")||"";
    campo.setAttribute("aria-describedby",(campo.dataset.desc+" "+m.id).trim());
  }
  c.append(m);
}
function limpiarError(campo){
  campo.removeAttribute("aria-invalid");
  if(campo.dataset.desc!==undefined){
    if(campo.dataset.desc) campo.setAttribute("aria-describedby",campo.dataset.desc); else campo.removeAttribute("aria-describedby");
    delete campo.dataset.desc;
  }
  const c = campo.closest(".campo"); if(!c) return;
  c.classList.remove("err");
  c.querySelectorAll(".msj").forEach(m=>{ if(m.dataset.gen) m.remove(); });
}
function validar(){
  document.querySelectorAll("#f [aria-invalid]").forEach(limpiarError);
  const faltas=[];
  const falla = (c,texto)=>{ error(c,texto); faltas.push(c); };
  document.querySelectorAll("#f input:not([type=file]):not([type=checkbox]), #f select").forEach(c=>{
    if(c.closest("#famBody")) return;
    const exigido = c.required || (c.dataset.cond && v(c.dataset.cond));
    if(!exigido) return;
    const t = c.value.trim();
    if(!t){ falla(c,"Falta este dato."); return; }
    if(c.dataset.rut!==undefined){
      if(!rutValido(t)) falla(c,"El RUT no es válido. Revise los números y el dígito verificador.");
      else if(c.id==="tutorRut" && rutLimpio(t)===rutLimpio(val("rut"))) falla(c,"El RUT del tutor no puede ser el mismo del postulante.");
    }
    else if(c.type==="email"){ if(!correoValido(t)) falla(c,"Escriba un correo válido, por ejemplo nombre@correo.cl."); }
    else if(c.type==="tel"){ if(!telefonoValido(t)) falla(c,"Escriba un teléfono válido, por ejemplo +56 9 1234 5678."); }
    else if(c.id==="promedio"){
      const n=aNota(t), anio=val("anio"), min=notaMinima(anio);
      if(!(n>=1&&n<=7)) falla(c,"El promedio debe estar entre 1,0 y 7,0.");
      else if(anio && n<min) falla(c,"La ordenanza exige un promedio mínimo de "+conComa(min)+" para el año que cursa.");
    }
  });
  const caja=$("gastos");
  if(caja){
    const hay = !!caja.querySelector("input:checked"), m=$("gastosMsj");
    if(m) m.hidden = hay;
    if(!hay) faltas.push(caja.querySelector("input")||caja);
  }
  const sinDoc = aplican().filter(d=>!archivos[d.k]);
  sinDoc.forEach(d=>marcar(d.k,"Falta adjuntar este documento."));
  const sinDecl = ["d1","d2","d3","d4"].filter(id=>$(id) && !v(id));
  sinDecl.forEach(id=>$(id).setAttribute("aria-invalid","true"));
  // Resguardo. El límite total ya se controla al adjuntar cada archivo.
  const excedido = pesoTotal() > MAX_TOTAL_MB*MB;
  return {faltas, sinDoc, sinDecl, excedido};
}
// Lleva el foco al primer problema, en el orden en que aparece en el formulario.
function enfocarPrimero(r){
  const lista = r.faltas.slice().sort((a,b)=> a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  if(lista.length){ lista[0].focus(); return; }
  if(r.sinDoc.length){ enfocarDoc(r.sinDoc[0].k); return; }
  if(r.sinDecl.length) $(r.sinDecl[0]).focus();
}

function aviso(tipo,titulo,texto){
  const s=$("salida") || $("f"); if(!s) return null;
  if(s.id==="salida") s.textContent="";
  const a=document.createElement("div"); a.className="aviso "+tipo;
  if(tipo==="error") a.setAttribute("role","alert");
  const b=document.createElement("b"); b.textContent=titulo; const p=document.createElement("span"); p.textContent=texto;
  a.append(b,p); s.append(a); a.scrollIntoView({block:"center"});
  return a;
}

// ---------- Borrador local ----------
// Evita que el postulante pierda lo escrito si cierra la página. Queda solo en este navegador.

function guardarBorrador(){
  try{
    const b = {t:Date.now(), c:{}, k:{}, g:[]};
    BORRADOR_TEXTO.forEach(id=>{ const x=val(id); if(x) b.c[id]=x; });
    BORRADOR_CHECKS.forEach(id=>{ if(v(id)) b.k[id]=true; });
    b.g = [...document.querySelectorAll("#gastos input:checked")].map(i=>i.value);
    localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(b));
  }catch(e){ /* almacenamiento bloqueado o lleno. El formulario funciona igual */ }
}
function borrarBorrador(){ try{ localStorage.removeItem(CLAVE_BORRADOR); }catch(e){} }
function restaurarBorrador(){
  let b;
  try{ b = JSON.parse(localStorage.getItem(CLAVE_BORRADOR)||"null"); }catch(e){ return; }
  if(!b || typeof b!=="object" || !b.c) return;
  if(!(Date.now()-b.t < BORRADOR_DIAS*86400000)){ borrarBorrador(); return; }
  let algo=false;
  BORRADOR_TEXTO.forEach(id=>{ const e=$(id), x=b.c[id]; if(e && typeof x==="string" && x){ e.value=x; algo = algo || e.value===x; } });
  BORRADOR_CHECKS.forEach(id=>{ const e=$(id); if(e && b.k && b.k[id]===true){ e.checked=true; algo=true; } });
  if(Array.isArray(b.g)) document.querySelectorAll("#gastos input").forEach(i=>{ if(b.g.includes(i.value)){ i.checked=true; algo=true; } });
  const f=$("f"); if(!algo || !f) return;
  // Aviso con la opción de borrar, pensando en computadores compartidos.
  const a=document.createElement("div"); a.className="aviso info"; a.id="borradorAviso";
  const t=document.createElement("b"); t.textContent="Recuperamos lo que usted había escrito";
  const p=document.createElement("span"); p.textContent="Estos datos estaban guardados solo en este navegador. La cuenta bancaria, el grupo familiar y los documentos no se guardan, por lo que debe ingresarlos nuevamente. ";
  const q=document.createElement("button"); q.type="button"; q.className="quitar"; q.textContent="Borrar los datos guardados y empezar de nuevo";
  q.addEventListener("click",()=>{ borrarBorrador(); f.reset(); Object.keys(archivos).forEach(k=>delete archivos[k]); a.remove(); alCambiarCondiciones(); alCambiarAnio(); const n=$("nombres"); if(n) n.focus(); });
  p.append(q); a.append(t,p); f.prepend(a);
}

// ---------- Envío ----------

const aBase64 = f => new Promise((ok,no)=>{ const r=new FileReader(); r.onload=()=>ok(String(r.result).split(",")[1]||""); r.onerror=()=>no(new Error("lectura")); r.readAsDataURL(f); });

async function armarCarga(){
  const datos = {};
  ["nombres","apellidos","rut","telefono","domicilio","correo","tutorNombre","tutorRut","titular","banco","tipoCuenta","numCuenta","institucion","carrera","anio","promedio","tramo"].forEach(k=>datos[k]=val(k));
  datos.rut = rutFormato(datos.rut);
  datos.promedio = datos.promedio.replace(",",".");
  datos.menor=v("menor");
  if(datos.menor) datos.tutorRut = rutFormato(datos.tutorRut); else { datos.tutorNombre=""; datos.tutorRut=""; }
  datos.credDiscapacidad=v("cDisc"); datos.credDiscapacidadFamiliar=v("cDiscFam"); datos.credCuidador=v("cCuid"); datos.programaFamilias=v("cFam");
  datos.gastos=[...document.querySelectorAll("#gastos input:checked")].map(i=>i.value);
  const cuerpo=$("famBody");
  const familia = cuerpo ? [...cuerpo.rows].map(tr=>[...tr.querySelectorAll("input")].map(i=>i.value.trim())).filter(f=>f.some(x=>x)) : [];
  const adj=[];
  for(const d of aplican()){ const a=archivos[d.k]; if(a) adj.push({clave:d.k,nombre:a.name,tipo:tipoArchivo(a),contenido:await aBase64(a)}); }
  return {datos,familia,archivos:adj};
}

// Envía y devuelve el folio. Si algo falla lanza un Error cuyo mensaje ya está redactado para el postulante.
async function enviar(carga){
  const ctrl = new AbortController();
  const reloj = setTimeout(()=>ctrl.abort(), ESPERA_MS);
  try{
    let r, texto;
    try{
      // Cuerpo como texto plano. Así el navegador no hace la consulta previa (CORS) que Apps Script no responde.
      r = await fetch(ENDPOINT,{method:"POST",body:JSON.stringify(carga),signal:ctrl.signal,redirect:"follow"});
      texto = await r.text();
    }catch(e){
      if(ctrl.signal.aborted) throw new Error("El envío tardó más de lo esperado y no recibimos la confirmación. Antes de intentar otra vez, revise si llegó a su correo el comprobante con el número de folio. Si no llegó, envíe nuevamente.");
      throw new Error("No fue posible conectar con el servidor del municipio. Revise su conexión a internet e intente nuevamente.");
    }
    let j=null; try{ j = JSON.parse(texto); }catch(e){}
    if(j && j.ok===true && typeof j.folio==="string" && j.folio) return j;
    if(j && j.ok===false && typeof j.error==="string" && j.error) throw new Error(j.error);
    throw new Error("El servidor respondió de una forma inesperada, por lo que su postulación no quedó confirmada. Intente nuevamente en unos minutos.");
  }finally{ clearTimeout(reloj); }
}

async function alEnviar(ev){
  ev.preventDefault();
  if(enviando) return;                       // evita el doble envío
  const r = validar();
  if(r.faltas.length||r.sinDoc.length||r.sinDecl.length||r.excedido){
    const partes=[];
    if(r.faltas.length) partes.push(r.faltas.length===1?"1 dato por completar o corregir":r.faltas.length+" datos por completar o corregir");
    if(r.sinDoc.length) partes.push(r.sinDoc.length===1?"1 documento sin adjuntar":r.sinDoc.length+" documentos sin adjuntar");
    if(r.sinDecl.length) partes.push("la declaración del paso 6");
    if(r.excedido) partes.push("reducir el tamaño de los documentos, que en conjunto superan los "+MAX_TOTAL_MB+" MB");
    aviso("error","Todavía no se puede enviar","Queda pendiente: "+partes.join(", ")+". Los campos con problemas están marcados en el formulario.");
    enfocarPrimero(r);
    return;
  }
  if(!ENDPOINT){ aviso("info","Formulario completo","Todos los datos y documentos están en orden. El envío se activará cuando el municipio conecte la recepción de postulaciones."); return; }
  const bot=$("enviar"), rotulo = bot ? bot.textContent : "";
  enviando=true; if(bot){ bot.disabled=true; bot.textContent="Enviando…"; }
  try{
    let carga;
    try{ carga = await armarCarga(); }
    catch(e){ throw new Error("No fue posible leer uno de los archivos adjuntos. Vuelva a adjuntar sus documentos e intente nuevamente."); }
    const j = await enviar(carga);
    borrarBorrador();
    const zona = document.querySelector(".zona") || $("f");
    const a=document.createElement("div"); a.className="aviso exito"; a.id="exito"; a.setAttribute("role","status"); a.tabIndex=-1;
    const b=document.createElement("b"); b.textContent="Postulación recibida. Folio "+j.folio;
    const p=document.createElement("span");
    p.textContent = j.comprobante===false
      ? "Su postulación quedó registrada, pero no fue posible enviar el comprobante a "+carga.datos.correo+". Anote su número de folio y consérvelo para cualquier consulta."
      : "Enviamos un comprobante a "+carga.datos.correo+". Guarde su número de folio para cualquier consulta.";
    a.append(b,p); zona.hidden=true; zona.parentNode.insertBefore(a,zona);
    const ba=$("borradorAviso"); if(ba) ba.remove();
    a.scrollIntoView({block:"center"}); a.focus({preventScroll:true});
  }catch(e){
    aviso("error","No pudimos recibir su postulación", e.message+" Sus datos siguen en esta página. Si el problema continúa, escriba a "+CORREO_BECA+".");
  }finally{ enviando=false; if(bot){ bot.disabled=false; bot.textContent=rotulo; } }
}

// ---------- Reacciones a cambios del formulario ----------

function alCambiarCondiciones(){ const t=$("tutorBox"); if(t) t.hidden=!v("menor"); pintarDocs(); }
function alCambiarAnio(){
  const a = val("anio"), primero = a==="1", l=$("promLabel"), y=$("promAyuda");
  if(l) l.textContent = primero ? "Promedio NEM (1° a 4° medio)" : "Promedio del último año aprobado";
  if(y) y.textContent = a ? "Mínimo exigido "+conComa(notaMinima(a))+"." : "Escala de 1,0 a 7,0.";
}

function iniciar(){
  const f=$("f");
  // El promedio pasa a campo de texto con teclado decimal. Un campo numérico rechaza la coma
  // en varios navegadores y deja el valor vacío, lo que confunde a quien escribe 5,5.
  const prom=$("promedio");
  if(prom){ prom.type="text"; prom.inputMode="decimal"; prom.setAttribute("maxlength","4"); if(!prom.placeholder) prom.placeholder="Ej. 5,8"; }
  const caja=$("gastos");
  if(caja && !caja.getAttribute("role")){ caja.setAttribute("role","group"); caja.setAttribute("aria-label","¿En qué usará la beca?"); if($("gastosMsj")) caja.setAttribute("aria-describedby","gastosMsj"); }

  filaFamilia(); filaFamilia();
  restaurarBorrador();
  alCambiarAnio(); alCambiarCondiciones();

  f.addEventListener("submit", alEnviar);
  ["menor","cDisc","cDiscFam","cCuid","cFam"].forEach(id=>{ const e=$(id); if(e) e.addEventListener("change",alCambiarCondiciones); });
  const anio=$("anio"); if(anio) anio.addEventListener("change",alCambiarAnio);
  const mas=$("famAdd"); if(mas) mas.addEventListener("click",filaFamilia);

  // Al salir de un campo se quitan los espacios sobrantes y se da formato al RUT.
  f.addEventListener("focusout",ev=>{
    const c=ev.target;
    if(!c || c.tagName!=="INPUT" || !/^(text|tel|email)$/.test(c.type)) return;
    let t=c.value.trim();
    if(c.dataset.rut!==undefined) t=rutFormato(t);
    if(t!==c.value) c.value=t;
  });
  // Al corregir un campo marcado desaparece su mensaje de error.
  let reloj=null;
  const alEditar = ev=>{
    const c=ev.target;
    if(c && c.getAttribute && c.getAttribute("aria-invalid") && c.type!=="file") limpiarError(c);
    if(c && c.closest && c.closest("#gastos")){ const m=$("gastosMsj"); if(m && document.querySelector("#gastos input:checked")) m.hidden=true; }
    avance();
    clearTimeout(reloj); reloj=setTimeout(guardarBorrador,400);
  };
  f.addEventListener("input",alEditar); f.addEventListener("change",alEditar);

  const modo=$("modo"); if(modo) modo.hidden = !!ENDPOINT;

  // Índice lateral. Marca la sección visible.
  if("IntersectionObserver" in window){
    const enlaces = [...document.querySelectorAll(".indice a")];
    const obs = new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting) enlaces.forEach(a=>a.getAttribute("href")==="#"+e.target.id ? a.setAttribute("aria-current","true") : a.removeAttribute("aria-current"));
    }),{rootMargin:"-20% 0px -70% 0px"});
    document.querySelectorAll("main section").forEach(s=>obs.observe(s));
  }
}

// En Node (pruebas) no existe document y solo quedan disponibles las funciones puras.
if(typeof document!=="undefined"){
  const arrancar = () => { if($("f")) iniciar(); };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",arrancar); else arrancar();
}
