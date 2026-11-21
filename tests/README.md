# Pruebas

Requieren Node y Playwright con Chromium, ya instalados en el equipo de desarrollo. No se conectan a servicios reales ni envían datos.

```
node tests/rut.test.js          # funciones puras de js/app.js: RUT, correo, teléfono, notas, tipo de archivo
node tests/formulario.e2e.js    # formulario completo en Chromium, con el servicio de recepción simulado
node tests/backend.test.js      # lógica de backend/Code.gs con Drive, hoja, correo y candado simulados
```

Cada comando termina con código 0 si todo está correcto y distinto de 0 si algo falla.

## Qué cubre cada una

- `rut.test.js` evalúa `js/app.js` en un contexto sin página, de modo que solo se cargan sus funciones.
- `formulario.e2e.js` abre `index.html` desde el disco y revisa el envío vacío, las validaciones, el modo de revisión, el borrador local, el envío correcto con folio, las respuestas de error del servidor, el doble envío y la ausencia de desborde horizontal a 400 px. Ambas pruebas reemplazan al vuelo el valor de `const ENDPOINT` en `js/app.js`, de modo que nunca envían datos al servicio real. Los elementos se buscan solo por `id`.
- `backend.test.js` ejecuta `doPost` y `doGet` con objetos que imitan los servicios de Google.

## Qué no cubren

Google Apps Script no se puede ejecutar fuera de Google. Antes de abrir la postulación es indispensable una prueba real con la aplicación web ya implementada: abrir la URL `/exec` (debe responder `"configurado":true`), enviar una postulación ficticia desde el sitio y confirmar la carpeta en Drive, la fila en la hoja y los dos correos. Luego se borra esa fila de prueba.
