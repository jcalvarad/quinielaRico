# 🏆 Quiniela Rico · Mundial 2026

Página web para compartir la **quiniela familiar del Mundial de Fútbol 2026**.
Los puntos de cada participante se **calculan automáticamente** y los marcadores
se **actualizan solos** con los resultados más recientes.

👉 Es un sitio 100% estático (HTML + CSS + JavaScript), sin servidor ni base de
datos. Funciona abriendo el archivo o publicándolo en GitHub Pages.

## ✨ Qué incluye

- **Clasificación** en vivo con podio y reparto de premios (60/30/10).
- **Partidos**: cada juego con su marcador real y las predicciones de todos
  (resaltando quién acertó el resultado o el marcador exacto).
- **Participantes**: la hoja completa de cada quiniela con sus puntos.
- **Reglas** y bolsa de premios.
- Se **refresca solo** con los marcadores más recientes (botón _Actualizar_ y
  cada 90 s mientras la página está abierta).

## 🚀 Publicar para compartir (GitHub Pages)

1. Sube esta carpeta a la rama principal del repositorio.
2. En GitHub: **Settings → Pages → Build and deployment → Source: _Deploy from a
   branch_**, elige la rama y carpeta `/ (root)`.
3. En 1–2 minutos tendrás un enlace público tipo
   `https://<usuario>.github.io/quinielarico/` para compartir por WhatsApp. 🎉

Para probar en tu compu sin publicar, simplemente abre `index.html` en el navegador.

## 🔢 Cómo se calculan los puntos

| Acierto | Puntos |
|---|---|
| **Resultado** (Local / Empate / Visitante) | **3** |
| **Marcador exacto** (bonus adicional) | **+2** |

> Acertar el marcador exacto da **5 puntos** (3 del resultado + 2 del marcador).
> Si en tu familia el marcador exacto valiera solo 2 puntos (sin sumar el
> resultado), cambia las constantes al inicio de [`assets/app.js`](assets/app.js):
> `PTS_RESULTADO` y `PTS_MARCADOR`.

Premios: bolsa de `15 × $300 = $4,500` → 🥇 $2,700 · 🥈 $1,350 · 🥉 $450.
(Se recalcula sola según el número de participantes.)

## 🔄 Actualización automática de marcadores

Los resultados salen de la base pública y gratuita
[openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)
(no requiere API key). El emparejamiento se hace **por par de equipos**, así que
no importa la fecha ni el grupo del PDF.

Hay dos mecanismos, complementarios:

1. **En el navegador** (sin configurar nada): al abrir la página y cada 90 s se
   descargan los marcadores más recientes.
2. **GitHub Action** ([`.github/workflows/update-results.yml`](.github/workflows/update-results.yml)):
   cada 30 minutos refresca [`data/results.js`](data/results.js) y lo guarda en
   el repo, para que el sitio cargue al instante con datos frescos aunque nadie
   lo tenga abierto. Se puede lanzar a mano desde la pestaña **Actions**.

> Los marcadores se publican cuando los partidos **terminan**. Si quieres fijar
> un resultado al momento, puedes editarlo a mano (ver abajo).

## ✏️ Editar datos a mano

Todo vive en archivos legibles dentro de [`data/`](data/):

- **`participants.js`** — las predicciones de cada persona
  (`pick`: `"L"`/`"E"`/`"V"`, y el marcador `ph`-`pa`).
- **`fixtures.js`** — los 72 partidos (equipos, grupo, fecha, sede).
- **`results.js`** — los marcadores reales. Para fijar uno manualmente:

  ```js
  "L-england-vs-croatia": { "h": 2, "a": 1, "status": "FT" },
  ```

## 🛠️ Agregar una quiniela o regenerar los datos

Las quinielas viven en `scripts/sources/`:

- **`quiniela_pdf.txt`** — el PDF original (14 participantes) convertido con
  `pdftotext -layout`.
- **`*.xlsx`** — una quiniela adicional por archivo de Excel (mismo formato que
  el Excel de Lorena y Fabián). El nombre se toma de `EXCEL_NAMES` dentro del
  script (o del nombre del archivo).

Para **agregar otra quiniela**: copia su `.xlsx` a `scripts/sources/`, añade su
nombre en `EXCEL_NAMES` si hace falta, y regenera:

```bash
python3 scripts/build-data.py        # requiere Python 3 + openpyxl
```

Las predicciones del Excel se mapean **por posición de calendario**, así que se
corrige sola la orientación local/visitante (y errores de captura en el nombre
del partido, que el script reporta).

## 📁 Estructura

```
index.html                      Página principal
assets/styles.css               Estilos (mobile-first)
assets/app.js                   Lógica: puntos, vistas y actualización en vivo
data/fixtures.js                72 partidos del Mundial
data/participants.js            15 participantes y sus predicciones
data/results.js                 Marcadores reales (se actualiza solo)
scripts/sources/                Quinielas originales (PDF en texto + Excel)
scripts/build-data.py           Reconstruye los datos desde las fuentes
scripts/update-results.mjs      Trae marcadores (lo usa la GitHub Action)
.github/workflows/              Actualización programada cada 30 min
```

---
Hecho con cariño para la familia. ¡Que gane el mejor! ⚽
