# Subir el repositorio a GitHub

Guía breve para publicar este proyecto en GitHub. Requiere una cuenta en github.com y Git instalado en su computador.

## Antes de subir

Confirme que la carpeta no contiene postulaciones reales ni exportaciones de la hoja de cálculo. El archivo `.gitignore` ya excluye `postulaciones/`, `*.xlsx` y `*.csv`, pero conviene revisar con el siguiente comando qué archivos se van a subir.

```bash
git status
```

## 1. Crear el repositorio vacío

1. Ingrese a github.com y elija **New repository**.
2. Use el nombre `beca-municipal-rengo`.
3. No marque las opciones para agregar README, `.gitignore` ni licencia. El repositorio debe quedar vacío.
4. Elija la visibilidad. El repositorio puede ser privado. La disponibilidad de GitHub Pages en repositorios privados depende del plan de la cuenta, por lo que verifique en la configuración de su cuenta antes de decidir.

## 2. Conectar y subir

Ejecute lo siguiente en la carpeta del proyecto. Reemplace `USUARIO` por su nombre de usuario o por el de la organización.

```bash
git remote add origin https://github.com/USUARIO/beca-municipal-rengo.git
git push -u origin main
```

Si Git indica que no hay nada que subir, registre primero los archivos.

```bash
git add .
git commit -m "Sitio de la Beca Municipal Rengo"
git push -u origin main
```

Si su rama local tiene otro nombre, renómbrela con `git branch -M main` antes de subir.

## 3. Activar GitHub Pages

1. En el repositorio abra **Settings** y luego **Pages**.
2. En **Build and deployment**, elija **GitHub Actions** como origen. Con esto se usa el flujo `.github/workflows/pages.yml`, que publica solo el sitio público.
3. Abra la pestaña **Actions** y espere a que termine el flujo "Publicar en GitHub Pages". Si no se inició solo, ejecútelo con **Run workflow**.
4. La dirección del sitio aparece en **Settings** y luego **Pages**. Tiene la forma `https://USUARIO.github.io/beca-municipal-rengo/`.

La alternativa sin flujo de trabajo y los pasos para conectar la recepción de postulaciones están en [DESPLIEGUE.md](DESPLIEGUE.md).
