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
    { k: 'hp', name: 'Aguante', icon: 'corazon', fmt: v => Math.round(v), max: 1500 },
    { k: 'speed', name: 'Velocidad', icon: 'velocidad', fmt: v => Math.round(v / Z.PXM * 3.6) + ' km/h', max: 140 },
    { k: 'dmg', name: 'Daño', icon: 'calavera', fmt: v => Math.round(v), max: 260 },
    { k: 'armor', name: 'Blindaje', icon: 'blindaje', fmt: v => Math.round(v * 100) + '%', max: 0.8 },
    { k: 'fuel', name: 'Autonomía', icon: 'bidon', fmt: v => Z.fmt(v * 10) + ' m', max: 1500 },
    { k: 'dps', name: 'Arma', icon: 'bala', fmt: v => v ? Math.round(v) + ' dps' : '—', max: 220 },
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
      return `<div class="stat"><span class="name">${Z.icon(r.icon, 1)}${r.name}</span><span class="sbar"><i style="width:${sc(v)}%"></i>${diff}</span><span class="val">${r.fmt(n)}${em}</span></div>`;
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
  // Otras partes del juego pueden añadir su pestaña con UI.addTab (la de «Armas» va justo después de «Taller»):
  //   ZG.UI.addTab({ id: 'armas', name: 'Armas', icon: 'armas', after: 'taller',
  //                  render(body, ctx) { body.innerHTML = '…' }, onClick(e, ctx) { return true si lo ha gestionado }, sig() { return '…' } })
  // ctx = { inGarage, esc, refresh }. sig() devuelve algo que cambie cuando haya que repintar la pestaña.
  const TABS = UI.tabs = [
    { id: 'taller', name: 'Taller', icon: 'llave' }, { id: 'mejoras', name: 'Mejoras', icon: 'mejora' }, { id: 'pintura', name: 'Pintura', icon: 'pintura' },
    { id: 'objetivos', name: 'Objetivos', icon: 'diana' }, { id: 'ranking', name: 'Ranking', icon: 'corona' },
  ];
  UI.addTab = function (t) {
    const old = TABS.findIndex(x => x.id === t.id);
    if (old >= 0) TABS.splice(old, 1);
    const i = t.after ? TABS.findIndex(x => x.id === t.after) : -1;
    TABS.splice(i >= 0 ? i + 1 : TABS.length, 0, t);
    if (UI.ready) UI.refresh();
  };
  const tabCtx = () => ({ inGarage: inGarage(), esc, refresh: () => UI.refresh() });
  const extTab = () => TABS.find(t => t.id === UI.tab && t.render);
  function claimable() { return Z.OBJECTIVES.filter(o => !S.claimed[o.id] && o.prog(S)[0] >= o.prog(S)[1]).length; }
  function renderTabs() {
    const n = claimable();
    $('tabs').innerHTML = TABS.map(t => `<button role="tab" type="button" data-tab="${t.id}" aria-selected="${UI.tab === t.id}">${t.icon ? Z.icon(t.icon, 2) : ''}${t.name}${t.id === 'objetivos' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('');
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
    const ext = extTab();
    if (ext) { ext.render(b, tabCtx()); return; }
    if (UI.tab === 'taller') {
      const slots = Z.SLOTS.map(s => {
        const p = Z.part(s.id, S.eq[s.id]), lvl = S.owned[s.id][p.id] || 0;
        return `<button class="slot" type="button" data-slot-pick="${s.id}" aria-pressed="${UI.slot === s.id}"><span class="si">${Z.icon(s.id, 2)}</span><span class="st"><small>${s.name}</small><span>${esc(p.name)}${lvl ? ' · Nv ' + lvl : ''}</span></span></button>`;
      }).join('');
      b.innerHTML = `<div class="taller"><div class="slots">${slots}</div><div class="parts">${Z.PARTS[UI.slot].map(p => partCard(UI.slot, p)).join('')}</div></div>`;
    } else if (UI.tab === 'mejoras') {
      b.innerHTML = `<p class="hint">Mejoras del taller. Se quedan para siempre y afectan a todos tus coches.</p><div class="parts" style="margin-top:8px">${Z.GARAGE.map(g => {
        const lvl = S.garage[g.id], c = Z.garageCost(g, lvl), max = lvl >= g.max;
        const pips = `<div class="pips" aria-label="Nivel ${lvl} de ${g.max}">${Array.from({ length: g.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>`;
        return `<div class="part upg"><div class="ph">${Z.icon(g.icon || 'mejora', 3)}<h4>${g.name}</h4></div><p>${g.desc}</p><div class="chips">${garageEffect(g.id, lvl, max)}</div>${pips}<div class="row">${max ? '<span class="tag">Al máximo</span>' : `<button class="btn buy" type="button" data-act="garage" data-id="${g.id}" ${!inGarage() || S.money < c ? 'disabled' : ''}>Mejorar $${Z.fmt(c)}</button>`}</div></div>`;
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

  // Efecto de una mejora del taller ahora y con un nivel más.
  function garageEffect(id, lvl, max) {
    const at = (l, f) => { const o = S.garage[id]; S.garage[id] = l; try { return f(); } finally { S.garage[id] = o; } };
    const pct = (x) => Math.round(x * 100) + '%';
    const two = (f) => `<span class="chip">${f(lvl)}</span>${max ? '' : `<span class="chip next">▲ ${f(lvl + 1)}</span>`}`;
    if (id === 'mecanico') return two(l => at(l, () => `Solo: ${Math.round(Z.repairTime())} s · Clic: +${pct(Z.repairClick())}`));
    if (id === 'surtidor') return two(l => at(l, () => `Solo: ${Math.round(Z.refuelTime())} s · Clic: +${pct(Z.refuelClick())}`));
    if (id === 'chatarrero') return two(l => `+${l * 10}% dinero`);
    if (id === 'reserva') return two(l => `+${l * 10}% gasolina`);
    return two(l => `+${l * 8}% aguante`);
  }

  UI.refresh = function () {
    renderTabs(); renderBody(); renderStats();
    $('lock').innerHTML = inGarage() ? '' : '<div class="lock">Estás en la carretera. Las compras y cambios de piezas se hacen en el garaje.</div>';
    UI.sig = sig();
  };
  // Firma barata para saber cuándo hay que volver a pintar el panel.
  function sig() { const ext = extTab(); return [UI.tab, UI.slot, inGarage(), Math.floor(Math.log10(S.money + 1) * 20), claimable(), S.money >= 0 ? affordCount() : 0, ext && ext.sig ? ext.sig() : ''].join('|'); }
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
    const before = S.money;
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
    if (Z.Audio) {
      const buying = a === 'buy' || a === 'up' || a === 'garage' || a === 'buypaint' || a === 'buydecal';
      Z.Audio.play(S.money < before ? 'compra' : buying ? 'error' : a === 'claim' ? 'moneda' : 'llave');
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
      const ext = extTab();
      if (ext && ext.onClick && ext.onClick(e, tabCtx())) { touch(); return; }
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
    // Salir solo desde la ventana del garaje y con confirmación, para no cerrar el juego por un clic despistado.
    if (desk) {
      const q = $('btn-quit'); let armT = 0;
      q.hidden = false;
      q.addEventListener('click', () => {
        if (Date.now() - armT < 3000) { Z.save(); desk.quit(); return; }
        armT = Date.now(); q.textContent = '¿Salir? Pulsa otra vez';
        setTimeout(() => { q.textContent = 'Salir'; }, 3000);
      });
    }
    if (Z.TASKBAR) setPanel(false);
    // En la barra, los clics atraviesan el juego salvo encima de sus botones (lo gestiona js/through.js).
    $('btn-go').addEventListener('click', () => { touch(); G.lastInteract = -99; if (Z.TASKBAR) setPanel(false); Z.launch(); });
    // Servicio: reparar (coche) y repostar (surtidor), con clic en el escenario o en sus botones.
    $('hot-car').addEventListener('click', (e) => UI.serviceClick('hp', e));
    $('hot-pump').addEventListener('click', (e) => UI.serviceClick('fuel', e));
    $('btn-repair').addEventListener('click', (e) => UI.serviceClick('hp', e));
    $('btn-refuel').addEventListener('click', (e) => UI.serviceClick('fuel', e));
    $('bar-repair').addEventListener('click', (e) => UI.serviceClick('hp', e));
    $('bar-refuel').addEventListener('click', (e) => UI.serviceClick('fuel', e));
    for (const [id, k] of [['hot-car', 'hp'], ['hot-pump', 'fuel']]) {
      $(id).addEventListener('pointerenter', () => { Z.Service.hover = k; });
      $(id).addEventListener('pointerleave', () => { if (Z.Service.hover === k) Z.Service.hover = null; });
    }
    Z.fillIcons();
    applyToggles();
    UI.ready = true;
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

  const TRACK_MAX = Z.TRACK_MAX || 10000;
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
  // ---------- Aguante y gasolina: HUD, panel de servicio y zonas pulsables ----------
  const setW = (id, f) => { const v = (Z.clamp(f, 0, 1) * 100).toFixed(1) + '%'; if (hudCache[id] !== v) { hudCache[id] = v; $(id).style.width = v; } };
  const setCls = (id, cls, on) => { const k = id + '.' + cls; if (hudCache[k] !== on) { hudCache[k] = on; $(id).classList.toggle(cls, on); } };
  function vitals() {
    const car = G.car;
    if (!car) return { hp: 1, fuel: 1, hpN: 0, hpMax: 0, m: 0, mMax: 0 };
    const fuel = Z.clamp(car.fuel / Math.max(1, car.maxFuel), 0, 1);
    return { hp: car.hpFrac, fuel, hpN: Math.max(0, Math.ceil(car.hp)), hpMax: Math.round(car.maxHp), m: Math.max(0, Math.floor(car.fuel * 10)), mMax: Math.round(car.maxFuel * 10) };
  }
  function meters(v, running) {
    setW('hud-hp', v.hp); setW('hud-fuel', v.fuel);
    setText('hud-hp-n', v.hpN + '/' + v.hpMax);
    setText('hud-fuel-n', Z.fmt(v.m) + ' m');
    // en carretera parpadean cuando queda poco
    setCls('m-hp', 'low', running && v.hp < 0.3);
    setCls('m-fuel', 'low', running && v.fuel < 0.2);
    setText('hud-warn', running && G.car.fuel <= 0 ? 'SIN GASOLINA' : running && v.hp < 0.3 ? '¡EL COCHE NO AGUANTA!' : running && v.fuel < 0.2 ? 'RESERVA' : '');
  }
  const SV = () => Z.Service;
  function servicePanel(v, running) {
    const g = !running && G.garage, busy = !g || G.mode !== 'garage' || g.launching;
    setW('svc-hp-fill', v.hp); setW('svc-fuel-fill', v.fuel);
    setText('svc-hp-v', `${v.hpN} / ${v.hpMax}`);
    setText('svc-fuel-v', `${Z.fmt(v.m)} / ${Z.fmt(v.mMax)} m`);
    setCls('svc-hp', 'low', v.hp < 0.3); setCls('svc-fuel', 'low', v.fuel < 0.2);
    setCls('svc-hp', 'full', v.hp >= 1); setCls('svc-fuel', 'full', v.fuel >= 1);
    const pct = (x) => Math.round(x * 100) + '%';
    if (running) {
      setText('svc-hp-s', v.hp < 0.3 ? 'A punto de romperse' : 'En carretera');
      setText('svc-fuel-s', G.car.fuel <= 0 ? 'Depósito vacío' : `Te quedan ${Z.fmt(v.m)} m`);
    } else {
      const k = (kind) => SV().combo[kind] > 0 && SV().comboT[kind] > 0 ? ` · racha x${SV().mult(kind).toFixed(1)}` : '';
      setText('svc-hp-s', v.hp >= 1 ? 'Reparado' : `Solo: +${(100 / Z.repairTime()).toFixed(1)}%/s · Clic: +${pct(Z.repairClick())}${k('hp')}`);
      setText('svc-fuel-s', v.fuel >= 1 ? 'Depósito lleno' : `Solo: +${(100 / Z.refuelTime()).toFixed(1)}%/s · Clic: +${pct(Z.refuelClick())}${k('fuel')}`);
    }
    for (const [id, full] of [['btn-repair', v.hp >= 1], ['btn-refuel', v.fuel >= 1], ['bar-repair', v.hp >= 1], ['bar-refuel', v.fuel >= 1]]) {
      const dis = busy || full, b = $(id);
      if (b.disabled !== dis) b.disabled = dis;
    }
    $('bar-repair').hidden = busy || v.hp >= 1;
    $('bar-refuel').hidden = busy || v.fuel >= 1;
    setW('bar-repair-f', v.hp); setW('bar-refuel-f', v.fuel);
  }
  // Botones invisibles encima del coche y del surtidor (sirven también en la barra de tareas).
  function hotspots() {
    const on = G.mode === 'garage' && G.garage && !G.garage.launching && G.art;
    for (const id of ['hot-car', 'hot-pump']) if ($(id).hidden !== !on) $(id).hidden = !on;
    if (!on) { SV().hover = null; return; }
    const L = SV().layout(), top = Z.overlay ? Z.VIEW_TOP : 0, vh = Z.overlay ? Z.VIEW_H : Z.H, rtl = S.dir === 'rtl';
    const place = (id, r, full) => {
      // En la barra de tareas solo se puede pinchar por encima de la barra real, para no tapar Inicio ni los iconos.
      if (Z.overlay) { const y2 = Math.min(r.y + r.h, Z.H - Z.TB_ROWS); r = { x: r.x, y: r.y, w: r.w, h: Math.max(0, y2 - r.y) }; }
      const x = rtl ? Z.W - r.x - r.w : r.x;
      const css = `left:${(x / Z.W * 100).toFixed(2)}%;top:${((r.y - top) / vh * 100).toFixed(2)}%;width:${(r.w / Z.W * 100).toFixed(2)}%;height:${(r.h / vh * 100).toFixed(2)}%`;
      const el = $(id);
      if (hudCache[id] !== css) { hudCache[id] = css; el.style.cssText = css; }
      el.classList.toggle('done', full);
    };
    place('hot-car', L.car, S.svc.hp >= 1);
    place('hot-pump', L.pump, S.svc.fuel >= 1);
  }
  // Pasa un clic de la pantalla a coordenadas del mundo (para que las chispas salgan donde pinchas).
  function toWorld(e) {
    const r = $('screen').getBoundingClientRect();
    const top = Z.overlay ? Z.VIEW_TOP : 0, vh = Z.overlay ? Z.VIEW_H : Z.H;
    let x = (e.clientX - r.left) / r.width * Z.W;
    if (S.dir === 'rtl') x = Z.W - x;
    return [x, top + (e.clientY - r.top) / r.height * vh];
  }
  UI.serviceClick = function (kind, e) {
    let wx, wy;
    if (e && e.clientX !== undefined && e.detail > 0 && e.currentTarget && e.currentTarget.classList.contains('hot')) [wx, wy] = toWorld(e);
    SV().click(kind, wx, wy);
    const el = $(kind === 'hp' ? 'svc-hp' : 'svc-fuel');
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  };

  UI.frame = function (dt) {
    setText('hud-money', '$' + Z.fmt(S.money));
    const running = G.mode !== 'garage' && G.mode !== 'fadein-garage' && G.mode !== 'fadein-run' && G.run;
    const v = vitals();
    if (running) {
      setText('hud-kills', G.run.kills + ' bajas');
      setText('hud-dist', Math.floor(G.run.dist) + ' m');
      setText('hud-zone', Z.ZONES[G.zone].name);
      const p = Object.entries(G.car.perks).filter(([, x]) => x > 0).map(([k, x]) => Z.PERKS.find(q => q.id === k).name + ' ' + Math.ceil(x));
      setText('hud-perks', p.join(' · '));
    } else {
      setText('hud-kills', ''); setText('hud-perks', '');
      const todo = [];
      if (v.hp < 1) todo.push('Reparando ' + Math.floor(v.hp * 100) + '%');
      if (v.fuel < 1) todo.push('Repostando ' + Math.floor(v.fuel * 100) + '%');
      setText('hud-dist', todo.length ? todo.join(' · ') : 'Listo');
      setText('hud-zone', 'El Garaje');
    }
    meters(v, running);
    servicePanel(v, running);
    hotspots();
    if (deathShown && G.mode === 'garage' && (G.garage.t > 3 || G.t - G.lastInteract < 0.5)) { $('deathcard').classList.remove('show'); deathShown = false; }
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
    // salida: en automático cuando está todo a punto; a mano en cuanto aguanta un poco y lleva algo de gasolina
    const here = G.mode === 'garage' && !G.garage.launching;
    const can = here && SV().canLaunch(), full = SV().full();
    let label = 'A la carretera';
    if (here && !can) label = S.svc.hp < SV().MIN_HP ? 'Repara el coche' : 'Echa gasolina';
    else if (can && full && S.auto && G.t - G.lastInteract > 4) label = `A la carretera (${Math.ceil(G.garage.countdown)})`;
    const tip = can && !full ? `Sales con el ${Math.floor(S.svc.hp * 100)}% de aguante y el ${Math.floor(S.svc.fuel * 100)}% de gasolina` : '';
    for (const id of ['btn-go', 'bar-go']) {
      const go = $(id);
      if (go.disabled !== !can) go.disabled = !can;
      setText(id, label);  // solo se reescribe si cambia, para no estorbar al clic
      if (go.title !== tip) go.title = tip;
    }
    $('bar-go').hidden = !can;
    // en la barra de tareas, los textos de la derecha se apartan de los botones (que cambian de ancho)
    if (Z.overlay) { const r = $('bar-ctl').offsetWidth + 24 + 'px'; if (hudCache.trR !== r) { hudCache.trR = r; $('hud-tr').style.setProperty('--tr-off', r); } }
    renderTrack();
  };
})(window.ZG);
