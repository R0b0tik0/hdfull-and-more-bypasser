# HDFull / Powvideo Bypasser

Userscript que simplifica ver contenido en **HDFull** (`hdfull.love` y dominios espejo) y en su proveedor **Powvideo/Powwideo** (`powvideo.org` / `powwideo.org`).

Automatiza todo el flujo salvo el paso que no puede evitarse a nivel de ficha: el captcha.

## Instalación rápida

> **Requisito previo:** instala antes un gestor de usuarioscripts — [Tampermonkey](https://www.tampermonkey.net/) (recomendado) o [Violentmonkey](https://violentmonkey.github.io/).

[![Instalar](https://img.shields.io/badge/Instalar-HDFull_Bypasser-8758f5?style=for-the-badge&logo=tampermonkey)](https://github.com/R0b0tik0/hdfull-and-more-bypasser/raw/refs/heads/main/hdfull-bypasser.user.js)

Pulsa el botón y Tampermonkey/Violentmonkey abrirá la página de instalación del userscript. Acepta y listo.


## Qué hace

### 1. HDFull: "Enlace externo" sin captcha intermedio

En las páginas de películas y series, la web tiene botones **"Enlace externo"** que normalmente pasan por una página con captcha (hCaptcha) de HDFull antes de llevarte al proveedor.

Esto se elimina:

- Detecta los enlaces `/ext/<código>` de la página.
- Para el servidor activo los reescribe directo a su **enlace limpio**: `https://powvideo.org/embed-abc123-920x560.html` → `https://powvideo.org/abc123` (quita `embed-` y el sufijo `-anchoAlto.html`).
- Si haces clic en "Enlace externo" de otro servidor (streamplay, vidmoly, etc.), el script activa ese servidor, lee su iframe y resuelve igualmente el enlace limpio.

Resultado: clic en "Enlace externo" → te lleva direktamente a la página del proveedor, sin captcha de HDFull.

### 2. Powvideo/Powwideo: ver la película sin anuncios

Al entrar en un enlace limpio (`https://powwideo.org/<id>`), la página pide un captcha y luego un paso intermedio ("Continuar al vídeo") antes de reproducir el contenido dentro de un reproductor con anuncios.

El script muestra un **menú flotante estilo BypassTools** ("¿Qué quieres hacer?") y automatiza el proceso:

| Paso | Quién lo hace |
|---|---|
| Resolver el captcha | **Tú** (es reCAPTCHA de Google, no se puede saltar) |
| Pulsar "Continuar al vídeo" | Automático (envía el formulario en cuanto detecta el token del captcha) |
| Reproducir el vídeo | Automático (arranca el reproductor) |
| Capturar el stream directo | Automático (detecta `init-v1-x3.mp4` / fragmentos en `*.pkcdn.org`) |
| Abrir el reproductor limpio | Automático — abre la URL del stream **sin `/dash`**, que el navegador reproduce completa sin anuncios |

El menú tiene dos botones de respaldo:
- **▶ Ver el contenido sin anuncios** — abre manualmente el stream limpio detectado.
- **Cancelar** — cierra el menú y desactiva la automatización, dejando la web normal.

## Instalación manual

1. **Instala un gestor de usuarioscripts** si no lo tienes:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Opera) — recomendado
   - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox)

2. **Descarga el archivo del userscript** desde el repositorio:

   ```
   https://github.com/R0b0tik0/hdfull-and-more-bypasser/raw/refs/heads/main/hdfull-bypasser.user.js
   ```

3. **Instálalo**, de cualquiera de estas formas:
   - **Desde la URL**: en Tampermonkey → **Utilidades** → pega la URL del punto 2 en *"Instalar desde URL"* → **Instalar**.
   - **Desde archivo**: en Tampermonkey → **Utilidades** → **"Elegir archivo"** en *Importar* → selecciona el `.user.js` descargado → Instalar.
   - **Arrastrando el archivo** al navegador: si el gestor pregunta, acepta instalar.

4. Asegúrate de que el userscript está **activado** en la lista del gestor.

5. Recarga la página de HDFull/Powvideo. Verás el menú "¿Qué quieres hacer?" en Powvideo y los enlaces directos en HDFull.

### Origen del archivo y dominios cubiertos

El archivo se instala desde el repositorio:

```
https://github.com/R0b0tik0/hdfull-and-more-bypasser/blob/main/hdfull-bypasser.user.js
```

Cubre los dominios:
- `hdfull.love`, `hdfull.sbs`, `hdfull.tv` y cualquier `*.hdfull.*`
- `powvideo.org`, `powwideo.org`, `powvideo.net`, `powwideo.net` y cualquier `*.powvideo.*` / `*.powwideo.*`

## Requisitos

- Un gestor de usuarioscripts (ver Instalación).
- Navegador moderno (Chrome/Edge/Firefox).
- No requiere ninguna extensión adicional.

## Notas

- El captcha de Powvideo no se puede automatizar: es reCAPTCHA de Google validado en servidor. El script espera a que lo resuelvas y continúa solo a partir de ahí.
- La descarga directa del mp4 no está disponible (el CDN `pkcdn.org` bloquea la petición cross-origin). A cambio, el reproductor limpio permite ver el contenido y guardarlo desde el propio navegador si se desea.
- Si la URL del stream cambia de patrón en el futuro, abre una incidencia o ajusta el regex `parsePkUrl` en el script.