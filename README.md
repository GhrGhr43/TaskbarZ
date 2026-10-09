# Zombie Garage (TaskbarZ)

Idle roguelike postapocalíptico que vive encima de la barra de tareas. El coche avanza solo, revienta zombis y gana dinero; se va destrozando hasta que muere (la muerte cambia según la zona), vuelve solo al garaje, se repara y sale otra vez. En el garaje compras, mejoras y cambias piezas para llegar más lejos.

## Cómo jugar
- **Navegador:** abre `game/index.html`. No necesita instalación.
- **Escritorio:** `npm install` y luego `npm start`. Arranca en la barra de tareas, al estilo de Taskbar Hero: una franja transparente a todo el ancho de la pantalla que tapa la barra y sobresale un poco por arriba. El coche, los zombis y la carretera se ven ahí mismo, y los clics atraviesan la franja salvo en sus botones. **A la carretera** sale a correr, **Garaje** abre la ventana grande con la tienda (al volver a salir, la partida regresa sola a la barra) y **✕** cierra el juego. La altura se adapta al tamaño de la barra de Windows.
- **Disparar a la barra:** deja el ratón quieto 1 segundo sobre un icono de la barra de tareas y aparece una mira; haz clic y el icono revienta en sangre. Es solo un efecto visual: con la mira puesta el clic lo recibe el juego, no la barra ni tus programas, y el icono vuelve a verse a los pocos segundos.
- **Armas:** un superviviente va asomado por la ventanilla y dispara a donde hagas clic (en la barra, al pasar el ratón por encima de un zombi aparece la mira y ese clic es del juego). Empiezas con una pistola que necesita varios tiros por zombi; en la pestaña **Armas** del garaje compras y mejoras revólver, recortada, subfusil, rifle y lanzagranadas. El botón pequeño de la ventanilla cambia por dónde se asoma (delante, detrás o cerrada: sigue disparando desde el otro lado sin que se le vea). El **autodisparo** se desbloquea al llegar a Ciudad Ceniza y empieza lento.
- **Probar el modo barra en el navegador:** abre `game/index.html?modo=barra&w=960&h=56`.

## Estructura
- `game/`: el juego (HTML5 Canvas 512x128, JavaScript sin dependencias ni compilación). Las fuentes van incluidas en `game/fonts/` para que funcione sin internet.
- `electron/`: envoltorio de escritorio (capa transparente sobre la barra de tareas, ventana del garaje y prueba de humo en `electron/smoke.js`).
- `docs/STEAM.md`: lo que falta para poder sacarlo en Steam.

## Empaquetar
- `npm run dist:win` genera la carpeta del ejecutable de Windows en `dist/` (desde Windows; en Linux necesitaría Wine).
- `npm run dist:linux` hace lo mismo para Linux.

Nada de esto publica en Steam.
