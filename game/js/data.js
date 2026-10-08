'use strict';
// Datos de diseño: zonas, zombis, piezas, mejoras, objetivos y rivales.
(function (Z) {
  Z.ZONES = [
    { id: 'afueras', name: 'Las Afueras', sub: 'Donde empezó todo', start: 0, hp: 1, dmg: 1, money: 1, density: 1,
      mix: { walker: 1 } },
    { id: 'autopista', name: 'La Autopista Muerta', sub: 'Kilómetros de chatarra y gente que no se fue', start: 700, hp: 2.2, dmg: 1.8, money: 3, density: 1.15,
      mix: { walker: 0.6, runner: 0.3, bloater: 0.1 } },
    { id: 'ciudad', name: 'Ciudad Ceniza', sub: 'Todavía arde', start: 1800, hp: 5, dmg: 3.2, money: 8, density: 1.3,
      mix: { walker: 0.45, runner: 0.3, bloater: 0.12, riot: 0.13 } },
    { id: 'desierto', name: 'El Páramo Rojo', sub: 'Aquí la gasolina vale más que la sangre', start: 3500, hp: 11, dmg: 5.5, money: 20, density: 1.45,
      mix: { runner: 0.45, walker: 0.25, bloater: 0.1, riot: 0.16, brute: 0.04 } },
    { id: 'zonacero', name: 'Zona Cero', sub: 'La catedral de los muertos', start: 6000, hp: 25, dmg: 9, money: 50, density: 1.6,
      mix: { runner: 0.4, walker: 0.2, bloater: 0.12, riot: 0.2, brute: 0.08 } },
  ];
  Z.zoneAt = function (m) {
    let z = 0;
    for (let i = 0; i < Z.ZONES.length; i++) if (m >= Z.ZONES[i].start) z = i;
    return z;
  };

  Z.ZTYPES = {
    walker:  { name: 'Caminante',      hp: 10,  speed: 9,  reward: 1,  impact: 5,  dps: 6,  mass: 1 },
    runner:  { name: 'Corredor',       hp: 7,   speed: 30, reward: 2,  impact: 4,  dps: 5,  mass: 0.8 },
    bloater: { name: 'Gordo',          hp: 45,  speed: 6,  reward: 6,  impact: 9,  dps: 4,  mass: 2.2, acid: 14 },
    riot:    { name: 'Antidisturbios', hp: 90,  speed: 10, reward: 12, impact: 14, dps: 8,  mass: 2 },
    brute:   { name: 'Bruto',          hp: 320, speed: 13, reward: 45, impact: 30, dps: 20, mass: 6 },
  };

  Z.SLOTS = [
    { id: 'chasis', name: 'Chasis' },
    { id: 'motor', name: 'Motor' },
    { id: 'ruedas', name: 'Ruedas' },
    { id: 'frontal', name: 'Frontal' },
    { id: 'blindaje', name: 'Blindaje' },
    { id: 'techo', name: 'Arma de techo' },
    { id: 'deposito', name: 'Depósito' },
  ];

  // st: aportación a las estadísticas. Los niveles multiplican los valores principales.
  Z.PARTS = {
    chasis: [
      { id: 'sedan', name: 'Sedán oxidado', desc: 'Lo encontraste con las llaves puestas. Y un brazo dentro.', cost: 0, st: { hp: 100, mass: 1 } },
      { id: 'pickup', name: 'Pickup del granjero', desc: 'Más chapa y más peso para embestir.', cost: 300, st: { hp: 170, mass: 1.35 } },
      { id: 'funebre', name: 'Coche fúnebre', desc: 'Viene con cortinas. +20% dinero por baja.', cost: 2200, st: { hp: 260, mass: 1.5, money: 0.2 } },
      { id: 'interceptor', name: 'Interceptor V8', desc: 'El último de su especie. +15% velocidad.', cost: 9000, st: { hp: 340, mass: 1.45, speedPct: 0.15 } },
      { id: 'camion', name: 'Camión de guerra', desc: 'Una fortaleza con ruedas y una cisterna a la espalda.', cost: 60000, st: { hp: 800, mass: 2.6, speedPct: -0.08, fuel: 150 } },
    ],
    motor: [
      { id: 'm4', name: '4 cilindros cansado', desc: 'Tose, pero arranca.', cost: 0, st: { speed: 46, accel: 30 } },
      { id: 'v6', name: 'V6 trucado', desc: 'Escape libre y mucho ruido.', cost: 140, st: { speed: 58, accel: 40 } },
      { id: 'v8', name: 'V8 sobrealimentado', desc: 'Compresor sobre el capó. Escupe fuego.', cost: 1300, st: { speed: 74, accel: 55 } },
      { id: 'turbina', name: 'Turbina de avión', desc: 'Nadie sabe de qué avión.', cost: 16000, st: { speed: 100, accel: 80 } },
    ],
    ruedas: [
      { id: 'gastadas', name: 'Neumáticos gastados', desc: 'Lisos como un hueso.', cost: 0, st: { grip: 0 } },
      { id: 'todoterreno', name: 'Todoterreno', desc: 'Pierdes menos velocidad al atropellar.', cost: 90, st: { grip: 0.25 } },
      { id: 'clavos', name: 'Ruedas con clavos', desc: 'Trituran lo que pisan. +daño.', cost: 650, st: { grip: 0.3, dmg: 6 } },
      { id: 'militares', name: 'Ruedas militares', desc: 'Macizas. +aguante y mucho agarre.', cost: 5500, st: { grip: 0.5, hp: 60, dmg: 10 } },
    ],
    frontal: [
      { id: 'parachoques', name: 'Parachoques de serie', desc: 'Cromado y con abolladuras.', cost: 0, st: { dmg: 10 } },
      { id: 'pinchos', name: 'Pinchos soldados', desc: 'Tres barras afiladas. Atraviesan.', cost: 60, st: { dmg: 22 } },
      { id: 'ariete', name: 'Ariete quitanieves', desc: 'Aparta a los gordos. +blindaje frontal.', cost: 520, st: { dmg: 40, armor: 0.06 } },
      { id: 'sierra', name: 'Sierra circular', desc: 'Gira a 3.000 rpm. No hace preguntas.', cost: 4200, st: { dmg: 75 } },
    ],
    blindaje: [
      { id: 'ninguno', name: 'Sin blindaje', desc: 'Solo chapa y fe.', cost: 0, st: { armor: 0 } },
      { id: 'chapas', name: 'Chapas soldadas', desc: 'Planchas sobre las ventanas.', cost: 110, st: { armor: 0.15, hp: 20 } },
      { id: 'rejas', name: 'Rejas', desc: 'Que no metan las manos.', cost: 750, st: { armor: 0.25, hp: 35 } },
      { id: 'placas', name: 'Placas de acero', desc: 'Acero de puerta de cámara acorazada.', cost: 7000, st: { armor: 0.4, hp: 90 } },
    ],
    techo: [
      { id: 'nada', name: 'Nada en el techo', desc: 'Solo antena y pájaros muertos.', cost: 0, st: {} },
      { id: 'escopeta', name: 'Escopeta montada', desc: 'Dispara en abanico a lo que tienes delante.', cost: 220, st: { fire: 8, rate: 1.1, pellets: 3, range: 110 } },
      { id: 'ametralladora', name: 'Ametralladora', desc: 'Lluvia de plomo continua.', cost: 2600, st: { fire: 7, rate: 8, pellets: 1, range: 170 } },
      { id: 'lanzallamas', name: 'Lanzallamas', desc: 'Quema todo en corto. Los cuerpos siguen ardiendo.', cost: 15000, st: { fire: 34, rate: 0, flame: 1, range: 64 } },
    ],
    deposito: [
      { id: 'lata', name: 'Depósito de serie', desc: 'Medio lleno. O medio vacío.', cost: 0, st: { fuel: 60 } },
      { id: 'bidones', name: 'Bidones extra', desc: 'Dos bidones atados al techo.', cost: 160, st: { fuel: 120 } },
      { id: 'doble', name: 'Depósito doble', desc: 'Barriles soldados atrás.', cost: 1300, st: { fuel: 250 } },
      { id: 'cisterna', name: 'Cisterna', desc: 'Para no parar nunca.', cost: 13000, st: { fuel: 600 } },
    ],
  };
  Z.part = function (slot, id) { return Z.PARTS[slot].find(p => p.id === id); };
  Z.MAX_LVL = 10;
  Z.upgradeCost = function (part, lvl) { return Math.ceil(Math.max(40, part.cost) * 0.45 * Math.pow(1.6, lvl)); };

  Z.PAINTS = [
    { id: 'medianoche', name: 'Azul medianoche', base: '#4b3fb0', accent: '#d9d2ff', cost: 0 },
    { id: 'oxido', name: 'Rojo óxido', base: '#8a3324', accent: '#e0b070', cost: 0 },
    { id: 'negro', name: 'Negro mate', base: '#2c2833', accent: '#b8202a', cost: 80 },
    { id: 'militar', name: 'Verde militar', base: '#4c5a34', accent: '#d8c890', cost: 120 },
    { id: 'hueso', name: 'Hueso', base: '#b8ad94', accent: '#5a1a1a', cost: 250 },
    { id: 'fuego', name: 'Naranja fuego', base: '#c4561c', accent: '#1c1418', cost: 400 },
    { id: 'sangre', name: 'Sangre seca', base: '#5e1220', accent: '#d8b060', cost: 900 },
  ];
  Z.DECALS = [
    { id: 'ninguna', name: 'Sin adornos', cost: 0 },
    { id: 'rayas', name: 'Rayas de carreras', cost: 60 },
    { id: 'calavera', name: 'Calavera', cost: 150 },
    { id: 'cruz', name: 'Cruz de penitente', cost: 300 },
  ];

  Z.GARAGE = [
    { id: 'mecanico', name: 'Mecánico', desc: 'Repara el coche más rápido.', base: 80, growth: 1.7, max: 10 },
    { id: 'chatarrero', name: 'Chatarrero', desc: '+10% dinero por cada zombi.', base: 150, growth: 1.8, max: 20 },
    { id: 'reserva', name: 'Bidón de reserva', desc: '+10% combustible.', base: 120, growth: 1.75, max: 15 },
    { id: 'chapista', name: 'Chapista', desc: '+8% aguante.', base: 200, growth: 1.8, max: 15 },
  ];
  Z.garageCost = (g, lvl) => Math.ceil(g.base * Math.pow(g.growth, lvl));

  Z.PERKS = [
    { id: 'nitro', name: 'NITRO', desc: 'Velocidad extra', dur: 6 },
    { id: 'kit', name: 'KIT DE REPARACIÓN', desc: '+35% aguante', dur: 0 },
    { id: 'bidon', name: 'BIDÓN', desc: '+30% combustible', dur: 0 },
    { id: 'furia', name: 'FURIA', desc: 'Dinero x2', dur: 15 },
    { id: 'filo', name: 'HOJAS AFILADAS', desc: 'Daño x2', dur: 15 },
  ];

  Z.NIGHTS = [
    { id: 'normal', name: 'Noche cerrada', desc: '', w: 6, spawn: 1, money: 1, hp: 1 },
    { id: 'sangre', name: 'Luna de sangre', desc: 'Más zombis. Dinero x2', w: 1.4, spawn: 1.4, money: 2, hp: 1.2 },
    { id: 'tormenta', name: 'Tormenta', desc: 'Lluvia y rayos. Dinero x1,3', w: 2, spawn: 1.1, money: 1.3, hp: 1 },
    { id: 'niebla', name: 'Niebla', desc: 'No ves lo que viene. Dinero x1,2', w: 1.6, spawn: 1, money: 1.2, hp: 1 },
  ];

  // Rivales del juego (personajes ficticios con su récord). Superarlos da recompensa.
  Z.RIVALS = [
    { name: 'Chispas', dist: 260, reward: 40 },
    { name: 'La Monja', dist: 520, reward: 90 },
    { name: 'Doc Tornillo', dist: 900, reward: 250 },
    { name: 'Hermanos Ruiz', dist: 1400, reward: 600 },
    { name: 'Viuda Negra', dist: 2100, reward: 1500 },
    { name: 'Toro', dist: 3000, reward: 4000 },
    { name: 'El Predicador', dist: 4200, reward: 10000 },
    { name: 'Reina del Asfalto', dist: 5600, reward: 25000 },
    { name: 'El Coleccionista', dist: 7500, reward: 60000 },
    { name: 'Leyenda Sin Nombre', dist: 10000, reward: 150000 },
  ];

  // Objetivos: prog(s) devuelve [actual, meta].
  Z.OBJECTIVES = [
    { id: 'k25', text: 'Mata 25 zombis en una carrera', reward: 50, prog: s => [s.stats.bestKills, 25] },
    { id: 'd500', text: 'Recorre 500 m', reward: 80, prog: s => [s.stats.bestDist, 500] },
    { id: 'buy1', text: 'Compra tu primera pieza', reward: 40, prog: s => [s.stats.partsBought, 1] },
    { id: 'z1', text: 'Llega a La Autopista Muerta', reward: 200, prog: s => [s.stats.bestDist, 700] },
    { id: 'horde1', text: 'Atraviesa una horda entera', reward: 150, prog: s => [s.stats.hordes, 1] },
    { id: 'bloat', text: 'Revienta 10 gordos', reward: 300, prog: s => [s.stats.byType.bloater || 0, 10] },
    { id: 'k100', text: 'Mata 100 zombis en una carrera', reward: 500, prog: s => [s.stats.bestKills, 100] },
    { id: 'tk1000', text: 'Mata 1.000 zombis en total', reward: 800, prog: s => [s.stats.kills, 1000] },
    { id: 'z2', text: 'Llega a Ciudad Ceniza', reward: 1500, prog: s => [s.stats.bestDist, 1800] },
    { id: 'riot', text: 'Mata 25 antidisturbios', reward: 2500, prog: s => [s.stats.byType.riot || 0, 25] },
    { id: 'z3', text: 'Llega a El Páramo Rojo', reward: 10000, prog: s => [s.stats.bestDist, 3500] },
    { id: 'brute', text: 'Mata a un Bruto', reward: 8000, prog: s => [s.stats.byType.brute || 0, 1] },
    { id: 'tk10k', text: 'Mata 10.000 zombis en total', reward: 20000, prog: s => [s.stats.kills, 10000] },
    { id: 'z4', text: 'Llega a la Zona Cero', reward: 50000, prog: s => [s.stats.bestDist, 6000] },
    { id: 'd10k', text: 'Recorre 10 km en una carrera', reward: 200000, prog: s => [s.stats.bestDist, 10000] },
  ];

  Z.DEATHS = {
    eaten: { word: 'DEVORADO' },
    flip: { word: 'VOLCADO' },
    explode: { word: 'CALCINADO' },
    flee: { word: 'CAZADO' },
  };
})(window.ZG);
