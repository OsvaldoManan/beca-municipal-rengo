# Guía de despliegue

Guía para la persona de informática municipal que pondrá en marcha el sitio de la Beca Municipal Rengo. Tiene tres partes.

- **Parte A.** Recepción de postulaciones con Google Apps Script.
- **Parte B.** Publicación del sitio.
- **Parte C.** Listas de verificación antes de abrir y después de cerrar el período de postulación.

El orden recomendado es A, luego B y finalmente C. El sitio puede publicarse antes de completar la Parte A. En ese caso funciona en modo de revisión, muestra el aviso "Sitio en revisión" y no envía ni guarda nada.

---

## Parte A. Recepción de postulaciones (Google Apps Script)

Todo este apartado debe hacerse con una cuenta institucional `@munirengo.cl`. El servicio se ejecuta con los permisos de esa cuenta. Los archivos quedan a su nombre y los correos salen desde ella. Se recomienda una cuenta de función del área y no la cuenta personal de un funcionario.

### A1. Crear la carpeta de Drive

1. En Google Drive cree una carpeta, por ejemplo `Beca Municipal Rengo 2027 - Postulaciones`.
2. Ábrala y copie su identificador. Es el tramo de la dirección que sigue a `/folders/`.

```
https://drive.google.com/drive/folders/ESTE_ES_EL_IDENTIFICADOR
```

3. Compártala solo con las y los profesionales de DIDECO a cargo del proceso. No active el acceso por enlace.

### A2. Crear la hoja de cálculo

1. Cree una hoja de cálculo de Google vacía, por ejemplo `Beca Municipal Rengo 2027 - Registro`.
2. Copie su identificador. Es el tramo de la dirección entre `/d/` y la barra siguiente.

```
https://docs.google.com/spreadsheets/d/ESTE_ES_EL_IDENTIFICADOR/edit
```

3. Déjela vacía. El servicio escribe la fila de encabezados cuando llega la primera postulación y usa siempre la primera pestaña.
4. Aplique los mismos permisos restringidos que a la carpeta.

No mueva las columnas A (Folio) y E (RUT). El folio se calcula como el mayor folio existente más uno y el control de RUT duplicado lee la quinta columna. La última columna, «Observaciones», registra los casos en que la postulación quedó guardada pero falló el envío de algún correo.

### A3. Crear el proyecto y pegar el código

1. Ingrese a `script.google.com` con la cuenta institucional y cree un proyecto nuevo. Asígnele un nombre reconocible, por ejemplo `Beca Municipal Rengo - Recepción`.
2. Borre el contenido del archivo `Código.gs` que aparece por defecto.
3. Pegue el contenido completo de `backend/Code.gs` y guarde.

### A4. Configurar las constantes

Edite las primeras líneas del código.

| Constante | Valor |
| --- | --- |
| `CARPETA_ID` | Identificador de la carpeta del paso A1 |
| `HOJA_ID` | Identificador de la hoja del paso A2 |
| `CORREO_BECA` | Casilla que recibe copia de cada postulación. Viene definida como `becaestudiantil@munirengo.cl` |
| `ANIO_PROCESO` | Año del proceso. Se usa en el folio, en el comprobante y en el control de plazo |
| `CONTROLAR_PLAZO` | Déjela en `false` durante las pruebas. Vea el paso A8 |

Los identificadores van entre comillas simples, en reemplazo de los textos `PEGAR_ID_DE_LA_CARPETA` y `PEGAR_ID_DE_LA_HOJA`.

### A5. Implementar como aplicación web

1. En el editor elija **Implementar** y luego **Nueva implementación**.
2. En el tipo seleccione **Aplicación web**.
3. Configure las dos opciones siguientes.
   - **Ejecutar como:** Yo.
   - **Quién tiene acceso:** Cualquier usuario.
4. Pulse **Implementar** y acepte la solicitud de autorización. Google pedirá permiso para acceder a Drive, a las hojas de cálculo y para enviar correos en nombre de la cuenta.
5. Copie la URL de la aplicación web. Termina en `/exec`.

La opción "Cualquier usuario" es necesaria porque quienes postulan no inician sesión en Google. Si la opción no aparece o la autorización queda bloqueada, la restricción proviene de la consola de administración de Google Workspace del municipio y debe resolverla quien la administra.

### A6. Conectar el sitio

Abra `js/app.js` y pegue la URL en la constante `ENDPOINT`, entre las comillas.

```js
const ENDPOINT = "https://script.google.com/macros/s/IDENTIFICADOR_DE_LA_IMPLEMENTACION/exec";
```

La constante se encuentra en `js/app.js` y no en `index.html`.

Publique el cambio según la Parte B. Con `ENDPOINT` definido, el aviso "Sitio en revisión" desaparece y el botón "Enviar postulación" transmite los datos. Si utiliza la versión de un solo archivo, vuelva a generarla con `python3 tools/build.py`.

