'use strict';
// Interfaz: HUD, carteles, mapa de progreso y panel del garaje (taller, mejoras, pintura, objetivos, ranking).
(function (Z) {
  const S = Z.S, G = Z.G;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const UI = Z.UI = { tab: 'taller', slot: 'frontal', hover: null };
  const inGarage = () => G.mode === 'garage' || G.mode === 'fadein-garage';
  const touch = () => { G.lastInteract = G.t; };

  // ---------- Estadísticas ----------
  const STATROWS = [
    { k: 'hp', name: 'Aguante', fmt: v => Math.round(v), max: 1500 },
    { k: 'speed', name: 'Velocidad', fmt: v => Math.round(v / Z.PXM * 3.6) + ' km/h', max: 140 },
    { k: 'dmg', name: 'Daño', fmt: v => Math.round(v), max: 260 },
    { k: 'armor', name: 'Blindaje', fmt: v => Math.round(v * 100) + '%', max: 0.8 },
    { k: 'fuel', name: 'Autonomía', fmt: v => Z.fmt(v * 10) + ' m', max: 1500 },
    { k: 'dps', name: 'Arma', fmt: v => v ? Math.round(v) + ' dps' : '—', max: 220 },
  ];
  function renderStats() {
    const cur = Z.statsNow();
    let nxt = null;
    if (UI.hover) {
      const eq = Object.assign({}, S.eq, { [UI.hover.slot]: UI.hover.id });
      const owned = JSON.parse(JSON.stringify(S.owned));
      if (owned[UI.hover.slot][UI.hover.id] === undefined) owned[UI.hover.slot][UI.hover.id] = 0;
      if (UI.hover.lvlUp) owned[UI.hover.slot][UI.hover.id]++;
      nxt = Z.computeStats(eq, owned, S.garage);
    }
    $('stats').innerHTML = STATROWS.map(r => {
      const v = cur[r.k], n = nxt ? nxt[r.k] : v;
      const sc = (x) => Math.min(100, Math.sqrt(Math.max(0, x) / r.max) * 100);
      const d = n - v;
      const diff = Math.abs(d) > 1e-6 ? `<b class="${d < 0 ? 'neg' : ''}" style="left:${Math.min(sc(v), sc(n))}%;width:${Math.abs(sc(n) - sc(v))}%"></b>` : '';
      const em = Math.abs(d) > 1e-6 ? ` <em class="${d < 0 ? 'neg' : ''}">${d > 0 ? '▲' : '▼'}</em>` : '';
      return `<div class="stat"><span class="name">${r.name}</span><span class="sbar"><i style="width:${sc(v)}%"></i>${diff}</span><span class="val">${r.fmt(n)}${em}</span></div>`;
    }).join('');
  }
  // La velocidad se compara en px/s; el máximo de la barra está en km/h, se convierte aquí.
  STATROWS[1].max = 140 / 3.6 * Z.PXM;

  // ---------- Vista previa del coche ----------
  function drawPreview() {
    const c = $('preview'), x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    const art = Z.ensureArt();
    x.fillStyle = '#120c10'; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < c.width; i += 8) { x.fillStyle = i % 16 ? '#1a1216' : '#1e151a'; x.fillRect(i, 33, 8, 10); }
    x.fillStyle = '#2a2024'; x.fillRect(0, 33, c.width, 1);
    const car = { hpFrac: 1, wheelRot: G.t * 2, driverIn: true, blood: 0, bounce: 0 };
    Z.drawCar(x, art, car, Math.round((c.width - art.mw) / 2), 33, G.t);
  }

  // ---------- Pestañas ----------
  const TABS = [
    { id: 'taller', name: 'Taller' }, { id: 'mejoras', name: 'Mejoras' }, { id: 'pintura', name: 'Pintura' },
    { id: 'objetivos', name: 'Objetivos' }, { id: 'ranking', name: 'Ranking' },
  ];
  function claimable() { return Z.OBJECTIVES.filter(o => !S.claimed[o.id] && o.prog(S)[0] >= o.prog(S)[1]).length; }
  function renderTabs() {
    const n = claimable();
    $('tabs').innerHTML = TABS.map(t => `<button role="tab" type="button" data-tab="${t.id}" aria-selected="${UI.tab === t.id}">${t.name}${t.id === 'objetivos' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('');
  }

  function partCard(slot, p) {
    const owned = S.owned[slot][p.id] !== undefined, lvl = S.owned[slot][p.id] || 0, eq = S.eq[slot] === p.id;
    const g = inGarage();
    const chips = Object.entries(p.st).filter(([k]) => !['mass', 'rate', 'pellets', 'range', 'flame'].includes(k)).map(([k, v]) => {
      const L = { hp: 'Aguante', speed: 'Vel', accel: 'Acel', dmg: 'Daño', armor: 'Blindaje', fuel: 'Gasolina', fire: 'Fuego', grip: 'Agarre', money: 'Dinero', speedPct: 'Vel' }[k] || k;
      const val = (k === 'armor' || k === 'grip' || k === 'money' || k === 'speedPct') ? (v >= 0 ? '+' : '') + Math.round(v * 100) + '%' : '+' + v;
      return `<span class="chip">${L} ${val}</span>`;
    }).join('');
    let actions = '';
    if (!owned) actions = `<button class="btn buy" type="button" data-act="buy" data-slot="${slot}" data-id="${p.id}" ${!g || S.money < p.cost ? 'disabled' : ''}>Comprar $${Z.fmt(p.cost)}</button>`;
    else {
      if (!eq) actions += `<button class="btn" type="button" data-act="equip" data-slot="${slot}" data-id="${p.id}" ${!g ? 'disabled' : ''}>Montar</button>`;
      else actions += `<span class="tag">Montada</span>`;
      if (lvl < Z.MAX_LVL) { const c = Z.upgradeCost(p, lvl); actions += `<button class="btn" type="button" data-act="up" data-slot="${slot}" data-id="${p.id}" ${!g || S.money < c ? 'disabled' : ''}>Mejorar $${Z.fmt(c)}</button>`; }
    }
    const pips = owned ? `<div class="pips" aria-label="Nivel ${lvl}">${Array.from({ length: Z.MAX_LVL }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>` : '';
    return `<div class="part ${eq ? 'equipped' : ''}" data-hover-slot="${slot}" data-hover-id="${p.id}"><h4>${esc(p.name)}</h4><p>${esc(p.desc)}</p><div class="chips">${chips || '<span class="chip">Sin efecto</span>'}</div>${pips}<div class="row">${actions}</div></div>`;
  }

  function renderBody() {
    const b = $('tab-body');
    if (UI.tab === 'taller') {
      const slots = Z.SLOTS.map(s => {
        const p = Z.part(s.id, S.eq[s.id]), lvl = S.owned[s.id][p.id] || 0;
        return `<button class="slot" type="button" data-slot-pick="${s.id}" aria-pressed="${UI.slot === s.id}"><small>${s.name}</small><span>${esc(p.name)}${lvl ? ' · Nv ' + lvl : ''}</span></button>`;
      }).join('');
      b.innerHTML = `<div class="taller"><div class="slots">${slots}</div><div class="parts">${Z.PARTS[UI.slot].map(p => partCard(UI.slot, p)).join('')}</div></div>`;
    } else if (UI.tab === 'mejoras') {
      b.innerHTML = `<p class="hint">Mejoras del taller. Se quedan para siempre y afectan a todos tus coches.</p><div class="parts" style="margin-top:8px">${Z.GARAGE.map(g => {
        const lvl = S.garage[g.id], c = Z.garageCost(g, lvl), max = lvl >= g.max;
        const eff = g.id === 'mecanico' ? `Reparación: ${Z.repairTime().toFixed(1)} s` : g.id === 'chatarrero' ? `+${lvl * 10}% dinero` : g.id === 'reserva' ? `+${lvl * 10}% gasolina` : `+${lvl * 8}% aguante`;
        return `<div class="part"><h4>${g.name}</h4><p>${g.desc}</p><div class="chips"><span class="chip">Nv ${lvl}/${g.max}</span><span class="chip">${eff}</span></div><div class="row">${max ? '<span class="tag">Al máximo</span>' : `<button class="btn buy" type="button" data-act="garage" data-id="${g.id}" ${!inGarage() || S.money < c ? 'disabled' : ''}>Mejorar $${Z.fmt(c)}</button>`}</div></div>`;
      }).join('')}</div>`;
    } else if (UI.tab === 'pintura') {
      const g = inGarage();
      b.innerHTML = `<h3>Pintura</h3><div class="swatches">${Z.PAINTS.map(p => {
        const own = S.paints.includes(p.id);
        return `<button class="swatch" type="button" data-act="${own ? 'paint' : 'buypaint'}" data-id="${p.id}" aria-pressed="${S.paint === p.id}" ${!g || (!own && S.money < p.cost) ? 'disabled' : ''}><span class="c" style="background:${p.base};box-shadow:inset 0 -6px 0 ${Z.mix(p.base, '#000', 0.4)}"></span><span>${p.name}</span><span class="tag">${own ? (S.paint === p.id ? 'Puesta' : 'Tuya') : '$' + Z.fmt(p.cost)}</span></button>`;
      }).join('')}</div><h3 style="margin-top:14px">Adornos</h3><div class="swatches">${Z.DECALS.map(d => {
        const own = S.decals.includes(d.id);
        return `<button class="swatch" type="button" data-act="${own ? 'decal' : 'buydecal'}" data-id="${d.id}" aria-pressed="${S.decal === d.id}" ${!g || (!own && S.money < d.cost) ? 'disabled' : ''}><span>${d.name}</span><span class="tag">${own ? (S.decal === d.id ? 'Puesto' : 'Tuyo') : '$' + Z.fmt(d.cost)}</span></button>`;
      }).join('')}</div>`;
    } else if (UI.tab === 'objetivos') {
      b.innerHTML = `<div class="list">${Z.OBJECTIVES.map(o => {
        const [c, goal] = o.prog(S), done = S.claimed[o.id], ok = c >= goal;
        return `<div class="obj ${done ? 'done' : ''}"><span>${o.text}</span><span class="row">${done ? '<span class="tag">Cobrado</span>' : ok ? `<button class="btn buy" type="button" data-act="claim" data-id="${o.id}">Cobrar $${Z.fmt(o.reward)}</button>` : `<span class="tag">$${Z.fmt(o.reward)}</span>`}</span><span class="pbar"><i style="width:${Math.min(100, c / goal * 100)}%"></i></span></div>`;
      }).join('')}</div>`;
    } else if (UI.tab === 'ranking') {
      const rows = Z.RIVALS.map(r => ({ name: r.name, dist: r.dist, you: false })).concat([{ name: 'Tú', dist: S.stats.bestDist, you: true }]).sort((a, b) => b.dist - a.dist);
      const st = S.stats;
      const hist = S.history.slice().reverse().slice(0, 6).map(h => `<span>${Z.ZONES[h.zone].name} · ${Z.DEATHS[h.death].word.toLowerCase()}</span><b>${h.dist} m · ${h.kills} bajas · $${Z.fmt(h.money)}</b>`).join('');
      b.innerHTML = `<div class="two"><div><h3>Supervivientes</h3><p class="hint" style="margin-bottom:8px">Rivales del juego. Supera su distancia para cobrar su recompensa.</p><div class="list">${rows.map((r, i) => `<div class="rank ${r.you ? 'you' : ''}"><span class="n">#${i + 1}</span><span>${esc(r.name)}</span><span class="d">${Z.fmt(r.dist)} m</span></div>`).join('')}</div></div>
        <div><h3>Tus récords</h3><div class="kv"><span>Mejor distancia</span><b>${st.bestDist} m</b><span>Más bajas en una carrera</span><b>${st.bestKills}</b><span>Zombis eliminados</span><b>${Z.fmt(st.kills)}</b><span>Hordas superadas</span><b>${st.hordes}</b><span>Carreras</span><b>${st.runs}</b><span>Dinero ganado</span><b>$${Z.fmt(st.earned)}</b></div>
        <h3 style="margin-top:14px">Últimas carreras</h3><div class="kv">${hist || '<span class="hint">Aún no has salido.</span>'}</div>
        <div class="row" style="margin-top:14px"><button class="btn" type="button" data-act="reset">${UI.confirmReset ? '¿Seguro? Pulsa otra vez para borrar todo' : 'Borrar partida'}</button></div></div></div>`;
    }
  }

  UI.refresh = function () {
    renderTabs(); renderBody(); renderStats();
    $('lock').innerHTML = inGarage() ? '' : '<div class="lock">Estás en la carretera. Las compras y cambios de piezas se hacen en el garaje.</div>';
    UI.sig = sig();
  };
  // Firma barata para saber cuándo hay que volver a pintar el panel.
  function sig() { return [UI.tab, UI.slot, inGarage(), Math.floor(Math.log10(S.money + 1) * 20), claimable(), S.money >= 0 ? affordCount() : 0].join('|'); }
  function affordCount() {
    let n = 0;
    for (const s of Z.SLOTS) for (const p of Z.PARTS[s.id]) {
      const lvl = S.owned[s.id][p.id];
      if (lvl === undefined ? S.money >= p.cost : S.money >= Z.upgradeCost(p, lvl)) n++;
    }
    return n;
  }
  UI.tick = function () { if (sig() !== UI.sig) UI.refresh(); drawPreview(); };

  // ---------- Acciones ----------
  function act(a, el) {
    touch();
    const slot = el.dataset.slot, id = el.dataset.id;
    if (a !== 'reset') UI.confirmReset = false;
    if (a === 'buy') { const p = Z.part(slot, id); if (S.money >= p.cost) { S.money -= p.cost; S.owned[slot][id] = 0; S.eq[slot] = id; S.stats.partsBought++; } }
    else if (a === 'equip') S.eq[slot] = id;
    else if (a === 'up') { const p = Z.part(slot, id), l = S.owned[slot][id], c = Z.upgradeCost(p, l); if (S.money >= c && l < Z.MAX_LVL) { S.money -= c; S.owned[slot][id]++; } }
    else if (a === 'garage') { const g = Z.GARAGE.find(x => x.id === id), c = Z.garageCost(g, S.garage[id]); if (S.money >= c && S.garage[id] < g.max) { S.money -= c; S.garage[id]++; } }
    else if (a === 'buypaint') { const p = Z.PAINTS.find(x => x.id === id); if (S.money >= p.cost) { S.money -= p.cost; S.paints.push(id); S.paint = id; } }
    else if (a === 'paint') S.paint = id;
    else if (a === 'buydecal') { const d = Z.DECALS.find(x => x.id === id); if (S.money >= d.cost) { S.money -= d.cost; S.decals.push(id); S.decal = id; } }
    else if (a === 'decal') S.decal = id;
    else if (a === 'claim') { const o = Z.OBJECTIVES.find(x => x.id === id); if (!S.claimed[id]) { S.claimed[id] = true; S.money += o.reward; Z.banner('Objetivo cumplido', '+$' + Z.fmt(o.reward), 'rival'); } }
    else if (a === 'reset') {
      if (!UI.confirmReset) { UI.confirmReset = true; UI.refresh(); return; }
      UI.confirmReset = false; Z.resetSave(); Z.enterGarage(true); applyToggles();
    }
    UI.hover = null;
    Z.refreshCar(); Z.save(); UI.refresh();
  }

  function applyToggles() {
    $('btn-dir').textContent = S.dir === 'rtl' ? 'Der → Izq' : 'Izq → Der';
    $('btn-auto').setAttribute('aria-pressed', S.auto ? 'true' : 'false');
    $('stage').classList.toggle('rtl', S.dir === 'rtl');
  }
  UI.applyToggles = applyToggles;

  UI.init = function () {
    $('tab-body').addEventListener('click', (e) => {
      const pick = e.target.closest('[data-slot-pick]');
      if (pick) { touch(); UI.slot = pick.dataset.slotPick; UI.hover = null; UI.refresh(); return; }
      const b = e.target.closest('[data-act]');
      if (b && !b.disabled) act(b.dataset.act, b);
    });
    $('tab-body').addEventListener('mouseover', (e) => {
      const c = e.target.closest('[data-hover-slot]');
      const up = e.target.closest('[data-act="up"]');
      const h = c ? { slot: c.dataset.hoverSlot, id: c.dataset.hoverId, lvlUp: !!up } : null;
      const k = h ? h.slot + h.id + h.lvlUp : '';
      if (k !== UI.hoverKey) { UI.hoverKey = k; UI.hover = h; renderStats(); }
    });
    $('panel').addEventListener('pointermove', touch);
    $('tabs').addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) { touch(); UI.tab = t.dataset.tab; UI.refresh(); } });
    $('btn-dir').addEventListener('click', () => { S.dir = S.dir === 'rtl' ? 'ltr' : 'rtl'; applyToggles(); Z.save(); });
    $('btn-auto').addEventListener('click', () => { S.auto = !S.auto; applyToggles(); Z.save(); });
    // App de escritorio: el juego corre encima de la barra de tareas (capa transparente).
    // «Garaje» abre la ventana grande con la tienda; «Volver a la barra» la devuelve a su sitio.
    const desk = window.taskbarz;
    const setPanel = (open) => {
      if (Z.TASKBAR) {
        Z.setOverlay(!open);
        if (desk) desk.setMode(open ? 'full' : 'taskbar');
        $('btn-panel').textContent = 'Volver a la barra';
        $('panel').hidden = false;
        return;
      }
      $('panel').hidden = !open; $('btn-panel').setAttribute('aria-pressed', open ? 'true' : 'false');
    };
    $('btn-panel').addEventListener('click', () => setPanel(Z.TASKBAR ? false : $('panel').hidden));
    $('bar-garage').addEventListener('click', () => { touch(); setPanel(true); });
    $('bar-go').addEventListener('click', () => { G.lastInteract = -99; Z.launch(); });
    $('bar-quit').addEventListener('click', () => { Z.save(); if (desk) desk.quit(); });
    if (desk) { $('btn-quit').hidden = false; $('btn-quit').addEventListener('click', () => { Z.save(); desk.quit(); }); }
    if (Z.TASKBAR) setPanel(false);
    // En la barra, los clics atraviesan el juego salvo encima de sus botones (como Taskbar Hero).
    let through = null;
    document.addEventListener('mousemove', (e) => {
      if (!desk || !Z.overlay) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const t = !(el && el.closest('button'));
      if (t !== through) { through = t; desk.setClickThrough(t); }
    });
    $('btn-go').addEventListener('click', () => { touch(); G.lastInteract = -99; if (Z.TASKBAR) setPanel(false); Z.launch(); });
    applyToggles();
    UI.refresh();
  };

  // ---------- HUD, carteles y mapa ----------
  const bannerQ = [];
  let bannerT = 0, deathShown = false;
  UI.event = function (ev) {
    if (ev.type === 'banner') { bannerQ.push(ev.data); if (bannerQ.length > 4) bannerQ.splice(1, 1); }
    if (ev.type === 'death') {
      const d = ev.data, el = $('deathcard');
      el.querySelector('.w').textContent = d.word;
      el.querySelector('.s').textContent = `${d.cause === 'fuel' ? 'Sin gasolina en ' : 'En '}${d.zone} · ${Math.floor(d.dist)} m · ${d.kills} bajas · +$${Z.fmt(d.money)}`;
      el.classList.add('show'); deathShown = true;
      bannerQ.length = 0; bannerT = 0; $('banner').classList.remove('show');
    }
    if (ev.type === 'mode') { if (deathShown && G.mode === 'run') { $('deathcard').classList.remove('show'); deathShown = false; } UI.refresh(); }
  };

  const TRACK_MAX = 10000;
  const tpos = (m) => { const p = Math.sqrt(Math.min(m, TRACK_MAX) / TRACK_MAX) * 100; return S.dir === 'rtl' ? 100 - p : p; };
  let trackSig = '';
  function renderTrack() {
    const t = $('track');
    const s = [S.dir, S.stats.bestDist, Object.keys(S.rivals).length, S.last ? S.last.dist : 0].join('|');
    if (s !== trackSig) {
      trackSig = s;
      let html = '';
      Z.ZONES.forEach((z, i) => {
        const a = tpos(z.start), b = tpos(i + 1 < Z.ZONES.length ? Z.ZONES[i + 1].start : TRACK_MAX);
        const l = Math.min(a, b), w = Math.abs(b - a);
        html += `<div class="seg" style="left:${l}%;width:${w}%;${S.dir === 'rtl' ? 'text-align:right' : ''}">${z.name}</div>`;
      });
      for (const r of Z.RIVALS) html += `<div class="mark rival ${S.rivals[r.name] ? 'beaten' : ''}" style="left:${tpos(r.dist)}%" title="${esc(r.name)}: ${r.dist} m"></div>`;
      if (S.last) html += `<div class="mark last" style="left:${tpos(S.last.dist)}%" title="Última carrera"></div>`;
      if (S.stats.bestDist) html += `<div class="mark best" style="left:${tpos(S.stats.bestDist)}%" title="Tu récord: ${S.stats.bestDist} m"></div>`;
      html += `<div class="mark car" id="track-car"></div>`;
      t.innerHTML = html;
    }
    const d = G.run && G.mode !== 'garage' && G.mode !== 'fadein-garage' ? G.run.dist : 0;
    const car = $('track-car');
    car.style.left = tpos(d) + '%';
    car.style.display = d > 0 ? '' : 'none';
    const next = Z.RIVALS.find(r => r.dist > Math.max(d, S.stats.bestDist) || !S.rivals[r.name]);
    $('track-note').textContent = next ? `Siguiente rival: ${next.name} a ${Z.fmt(next.dist)} m (recompensa $${Z.fmt(next.reward)}) · Tu récord: ${S.stats.bestDist} m` : `Has superado a todos los rivales. Récord: ${S.stats.bestDist} m`;
  }

  let hudCache = {};
  const setText = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } };
  UI.frame = function (dt) {
    setText('hud-money', '$' + Z.fmt(S.money));
    const running = G.mode !== 'garage' && G.mode !== 'fadein-garage' && G.mode !== 'fadein-run' && G.run;
    if (running) {
      setText('hud-kills', G.run.kills + ' bajas');
      setText('hud-dist', Math.floor(G.run.dist) + ' m');
      setText('hud-zone', Z.ZONES[G.zone].name);
      $('hud-hp').style.width = (G.car.hpFrac * 100).toFixed(1) + '%';
      $('hud-fuel').style.width = Z.clamp(G.car.fuel / G.car.maxFuel * 100, 0, 100).toFixed(1) + '%';
      const p = Object.entries(G.car.perks).filter(([, v]) => v > 0).map(([k, v]) => Z.PERKS.find(x => x.id === k).name + ' ' + Math.ceil(v));
      setText('hud-perks', p.join(' · '));
    } else {
      setText('hud-kills', ''); setText('hud-perks', '');
      setText('hud-dist', G.garage && G.garage.repair < 1 ? 'Reparando ' + Math.floor(G.garage.repair * 100) + '%' : 'Listo');
      setText('hud-zone', 'El Garaje');
      $('hud-hp').style.width = ((G.car ? G.car.hpFrac : 1) * 100) + '%';
      $('hud-fuel').style.width = '100%';
    }
    if (deathShown && G.mode === 'garage' && G.garage.repair > 0.35) { $('deathcard').classList.remove('show'); deathShown = false; }
    // carteles
    const bn = $('banner');
    if (deathShown) bannerQ.length = 0;
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0.35) bn.classList.remove('show'); }
    else if (bannerQ.length) {
      const b = bannerQ.shift();
      bn.className = 'banner show ' + (b.kind || '');
      bn.querySelector('.t').textContent = b.text; bn.querySelector('.s').textContent = b.sub || '';
      bannerT = b.kind === 'zone' ? 3.2 : 2.2;
    }
    const ready = G.mode === 'garage' && G.garage.repair >= 1 && !G.garage.launching;
    const label = ready && S.auto && G.t - G.lastInteract > 4 ? `A la carretera (${Math.ceil(G.garage.countdown)})` : 'A la carretera';
    for (const id of ['btn-go', 'bar-go']) {
      const go = $(id);
      if (go.disabled !== !ready) go.disabled = !ready;
      setText(id, label);  // solo se reescribe si cambia, para no estorbar al clic
    }
    $('bar-go').hidden = !ready;
    renderTrack();
  };
})(window.ZG);
