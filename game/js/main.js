'use strict';
// Arranque y bucle principal.
(function (Z) {
  const G = Z.G;
  const out = document.getElementById('screen');
  const [wc, wctx] = Z.canvas(Z.W, Z.H);
  Z.debug = { timeScale: 1 };

  // Capa sobre la barra de tareas (true) o ventana normal con el escenario completo (false).
  Z.setOverlay = function (on) {
    Z.overlay = on;
    document.body.classList.toggle('overlay', on);
    out.width = Z.W; out.height = on ? Z.VIEW_H : Z.H;
    document.getElementById('stage').style.aspectRatio = on ? '' : `${Z.W} / ${Z.H}`;
  };
  Z.setOverlay(false);

  Z.zombieSprites();
  Z.UI.init();
  Z.enterGarage(true);

  let last = performance.now(), saveT = 0, uiT = 0;
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const steps = Math.max(1, Math.round(Z.debug.timeScale));
    for (let i = 0; i < steps; i++) Z.update(dt);
    while (G.events.length) Z.UI.event(G.events.shift());
    Z.render(out, wc, wctx);
    Z.UI.frame(dt);
    uiT -= dt; if (uiT <= 0) { uiT = 0.25; Z.UI.tick(); }
    saveT -= dt; if (saveT <= 0) { saveT = 5; Z.save(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('beforeunload', () => Z.save());
})(window.ZG);
