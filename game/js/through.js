'use strict';
// Barra de tareas: decide si la ventana deja pasar los clics a lo que hay debajo.
// El juego solo se queda el clic encima de sus botones o de un zombi al que se puede disparar
// (Z.Gun.claims); en cualquier otro sitio el clic llega a la barra y a tus programas.
(function (Z) {
  const desk = window.taskbarz;
  const out = document.getElementById('screen');
  let px = -1, py = -1, onBtn = false, inside = false, through = null;

  const set = (on) => { if (on !== through) { through = on; if (desk) desk.setClickThrough(on); } };
  document.addEventListener('mousemove', (e) => {
    inside = true;
    px = e.clientX * out.width / window.innerWidth; py = e.clientY * out.height / window.innerHeight;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    onBtn = !!(el && el.closest('button, select, input'));
    Z.Through.frame();
  });
  document.addEventListener('mouseleave', () => { inside = false; onBtn = false; set(true); });

  Z.Through = {
    // Se llama en cada fotograma: un zombi puede pasar por debajo del ratón aunque este no se mueva.
    frame() {
      if (!Z.overlay) { through = null; return; }
      const claim = inside && Z.Gun && Z.Gun.claims ? Z.Gun.claims(px, py) : false;
      set(!(onBtn || claim));
    },
  };
})(window.ZG);
