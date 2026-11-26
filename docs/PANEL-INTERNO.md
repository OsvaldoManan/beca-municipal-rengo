# Panel interno de admisibilidad y nómina

El panel trabaja sobre la misma hoja de cálculo que recibe las postulaciones. Calcula el puntaje del artículo 16, ordena la nómina y aplica el desempate del artículo 17. No decide la admisibilidad, no realiza sorteos y no envía correos.

## Instalación

1. Abra el proyecto de Apps Script donde está `Code.gs`.
2. Agregue dos archivos de secuencia de comandos y pegue el contenido de `backend/Puntaje.gs` y `backend/Panel.gs`.
3. En `Panel.gs` indique en `CUPOS` el número de becas que permite el presupuesto del año. Con `0` la nómina se ordena pero no marca seleccionados.

El menú «Beca Municipal» aparece en la hoja solo si el proyecto fue creado desde ella (Extensiones > Apps Script). En un proyecto independiente ejecute las funciones desde el editor.

## Uso

| Paso | Quién | Qué hace |
| --- | --- | --- |
| 1. Preparar columnas de revisión (`prepararRevision`) | Profesional a cargo | Agrega las columnas «Admisible», «Motivo de inadmisibilidad», «Residencia rural» y «Resultado» al final de la hoja |
| 2. Revisar cada postulación | Profesionales de DIDECO (artículo 12) | Abre la carpeta, verifica los documentos y marca «Admisible» con Sí o No. Si es No, escribe el motivo. Marca «Residencia rural» cuando corresponda |
| 3. Corregir datos no acreditados | Profesionales de DIDECO | El puntaje usa lo declarado en el formulario. Si una credencial, el tramo o el promedio no coinciden con los documentos, se corrige la celda |
| 4. Generar nómina (`generarNomina`) | Profesional a cargo | Escribe las pestañas «Nómina», «Inadmisibles» y «Pendientes». Se puede repetir las veces que sea necesario |

## Cierre del proceso

Estas funciones exigen que `CUPOS` esté definido y que no queden empates por sortear.

| Función | Qué hace |
| --- | --- |
| Registrar resultados (`registrarResultados`) | Copia «Seleccionado» o «Lista de espera» a la columna «Resultado» de la hoja principal. Esa columna es la que lee la consulta de estado del sitio |
| Preparar correos (`prepararCorreos`) | Escribe en la pestaña «Correos» un borrador para cada seleccionado, cada postulante en lista de espera y cada inadmisible, con su motivo (artículo 14 letra c). No envía nada |
| Enviar correos marcados (`enviarCorreos`) | Envía solo las filas donde «Enviar» dice Sí y anota la fecha, de modo que repetir la función no duplica envíos |
| Preparar publicación (`prepararPublicacion`) | Deja en la pestaña «Publicación» el texto que Informática guarda como `datos/resultados.json` en el sitio |

La publicación incluye cifras agregadas y la nómina de seleccionados con folio y puntaje. No incluye nombres salvo que se cambie `PUBLICAR_NOMBRES` a `true`. Esa decisión corresponde al municipio, considerando que la ordenanza ordena publicar el listado de beneficiarios (artículo 9) y que se trata de un beneficio social.

## Informe de cierre

`prepararInformeCierre` escribe en la pestaña «Informe de cierre» las cifras agregadas del proceso. Incluye postulaciones recibidas, admisibles e inadmisibles, becas asignadas, monto ejecutado, puntaje de corte, distribución por tramo, institución y año de carrera, condiciones de vulnerabilidad declaradas y motivos de inadmisibilidad. No contiene datos de personas, por lo que puede copiarse a un memorándum o a una presentación para el Concejo.

## Reemplazo de documentos ilegibles

La ordenanza no regula la subsanación de antecedentes. Por eso esta función viene desactivada (`SUBSANACION_ACTIVA` en `Code.gs`) y solo debe activarse con el visto bueno de la Dirección de Asesoría Jurídica.

1. `prepararSubsanaciones` crea la pestaña «Subsanaciones».
2. El profesional anota el folio, elige el documento, escribe la observación y marca «Enviar aviso» con Sí.
3. `enviarAvisosSubsanacion` envía el correo al postulante y anota la fecha. No repite avisos.
4. El postulante sube el archivo en el sitio, sección de estado, con su folio y su RUT.
5. El servicio guarda el archivo en la carpeta del postulante con el nombre del documento y la palabra «reemplazo», sin borrar el original, y anota la fecha en «Reemplazo recibido».

El servicio rechaza cualquier archivo que no corresponda a una solicitud pendiente de esa pestaña.

## Encuesta

Después de postular, el sitio ofrece tres preguntas. Las respuestas llegan a la pestaña «Encuesta» con fecha, dos notas de 1 a 5 y un comentario. No se registra folio, RUT ni correo.

## Lectura de la pestaña «Nómina»

