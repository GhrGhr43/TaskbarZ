# Arte intercambiable

Todo lo que se ve en el juego tiene un **nombre de ranura** (`zombi.walker`, `coche.sedan`, `zona.afueras`, `icono.llave`…). Ahora mismo cada ranura se dibuja con código. Un **pack de arte** es una carpeta con PNG y un `pack.js` que dice qué ranura sustituye cada imagen. Lo que el pack no traiga se sigue dibujando con código, así que se puede cambiar el arte poco a poco (primero los zombis, luego los coches…) sin tocar el juego.

Da igual de dónde salga el arte (a mano, Aseprite, IA, comprado): el juego solo ve PNG. Si alguna vez sale en Steam con arte generado por IA, hay que declararlo en el formulario de contenido de Steam.

Los packs se cargan y se recortan una sola vez al arrancar. Durante la partida cuestan lo mismo que el arte de código (el juego solo copia imágenes ya preparadas).

## Empezar en 4 pasos

1. **Exporta la plantilla** con todo el arte actual en PNG, ya con el tamaño, los cuadros y los puntos de anclaje correctos:
   ```
   npm run exportar-arte -- mi-pack
   ```
   Crea `game/art/mi-pack/` con unas 190 imágenes y su `pack.js`. (Sin nombre, `npm run exportar-arte` lo deja en `game/art/plantilla/`, que no se sube a git.)
2. **Pinta encima** de los PNG que quieras cambiar. Si mantienes el tamaño de la imagen, no hay que tocar ningún número.
3. **Borra del `pack.js`** las ranuras que no hayas cambiado (opcional, pero así el pack queda pequeño y se ve qué trae).
4. **Actívalo** en `game/art/packs.js`:
   ```js
   ZG.ART_PACKS = ['mi-pack'];
   ```
   y arranca con `npm start`. En la consola de desarrollo sale `[arte] packs: mi-pack (N)` con las ranuras cargadas.

Se pueden activar varios packs: `['base', 'zombis-nuevos']`. Si dos traen la misma ranura, manda el último.

Para probar un pack sin tocar `packs.js`: `game/index.html?arte=mi-pack` (o `?arte=ninguno` para ver solo el arte de código). En un navegador normal hay que abrirlo desde un servidor local (por ejemplo `npx http-server game`): abierto como archivo, el navegador bloquea las imágenes y el juego vuelve al arte de código y lo avisa en la consola. La app de escritorio no tiene ese problema.

## Reglas de dibujo

- **Resolución nativa, píxel a píxel.** La pantalla lógica mide 512×128 (en la barra de tareas, más ancha pero igual de alta). Un zombi mide unos 30 px, un coche entre 50 y 70 px. Las imágenes no se escalan: 1 píxel del PNG es 1 píxel del juego.
- **PNG con transparencia.**
- **Personajes mirando a la izquierda.** El juego los da la vuelta cuando caminan hacia el otro lado.
- **Coches mirando a la derecha** (el morro a la derecha).
- El contorno y la luz de borde los pone el código solo en su propio arte; en el de los packs se dibujan a mano.

## Formato del `pack.js`

```js
ZG.Art.pack({
  nombre: 'Mi pack',
  sprites: {
    'zombi.walker': { imagen: 'personajes/zombi-walker.png', cuadro: [30, 30], pie: [15, 27], variantes: 4, anims: { walk: 8, attack: 6, idle: 1 } },
    'icono.llave': 'iconos/llave.png',
  },
});
```

Las rutas son relativas a la carpeta del pack. Cualquier texto que acabe en `.png`, `.webp`, `.gif` o `.jpg` se carga como imagen. Si una imagen no se encuentra, esa ranura se descarta y se usa el arte de código (y se avisa en la consola).

## Catálogo de ranuras

### Personajes: `zombi.<tipo>` y `humano.<tipo>`

| Ranura | Qué es |
|---|---|
| `zombi.walker` | Caminante |
| `zombi.runner` | Corredor |
| `zombi.bloater` | Gordo (revienta en ácido) |
| `zombi.riot` | Antidisturbios con escudo |
| `zombi.brute` | Bruto (grande, 46×46) |
| `humano.driver` | Conductor (huye corriendo cuando el coche muere; usa `walk`) |
| `humano.mech` | Mecánico del garaje (usa `attack` para los golpes de llave) |

