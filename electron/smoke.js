// Prueba de humo para la nube: capturas en modo barra, clic real en «Garaje» y en «A la carretera».
const fs = require('fs');
const path = require('path');

module.exports = function smoke(win, setMode, dir, app) {
  const wc = win.webContents;
  const shot = async (name) => fs.writeFileSync(path.join(dir, name), (await wc.capturePage()).toPNG());
  const state = () => wc.executeJavaScript('JSON.stringify({ mode: ZG.G.mode, overlay: ZG.overlay, w: ZG.W, repair: ZG.G.garage && ZG.G.garage.repair, dist: ZG.G.run && Math.round(ZG.G.run.dist) })');
  const click = async (id) => {
    const r = JSON.parse(await wc.executeJavaScript(`JSON.stringify(document.getElementById('${id}').getBoundingClientRect())`));
    const x = Math.round(r.x + r.width / 2), y = Math.round(r.y + r.height / 2);
    wc.sendInputEvent({ type: 'mouseMove', x, y });
    wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
    wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
  };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  wc.once('did-finish-load', async () => {
    const log = [];
    await wc.executeJavaScript('ZG.S.auto = false');
    await wait(1500); log.push('inicio ' + await state()); await shot('1-barra-garaje.png');
    await click('bar-go'); await wait(3500); log.push('tras A la carretera (barra) ' + await state()); await shot('2-barra-carrera.png');
    await wait(5000); await shot('3-barra-carrera.png');
    await wc.executeJavaScript('ZG.G.car.hp = 0'); await wait(7000); log.push('tras morir ' + await state());
    await click('bar-garage'); await wait(1500); log.push('ventana garaje ' + await state()); await shot('4-garaje.png');
    await wait(6000); await click('btn-go'); await wait(3500); log.push('tras A la carretera (garaje) ' + await state()); await shot('5-garaje-carrera.png');
    fs.writeFileSync(path.join(dir, 'log.txt'), log.join('\n'));
    app.quit();
  });
};
