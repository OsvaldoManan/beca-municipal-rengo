# Protección de datos personales

Nota práctica para quienes administran el sitio y la recepción de postulaciones. No es un informe jurídico ni reemplaza la revisión de la Dirección de Asesoría Jurídica.

## Qué datos recoge el formulario

| Tipo de dato | Ejemplos |
| --- | --- |
| Identificación y contacto | Nombres, apellidos, RUT, teléfono, domicilio, correo |
| Datos bancarios | Titular, banco, tipo y número de cuenta |
| Situación socioeconómica | Tramo y cartola del Registro Social de Hogares, participación en el programa Familias, Seguridades y Oportunidades |
| Salud y discapacidad | Credencial de discapacidad propia o de un familiar, credencial de cuidador |
| Grupo familiar | Nombre, RUT, parentesco, edad y actividad de cada integrante |
| Menores de edad | Datos de postulantes menores de 18 años y de su padre, madre o tutor |
| Documentos | Cédula de identidad, certificados académicos y de residencia, declaraciones juradas |

Parte de esta información es sensible y parte corresponde a menores de edad y a terceros que no llenan el formulario. Por eso requiere un cuidado mayor que el de un trámite común.

El aviso de apertura guarda aparte, en la pestaña «Recordatorios», solo el correo de quien lo pide y la fecha. Se usa únicamente para avisar que abrió la postulación. Conviene borrar esa pestaña al cerrar el proceso.

Las cifras públicas del sitio son totales agregados, sin datos que identifiquen a una persona.

## Dónde quedan los datos

| Lugar | Qué contiene |
| --- | --- |
| Repositorio de GitHub y sitio estático | Ningún dato personal. Solo código, textos y logos |
| Carpeta institucional de Google Drive | Una subcarpeta por postulante con sus documentos |
| Hoja de cálculo institucional | Una fila por postulación con los datos del formulario |
| Casilla `becaestudiantil@munirengo.cl` | Copia de cada postulación con los documentos adjuntos |
| Correo de la persona postulante | Comprobante con el folio, sin adjuntos |

El navegador envía los datos directamente a la aplicación web de Google Apps Script por una conexión HTTPS. El sitio no usa cookies propias ni herramientas de analítica y no guarda la postulación en el navegador. La página carga su tipografía desde Google Fonts, lo que implica una solicitud del navegador de cada visitante a ese servicio.

## Resguardos prácticos

1. **Cuenta institucional.** La carpeta, la hoja de cálculo y el proyecto de Apps Script deben pertenecer a una cuenta `@munirengo.cl`, nunca a una cuenta personal. Así la información permanece bajo control del municipio cuando cambian las personas a cargo.
2. **Acceso restringido.** Comparta la carpeta y la hoja solo con las y los profesionales de DIDECO responsables del proceso. El artículo 12 de la ordenanza dispone que la casilla de la beca sea administrada por al menos dos profesionales de DIDECO. Use el mismo criterio para Drive.
3. **Sin enlaces abiertos.** La carpeta y la hoja no deben quedar con acceso para "cualquier persona con el enlace". Revise esta configuración antes de abrir el período de postulación.
4. **Verificación en dos pasos.** Actívela en las cuentas que acceden a la carpeta y a la casilla.
5. **Nada de datos reales en el repositorio.** No suba postulaciones, exportaciones de la hoja ni capturas de pantalla con datos de personas. El archivo `.gitignore` excluye `postulaciones/`, `*.xlsx` y `*.csv` como resguardo adicional, pero no reemplaza la revisión previa a cada subida.
6. **Pruebas con datos ficticios.** Use nombres inventados y documentos de prueba. Elimine después la fila, la carpeta y los correos generados.
7. **Copias locales.** Evite descargar la hoja o los documentos a computadores personales, memorias externas o servicios de mensajería. Si una descarga es necesaria, elimínela al terminar.
8. **Publicación de resultados.** Defina con Asesoría Jurídica qué datos se publican en la nómina de resultados y en qué forma.
9. **Incidentes.** Si la información se expone o se envía a un destinatario equivocado, avise de inmediato a la jefatura de DIDECO y a la Dirección de Asesoría Jurídica.

## Conservación y eliminación

Este proyecto no fija plazos de conservación. Corresponde al municipio definir cuánto tiempo se guardan las postulaciones y sus documentos, quién las elimina y cómo queda registro de esa eliminación. Conviene tomar esa decisión antes de recibir la primera postulación y considerar por separado a las personas beneficiarias, cuyos antecedentes respaldan el pago y la rendición, y a las no seleccionadas.

Al cerrar cada proceso, revise también quiénes mantienen acceso a la carpeta y a la hoja y retire los permisos que ya no se justifiquen.

## Marco legal

El tratamiento de estos datos está sujeto a la legislación chilena sobre datos personales, en particular la Ley N° 19.628 sobre protección de la vida privada y la Ley N° 21.719, que la reforma. Esta nota no interpreta esas normas ni establece qué obligaciones concretas derivan de ellas para el municipio.

Se recomienda que la Dirección de Asesoría Jurídica revise, antes de la puesta en marcha, los siguientes puntos.

- El texto informativo y las declaraciones que la persona postulante acepta en el formulario.
- El tratamiento de datos sensibles, de menores de edad y de integrantes del grupo familiar.
- El uso de servicios de Google para almacenar la información.
- Los plazos de conservación y el procedimiento de eliminación.
- El canal por el que una persona puede consultar, corregir o pedir la eliminación de sus datos.
