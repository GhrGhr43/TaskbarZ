# Zombie Garage (TaskbarZ)

Idle roguelike postapocalíptico que vive encima de la barra de tareas. El coche avanza solo, revienta zombis y gana dinero; se va destrozando hasta que muere (la muerte cambia según la zona), vuelve solo al garaje, se repara y sale otra vez. En el garaje compras, mejoras y cambias piezas para llegar más lejos.

## Cómo jugar
- **Navegador:** abre `game/index.html`. No necesita instalación.
- **Escritorio:** `npm install` y luego `npm start`. Arranca como una tira siempre visible sobre la barra de tareas; el botón **Garaje** abre la ventana grande con la tienda y **Salir** cierra el juego.

## Estructura
- `game/`: el juego (HTML5 Canvas 512x128, JavaScript sin dependencias ni compilación). Las fuentes van incluidas en `game/fonts/` para que funcione sin internet.
- `electron/`: envoltorio de escritorio (ventana sin marco, modo tira y modo garaje).
- `docs/STEAM.md`: lo que falta para poder sacarlo en Steam.

## Empaquetar
- `npm run dist:win` genera la carpeta del ejecutable de Windows en `dist/` (desde Windows; en Linux necesitaría Wine).
- `npm run dist:linux` hace lo mismo para Linux.

Nada de esto publica en Steam.