Hoja: **cada fila es una animación y cada columna un cuadro**. Los zombis tienen además tres **etapas de heridas** (sano, tocado y destrozado): debajo de las filas de la etapa sana van las de "tocado" y después las de "destrozado". Con varias variantes en una sola imagen, el bloque de la variante 2 va debajo del de la 1, y así sucesivamente. La plantilla exportada ya viene ordenada así.

| Campo | Qué es |
|---|---|
| `imagen` | La hoja, o una lista de hojas (una por variante) |
| `cuadro` | Tamaño de cada cuadro `[ancho, alto]` |
| `pie` | Punto del cuadro que pisa el suelo `[x, y]` |
| `variantes` | Cuántas variantes hay en la imagen (el juego elige una al azar para cada zombi) |
| `etapas` | Cuántas etapas de heridas trae (1 a 3). Si trae menos de las que usa el juego, se repite la más dañada que haya |
| `anims` | Animaciones en el orden de las filas: `{ walk: 8, attack: 6, idle: 1 }`. También `{ walk: { fila: 0, cuadros: 8 } }` |
| `cadera`, `cuello` | Fila del cuadro donde está la cadera y los hombros: por ahí se parte el cuerpo al morir (partido en dos, decapitado) |
| `pierdeBrazo` | Si al quedar destrozado suelta un brazo (uno por variante o uno para todas) |
| `paleta` | Colores de la sangre, los trozos y el cadáver (`skin`, `top`, `bottom`…), uno por variante o uno para todas |

Todos menos `imagen`, `cuadro` y `anims` son opcionales. Las muertes (desplomarse, salir despedido, partirse, perder la cabeza, quemarse…) se hacen con código a partir de estos cuadros, así que salen solas con el arte nuevo. Si el juego tiene una animación que el pack no trae (por ejemplo una que se añada en el futuro), se usa la de código encajada por los pies.

### Coches: `coche.<chasis>`

Chasis: `sedan`, `pickup`, `funebre`, `interceptor`, `camion`.

| Campo | Qué es |
|---|---|
| `imagen` | La carrocería. Una sola imagen, o una por pintura: `{ medianoche: '...', oxido: '...', _: 'para-el-resto.png' }` |
| `pintura` | Opcional. Máscara en gris de las zonas pintadas; el juego la tiñe con el color que elija el jugador |
| `acento` | Opcional. Igual, con el color de acento de la pintura |
| `origen`, `largo` | Dónde empieza el coche dentro de la imagen y cuánto mide (para colocarlo en la carretera) |
| `ruedas`, `radio` | Centro de cada rueda y su radio |
| `puntos` | `frontal`, `techo`, `capo`, `trasera`, `conductor` (y opcional `pegatina`): donde se enganchan las piezas y el tirador |
| `ventanas` | `[x, y, ancho, alto]` de cada ventana (grietas, blindaje y tirador) |
| `pegatinas` | `false` para no dibujar las pegatinas de código encima |

Todos los campos menos `imagen` son opcionales: si faltan se usan los de la plantilla, así que una imagen del mismo tamaño que la exportada encaja sin más. Las abolladuras, la sangre, las grietas, y el coche quemado se generan solos a partir de la imagen.

### Piezas del coche: `pieza.<hueco>.<id>` o `pieza.<hueco>.<id>@<chasis>`

| Hueco | Ids |
|---|---|
| `frontal` | `pinchos`, `ariete`, `sierra` |
| `blindaje` | `chapas`, `rejas`, `placas` |
| `techo` | `escopeta`, `ametralladora`, `lanzallamas` |
| `deposito` | `bidones`, `doble`, `cisterna` |
| `motor` | `v6`, `v8`, `turbina` |

Con `@chasis` la pieza es solo para ese coche (la plantilla las exporta así, una por chasis); sin él vale para todos. Se coloca con `pos: [x, y]` (posición exacta dentro de la imagen del coche) o con `en` (un punto del coche: `frontal`, `techo`, `capo`, `trasera`, `conductor`, `origen`) más `ancla` (el píxel de la pieza que cae sobre ese punto). Las armas de techo llevan `boca` (de donde sale el fogonazo, en coordenadas de la pieza) y la sierra `sierra` (centro del disco que gira, que sigue siendo de código).

### Pegatinas: `pegatina.<id>` o `pegatina.<id>@<chasis>`

Ids: `rayas`, `calavera`, `cruz`. Se colocan como las piezas (punto por defecto: `pegatina`). Si no hay imagen, se dibuja la de código con el color de acento de la pintura.

