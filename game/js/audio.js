'use strict';
// Sonido sintetizado con Web Audio: no hay archivos, todo se genera al vuelo (funciona sin conexión).
// Uso desde cualquier parte del juego:  ZG.Audio.play('disparo')   ZG.Audio.play('golpe', { vol: 0.5, pitch: 1.2 })
// Sonidos: disparo, escopeta, metralla, golpe, chof, muerte_zombi, gemido, choque, cristal, explosion,
//          grito, mordisco, moneda, compra, clic, error, llave, gasolina, puerta, motor_arranque, zona, alarma.
// Bucle de motor: ZG.Audio.engine(on, rpm 0..1).  Volumen: ZG.Audio.setVolume(0..1).  Silencio: ZG.Audio.setMuted(bool).
(function (Z) {
  const KEY = 'zombie-garage-audio';
  let ctx = null, master = null, comp = null, noiseBuf = null, eng = null;
  let pref = { vol: 0.6, muted: false };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* sin almacenamiento */ }
  const last = {};   // limita repeticiones del mismo sonido en el mismo instante

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    master = ctx.createGain(); master.gain.value = pref.muted ? 0 : pref.vol;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  const unlock = () => { if (init() && ctx.state === 'suspended') ctx.resume(); };
  ['pointerdown', 'keydown', 'mousemove'].forEach(e => window.addEventListener(e, unlock, { passive: true }));

  // Piezas básicas
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function noise(t, dur, { type = 'lowpass', f = 2000, f2 = null, q = 0.7, vol = 0.5, a = 0.002 } = {}, out = master) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain(); env(g, t, a, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + a + dur + 0.05);
  }
  function tone(t, dur, { wave = 'square', f = 220, f2 = null, vol = 0.3, a = 0.003 } = {}, out = master) {
    const o = ctx.createOscillator(); o.type = wave; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + dur);
    const g = ctx.createGain(); env(g, t, a, vol, dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + a + dur + 0.05);
  }

  const SFX = {
    disparo(t, p) { noise(t, 0.12, { type: 'bandpass', f: 1800 * p, f2: 300, q: 0.8, vol: 0.7 }); tone(t, 0.08, { wave: 'square', f: 180 * p, f2: 50, vol: 0.35 }); },
    escopeta(t, p) { noise(t, 0.3, { f: 2600 * p, f2: 200, vol: 0.9 }); tone(t, 0.18, { wave: 'sawtooth', f: 110 * p, f2: 35, vol: 0.4 }); noise(t + 0.32, 0.05, { type: 'highpass', f: 3000, vol: 0.15 }); },
    metralla(t, p) { noise(t, 0.05, { type: 'bandpass', f: 2200 * p, q: 1.2, vol: 0.45 }); tone(t, 0.04, { f: 140 * p, f2: 60, vol: 0.18 }); },
    golpe(t, p) { tone(t, 0.12, { wave: 'sine', f: 120 * p, f2: 40, vol: 0.6 }); noise(t, 0.08, { f: 900 * p, vol: 0.4 }); },
    chof(t, p) { noise(t, 0.22, { f: 700 * p, f2: 150, q: 3, vol: 0.55, a: 0.01 }); tone(t + 0.02, 0.15, { wave: 'sine', f: 90 * p, f2: 50, vol: 0.3 }); },
    muerte_zombi(t, p) { SFX.chof(t, p); tone(t, 0.35, { wave: 'sawtooth', f: 140 * p, f2: 60, vol: 0.12, a: 0.02 }); },
    gemido(t, p) { const f = 90 + Math.random() * 40; tone(t, 0.7, { wave: 'sawtooth', f: f * p, f2: f * 0.7 * p, vol: 0.06, a: 0.15 }); noise(t, 0.6, { type: 'bandpass', f: 500, q: 4, vol: 0.05, a: 0.15 }); },
    choque(t, p) { noise(t, 0.45, { f: 1500 * p, f2: 120, vol: 0.9 }); tone(t, 0.3, { wave: 'square', f: 70 * p, f2: 30, vol: 0.4 }); SFX.cristal(t + 0.05, p); },
    cristal(t, p) { for (let i = 0; i < 6; i++) tone(t + i * 0.025, 0.12, { wave: 'triangle', f: (2400 + Math.random() * 2600) * p, vol: 0.06 }); noise(t, 0.2, { type: 'highpass', f: 4000, vol: 0.2 }); },
    explosion(t, p) { noise(t, 1.2, { f: 1200 * p, f2: 60, vol: 1, a: 0.005 }); tone(t, 0.8, { wave: 'sine', f: 70 * p, f2: 25, vol: 0.8 }); noise(t + 0.15, 0.9, { f: 300, vol: 0.4, a: 0.1 }); },
    grito(t, p) { const o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(520 * p, t); o.frequency.linearRampToValueAtTime(820 * p, t + 0.25); o.frequency.exponentialRampToValueAtTime(300 * p, t + 1.1);
      v.frequency.value = 9; vg.gain.value = 25; v.connect(vg); vg.connect(o.frequency);
      const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1200; fl.Q.value = 2;
      env(g, t, 0.05, 0.25, 1.05); o.connect(fl); fl.connect(g); g.connect(master); o.start(t); v.start(t); o.stop(t + 1.2); v.stop(t + 1.2); },
    mordisco(t, p) { noise(t, 0.1, { type: 'bandpass', f: 900 * p, q: 2, vol: 0.5 }); SFX.chof(t + 0.06, p * 0.8); },
    moneda(t, p) { tone(t, 0.06, { wave: 'square', f: 1320 * p, vol: 0.12 }); tone(t + 0.06, 0.18, { wave: 'square', f: 1980 * p, vol: 0.12 }); },
    compra(t, p) { [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.06, 0.16, { wave: 'square', f: f * p, vol: 0.12 })); SFX.llave(t, 1.3); },
    clic(t, p) { tone(t, 0.025, { wave: 'square', f: 900 * p, f2: 500, vol: 0.12 }); },
    error(t, p) { tone(t, 0.12, { wave: 'square', f: 160 * p, vol: 0.15 }); tone(t + 0.13, 0.18, { wave: 'square', f: 120 * p, vol: 0.15 }); },
    llave(t, p) { for (let i = 0; i < 3; i++) noise(t + i * 0.05, 0.03, { type: 'bandpass', f: 3200 * p, q: 6, vol: 0.35 }); tone(t, 0.08, { wave: 'triangle', f: 1600 * p, vol: 0.08 }); },
    gasolina(t, p) { for (let i = 0; i < 4; i++) tone(t + i * 0.07, 0.07, { wave: 'sine', f: (200 + Math.random() * 120) * p, f2: 420 * p, vol: 0.18, a: 0.01 }); noise(t, 0.3, { f: 600, vol: 0.08 }); },
    puerta(t, p) { noise(t, 1.1, { type: 'bandpass', f: 400 * p, q: 1.5, vol: 0.25, a: 0.05 }); for (let i = 0; i < 10; i++) noise(t + i * 0.1, 0.03, { type: 'bandpass', f: 1500, q: 5, vol: 0.12 }); SFX.golpe(t + 1.1, 0.7); },
    motor_arranque(t, p) { tone(t, 0.6, { wave: 'sawtooth', f: 40 * p, f2: 70 * p, vol: 0.25, a: 0.05 }); noise(t, 0.6, { f: 400, vol: 0.2, a: 0.05 }); tone(t + 0.55, 0.5, { wave: 'sawtooth', f: 90 * p, f2: 55 * p, vol: 0.3 }); },
    zona(t, p) { tone(t, 1.6, { wave: 'sawtooth', f: 55 * p, vol: 0.15, a: 0.3 }); tone(t, 1.6, { wave: 'sawtooth', f: 82.4 * p, vol: 0.1, a: 0.3 }); tone(t + 0.2, 1.4, { wave: 'triangle', f: 220 * p, f2: 207 * p, vol: 0.08, a: 0.3 }); },
    alarma(t, p) { for (let i = 0; i < 3; i++) tone(t + i * 0.22, 0.14, { wave: 'square', f: 880 * p, vol: 0.08 }); },
  };

  Z.Audio = {
    play(name, o = {}) {
      if (pref.muted || !init() || !SFX[name]) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime, gap = o.gap != null ? o.gap : 0.03;
      if (last[name] && now - last[name] < gap) return;
      last[name] = now;
      const bus = ctx.createGain(); bus.gain.value = o.vol != null ? o.vol : 1; bus.connect(master);
      const prev = master; master = bus;
      try { SFX[name](now + (o.delay || 0), (o.pitch || 1) * (0.94 + Math.random() * 0.12)); } finally { master = prev; }
      setTimeout(() => bus.disconnect(), 3000);
    },
    engine(on, rpm = 0) {
      if (!init()) return;
      if (on && !eng) {
        const o = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o2.type = 'square'; fl.type = 'lowpass'; fl.frequency.value = 380; g.gain.value = 0;
        o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(master); o.start(); o2.start();
        eng = { o, o2, g };
      }
      if (!eng) return;
      const t = ctx.currentTime, f = 38 + rpm * 70;
      eng.o.frequency.setTargetAtTime(f, t, 0.1); eng.o2.frequency.setTargetAtTime(f * 0.501, t, 0.1);
      eng.g.gain.setTargetAtTime(on ? 0.05 + rpm * 0.04 : 0, t, 0.15);
    },
    setVolume(v) { pref.vol = Math.max(0, Math.min(1, v)); if (master && !pref.muted) master.gain.value = pref.vol; save(); },
    setMuted(m) { pref.muted = !!m; if (master) master.gain.value = m ? 0 : pref.vol; if (m) Z.Audio.engine(false); save(); },
    get muted() { return pref.muted; },
    get volume() { return pref.vol; },
    names: Object.keys(SFX),
  };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) { /* nada */ } }
})(window.ZG);
