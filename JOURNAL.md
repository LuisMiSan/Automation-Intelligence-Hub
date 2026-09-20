# JOURNAL — Automation Intelligence Hub

Bitácora técnica: qué se tocó, por qué, y qué quedó sin verificar. Lo nuevo va arriba.

---

## 2026-09-20 — Lockfile fantasma, rescate de Firebase y un "guardado" que mentía

Sesión larga que empezó por 69 alertas de Dependabot y acabó destapando dos problemas mayores.
PRs: **#3**, **#4**, **#5** (los tres mergeados). **#1** y **#2** cerrados por obsoletos.

### 1. Las 69 alertas eran un lockfile desincronizado (PR #3)

`package-lock.json` estaba generado desde **otro** `package.json`. Su bloque raíz declaraba
`firebase`, `firebase-admin`, `express`, `express-rate-limit`, `helmet`, `tsx`,
`react-firebase-hooks`, `jspdf 2.5.2` y `vite ^8.0.5`, mientras el `package.json` versionado
tenía 4 dependencias y el código no importaba ni firebase ni express. **392 paquetes en el lock,
~263 fantasma** — y eso es lo que Dependabot escaneaba.

De propina, el lock fijaba **jspdf 2.5.2**, la versión vulnerable que el commit `44c1d08` ya
había subido a 4.2.1: *un lockfile desincronizado deshace un parche de seguridad en silencio,
porque el `package.json` sigue diciendo la versión buena.*

Arreglo: `npm install` + `npm audit fix` (sin `--force`). 392 → 178 entradas, **0
vulnerabilidades**. `package.json` sin tocar.

> **Método, para la próxima:** ante una avalancha de alertas, lo primero NO es mirar las CVE.
> Es comparar `packages[""]` del lockfile con el `package.json` versionado. Si no coinciden, el
> problema es el lockfile. Después, `npm audit` sobre el árbol instalado, y solo entonces cruzar
> `vulnerable_version_range` de cada alerta (`gh api .../dependabot/alerts`) con lo instalado.

### 2. La integración de Firebase llevaba 4 meses fuera de `main` (PR #4)

El commit `e4e9cb1` *"feat: Integrate Firebase and add lead management"* nunca llegó a `main`: el
merge `3f575fc` (5-may) resolvió el cruce quedándose **entero** con el lado de `44c1d08`.
Prueba: `git diff 44c1d08 3f575fc` sale **vacío**.

Rescatado **sin revert** (un revert habría devuelto una `App.tsx` vieja y machacado lo posterior):
se aplicó el diff `7afae84 → e4e9cb1` a tres vías sobre `main`. Se pudo hacer limpio porque
`App.tsx` era **el mismo blob `a9e92dc3`** en `7afae84`, `44c1d08` y `main` — comprobarlo con
`git rev-parse <ref>:<fichero>` antes de tocar nada convirtió un merge temido en un parche con un
solo conflicto (`package.json`).

Vuelven: `App.tsx` (336 → 834 líneas), `firebase.ts`, `firestore.rules`,
`firebase-applet-config.json`, `firebase-blueprint.json`, `ErrorBoundary.tsx` y los cambios de
`Header` / `BusinessInput` / `AutomationPlan` / `AdminPanel` / `icons` / `geminiService` / `types`.

Protegido de `main`, verificado uno a uno: **`jspdf ^4.2.1`** (el commit viejo fijaba 2.5.2) y
**`sanitizeUrl`** en `AutomationPlan.tsx` (el fix del code-scanning alert, `bad1734`).

**No portado:** los 3 JSON de `migrated_prompt_history/`. Llevan `:` en el nombre → ruta inválida
en Windows, `git cherry-pick` falla con `invalid path`. Se excluyeron con pathspec (`':!carpeta'`)
y siguen intactos en `e4e9cb1`. No son código.

### 3. La app decía "contacto guardado" aunque el lead se perdiera (PR #5)

`App.tsx` mostraba **siempre** `"¡Auditoría generada y contacto guardado!"`. El `catch` del
`addDoc` a `leads` solo hacía `console.error` —deliberadamente, para no tumbar la app— así que un
fallo de Firestore daba un éxito falso al visitante y **perdía el lead sin ninguna señal**. Ahora
el mensaje depende del resultado real y, si falla, sale con estilo de error.

### 4. Reglas de Firestore: ya estaban desplegadas

Comprobado contra el proyecto **`radar-local-491000`**: la release viva de la base
`ai-studio-2f390961-…` apunta al ruleset **`34a85d45`** del **3-abr-2026**, **idéntico byte a byte**
a `firestore.rules`. No había nada que desplegar.

Sin la CLI de Firebase (no está instalada), se consulta con `gcloud auth print-access-token` +
la cabecera **`x-goog-user-project: radar-local-491000`** (sin ella: 403 *"requires a quota
project"*) contra `firebaserules.googleapis.com`.

Queda `npm run test:rules` (`scripts/test-firestore-rules.mjs`): 7 casos contra el simulador
oficial, **sin escribir en la base de datos**. El caso 1 usa **el documento exacto** que manda
`App.tsx`, así que caza el día que alguien cambie los campos y las reglas dejen de aceptarlos.
Probado que puede fallar: debilitando `isAdmin()` a `if true` da 3 FALLA y exit 1.

> **Gotcha Node + Windows:** `process.exit()` justo después de un `fetch` aborta Node con
> `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` y devuelve **127 aunque el test haya
> pasado**. Por eso el script usa `process.exitCode`.

### 5. Seguridad: `.gitignore` no cubría `.env`

`vite.config.ts` lee `GEMINI_API_KEY` de `.env`, y `.gitignore` solo tenía `*.local`. Un `.env`
se habría commiteado con la clave dentro. Añadidos `.env` y `.env.*` (con excepción para
`.env.example`).

### Estado al cierre

`npm audit` **0 vulnerabilidades** · `tsc --noEmit` exit 0 · `vite build` OK ·
`npm run test:rules` **7/7** · 0 alertas de Dependabot · 0 PRs abiertos.

### Lo que quedó SIN verificar

- **Login con Google y escritura real en Firestore.** Exige credenciales del operador y dejaría un
  lead de prueba en la base real que no se podría borrar (las reglas solo dan `delete` al admin).
  El simulador cubre la lógica de permisos; el viaje completo del dato, no.
- **4 avisos de contraste** (texto gris sobre fondo de color) en `App.tsx`, líneas ~541-569. Código
  del rescate, no tocado: no entraba en el encargo.

### Para levantarlo en local

Hace falta un `.env` en la raíz con `GEMINI_API_KEY=<clave>`. Sin él,
`services/geminiService.ts` lanza en el import y **la app no pinta nada**. No es un bug: es así
desde antes de esta sesión.
