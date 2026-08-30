# HDFull / Powvideo Bypasser

Userscript que simplifica ver contenido en **HDFull** (`hdfull.love` y dominios espejo) y en su proveedor **Powvideo/Powwideo** (`powvideo.org` / `powwideo.org`), automatizando todo el flujo salvo el captcha.

## Instalación rápida

> **Requisito previo:** instala antes un gestor de usuarioscripts — [Tampermonkey](https://www.tampermonkey.net/) (recomendado) o [Violentmonkey](https://violentmonkey.github.io/).

[![Instalar](https://img.shields.io/badge/Instalar-HDFull_Bypasser-8758f5?style=for-the-badge&logo=tampermonkey)](https://github.com/R0b0tik0/hdfull-and-more-bypasser/raw/refs/heads/main/hdfull-bypasser.user.js)

Pulsa el botón y tu gestor abrirá la página de instalación del userscript. Acepta y listo.

## Qué hace

**1. HDFull: "Enlace externo" sin captcha intermedio**

En las páginas de películas y series, el botón **"Enlace externo"** pasa por una página con captcha de HDFull; el script lo reescribe directo a su enlace limpio (`https://powvideo.org/embed-abc123-920x560.html` → `https://powvideo.org/abc123`) y te lleva directamente al proveedor.

**2. Powvideo/Powwideo: ver la película sin anuncios**

Al entrar en un enlace limpio (`https://powwideo.org/<id>`), el script muestra un menú "¿Qué quieres hacer?" y automatiza el proceso después de que resuelvas el captcha: envía "Continuar al vídeo", arranca el reproductor, detecta el stream directo (`init-v1-x3.mp4` en `*.pkcdn.org`) y abre la URL sin `/dash`, que el navegador reproduce completa sin anuncios.

## Instalación manual

1. **Instala un gestor de usuarioscripts** si no lo tienes: [Tampermonkey](https://www.tampermonkey.net/) o [Violentmonkey](https://violentmonkey.github.io/).
2. **Descarga el archivo** desde el repositorio:

   ```
   https://github.com/R0b0tik0/hdfull-and-more-bypasser/raw/refs/heads/main/hdfull-bypasser.user.js
   ```

3. **Instálalo** de una de estas formas:
   - **Desde URL**: Tampermonkey → **Utilidades** → pega la URL en *"Instalar desde URL"* → **Instalar**.
   - **Desde archivo**: Tampermonkey → **Utilidades** → *Importar* → elige el `.user.js` descargado → Instalar.
   - **Arrastrando el archivo** al navegador y aceptando la instalación.

4. Asegúrate de que el userscript está **activado** y recarga la página.

### Dominios cubiertos

- `hdfull.love`, `hdfull.sbs`, `hdfull.tv` y cualquier `*.hdfull.*`
- `powvideo.org`, `powwideo.org`, `powvideo.net`, `powwideo.net` y cualquier `*.powvideo.*` / `*.powwideo.*`

## Requisitos

Un gestor de usuarioscripts y un navegador moderno (Chrome/Edge/Firefox). No requiere extensiones adicionales.

## Notas

El captcha de Powvideo (reCAPTCHA de Google, validado en servidor) no se puede automatizar; el script espera a que lo resuelvas y continúa solo a partir de ahí.