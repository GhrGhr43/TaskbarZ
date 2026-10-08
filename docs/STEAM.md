# Preparación para Steam

Nada de este repositorio sube ni publica nada en Steam. Esta lista resume qué hay y qué falta.

## Ya preparado
- **App de escritorio con Electron** (`electron/`): Steam acepta juegos hechos con Electron. Se empaqueta como carpeta (`npm run dist:win`), que es lo que se sube a un depot de Steam.
- **Funciona sin internet**: las fuentes están en `game/fonts/` y el juego no hace peticiones de red.
- **Sigue corriendo sin foco** (`backgroundThrottling: false`), necesario en un idle.
- **Guardado local** (localStorage dentro de la app).
- **Sentido de la tira configurable** (izquierda a derecha o al revés).

## Falta antes de publicar
1. **Cuenta de Steamworks y App ID** (la cuota de Steam Direct por juego la paga el titular).
2. **Steamworks en el juego**: integrar `steamworks.js` para logros, Steam Cloud (subir el guardado) y overlay. Los objetivos del juego ya se pueden mapear a logros.
3. **Guardado en archivo**: pasar de localStorage a un archivo en la carpeta de datos del usuario, para que Steam Cloud pueda sincronizarlo.
4. **Arte definitivo**: el pixel art actual es procedural y provisional; para la tienda hace falta arte hecho a mano (sprites, cápsulas, capturas, tráiler).
5. **Sonido y música**.
6. **Opciones**: tamaño de la tira, monitor, volumen, idioma (español e inglés como mínimo).
7. **Icono, nombre y metadatos del ejecutable** (requiere compilar en Windows o Wine).
8. **Ranking online**: los rivales actuales son personajes del juego; un ranking real usaría las leaderboards de Steam.
9. **Página de tienda y clasificación por edades** (el juego tiene violencia y sangre).