### A7. Probar con una postulación ficticia

Use datos inventados y documentos de prueba. El RUT debe tener un dígito verificador correcto, por ejemplo `11.111.111-1`. Indique un correo al que usted tenga acceso.

Verifique cada uno de estos resultados.

- [ ] La página muestra "Postulación recibida" con un folio de la forma `BMR-2027-0001`.
- [ ] En la carpeta de Drive existe una subcarpeta con el folio y el nombre, y contiene los documentos.
- [ ] La hoja tiene la fila de encabezados y una fila con los datos. El teléfono y el número de cuenta conservan sus ceros iniciales.
- [ ] Llegó el comprobante al correo indicado en el formulario.
- [ ] Llegó la copia con los adjuntos a `becaestudiantil@munirengo.cl`.
- [ ] Un segundo envío con el mismo RUT es rechazado con el mensaje "Ya existe una postulación registrada con este RUT".

Repita la prueba marcando las opciones condicionales (menor de edad, credencial de discapacidad, cuidador, programa Familias) para confirmar que los documentos adicionales también llegan.

Pruebe además un envío con todos los documentos cercanos a los 5 MB. Google aplica límites al tamaño de las solicitudes, al tamaño total de los adjuntos de un correo y a la cantidad de correos diarios, y esos límites dependen del tipo de cuenta. Revise los valores vigentes en la documentación de cuotas de Google Apps Script y contrástelos con el número de postulaciones que espera recibir.

Si algo falla, el mensaje de error aparece en la página. El detalle de cada ejecución está en el editor de Apps Script, en la sección **Ejecuciones**.

Al terminar, elimine las filas de prueba de la hoja (conserve la fila de encabezados o deje la hoja totalmente vacía), las subcarpetas de prueba y los correos generados. El folio de la primera postulación real será `0001` solo si la hoja queda con los encabezados y sin otras filas.

### A8. Activar el control de plazo

El artículo 9 de la ordenanza fija el período de postulación entre el 1 y el 30 de marzo de cada año. Antes del 1 de marzo realice lo siguiente.

1. Confirme que `ANIO_PROCESO` corresponde al año en curso.
2. Cambie `CONTROLAR_PLAZO` a `true` y guarde.
3. Publique el cambio como se indica en A9.

Con el control activado, el servicio rechaza todo envío realizado fuera del 1 al 30 de marzo del año indicado. Las pruebas de la sección A7 dejan de funcionar fuera de ese período.

El control usa la fecha según la zona horaria del proyecto. Revísela en **Configuración del proyecto** y ajústela a la hora de Chile continental para que el cierre ocurra a la medianoche local del 30 de marzo.

El formulario del sitio no bloquea por fecha. Fuera de plazo la persona puede llenarlo, pero al enviar recibe el mensaje de rechazo del servicio.

### A9. Publicar cambios posteriores en el código

Guardar el código no actualiza la aplicación web. Después de cualquier modificación siga estos pasos.

1. Elija **Implementar** y luego **Gestionar implementaciones**.
2. Edite la implementación existente, seleccione **Nueva versión** y pulse **Implementar**.

De este modo la URL `/exec` se mantiene. Si crea una implementación nueva en lugar de editar la existente, la URL cambia y deberá actualizar `ENDPOINT` y volver a publicar el sitio.

---

## Parte B. Publicación del sitio

El sitio consta de archivos estáticos. Solo estos cuatro elementos deben quedar públicos.

```
index.html
css/
js/
assets/
```

Las carpetas `backend/`, `tests/`, `tools/` y `docs/` no forman parte del sitio público.

### Opción 1. Servidor web municipal

1. Copie `index.html` y las carpetas `css`, `js` y `assets` al directorio del servidor que corresponda, conservando la estructura.
2. Sirva el sitio por HTTPS.
3. Abra la dirección pública y confirme que se ven los logos y los estilos y que el formulario responde.

Si el gestor de contenidos solo admite un archivo, genere la versión de un solo archivo y publique `dist/beca-municipal-rengo.html`.

```bash
python3 tools/build.py
```

### Opción 2. GitHub Pages

El repositorio debe estar en GitHub. Vea [SUBIR-A-GITHUB.md](SUBIR-A-GITHUB.md).

**Con el flujo de trabajo incluido (recomendado).**

1. En el repositorio abra **Settings** y luego **Pages**.
2. En **Build and deployment**, elija **GitHub Actions** como origen.
3. Cada cambio en la rama `main` ejecuta `.github/workflows/pages.yml`, que publica solo `index.html`, `css`, `js` y `assets`.
4. Revise el resultado en la pestaña **Actions**. La dirección del sitio aparece en **Settings** y luego **Pages**.

**Sin flujo de trabajo.**

1. En **Settings** y luego **Pages**, elija **Deploy from a branch**.
2. Seleccione la rama `main` y la carpeta `/ (root)` y guarde.