### Ruedas: `rueda.<estilo>` o `rueda.<estilo>@<chasis>`

Estilos: `gastadas`, `todoterreno`, `clavos`, `militares`. Una tira horizontal con los cuadros del giro: `{ imagen, cuadro: [ancho, alto], cuadros: 8 }`. El centro del cuadro va sobre el centro de la rueda.

### Fondos: `zona.<id>`

Zonas: `afueras`, `autopista`, `ciudad`, `desierto`, `zonacero`.

| Campo | Qué es |
|---|---|
| `cielo` | Fondo fijo (si es más estrecho que la pantalla se repite) |
| `estrellas` | Opcional. `[[x, y], …]` que parpadean |
| `capas` | Capas con paralaje, de la más lejana a la más cercana: `[{ imagen, paralaje: 0.1, y: 0, luces: [...] }]`. Si el pack trae capas, sustituyen a todas las de código. Se repiten en horizontal, así que el borde izquierdo tiene que casar con el derecho |
| `carretera` | Baldosa del asfalto (se repite) |
| `arcen` | Baldosa del borde de la carretera (hierba, arena…), apoyada sobre el asfalto |
| `niebla` | Textura de niebla, o `false` para quitarla. `colorNiebla` cambia el color |
| `lineas` | Color de las líneas de la carretera, o `false` para quitarlas |

`paralaje` es cuánto se mueve la capa respecto a la carretera (0 = quieta, 1 = igual que la carretera). Las `luces` son las animadas de código (farolas, fuegos, balizas) con la forma `{ type: 'lamp' | 'fire' | 'blink' | 'glow', x, y, color, … }`; la plantilla trae las actuales.

### Garaje: `garaje`

`{ imagen, adornos: true, puerta: [440, 28, 72, 72] }`. La imagen se centra en pantalla (512 de ancho es el interior; si es más ancha cubre también los lados en pantallas anchas). `adornos: false` quita las velas, la lámpara y el neón animados de código (que están pensados para el garaje de código). `puerta` es el hueco de la puerta que se abre al salir, en coordenadas del interior.

### Iconos de la interfaz: `icono.<nombre>`

`corazon`, `bidon`, `llave`, `surtidor`, `moneda`, `chasis`, `motor`, `rueda`, `frontal`, `blindaje`, `techo`, `velocidad`, `calavera`, `bala`, `martillo`, `mejora`, `pintura`, `diana`, `corona`, `pistola`, `escopeta`, `rayo` (y los alias `armas`, `deposito`, `ruedas`). Una imagen por icono, tal cual (sin contorno añadido).

## Qué sigue siendo solo código (de momento)

Efectos (sangre, trozos, chispas, fuego, fogonazos, luces y clima), el tirador de la ventanilla y sus armas, el surtidor del garaje, el cadáver del conductor, las cajas de suministros y las cruces de los rivales. Los cadáveres y las muertes de los zombis salen de sus cuadros, así que esos sí cambian con el pack. Se pueden convertir en ranuras con el mismo patrón que el resto (ver abajo).

## Para programadores: arte nuevo

Cualquier dibujo nuevo debería pasar por `ZG.Art` para que también se pueda sustituir:

```js
// Imagen suelta: la del pack si existe, si no la de código (que se construye una vez y se guarda).
const img = Z.Art.image('objeto.caja') || cajaDeCodigo();

// Personaje animado: misma forma que Z.SPR (contrato en sprites.js: w, h, cx, gy, hip, neck, stage(n)...).
const set = Z.Art.actor('zombi.nuevo', variante, setDeCodigo);

// Tira de cuadros (por ejemplo, un efecto animado).
const cuadros = Z.Art.strip('fx.explosion') || cuadrosDeCodigo();
```

- Construye el arte una vez (al arrancar o la primera vez que se usa) y en cada fotograma solo `drawImage`.
- Si añades animaciones a un personaje, ponlas como un array más de cuadros `{ c }` en lo que devuelve `stage(n)` de su juego de `Z.SPR` (contrato en `sprites.js`): el exportador y los packs las recogen solas.
- Añade la ranura nueva a `tools/exportar-arte-pagina.js` para que salga en la plantilla, y a este documento.
- El código de los packs está en `game/js/art.js`; los enganches, en `sprites.js` (personajes, coches, piezas, ruedas), `world.js` (fondos y garaje) e `icons.js`.