| Columna | Significado |
| --- | --- |
| Lugar | Posición por puntaje. Las postulaciones en empate total comparten lugar |
| Puntos rendimiento, RSH y vulnerabilidad | Calificación de 0 a 100 en cada criterio, antes de ponderar |
| Puntaje final | Suma ponderada 40%, 45% y 15% |
| Desempate | «Resuelto por artículo 17» cuando el orden entre puntajes iguales lo definió una prioridad. «Empate total» cuando ninguna prioridad los separa |
| Estado | «Seleccionado», «Lista de espera», «Requiere sorteo» o «Admisible» si no hay cupos definidos |
| Monto | $400.000 para cada seleccionado. Junto a nombre, RUT y puntaje forma la tabla que exige el artículo 19 para el decreto |

«Requiere sorteo» aparece solo cuando un grupo en empate total queda a ambos lados del último cupo. El sorteo lo realiza la comisión y su resultado se registra fuera del panel.

## Criterios de lectura de la tabla del artículo 16

La regla está en `js/puntaje.js` y su copia `backend/Puntaje.gs`. Donde la tabla no es explícita se adoptaron estos criterios, que el Comité Técnico Evaluador debe confirmar antes de usar la nómina.

1. Los promedios se comparan con un decimal.
2. Un NEM de 6,6 recibe 100 puntos. La tabla dice «sobre 6,6» y el tramo anterior termina en 6,5, de modo que 6,6 quedaría sin puntaje. La lectura contraria se activa cambiando una constante.
3. Los tramos 90% y 100% del Registro Social de Hogares reciben 0 puntos.
4. En vulnerabilidad se asigna el puntaje más alto que corresponda, sin sumar.

Si se cambia la regla, edite `js/puntaje.js`, cópielo sobre `backend/Puntaje.gs` y ejecute `node tests/puntaje.test.js`.

## Límites

El panel se probó con servicios de Google simulados. La lectura y escritura real en la hoja debe verificarse con postulaciones ficticias antes de abril.

## Aviso de apertura por correo

Antes del inicio del período (`PLAZO_INICIO`), el sitio ofrece a las personas dejar su correo para recibir un aviso cuando abra la postulación. Los correos quedan en la pestaña «Recordatorios» de la hoja, con la fecha de la solicitud.

El día de la apertura, abra el proyecto en Apps Script, elija la función `enviarRecordatorios` en el selector y pulse **Ejecutar**. El resultado indica cuántos avisos se enviaron y cuántos quedaron pendientes.

- La función solo envía dentro del período de postulación. Antes de la apertura no envía nada.
- Cada aviso enviado queda marcado con su fecha en la columna «Aviso enviado», de modo que nadie lo recibe dos veces.
- La cuota diaria de correo de la cuenta es limitada. La función deja sin usar 20 envíos (`RESERVA_CORREOS`) para los comprobantes de postulación. Si quedan pendientes, ejecútela de nuevo al día siguiente.
- Para desactivar el aviso, cambie `RECORDATORIOS_ACTIVOS` a `false` en `Code.gs` y publique una versión nueva.

## Cifras públicas

Durante el período de postulación, la sección «Estado y resultados» del sitio muestra en vivo el total de postulaciones recibidas y la cantidad por día, por tramo del Registro Social de Hogares, por unidad vecinal, por tipo de institución, por área de la carrera y por rango de edad. El servicio entrega solo esos totales. No entrega nombres, RUT, correos, fechas de nacimiento ni ningún otro dato que identifique a una persona.

Cada cifra se publica por separado, sin cruces. Un grupo de 1 a 4 personas se muestra como «menos de 5», para que nadie pueda ser reconocido en una comuna pequeña. El umbral se ajusta con `UMBRAL_CIFRAS` en `Code.gs`. Para dejar de publicarlas, cambie `PUBLICAR_CIFRAS` a `false` y publique una versión nueva.

## Panel interno de postulaciones

El panel completo para el equipo de DIDECO es la pestaña «Resumen» de la hoja de cálculo. Solo la ven las personas con acceso a la hoja. Ejecute `prepararResumen()` una vez después de publicar esta versión, y otra vez si cambian las listas. Sus fórmulas se actualizan solas con cada postulación.

Muestra los mismos conteos del sitio sin ocultar grupos pequeños, la revisión de admisibilidad y dos cruces, unidad vecinal por tipo de institución y área de la carrera por tramo.

## Listas del formulario

- Unidades vecinales. Son las 21 unidades vecinales, 9 urbanas y 12 rurales, del documento «Diagnóstico Unidades Vecinales. 9 urbanas 12 rurales» de la Secretaría de Planificación Comunal (catastro al 2 de abril de 2026). El documento indica que la estructura está en actualización durante 2026, de modo que conviene confirmarla antes de cada proceso. Se agrega la opción «No sé a qué unidad vecinal pertenezco».
- Tipo de institución. Universidad, instituto profesional o centro de formación técnica.
- Área de la carrera. Las diez áreas del conocimiento que usa el Servicio de Información de Educación Superior del Mineduc.

Las listas viven en `Code.gs` (`SECTORES`, `TIPOS_INSTITUCION`, `AREAS_CARRERA`) y en `index.html`. Deben coincidir, y `tests/backend.test.js` lo verifica.
