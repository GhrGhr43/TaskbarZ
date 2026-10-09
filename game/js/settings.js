'use strict';
// Opciones de la franja de la barra de tareas (alto, ancho, posición, modo compacto) y del sonido.
// El tamaño lo aplica la app de escritorio (electron/main.js); en el navegador solo aparece el sonido.
(function (Z) {
  const desk = window.taskbarz;
  const $ = (id) => document.getElementById(id);
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const snd = () => Z.Audio;

  // Sonido: botón en la cabecera del garaje y en la franja.
  const soundLabel = () => (snd() && snd().muted ? 'Sonido: no' : 'Sonido: sí');
  const topbar = document.querySelector('.topbar'), quit = $('btn-quit');
  const bSound = el('<button class="tb-btn" id="btn-sound" type="button"></button>');
  const vol = el('<input class="tb-vol" id="opt-vol" type="range" min="0" max="100" step="5" title="Volumen" aria-label="Volumen">');
  topbar.insertBefore(bSound, quit); topbar.insertBefore(vol, quit);
  const barSound = el('<button class="tb-btn" id="bar-sound" type="button" title="Sonido" aria-label="Sonido"></button>');
  const barMini = el('<button class="tb-btn" id="bar-mini" type="button" title="Hacer la franja más pequeña" aria-label="Franja compacta"></button>');
  $('bar-ctl').appendChild(barSound); $('bar-ctl').appendChild(barMini);
  const syncSound = () => {
    const m = snd() && snd().muted;
    bSound.textContent = soundLabel(); bSound.setAttribute('aria-pressed', m ? 'false' : 'true');
    barSound.textContent = m ? '♪̸' : '♪'; barSound.classList.toggle('off', !!m);
    vol.value = Math.round((snd() ? snd().volume : 0.6) * 100);
  };
  const toggleSound = () => { if (!snd()) return; snd().setMuted(!snd().muted); syncSound(); if (!snd().muted) snd().play('clic'); };
  bSound.addEventListener('click', toggleSound); barSound.addEventListener('click', toggleSound);
  vol.addEventListener('input', () => { if (snd()) { snd().setVolume(vol.value / 100); if (snd().muted) snd().setMuted(false); syncSound(); } });
  vol.addEventListener('change', () => snd() && snd().play('moneda'));
  syncSound();

  // Tamaño de la franja (solo en la app de escritorio).
  if (!desk || !desk.getLayout) { barMini.remove(); return; }
  const box = el(`<span class="tb-layout" title="Tamaño de la franja en la barra de tareas">
    <label>Alto <select id="opt-scale"><option value="0">Auto</option><option value="1">Bajo</option><option value="2">Medio</option><option value="3">Alto</option></select></label>
    <label>Ancho <select id="opt-width"><option value="100">Toda</option><option value="75">75%</option><option value="50">Media</option><option value="30">30%</option></select></label>
    <label>Sitio <select id="opt-pos"><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></label>
  </span>`);
  topbar.insertBefore(box, bSound);
  let lay = null;
  const apply = (patch) => { Z.save(); lay = Object.assign({}, lay, patch); desk.setLayout(lay); };
  desk.getLayout().then((l) => {
    lay = l;
    $('opt-scale').value = String(l.scale); $('opt-width').value = String(l.width); $('opt-pos').value = l.pos;
    barMini.textContent = l.compact ? '▴' : '▾';
    barMini.title = l.compact ? 'Volver al tamaño normal' : 'Hacer la franja más pequeña';
  });
  $('opt-scale').addEventListener('change', (e) => apply({ scale: +e.target.value, compact: false }));
  $('opt-width').addEventListener('change', (e) => apply({ width: +e.target.value, compact: false }));
  $('opt-pos').addEventListener('change', (e) => apply({ pos: e.target.value }));
  barMini.addEventListener('click', () => apply({ compact: !(lay && lay.compact) }));
})(window.ZG);