Con esta modalidad se publica el repositorio completo, incluidas `backend/`, `docs/` y `tests/`. No contienen datos personales, pero no son parte del sitio. Use una sola de las dos modalidades.

En ambos casos, cada cambio en `ENDPOINT` requiere subir el archivo `js/app.js` actualizado a la rama `main`. La URL `/exec` queda visible en el código del sitio, lo que es propio de este diseño. No es una clave. La protección de los datos depende de los permisos de la carpeta y de la hoja, no de mantener oculta esa dirección.

---

## Parte C. Listas de verificación

### Antes de abrir las postulaciones (1 de marzo)

- [ ] El contenido del sitio fue revisado por DIDECO contra la ordenanza vigente.
- [ ] La carpeta, la hoja y el proyecto de Apps Script pertenecen a una cuenta institucional.
- [ ] `CARPETA_ID`, `HOJA_ID`, `CORREO_BECA` y `ANIO_PROCESO` tienen los valores correctos.
- [ ] `ENDPOINT` en `js/app.js` contiene la URL `/exec` y el sitio publicado ya no muestra "Sitio en revisión".
- [ ] Se completó la prueba de la sección A7 y se eliminaron los datos de prueba.
- [ ] `CONTROLAR_PLAZO` está en `true`, el cambio fue publicado como nueva versión y la zona horaria del proyecto es la de Chile.
- [ ] La carpeta y la hoja están compartidas solo con las personas responsables y sin acceso por enlace.
- [ ] Al menos dos profesionales de DIDECO administran la casilla `becaestudiantil@munirengo.cl`, como dispone el artículo 12.
- [ ] La casilla tiene espacio disponible. Cada postulación llega con sus documentos adjuntos.
- [ ] Se revisaron las cuotas de Apps Script frente al volumen esperado de postulaciones.
- [ ] Asesoría Jurídica revisó los puntos de [PROTECCION-DE-DATOS.md](PROTECCION-DE-DATOS.md).
- [ ] El sitio fue probado en un teléfono y en un computador.
- [ ] Existe una persona de contacto de informática durante el período.

### Durante el período (1 al 30 de marzo)

- [ ] Revisar periódicamente la sección **Ejecuciones** de Apps Script en busca de errores.
- [ ] Comprobar que el número de filas de la hoja coincide con el de subcarpetas y con el de correos recibidos.
- [ ] No ordenar, filtrar con eliminación ni borrar filas de la hoja.

### Después del cierre (desde el 31 de marzo)

- [ ] Confirmar que el servicio rechaza los envíos nuevos.
- [ ] Retirar o desactivar el formulario del sitio, o informar en la página que el período terminó.
- [ ] Guardar una copia de respaldo de la hoja y de la carpeta dentro del Drive institucional.
- [ ] Entregar la información al equipo que realiza la admisibilidad durante abril.
- [ ] Retirar los permisos de acceso que ya no sean necesarios.
- [ ] Aplicar la política de conservación y eliminación que defina el municipio.
- [ ] Antes del proceso siguiente, crear una carpeta y una hoja nuevas, actualizar `CARPETA_ID`, `HOJA_ID` y `ANIO_PROCESO` y publicar una nueva versión.

## Dónde queda la información

| Qué | Dónde vive | Quién la ve |
| --- | --- | --- |
| Páginas del sitio, formatos y ordenanza | Repositorio y servidor web (GitHub Pages o servidor municipal) | Público |
| Datos de cada postulación | Hoja de cálculo «Postulaciones Beca Municipal Rengo», pestaña principal | Solo quienes tengan acceso a la hoja |
| Control de documentos | Misma hoja, pestaña «Documentos». Una fila por postulación con Sí, No o No aplica en cada documento | Igual |
| Conteos del proceso | Misma hoja, pestaña «Resumen». Postulaciones recibidas, documentos por tipo, tramos y avance de la revisión, con fórmulas que se actualizan solas | Igual |
| Archivos adjuntos | Carpeta de Drive «Documentos de postulantes», con una subcarpeta por folio | Solo quienes tengan acceso a la carpeta |
| Correo de respaldo | Lo envía el servicio al postulante con folio, fecha y lista de documentos. Una copia llega a becaestudiantil@munirengo.cl | Postulante y casilla de la beca |

Nada de lo que escribe el postulante se guarda en el repositorio ni en el servidor web. El sitio solo transporta la postulación hasta el servicio de Apps Script, que la deja en la hoja y en la carpeta.

La plantilla `plantillas/postulaciones-beca-municipal-rengo.xlsx` contiene las tres pestañas con sus encabezados y fórmulas. Se puede subir a Drive y abrir como Hoja de cálculo de Google, o usar como respaldo en Excel. La función `prepararResumen` de `Panel.gs` vuelve a crear la pestaña «Resumen» si se borra.
