/**
 * Base de respuestas del asistente de consultas y buscador que elige la respuesta.
 *
 * Cada respuesta resume un punto de la Ordenanza de Postulación y Entrega de la Beca Municipal Rengo
 * (Decreto Alcaldicio N° 340 de 26 de febrero de 2026) e indica el artículo de origen.
 * El asistente NO genera texto: busca la respuesta más cercana a la pregunta entre las de esta lista.
 * Si ninguna coincide lo dice y deriva al correo de la beca.
 *
 * Para corregir o agregar una respuesta edite ORDENANZA_BASE y ejecute  node tests/asistente.test.js
 *   t  título breve (también se muestra como sugerencia)
 *   a  artículo o anexo de la ordenanza
 *   k  palabras con que la gente suele preguntar esto (sin tildes, separadas por espacio)
 *   r  respuesta
 *   e  enlace opcional [texto, destino], o varios [[texto, destino], [texto, destino]]
 *   En «a», las respuestas sobre el funcionamiento del sitio (y no sobre la ordenanza) comienzan con «Sitio».
 */
var ORDENANZA_PDF = "documentos/ordenanza-beca-municipal-rengo.pdf";
var ORDENANZA_CORREO = "becaestudiantil@munirengo.cl";

var ORDENANZA_BASE = [
  { id: "que-es", t: "Qué es la beca", a: "Artículos 1 y 2",
    k: "que es beca municipal consiste objetivo finalidad para que sirve trata sentido",
    r: "Es un aporte económico de la Ilustre Municipalidad de Rengo para estudiantes de la comuna que cursan educación superior. Su objetivo es promover la igualdad de oportunidades y el desarrollo integral, reconociendo los logros y el esfuerzo personal y familiar en materias académicas." },
  { id: "monto", t: "Monto de la beca", a: "Artículo 6",
    k: "monto cuanto dinero plata valor cantidad pesos 400000 400.000 lucas entregan dan cuotas",
    r: "La beca es de $400.000. Se entrega en una sola cuota en el mes de mayo, por transferencia electrónica o cheque, y debe rendirse a más tardar el 30 de noviembre." },
  { id: "quienes", t: "Quiénes pueden postular", a: "Artículos 1 y 4",
    k: "quien quienes puede puedo pueden postular dirigida destinatarios universidad instituto profesional cft centro formacion tecnica carrera tecnica pregrado estudios sirve mi carrera",
    r: "Pueden postular estudiantes de la comuna de Rengo que cursen una carrera de pregrado conducente a título profesional en una universidad estatal o privada, o una carrera en un instituto profesional o centro de formación técnica. La institución debe estar acreditada por la Comisión Nacional de Acreditación y la carrera reconocida por el Ministerio de Educación.",
    e: ["Ver requisitos", "#requisitos"] },
  { id: "requisitos", t: "Requisitos para postular", a: "Artículo 7",
    k: "requisitos requisito condiciones exigen exigencias necesito cumplir que piden que necesito",
    r: "Debe ser alumno regular de educación superior, tener rendimiento académico meritorio (NEM 6,0 si ingresa a primer año, o promedio 5,0 desde segundo año), Registro Social de Hogares actualizado en la comuna, residencia en Rengo certificada por la junta de vecinos y una cuenta bancaria a su nombre o de su tutor legal. No debe tener título profesional ni grado de licenciado.",
    e: ["Ver requisitos", "#requisitos"] },
  { id: "notas", t: "Promedio de notas exigido", a: "Artículo 7 letra d",
    k: "nota notas promedio nem minimo minima rendimiento academico concentracion calificaciones 6.0 5.0 6,0 5,0 me alcanza",
    r: "Si ingresa a primer año de educación superior se exige promedio NEM de 6,0 (notas de 1° a 4° medio), acreditado con la concentración de notas de enseñanza media. Desde segundo año se exige promedio 5,0, acreditado con el certificado de notas de su institución. Se exige porque la beca reconoce el rendimiento académico meritorio, que además define el 40% del puntaje.",
    e: ["Cómo conseguir el certificado", "#guia"] },
  { id: "documentos", t: "Documentos que se adjuntan", a: "Artículo 7 y Anexo 1",
    k: "documentos documento papeles piden pide antecedentes adjuntar subir presentar certificado certificados cuales lista fotocopia cedula carnet alumno regular",
    r: "Formulario de postulación, cédula de identidad por ambos lados, certificado de alumno regular, concentración de notas NEM o certificado de notas del último año, cartola del Registro Social de Hogares, certificado de residencia de la junta de vecinos y declaración jurada simple. Según su caso se agregan la credencial de discapacidad, la credencial de cuidador o el Formulario Único de Derivación del programa Familias, Seguridades y Oportunidades.",
    e: ["Ver documentos", "#documentos"] },
  { id: "fechas", t: "Fechas de postulación", a: "Artículo 9",
    k: "fecha fechas cuando plazo plazos periodo postulacion postular abre abren cierra cierran inicio termino marzo calendario etapas hasta cuando",
    r: "La recepción de antecedentes va del 1 al 30 de marzo de cada año. La revisión de admisibilidad se realiza del 1 al 30 de abril. El listado de beneficiarios se publica y la beca se paga en mayo.",
    e: ["Ver calendario", "#fechas"] },
  { id: "como-postular", t: "Cómo se postula", a: "Artículos 10 letra d y 12",
    k: "como postulo postular postulacion donde forma manera online linea internet digital formulario correo enviar presencial papel fisico oficina entregar",
    r: "La postulación es solo por medios digitales. No se reciben postulaciones presenciales ni en papel. Los antecedentes se envían por el medio digital habilitado para el período y la casilla de la beca es " + ORDENANZA_CORREO + ". Necesita un correo electrónico personal, que se usará en todas las etapas.",
    e: ["Ir al formulario", "#postular"] },
  { id: "apoyo", t: "Ayuda para postular", a: "Artículo 11 letra f",
    k: "ayuda apoyo no tengo computador internet celular medios no se usar orientacion asistencia organizaciones comunitarias dideco alguien me ayude",
    r: "Si no cuenta con los medios para postular en línea, la Oficina de Organizaciones Comunitarias de DIDECO habilita un espacio donde un profesional le apoya para completar el proceso. Aun así la postulación se realiza en formato digital." },
  { id: "titulo", t: "Si ya tiene un título", a: "Artículo 7",
    k: "titulo titulado profesional licenciado licenciatura postgrado magister doctorado diplomado segunda carrera ya tengo egresado",
    r: "No pueden optar a la beca quienes estén en posesión de un título profesional o grado de licenciado, ni quienes cursen una carrera de postgrado." },
  { id: "funcionarios", t: "Funcionarios municipales y sus familias", a: "Artículo 8",
    k: "funcionario funcionarios municipal trabaja trabajo municipalidad honorarios contrata planta hijo hija familiar familia papa mama padre madre pariente",
    r: "No pueden postular los funcionarios municipales de planta, contrata o Código del Trabajo ni los prestadores de servicios a honorarios. Sus familiares directos e indirectos sí pueden postular." },
  { id: "otras-becas", t: "Compatibilidad con otros beneficios", a: "Artículo 15",
    k: "gratuidad otra otras beca becas cae credito aval estado fondo solidario compatible compatibilidad junaeb tengo otro beneficio beneficios",
    r: "Sí puede postular. Tener otros fondos del Estado, como becas, fondo solidario o crédito con aval del Estado, no es impedimento para adjudicarse la beca municipal." },
  { id: "puntaje", t: "Cómo se calcula el puntaje", a: "Artículos 16 y 17",
    k: "puntaje puntos puntuacion criterios evaluacion evaluan calculan ponderacion porcentaje porcentajes seleccion seleccionan eligen como eligen",
    r: "El puntaje suma tres criterios ponderados. Rendimiento académico 40%, tramo del Registro Social de Hogares 45% y condición de vulnerabilidad 15%. Las becas se asignan de mayor a menor puntaje. En la sección de puntaje puede calcular una estimación.",
    e: ["Calcular mi puntaje", "#simulador"] },
  { id: "empate", t: "Qué pasa si hay empate", a: "Artículo 17",
    k: "empate empatan igualdad mismo puntaje desempate sorteo prioridad rural",
    r: "Ante un empate tienen prioridad, en este orden, los estudiantes con credencial de discapacidad o de cuidador, luego quienes son parte del programa Familias, Seguridades y Oportunidades y después quienes tienen residencia rural dentro de la comuna. Si la igualdad se mantiene se realiza un sorteo aleatorio." },
  { id: "comite", t: "Quién evalúa", a: "Artículos 12 y 13",
    k: "quien evalua revisa comite comision evaluador evaluadora decide decision integrantes profesionales",
    r: "Dos profesionales de DIDECO realizan la primera revisión de los documentos. La evaluación está a cargo de un Comité Técnico Evaluador integrado por el Director o Directora de Desarrollo Comunitario, un asistente social designado por esa dirección y el encargado o encargada del Departamento Social." },
  { id: "resultados", t: "Cuándo y dónde salen los resultados", a: "Artículos 9 y 24",
    k: "resultados resultado lista listado nomina seleccionados beneficiarios publican publicacion sabre saber quede gane avisan informan donde veo",
    r: "El listado de beneficiarios se publica en mayo en los medios digitales del municipio, que son la página web, Instagram y Facebook. La publicación se hace dentro de los 5 días hábiles siguientes a la tramitación del decreto alcaldicio que ratifica a los seleccionados." },
  { id: "no-seleccionado", t: "Si no resulta seleccionado", a: "Artículo 14 letra c",
    k: "no quede no seleccionado rechazado rechazaron rechazo inadmisible razones motivo apelar apelacion reclamo por que no",
    r: "El Departamento Social responde por correo electrónico a quienes no resulten seleccionados, señalando las razones. La ordenanza no establece un procedimiento de apelación. Para consultas sobre su caso escriba a " + ORDENANZA_CORREO + "." },
  { id: "pago", t: "Cuándo y cómo se paga", a: "Artículos 6 y 20",
    k: "pago pagan pagar depositan deposito transferencia transfieren cheque cuando llega recibo dinero entrega mayo",
    r: "La beca se paga en mayo, en una sola cuota. Una vez tramitado el decreto alcaldicio, la Dirección de Administración y Finanzas gestiona la transferencia bancaria a nombre del beneficiario o de su tutor legal." },
  { id: "gastos", t: "En qué se puede gastar", a: "Artículo 5",
    k: "gastar gasto gastos usar uso ocupar utilizar comprar sirve para que cubre items item matricula arancel materiales insumos computador notebook libros utiles",
    r: "Puede elegir uno o más de estos ítems, sin superar el monto de la beca. Matrícula o cuota de arancel, insumos, materiales o productos de apoyo que requiera su carrera, pasajes de traslado entre su residencia y la institución, y arriendo de hospedaje. Deben ser gastos futuros, porque no se financian gastos ya realizados.",
    e: ["Ver uso y rendición", "#uso"] },
  { id: "traslados", t: "Pasajes y combustible", a: "Artículo 5 letra c",
    k: "pasaje pasajes traslado traslados transporte locomocion micro bus tren bencina combustible auto vehiculo peaje uber taxi",
    r: "Se financian los pasajes entre su residencia habitual y su institución de estudios, rendidos con boletos originales o comprobantes de recarga de microbuses, buses interurbanos o trenes. No se acepta combustible ni gastos asociados al uso de vehículo particular." },
  { id: "arriendo", t: "Arriendo de hospedaje", a: "Artículo 5 letra d",
    k: "arriendo arrendar pension hospedaje pieza departamento residencia estudiantil alojamiento contrato",
    r: "Puede destinar la beca al pago de arriendo de hospedaje. Se acredita con un contrato de arriendo vigente y un documento que respalde el pago mensual, como comprobante de transferencia, boleta o recibo firmado." },
  { id: "rendicion", t: "Cómo y cuándo se rinde", a: "Artículos 10 letra e y 21",
    k: "rendicion rendir rindo rendiciones planilla oficina partes noviembre justificar comprobar donde entrego boletas plazo rendir",
    r: "La rendición se entrega de manera presencial y en papel en la Oficina de Partes de la municipalidad, con plazo máximo el 30 de noviembre. Se usa la Planilla de Rendición del Anexo 2, acompañada de las boletas y respaldos que acrediten el gasto. Se exige porque la beca se paga con fondos públicos, cuyo uso debe demostrarse conforme a la Resolución N° 30 de la Contraloría General de la República.",
    e: [["Descargar la planilla de rendición", "documentos/formatos/planilla-rendicion.pdf"], ["Ver uso y rendición", "#uso"]] },
  { id: "respaldos", t: "Qué boletas sirven para rendir", a: "Artículo 21 letra c",
    k: "boleta boletas factura facturas comprobante comprobantes respaldo respaldos sirven validos original originales detalle voucher",
    r: "Todo gasto debe respaldarse con su documento mercantil en original y sin correcciones, por ejemplo comprobante de pago, pagaré, boleta, factura o boleta de servicio. El documento debe especificar claramente el gasto o el detalle de lo comprado. Solo valen gastos posteriores al decreto y a la transferencia, con la excepción de la matrícula." },
  { id: "tarjeta", t: "Pagos con tarjeta de crédito", a: "Artículo 21 letra c",
    k: "tarjeta credito debito pague pagar con tarjeta cuotas visa mastercard",
    r: "No se aceptan en la rendición los pagos efectuados con tarjeta de crédito." },
  { id: "reintegro", t: "Si gasta menos del monto", a: "Artículo 21 letra b",
    k: "gaste menos sobra sobro sobrante diferencia devolver reintegro reintegrar no ocupe todo saldo resto",
    r: "Si los comprobantes no reflejan la totalidad del monto de la beca, debe reintegrar la diferencia a través de la Dirección de Administración y Finanzas." },
  { id: "observaciones", t: "Observaciones a la rendición", a: "Artículo 21 letra c",
    k: "observacion observaciones corregir subsanar errores rendicion mala rechazada plazo dias habiles",
    r: "Si la rendición tiene observaciones, la Dirección de Administración y Finanzas se las notifica. El plazo para corregirlas lo fija la Dirección de Control y no puede superar los 20 días hábiles. Si no se corrigen, debe reintegrar los valores en Tesorería Municipal dentro de 15 días hábiles desde la notificación." },
  { id: "no-rendir", t: "Qué pasa si no rinde", a: "Artículo 22",
    k: "no rindo no rendir sancion castigo consecuencia bloqueo bloquean multa que pasa si no rindo atraso",
    r: "La no rendición queda registrada en el Departamento de Finanzas y permite bloquear al estudiante de los beneficios que otorga el municipio por dos años calendario, mientras no regularice su situación." },
  { id: "menores", t: "Postulantes menores de 18 años", a: "Artículo 7 letra b",
    k: "menor menores edad 17 anos tutor apoderado autorizacion padres",
    r: "Si tiene menos de 18 años debe presentar además la fotocopia de la cédula de identidad de su padre o madre, o en su ausencia la del tutor, y una autorización simple que respalde la postulación. El pago puede hacerse a la cuenta del tutor legal.",
    e: [["Autorización del tutor", "documentos/formatos/autorizacion-simple-tutor.pdf"], ["Declaración jurada para menores", "documentos/formatos/declaracion-jurada-menores-de-edad.pdf"]] },
  { id: "cuenta", t: "Cuenta bancaria", a: "Artículos 7 letra i y 20",
    k: "cuenta bancaria banco rut cuentarut vista corriente titular a nombre de otra persona ahorro",
    r: "Debe ser titular de una cuenta bancaria para recibir la transferencia. También puede usarse la cuenta del tutor legal. El formulario de la ordenanza pide indicar si la cuenta es vista o corriente y su número. Se solicita porque el pago se hace en una sola cuota por transferencia electrónica." },
  { id: "rsh", t: "Registro Social de Hogares", a: "Artículos 7 letra f y 16",
    k: "registro social hogares rsh tramo cartola ficha porcentaje vulnerabilidad 40 60 actualizado otra comuna",
    r: "Debe tener el Registro Social de Hogares actualizado en la comuna de Rengo. El tramo pesa 45% del puntaje. Hasta el 40% obtiene 100 puntos, del 41% al 50% obtiene 75, del 51% al 60% obtiene 50, del 61% al 70% obtiene 25, del 71% al 80% obtiene 10 y del 81% al 100% obtiene 0. Se solicita porque de la cartola se obtiene el tramo socioeconómico del hogar, que es el criterio de mayor peso.",
    e: [["Cómo conseguir la cartola", "#guia"], ["Calcular mi puntaje", "#simulador"]] },
  { id: "residencia", t: "Certificado de residencia", a: "Artículo 7 letra g",
    k: "residencia junta vecinos domicilio vivo vivir direccion comuna certificado de residencia estudio en otra ciudad santiago",
    r: "Debe acreditar residencia en la comuna de Rengo con un certificado otorgado por la junta de vecinos correspondiente a su sector. Estudiar en otra ciudad no impide postular, porque el requisito se refiere a su residencia en la comuna. Se solicita porque la beca se financia con el presupuesto municipal y está destinada a estudiantes de Rengo.",
    e: ["Cómo conseguirlo", "#guia"] },
  { id: "vulnerabilidad", t: "Discapacidad, cuidadores y programa Familias", a: "Artículos 7 y 16",
    k: "discapacidad credencial cuidador cuidadora cuidadores registro nacional familias seguridades oportunidades fud derivacion condicion",
    r: "La condición de vulnerabilidad pesa 15% del puntaje. Obtiene 100 puntos el estudiante con credencial de discapacidad, con credencial de cuidador o que es parte del programa Familias, Seguridades y Oportunidades. Obtiene 75 puntos si un integrante de su familia tiene credencial de discapacidad. Cada condición se acredita con su credencial, el certificado del Registro Nacional de Cuidadores o el Formulario Único de Derivación." },
  { id: "declaracion", t: "Declaración jurada", a: "Artículo 7 letra h y Anexo",
    k: "declaracion jurada simple notaria notario firmar firma formato",
    r: "Se pide una declaración jurada simple en el formato que entrega el municipio. En ella declara conocer la ordenanza, que la información entregada es fidedigna y que cumple los requisitos. La ordenanza la define como simple, es decir, no exige trámite notarial. Se solicita para dejar constancia de que usted conoce y acepta las condiciones de la beca.",
    e: ["Descargar el formato", "documentos/formatos/declaracion-jurada-simple.pdf"] },
  { id: "cupos", t: "Cuántas becas se entregan", a: "Artículos 2 y 23",
    k: "cuantas becas cupos cupo vacantes numero cantidad beneficiarios presupuesto alcanza para todos",
    r: "La ordenanza no fija un número de becas. La entrega está sujeta a la disponibilidad de recursos del presupuesto municipal anual, y cada año se da a conocer el monto destinado junto con los períodos de postulación, evaluación, resultados y transferencias." },
  { id: "renovacion", t: "Postular otra vez al año siguiente", a: "Artículo 9",
    k: "renovar renovacion renueva automatica siguiente ano todos los anos de nuevo otra vez volver postular ya la tuve",
    r: "La ordenanza establece un período de postulación cada año y no menciona una renovación automática. Quien quiera optar nuevamente debe postular en el período correspondiente y cumplir los requisitos." },
  { id: "ceremonia", t: "Ceremonia de entrega", a: "Artículo 9",
    k: "ceremonia acto entrega oficial evento asistir",
    r: "La entrega del beneficio puede efectuarse en una ceremonia oficial programada entre los meses de mayo y junio para los postulantes seleccionados." },
  { id: "derechos", t: "Derechos y obligaciones", a: "Artículos 10 y 11",
    k: "derecho derechos obligacion obligaciones deberes deber compromiso mantener requisitos",
    r: "Tiene derecho a conocer la ordenanza, a ser orientado en la postulación, a ser informado de los resultados, a hacer consultas y a recibir orientación sobre la rendición. Sus obligaciones son presentar la documentación en plazo, entregar información fidedigna, mantener los requisitos que dieron origen a la beca, postular por medios digitales y rendir los gastos." },
  { id: "contacto", t: "Dónde hacer consultas", a: "Artículos 11 y 12",
    k: "contacto consulta consultas correo mail email telefono llamar escribir hablar persona atencion duda dudas",
    r: "Las consultas sobre la beca se dirigen a " + ORDENANZA_CORREO + ", casilla que administran al menos dos profesionales de DIDECO. También puede acercarse a la Oficina de Organizaciones Comunitarias de DIDECO." },
  { id: "texto", t: "Dónde leer la ordenanza completa", a: "Artículo 25",
    k: "ordenanza completa texto leer descargar pdf decreto documento oficial vigencia vigente norma reglamento bases",
    r: "La ordenanza fue aprobada por Decreto Alcaldicio N° 340 de 26 de febrero de 2026. Puede descargar el texto completo desde este sitio.",
    e: ["Descargar la ordenanza", ORDENANZA_PDF] },
  { id: "formatos", t: "Formatos para descargar", a: "Artículo 7 y Anexos",
    k: "descargar descarga bajar formato formatos plantilla plantillas imprimir archivo archivos word modelo anexo anexos donde saco",
    r: "Puede descargar cuatro formatos listos para imprimir y firmar. La declaración jurada simple, que es obligatoria. La declaración jurada y la autorización del tutor, para postulantes menores de 18 años. Y la planilla de rendición, que se usa en noviembre.",
    e: [["Declaración jurada simple", "documentos/formatos/declaracion-jurada-simple.pdf"], ["Declaración para menores", "documentos/formatos/declaracion-jurada-menores-de-edad.pdf"],
        ["Autorización del tutor", "documentos/formatos/autorizacion-simple-tutor.pdf"], ["Planilla de rendición", "documentos/formatos/planilla-rendicion.pdf"], ["Ordenanza completa", ORDENANZA_PDF]] },
  { id: "por-que", t: "Por qué se piden tantos antecedentes", a: "Artículos 7, 16 y 21",
    k: "por que porque razon motivo para que tanto tantos piden pide solicitan solicita exigen necesario justificacion sentido tramite burocracia",
    r: "Cada antecedente cumple una función en la evaluación. La cédula identifica al postulante. El certificado de alumno regular acredita que cursa estudios superiores. Las notas miden el rendimiento, que pesa 40% del puntaje. La cartola del Registro Social de Hogares entrega el tramo socioeconómico, que pesa 45%. El certificado de residencia acredita que vive en Rengo. Las credenciales acreditan la condición de vulnerabilidad, que pesa 15%. La cuenta bancaria permite el pago. Como la beca se financia con fondos públicos, todo requisito debe quedar respaldado con un documento.",
    e: ["Ver qué acredita cada documento", "#documentos"] },
  { id: "alumno-regular", t: "Certificado de alumno regular", a: "Artículo 7 letra c",
    k: "alumno regular certificado matricula matriculado acreditar estudios todavia no tengo congelado congele suspendi",
    r: "Debe acreditar sus estudios con un certificado de alumno regular de una institución de educación superior reconocida por el Estado. Lo emite su casa de estudios. Se solicita porque la beca cubre gastos de estudios en curso.",
    e: ["Cómo conseguirlo", "#guia"] },
  { id: "cedula", t: "Cédula de identidad", a: "Artículo 7 letra b",
    k: "cedula carnet identidad fotocopia vencida vencido vigente ambos lados foto extranjero pasaporte",
    r: "Se pide la fotocopia de su cédula de identidad por ambos lados y vigente. Sirve para verificar su identidad y su RUT, que es el dato con que se registra la postulación y se emite el pago." },
  { id: "grupo-familiar", t: "Datos del grupo familiar", a: "Formulario de postulación",
    k: "grupo familiar familia integrantes hogar viven conmigo parentesco hermanos padres datos de mi familia",
    r: "El formulario de la ordenanza pide el nombre, RUT, parentesco, edad y actividad de quienes integran su hogar, y que presente la cartola del Registro Social de Hogares. Se solicita para contrastar la composición del hogar con la cartola, que determina el tramo socioeconómico." },
  { id: "correo", t: "Correo electrónico personal", a: "Artículo 12",
    k: "correo electronico personal mail email gmail no tengo correo de quien cual usar institucional",
    r: "Cada postulante debe contar con un correo electrónico personal, que se usa durante todas las etapas del proceso. A ese correo llegan el comprobante de su postulación y la respuesta del municipio." },
  { id: "archivos", t: "Formato y tamaño de los archivos", a: "Sitio y Anexo 1",
    k: "archivo archivos formato pdf jpg png foto fotos celular escanear escaneado tamano peso pesa megas mb muy grande no sube no carga error subir",
    r: "Cada documento se adjunta en PDF, JPG o PNG, con un máximo de 5 MB por archivo y 25 MB en total. Puede fotografiar los documentos con el celular, siempre que se lean completos y sin cortes. La ordenanza pide que la documentación sea legible y completa." },
  { id: "comprobante", t: "Comprobante de la postulación", a: "Sitio",
    k: "comprobante confirmacion confirmar respaldo recibi recibieron llego envie enviada folio numero constancia correo de confirmacion como se que",
    r: "Al enviar el formulario la página muestra su número de folio y usted recibe un correo de respaldo con el folio, la fecha de recepción y la lista de documentos recibidos. Conserve ese correo. Si no llega, revise la carpeta de correo no deseado y luego escriba a " + ORDENANZA_CORREO + "." },
  { id: "estado", t: "Revisar el estado de la postulación", a: "Sitio",
    k: "estado etapa seguimiento revisar consultar como va mi postulacion en que va avance tramite",
    r: "Con su folio y su RUT puede consultar en este sitio la etapa de su postulación. Los estados son recibida y en revisión, admisible y en evaluación, no admisible, y el resultado final.",
    e: ["Consultar estado", "#estado"] },
  { id: "corregir", t: "Corregir o repetir una postulación", a: "Sitio",
    k: "corregir correccion error equivoque equivocado cambiar modificar editar repetir dos veces duplicada otra vez mal subi mal",
    r: "Se acepta una postulación por RUT. Si necesita corregir un dato o reemplazar un documento después de enviar, escriba a " + ORDENANZA_CORREO + " indicando su folio. Antes de enviar revise sus datos, porque el formulario le muestra lo que falta." },
  { id: "privacidad", t: "Uso de los datos personales", a: "Sitio",
    k: "datos personales privacidad proteccion informacion quien ve mis datos seguro seguridad confidencial uso guardan",
    r: "Los datos y documentos se usan solo para evaluar su postulación y gestionar la beca, y así lo autoriza usted al enviar el formulario. La casilla de la beca la administran profesionales de DIDECO. Este asistente no guarda ni envía lo que usted escribe." },
  { id: "reemplazo", t: "Reemplazar un documento", a: "Sitio",
    k: "reemplazar reemplazo ilegible borroso reenviar volver enviar documento malo me pidieron aviso subsanar subsanacion",
    r: "Si el municipio le avisa por correo que un documento no pudo validarse, puede enviarlo nuevamente desde la sección de estado, con su folio y su RUT. Solo se aceptan reemplazos que el municipio haya solicitado.",
    e: ["Reemplazar un documento", "#reemplazo"] },
  { id: "resumen", t: "Resumen para imprimir", a: "Sitio",
    k: "resumen imprimir impreso hoja folleto volante triptico afiche compartir repartir una pagina",
    r: "Hay un resumen de una página con requisitos, fechas, documentos y criterios, pensado para imprimir y compartir.",
    e: ["Descargar el resumen", "documentos/resumen-beca-municipal-rengo.pdf"] },
  { id: "conseguir", t: "Cómo conseguir los documentos", a: "Sitio",
    k: "como consigo conseguir obtener obtengo saco sacar pedir tramitar donde pido clave unica chileatiende",
    r: "La cartola del Registro Social de Hogares y la concentración de notas de enseñanza media se obtienen en línea. El certificado de alumno regular lo emite su institución y el de residencia lo entrega su junta de vecinos. El sitio tiene una guía con los pasos y los enlaces oficiales.",
    e: ["Ver la guía", "#guia"] }
];

