# Beca Municipal Rengo

Sitio público de la Beca Municipal Rengo, el beneficio de apoyo a estudiantes de educación superior que administra la Dirección de Desarrollo Comunitario (DIDECO) de la Ilustre Municipalidad de Rengo.

El sitio cumple dos funciones. Informa los requisitos, documentos, fechas, puntaje y rendición del beneficio, y ofrece un formulario de postulación en línea con carga de documentos.

La norma que rige el beneficio es la Ordenanza de Postulación y Entrega de la Beca Municipal Rengo, Decreto Alcaldicio N° 340 de 26 de febrero de 2026. Ante cualquier diferencia entre este sitio y la ordenanza, prevalece la ordenanza.

## Estado actual

La recepción de postulaciones no está conectada. La constante `ENDPOINT` de `js/app.js` está vacía, por lo que el sitio funciona en modo de revisión. En ese modo el formulario se puede recorrer y validar completo, pero ningún dato ni archivo se envía ni se guarda, y la página muestra el aviso "Sitio en revisión".

Para activar la recepción siga la guía [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

## Estructura

| Ruta | Contenido |
| --- | --- |
| `index.html` | Página única con la información de la beca y el formulario de postulación |
| `css/estilos.css` | Estilos del sitio |
| `js/app.js` | Lógica del formulario. Valida datos y documentos y envía la postulación a la dirección definida en `ENDPOINT` |
| `assets/` | Logos oficiales de la Municipalidad de Rengo |
| `backend/Code.gs` | Servicio de recepción en Google Apps Script |
| `tools/build.py` | Genera en `dist/` una versión del sitio en un solo archivo |
| `documentos/` | Ordenanza de la beca en PDF y formatos imprimibles (`documentos/formatos/`, generados con `node tools/formatos.js`) |
| `datos/` | `resultados.json`, que alimenta la sección de resultados del sitio |
| `plantillas/` | Planilla de control en Excel con las pestañas Postulaciones, Documentos y Resumen |
| `tests/` | Pruebas automáticas |
| `docs/` | Guías de despliegue, publicación en GitHub y protección de datos |
| `.github/workflows/pages.yml` | Publicación automática en GitHub Pages |

La carpeta `dist/` es una salida de compilación. No se versiona y se regenera cuando se necesita.

## Abrir el sitio en su computador

El sitio es estático y no requiere instalación. Basta abrir `index.html` en un navegador.

Si prefiere servirlo por HTTP, como lo hará el servidor definitivo, ejecute lo siguiente en la carpeta del proyecto y luego visite `http://localhost:8000`.

```bash
python3 -m http.server 8000
```

La tipografía se carga desde Google Fonts. Sin conexión a internet el sitio funciona igual y usa las fuentes del sistema.

## Compilar la versión de un solo archivo

```bash
python3 tools/build.py
```

El comando requiere Python 3 y no usa bibliotecas externas. Genera dos archivos.

| Archivo | Uso |
| --- | --- |
| `dist/beca-municipal-rengo.html` | Sitio completo con estilos, código y logos incrustados. Sirve para enviarlo por correo o revisarlo sin servidor |
| `dist/vista-previa.html` | Fragmento sin las etiquetas `html`, `head` y `body`, pensado para vistas previas incrustadas |

La versión de un solo archivo copia el contenido de `js/app.js` tal como está en ese momento. Si cambia `ENDPOINT`, vuelva a compilar.

## Ejecutar las pruebas

Las pruebas requieren Node.js.

```bash
node tests/rut.test.js
node tests/backend.test.js
node tests/puntaje.test.js
node tests/asistente.test.js
node tests/gestion.test.js
node tests/formulario.e2e.js
```

La primera verifica la validación del RUT. La segunda ejecuta el servicio de recepción contra servicios de Google simulados. La de puntaje verifica la regla del artículo 16 y el armado de la nómina. La última recorre el formulario de principio a fin en un navegador y requiere Playwright con Chromium instalado.

## Cómo funciona la postulación

1. La persona completa el formulario en su navegador y adjunta los documentos. Se aceptan archivos PDF, JPG o PNG de hasta 5 MB cada uno.
2. `js/app.js` valida los datos antes de enviar. Revisa los campos obligatorios, el dígito verificador del RUT, el formato del correo, el promedio mínimo según el año que se cursa, los documentos exigidos según cada caso y las declaraciones finales.
3. Si `ENDPOINT` tiene una dirección, el navegador convierte cada archivo a base64 y envía una única solicitud `POST` con un cuerpo JSON de tres partes, `datos`, `familia` y `archivos`.
4. La aplicación web de Google Apps Script (`backend/Code.gs`) recibe la solicitud y vuelve a validar. Comprueba los datos mínimos, el RUT, la presencia de los documentos obligatorios, el tipo y tamaño de cada archivo y que no exista otra postulación con el mismo RUT. Si `CONTROLAR_PLAZO` está activado, rechaza los envíos fuera del período del 1 al 30 de marzo.
5. El servicio asigna un folio con el formato `BMR-AÑO-0001`, crea en Google Drive una carpeta para la persona postulante y guarda allí sus documentos.
6. El servicio agrega una fila a la hoja de cálculo con los datos de la postulación y el enlace a la carpeta.
7. El servicio envía un comprobante al correo de la persona postulante y una copia con los documentos adjuntos a `becaestudiantil@munirengo.cl`, la casilla prevista en el artículo 12 de la ordenanza.
8. El navegador muestra el folio en pantalla. Si algo falla, muestra el motivo y conserva los datos en la página para reintentar.

Ningún dato de postulantes pasa por este repositorio ni queda en el sitio estático. Toda la información se almacena en el Drive, la hoja de cálculo y el correo institucionales. Vea [docs/PROTECCION-DE-DATOS.md](docs/PROTECCION-DE-DATOS.md).

## Documentación

| Documento | Para qué sirve |
| --- | --- |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Puesta en marcha de la recepción y publicación del sitio |
| [docs/SUBIR-A-GITHUB.md](docs/SUBIR-A-GITHUB.md) | Publicación de este repositorio en GitHub |
| [docs/PROTECCION-DE-DATOS.md](docs/PROTECCION-DE-DATOS.md) | Resguardos para el tratamiento de los datos personales |

## Créditos

Desarrollado por Osvaldo Mañán Arce para la Dirección de Desarrollo Comunitario de la Ilustre Municipalidad de Rengo.

## Logos y licencia

Los logos de la carpeta `assets/` pertenecen a la Ilustre Municipalidad de Rengo. Se incluyen solo para el uso institucional de este sitio y no pueden reutilizarse sin autorización del municipio.

Este repositorio no incluye una licencia. Su titular definirá las condiciones de uso del código.

## Simulador y panel interno

La sección de puntaje del sitio incluye un simulador para el postulante. La misma regla (`js/puntaje.js`, copiada en `backend/Puntaje.gs`) alimenta el panel interno que ordena la nómina de admisibles. Vea `docs/PANEL-INTERNO.md`.

## Asistente de consultas

El sitio incluye una ventana de consultas sobre la ordenanza (`js/asistente.js`). No usa inteligencia artificial generativa ni servicios externos. Busca la respuesta más cercana entre las 39 de `js/ordenanza.js`, cada una con su artículo de origen, y cuando no encuentra una lo dice y deriva al correo de la beca. Las preguntas no se guardan ni se envían. Para corregir o agregar respuestas edite `js/ordenanza.js` y ejecute `node tests/asistente.test.js`.

## Complementos del sitio

`js/complementos.js` reúne cinco ayudas que funcionan sin servidor, salvo la consulta de estado.

| Complemento | Qué hace | Ajuste |
| --- | --- | --- |
| Aviso de plazo | Muestra los días que faltan para la apertura o el cierre del 1 al 30 de marzo | `PLAZO_ANIO` y `PLAZO_CERRAR_FORMULARIO` en `js/complementos.js` |
| Lista de verificación | El postulante confirma que reunió requisitos y documentos antes del formulario | Marcado en `index.html`, bloque `#verifica` |
| Accesibilidad | Tamaño de letra y alto contraste, recordados en el navegador | Barra superior |
| Estado por folio | Consulta la etapa de una postulación con folio y RUT. Requiere `ENDPOINT` | Lee las columnas «Admisible» y «Resultado» de la hoja |
| Resultados | Muestra cifras y nómina cuando `datos/resultados.json` tiene `"publicado": true` | El panel interno genera ese archivo |

El asistente puede registrar las consultas que no supo responder. Viene desactivado. Para activarlo cambie `REGISTRAR_CONSULTAS` a `true` en `js/asistente.js` y en `backend/Code.gs`. Se guarda solo el texto y la fecha, y el asistente avisa al usuario.