/* ───────── buscador ───────── */

var ASISTENTE_VACIAS = ("a al algo como con de del el en es esta este la las le lo los me mi mis o para pero por se si sin su sus un una uno y ya yo que cual cuales " +
  "hay ser soy son tengo tiene tienen puedo puede debo debe quiero necesito saber sobre hola buenas gracias favor beca municipal rengo").split(" ");

// Palabras interrogativas: ayudan a desempatar, pero por sí solas no bastan para elegir una respuesta.
var ASISTENTE_DEBILES = ["cuanto", "cuando", "donde", "quien", "hasta"];

/** Minúsculas, sin tildes, sin signos. Los plurales y terminaciones se recortan a una raíz corta. */
function asistentePalabras(texto) {
  var limpio = String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/(\d)[.,](\d)/g, "$1$2").replace(/[^a-z0-9ñ]+/g, " ").trim();
  if (!limpio) return [];
  return limpio.split(" ").filter(function (p) { return p.length > 1 && ASISTENTE_VACIAS.indexOf(p) < 0; }).map(asistenteRaiz);
}
function asistenteRaiz(p) {
  if (/^\d+$/.test(p)) return p;
  if (/^cuant[oa]s?$/.test(p)) return "cuanto";
  if (p.length > 4 && /es$/.test(p)) p = p.slice(0, -2);
  else if (p.length > 3 && /s$/.test(p)) p = p.slice(0, -1);
  return p.length > 6 ? p.slice(0, 6) : p;
}

var ASISTENTE_INDICE = null;
function asistenteIndice() {
  if (ASISTENTE_INDICE) return ASISTENTE_INDICE;
  var frec = {};
  var docs = ORDENANZA_BASE.map(function (x) {
    var claves = {}, titulo = {};
    asistentePalabras(x.k).forEach(function (p) { claves[p] = 1; });
    asistentePalabras(x.t).forEach(function (p) { titulo[p] = 1; });
    var todas = {};
    Object.keys(claves).concat(Object.keys(titulo)).forEach(function (p) { todas[p] = 1; });
    Object.keys(todas).forEach(function (p) { frec[p] = (frec[p] || 0) + 1; });
    return { claves: claves, titulo: titulo };
  });
  var n = ORDENANZA_BASE.length, peso = {};
  Object.keys(frec).forEach(function (p) { peso[p] = Math.log(1 + n / frec[p]); });
  ASISTENTE_INDICE = { docs: docs, peso: peso };
  return ASISTENTE_INDICE;
}

/**
 * Busca la respuesta más cercana a la pregunta.
 * Devuelve {entrada, relacionadas} o {entrada:null, relacionadas:[]} si nada coincide lo suficiente.
 */
function asistenteBuscar(pregunta) {
  var ix = asistenteIndice();
  var palabras = asistentePalabras(pregunta).filter(function (p, i, a) { return a.indexOf(p) === i; });
  if (!palabras.length) {
    // «¿Qué es la beca?» solo contiene palabras muy comunes: se responde con la definición.
    var general = /\bbeca\b/i.test(String(pregunta || "")) ? ORDENANZA_BASE[0] : null;
    return { entrada: general, relacionadas: [] };
  }
  var puntajes = ix.docs.map(function (d, i) {
    var s = 0;
    palabras.forEach(function (p) {
      var f = ASISTENTE_DEBILES.indexOf(p) >= 0 ? 0.3 : 1;
      if (d.claves[p]) s += ix.peso[p] * f;
      if (d.titulo[p]) s += ix.peso[p] * 0.5 * f;
    });
    return { i: i, s: s };
  }).sort(function (a, b) { return b.s - a.s; });
  var mejor = puntajes[0];
  // Umbral: al menos una palabra distintiva. Bajo ese nivel es más honesto decir que no se encontró.
  if (mejor.s < 2.2) return { entrada: null, relacionadas: [] };
  var relacionadas = puntajes.slice(1, 4).filter(function (x) { return x.s >= mejor.s * 0.55 && x.s >= 2.2; })
    .map(function (x) { return ORDENANZA_BASE[x.i]; });
  return { entrada: ORDENANZA_BASE[mejor.i], relacionadas: relacionadas };
}
