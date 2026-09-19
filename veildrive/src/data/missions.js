// Five compact Hotline Miami-style missions. Each is a single floor with a
// clear goal, an unlockable exit, a mood palette and a bespoke enemy roster.
// Every mission opens with the player sealed in an empty entry room and a
// single breachable door into the action. Consumed by Level(def) and the
// campaign flow in Game.js.

const W = (x, y, w, h) => ({ x, y, w, h });
const D = (x, y, w, h) => ({ x, y, w, h });
const P = (x, y, w, h, type, solid, hp) => ({ x, y, w, h, type, solid: solid !== false, hp: hp || 2 });
const L = (x, y, r) => ({ x, y, r });
const E = (x, y, type, waypoints = []) => ({ x, y, type, waypoints });

const PHASE1_MISSIONS = [
  {
    id: 'motel',
    name: 'MOTEL STATIC',
    sub: 'Sealed in maintenance. Breach out and clear every room.',
    entryLabel: 'MAINTENANCE', entryKind: 'door',
    mood: 'violet',
    w: 1800, h: 1100,
    spawn: { x: 150, y: 520 },
    exit: { x: 150, y: 520 },
    goal: { type: 'eliminate' },
    walls: [
      W(330, 100, 1240, 28), W(330, 892, 1240, 28), W(330, 100, 28, 330), W(330, 500, 28, 420), W(1542, 100, 28, 820),
      W(650, 128, 28, 172), W(650, 372, 28, 28),
      W(358, 520, 220, 28), W(658, 520, 210, 28), W(948, 520, 210, 28), W(1238, 520, 304, 28),
      W(870, 128, 28, 152), W(870, 350, 28, 50), W(1160, 128, 28, 122), W(1160, 320, 28, 80),
      W(358, 400, 112, 28), W(548, 400, 322, 28), W(898, 400, 262, 28), W(1160, 400, 382, 28),
      W(650, 548, 28, 132), W(650, 754, 28, 138), W(960, 548, 28, 82), W(960, 704, 28, 188), W(1210, 548, 28, 142), W(1210, 770, 28, 122),
      W(1238, 690, 82, 28), W(1395, 690, 147, 28),
      W(10, 400, 260, 24), W(10, 616, 260, 24), W(10, 400, 24, 240), W(246, 400, 24, 100), W(246, 572, 24, 68)
    ],
    doors: [
      D(650, 300, 28, 72), D(578, 520, 80, 28), D(868, 520, 80, 28), D(1158, 520, 80, 28),
      D(470, 400, 78, 28), D(870, 280, 28, 70), D(1160, 250, 28, 70),
      D(650, 680, 28, 74), D(960, 630, 28, 74), D(1210, 690, 28, 80), D(1320, 690, 75, 28),
      D(246, 500, 24, 72)
    ],
    props: [
      P(95, 660, 120, 48, 'car', true, 4), P(90, 230, 118, 48, 'car', true, 4), P(220, 820, 64, 30, 'dumpster', true, 3),
      P(420, 180, 92, 34, 'sofa'), P(535, 245, 54, 54, 'desk', true, 3), P(715, 180, 76, 36, 'bed', true, 3), P(985, 190, 78, 36, 'bed', true, 3), P(1285, 185, 78, 36, 'bed', true, 3),
      P(728, 595, 56, 30, 'table'), P(820, 760, 70, 34, 'table'), P(1008, 610, 44, 44, 'vending', true, 3), P(1055, 805, 80, 28, 'bench'), P(905, 590, 24, 24, 'barrel', true, 1), P(1180, 845, 24, 24, 'barrel', true, 1),
      P(1270, 745, 72, 34, 'desk', true, 3), P(1435, 795, 42, 58, 'cabinet', true, 3),
      P(360, 660, 24, 24, 'barrel', true, 1), P(1300, 650, 24, 24, 'barrel', true, 1),
      P(805, 400, 12, 28, 'glass', false, 1), P(1110, 400, 12, 28, 'glass', false, 1), P(650, 610, 12, 50, 'glass', false, 1)
    ],
    lights: [L(500, 260, 190), L(760, 290, 150), L(1030, 280, 150), L(1320, 270, 170), L(760, 680, 170), L(1080, 690, 160), L(1380, 790, 180), L(150, 520, 150)],
    pickups: [{ x: 400, y: 570, weapon: 'baton' }, { x: 750, y: 245, weapon: 'pistol' }, { x: 1010, y: 760, weapon: 'shotgun' }, { x: 1375, y: 230, weapon: 'suppressed' }, { x: 500, y: 700, weapon: 'cleaver' }, { x: 300, y: 650, weapon: 'bottle' }, { x: 1240, y: 640, weapon: 'revolver' }],
    enemies: [
      E(250, 320, 'guard', [{ x: 230, y: 300 }, { x: 290, y: 360 }]),
      E(510, 250, 'guard', [{ x: 450, y: 250 }, { x: 602, y: 250 }]),
      E(770, 320, 'brawler', [{ x: 724, y: 167 }, { x: 810, y: 350 }]),
      E(1010, 290, 'hunter', [{ x: 950, y: 220 }, { x: 1090, y: 330 }]),
      E(1320, 300, 'shotgunner', [{ x: 1272, y: 218 }, { x: 1450, y: 320 }]),
      E(730, 690, 'brawler', [{ x: 716, y: 614 }, { x: 870, y: 820 }]),
      E(1075, 730, 'guard', [{ x: 1010, y: 590 }, { x: 1148, y: 830 }]),
      E(1390, 800, 'elite', [{ x: 1283, y: 792 }, { x: 1492, y: 840 }]),
      E(620, 470, 'guard', [{ x: 560, y: 450 }, { x: 720, y: 490 }]),
      E(920, 470, 'shotgunner', [{ x: 860, y: 450 }, { x: 1000, y: 490 }]),
      E(1190, 470, 'hunter', [{ x: 1130, y: 450 }, { x: 1260, y: 490 }]),
      E(1099, 846, 'guard', [{ x: 1020, y: 800 }, { x: 1168, y: 860 }]),
      E(420, 780, 'brawler', [{ x: 380, y: 740 }, { x: 520, y: 840 }]),
      E(947, 825, 'elite', [{ x: 906, y: 800 }, { x: 1060, y: 850 }])
    ]
  },
  {
    id: 'club',
    name: 'THE NEON ROOM',
    sub: 'Out of the stockroom. Take the tape off the stage and run for the doors.',
    entryLabel: 'BACKSTAGE', entryKind: 'door',
    mood: 'sunset',
    w: 1200, h: 760,
    spawn: { x: 110, y: 380 },
    exit: { x: 1100, y: 380 },
    goal: { type: 'retrieve', x: 600, y: 320, label: 'THE STATIC TAPE' },
    walls: [
      W(0, 0, 1200, 28), W(0, 732, 1200, 28), W(0, 28, 28, 704), W(1172, 28, 28, 704),
      W(430, 180, 340, 28), W(430, 180, 28, 140), W(742, 180, 28, 140),
      W(860, 470, 28, 180), W(860, 470, 200, 28),
      W(300, 470, 28, 28), W(300, 180, 28, 28), W(1000, 180, 28, 28),
      W(40, 300, 180, 24), W(40, 436, 180, 24), W(40, 300, 24, 160), W(196, 300, 24, 60), W(196, 420, 24, 40)
    ],
    doors: [D(196, 360, 24, 60)],
    props: [
      P(150, 120, 90, 34, 'sofa'), P(150, 600, 90, 34, 'sofa'), P(980, 600, 90, 34, 'sofa'), P(980, 120, 90, 34, 'sofa'),
      P(300, 300, 56, 30, 'table'), P(900, 300, 56, 30, 'table'), P(300, 560, 56, 30, 'table'), P(900, 560, 56, 30, 'table'),
      P(520, 60, 44, 44, 'vending'), P(1100, 60, 24, 24, 'barrel', true, 1), P(80, 700, 24, 24, 'barrel', true, 1),
      P(470, 420, 24, 24, 'barrel', true, 1), P(700, 420, 24, 24, 'barrel', true, 1),
      P(600, 480, 12, 28, 'glass', false, 1)
    ],
    lights: [L(600, 300, 230), L(250, 180, 150), L(950, 180, 150), L(250, 580, 150), L(950, 580, 150), L(110, 380, 140)],
    pickups: [{ x: 280, y: 400, weapon: 'baton' }, { x: 1050, y: 120, weapon: 'pistol' }, { x: 1050, y: 640, weapon: 'smg' }, { x: 300, y: 650, weapon: 'bottle' }, { x: 900, y: 90, weapon: 'cleaver' }],
    enemies: [
      E(600, 250, 'brawler', [{ x: 540, y: 240 }, { x: 660, y: 300 }]),
      E(470, 300, 'guard', [{ x: 418, y: 260 }, { x: 540, y: 360 }]),
      E(730, 300, 'guard', [{ x: 700, y: 260 }, { x: 800, y: 360 }]),
      E(250, 250, 'hunter', [{ x: 180, y: 200 }, { x: 326, y: 343 }]),
      E(950, 250, 'shotgunner', [{ x: 900, y: 200 }, { x: 1050, y: 320 }]),
      E(250, 520, 'brawler', [{ x: 180, y: 480 }, { x: 345, y: 603 }]),
      E(950, 520, 'guard', [{ x: 894, y: 457 }, { x: 1050, y: 588 }]),
      E(600, 640, 'hunter', [{ x: 540, y: 600 }, { x: 680, y: 690 }]),
      E(1120, 400, 'elite', [{ x: 1080, y: 360 }, { x: 1150, y: 460 }])
    ]
  },
  {
    id: 'storage',
    name: 'COLD STORAGE',
    sub: 'Locked in the foreman\u2019s office. Breach the aisles and wipe the floor.',
    entryLabel: 'FOREMAN', entryKind: 'door',
    mood: 'toxic',
    w: 1300, h: 820,
    spawn: { x: 135, y: 220 },
    exit: { x: 1220, y: 140 },
    goal: { type: 'eliminate' },
    walls: [
      W(0, 0, 1300, 28), W(0, 792, 1300, 28), W(0, 28, 28, 764), W(1272, 28, 28, 764),
      W(230, 120, 28, 200), W(230, 400, 28, 300),
      W(470, 120, 28, 200), W(470, 400, 28, 300),
      W(710, 120, 28, 200), W(710, 400, 28, 300),
      W(950, 120, 28, 200), W(950, 400, 28, 300),
      W(28, 300, 202, 28), W(1000, 520, 272, 28),
      W(40, 120, 24, 180), W(40, 120, 60, 24), W(180, 120, 50, 24), W(206, 144, 24, 156), W(40, 276, 190, 24)
    ],
    doors: [D(100, 120, 80, 24)],
    props: [
      P(300, 180, 40, 40, 'cabinet'), P(360, 180, 40, 40, 'cabinet'), P(300, 240, 40, 40, 'cabinet'),
      P(540, 180, 40, 40, 'cabinet'), P(600, 180, 40, 40, 'cabinet'), P(540, 620, 40, 40, 'cabinet'),
      P(780, 180, 40, 40, 'cabinet'), P(840, 180, 40, 40, 'cabinet'), P(840, 620, 40, 40, 'cabinet'),
      P(1020, 180, 40, 40, 'cabinet'), P(1080, 180, 40, 40, 'cabinet'),
      P(350, 700, 24, 24, 'barrel', true, 1), P(1240, 600, 24, 24, 'barrel', true, 1),
      P(600, 350, 24, 24, 'barrel', true, 1), P(850, 350, 24, 24, 'barrel', true, 1),
      P(1200, 200, 24, 24, 'barrel', true, 1), P(1200, 700, 44, 44, 'vending')
    ],
    lights: [L(350, 250, 170), L(600, 250, 170), L(850, 250, 170), L(1100, 250, 170), L(650, 700, 200), L(135, 220, 150)],
    pickups: [{ x: 120, y: 500, weapon: 'pistol' }, { x: 800, y: 120, weapon: 'shotgun' }, { x: 1240, y: 740, weapon: 'smg' }, { x: 600, y: 740, weapon: 'baton' }, { x: 1100, y: 740, weapon: 'cleaver' }],
    enemies: [
      E(350, 150, 'guard', [{ x: 300, y: 140 }, { x: 420, y: 300 }]),
      E(350, 560, 'brawler', [{ x: 300, y: 500 }, { x: 420, y: 680 }]),
      E(600, 150, 'hunter', [{ x: 540, y: 140 }, { x: 680, y: 300 }]),
      E(600, 560, 'shotgunner', [{ x: 540, y: 500 }, { x: 680, y: 680 }]),
      E(850, 150, 'guard', [{ x: 790, y: 140 }, { x: 920, y: 300 }]),
      E(850, 560, 'brawler', [{ x: 790, y: 500 }, { x: 920, y: 680 }]),
      E(1090, 150, 'hunter', [{ x: 1030, y: 140 }, { x: 1150, y: 300 }]),
      E(1090, 560, 'guard', [{ x: 1030, y: 500 }, { x: 1150, y: 680 }]),
      E(600, 700, 'elite', [{ x: 540, y: 680 }, { x: 720, y: 720 }]),
      E(150, 400, 'guard', [{ x: 120, y: 360 }, { x: 200, y: 460 }])
    ]
  },
  {
    id: 'subway',
    name: 'LAST TRAIN',
    sub: 'Up from the stairwell. The marked man has an escort \u2014 cut through it.',
    entryLabel: 'STAIR B', entryKind: 'stairs',
    mood: 'blood',
    w: 1420, h: 700,
    spawn: { x: 110, y: 350 },
    exit: { x: 110, y: 350 },
    goal: { type: 'target', x: 1300, y: 350 },
    walls: [
      W(0, 0, 1420, 28), W(0, 672, 1420, 28), W(0, 28, 28, 644), W(1392, 28, 28, 644),
      W(300, 120, 28, 200), W(300, 380, 28, 200),
      W(900, 120, 28, 200), W(900, 380, 28, 200),
      W(600, 180, 28, 28), W(600, 480, 28, 28), W(1100, 180, 28, 28), W(1100, 480, 28, 28),
      W(40, 270, 170, 24), W(40, 406, 170, 24), W(40, 270, 24, 160), W(186, 270, 24, 60), W(186, 390, 24, 40)
    ],
    doors: [D(186, 330, 24, 60)],
    props: [
      P(380, 180, 80, 28, 'bench'), P(380, 480, 80, 28, 'bench'),
      P(960, 180, 80, 28, 'bench'), P(960, 480, 80, 28, 'bench'),
      P(1240, 180, 80, 28, 'bench'), P(1240, 480, 80, 28, 'bench'),
      P(120, 60, 44, 44, 'vending'), P(1360, 600, 44, 44, 'vending'),
      P(80, 600, 24, 24, 'barrel', true, 1), P(650, 350, 24, 24, 'barrel', true, 1),
      P(600, 300, 12, 28, 'glass', false, 1)
    ],
    lights: [L(200, 350, 170), L(500, 120, 150), L(500, 580, 150), L(1000, 120, 150), L(1000, 580, 150), L(1300, 350, 180), L(110, 350, 150)],
    pickups: [{ x: 150, y: 640, weapon: 'pistol' }, { x: 760, y: 640, weapon: 'shotgun' }, { x: 100, y: 80, weapon: 'baton' }, { x: 1310, y: 640, weapon: 'revolver' }, { x: 620, y: 90, weapon: 'bottle' }],
    enemies: [
      E(1300, 350, 'elite', [{ x: 1260, y: 320 }, { x: 1340, y: 420 }]),
      E(1180, 290, 'guard', [{ x: 1140, y: 280 }, { x: 1240, y: 320 }]),
      E(1180, 410, 'guard', [{ x: 1140, y: 400 }, { x: 1240, y: 440 }]),
      E(220, 150, 'guard', [{ x: 160, y: 140 }, { x: 288, y: 260 }]),
      E(220, 550, 'brawler', [{ x: 160, y: 520 }, { x: 300, y: 620 }]),
      E(520, 250, 'hunter', [{ x: 476, y: 200 }, { x: 580, y: 340 }]),
      E(700, 500, 'shotgunner', [{ x: 640, y: 460 }, { x: 780, y: 600 }]),
      E(780, 200, 'guard', [{ x: 720, y: 180 }, { x: 860, y: 300 }]),
      E(1080, 250, 'brawler', [{ x: 1054, y: 200 }, { x: 1160, y: 340 }]),
      E(1150, 550, 'hunter', [{ x: 1088, y: 500 }, { x: 1240, y: 620 }]),
      E(1312, 221, 'guard', [{ x: 1250, y: 168 }, { x: 1360, y: 260 }])
    ]
  },
  {
    id: 'penthouse',
    name: 'THE PORTER',
    sub: 'The elevator opens onto his hall. Fight through the staff to the Porter.',
    entryLabel: 'ELEVATOR', entryKind: 'elevator',
    mood: 'violet',
    w: 1200, h: 800,
    spawn: { x: 120, y: 400 },
    exit: { x: 120, y: 400 },
    goal: { type: 'boss' },
    boss: { x: 950, y: 400 },
    walls: [
      W(0, 0, 1200, 28), W(0, 772, 1200, 28), W(0, 28, 28, 744), W(1172, 28, 28, 744),
      W(400, 28, 28, 300), W(400, 428, 28, 344),
      W(800, 28, 28, 260), W(800, 388, 28, 384),
      W(40, 320, 190, 24), W(40, 456, 190, 24), W(40, 320, 24, 160), W(206, 320, 24, 60), W(206, 440, 24, 40)
    ],
    doors: [D(206, 380, 24, 60)],
    props: [
      P(120, 80, 80, 36, 'bed'), P(120, 640, 72, 34, 'desk'), P(300, 300, 60, 30, 'table'),
      P(520, 80, 92, 34, 'sofa'), P(520, 660, 92, 34, 'sofa'),
      P(980, 80, 78, 36, 'bed'), P(1050, 600, 72, 34, 'desk'), P(900, 650, 44, 58, 'cabinet'),
      P(700, 300, 24, 24, 'barrel', true, 1), P(1100, 300, 44, 44, 'vending'),
      P(520, 380, 24, 24, 'barrel', true, 1)
    ],
    lights: [L(250, 250, 180), L(650, 250, 190), L(1000, 250, 180), L(250, 600, 180), L(900, 600, 180), L(120, 400, 150)],
    pickups: [{ x: 300, y: 180, weapon: 'baton' }, { x: 650, y: 120, weapon: 'smg' }, { x: 650, y: 700, weapon: 'shotgun' }, { x: 1080, y: 120, weapon: 'suppressed' }, { x: 700, y: 660, weapon: 'cleaver' }, { x: 520, y: 200, weapon: 'revolver' }],
    enemies: [
      E(600, 200, 'elite', [{ x: 560, y: 180 }, { x: 680, y: 260 }]),
      E(600, 600, 'shotgunner', [{ x: 560, y: 560 }, { x: 680, y: 660 }]),
      E(950, 180, 'brawler', [{ x: 900, y: 150 }, { x: 1050, y: 240 }]),
      E(950, 620, 'hunter', [{ x: 900, y: 580 }, { x: 1050, y: 680 }]),
      E(1080, 400, 'guard', [{ x: 1040, y: 360 }, { x: 1140, y: 440 }]),
      E(330, 250, 'guard', [{ x: 300, y: 220 }, { x: 380, y: 300 }]),
      E(330, 550, 'guard', [{ x: 300, y: 520 }, { x: 380, y: 600 }])
    ]
  }
];

// Phase 2 — DEEP COVER. Ten new floors across three phases; each phase is five
// missions with a distinct objective mix. All coordinates obey the structural
// invariants enforced by scripts/unit-test.mjs.
const PHASE2_MISSIONS = [
  {
    id: 'docks',
    name: 'SALT DOCKS',
    sub: 'Dropped at the dock gate. Plant charges on the pumps and winches, then get back out.',
    entryLabel: 'DOCK GATE', entryKind: 'door',
    mood: 'toxic',
    w: 1500, h: 900,
    spawn: { x: 120, y: 450 },
    exit: { x: 120, y: 450 },
    goal: { type: 'sabotage', targets: [{ x: 240, y: 150, label: 'CRANE PUMP' }, { x: 940, y: 800, label: 'FUEL LINE' }, { x: 1380, y: 150, label: 'DOCK WINCH' }] },
    walls: [
      W(0, 0, 1500, 28), W(0, 872, 1500, 28), W(0, 28, 28, 844), W(1472, 28, 28, 844),
      W(40, 370, 190, 24), W(40, 506, 190, 24), W(40, 370, 24, 160), W(206, 370, 24, 60), W(206, 490, 24, 40),
      W(620, 28, 28, 320), W(620, 438, 28, 434), W(1080, 28, 28, 520), W(1080, 638, 28, 234),
      W(458, 700, 200, 28)
    ],
    doors: [D(206, 430, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(560, 700, 54, 54, 'desk', true, 3), P(880, 110, 80, 28, 'bench'),
      P(1280, 700, 44, 44, 'vending'), P(1350, 200, 24, 24, 'barrel', true, 1), P(500, 420, 24, 24, 'barrel', true, 1),
      P(950, 760, 24, 24, 'barrel', true, 1), P(740, 300, 40, 40, 'cabinet', true, 3), P(1200, 520, 40, 40, 'cabinet', true, 3),
      P(820, 600, 12, 28, 'glass', false, 1)
    ],
    lights: [L(250, 150, 170), L(600, 300, 170), L(900, 400, 170), L(1250, 250, 170), L(1250, 700, 170), L(120, 450, 150)],
    pickups: [{ x: 300, y: 700, weapon: 'pistol' }, { x: 700, y: 100, weapon: 'shotgun' }, { x: 980, y: 780, weapon: 'baton' }, { x: 1400, y: 600, weapon: 'smg' }, { x: 420, y: 140, weapon: 'cleaver' }, { x: 860, y: 520, weapon: 'suppressed' }],
    enemies: [
      E(320, 650, 'guard', [{ x: 280, y: 600 }, { x: 380, y: 700 }]),
      E(340, 200, 'brawler', [{ x: 300, y: 190 }, { x: 400, y: 260 }]),
      E(560, 300, 'hunter', [{ x: 520, y: 250 }, { x: 610, y: 360 }]),
      E(660, 780, 'shotgunner', [{ x: 680, y: 700 }, { x: 720, y: 820 }]),
      E(880, 260, 'guard', [{ x: 840, y: 220 }, { x: 940, y: 320 }]),
      E(940, 650, 'elite', [{ x: 900, y: 600 }, { x: 1000, y: 720 }]),
      E(1000, 420, 'brawler', [{ x: 960, y: 380 }, { x: 1060, y: 460 }]),
      E(1240, 300, 'hunter', [{ x: 1180, y: 260 }, { x: 1320, y: 360 }]),
      E(1260, 640, 'guard', [{ x: 1200, y: 600 }, { x: 1340, y: 720 }]),
      E(1420, 460, 'shotgunner', [{ x: 1380, y: 400 }, { x: 1460, y: 520 }]),
      E(220, 700, 'brawler', [{ x: 180, y: 650 }, { x: 280, y: 760 }]),
      E(760, 500, 'guard', [{ x: 700, y: 460 }, { x: 820, y: 560 }])
    ]
  },
  {
    id: 'arcade',
    name: 'THE ARCADE',
    sub: 'Token booth to the back room. The floor is thick with elites \u2014 clear it.',
    entryLabel: 'TOKEN BOOTH', entryKind: 'door',
    mood: 'sunset',
    w: 1300, h: 760,
    spawn: { x: 120, y: 380 },
    exit: { x: 120, y: 380 },
    goal: { type: 'eliminate' },
    walls: [
      W(0, 0, 1300, 28), W(0, 732, 1300, 28), W(0, 28, 28, 704), W(1272, 28, 28, 704),
      W(40, 300, 190, 24), W(40, 436, 190, 24), W(40, 300, 24, 160), W(206, 300, 24, 60), W(206, 420, 24, 40),
      W(500, 28, 28, 250), W(500, 368, 28, 364), W(900, 28, 28, 420), W(900, 538, 28, 194)
    ],
    doors: [D(206, 360, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(700, 120, 44, 44, 'vending'), P(1100, 600, 44, 44, 'vending'),
      P(600, 600, 54, 54, 'desk', true, 3), P(1000, 300, 24, 24, 'barrel', true, 1), P(350, 600, 24, 24, 'barrel', true, 1),
      P(820, 400, 12, 28, 'glass', false, 1)
    ],
    lights: [L(200, 380, 140), L(600, 250, 170), L(1000, 250, 170), L(600, 600, 170), L(1000, 600, 170), L(1200, 380, 160)],
    pickups: [{ x: 320, y: 650, weapon: 'pistol' }, { x: 620, y: 100, weapon: 'shotgun' }, { x: 1000, y: 700, weapon: 'smg' }, { x: 1150, y: 120, weapon: 'cleaver' }, { x: 760, y: 300, weapon: 'baton' }, { x: 1180, y: 400, weapon: 'revolver' }],
    enemies: [
      E(300, 250, 'elite', [{ x: 260, y: 200 }, { x: 360, y: 320 }]),
      E(400, 600, 'guard', [{ x: 360, y: 560 }, { x: 460, y: 660 }]),
      E(600, 250, 'brawler', [{ x: 560, y: 200 }, { x: 660, y: 320 }]),
      E(700, 600, 'shotgunner', [{ x: 660, y: 560 }, { x: 760, y: 660 }]),
      E(800, 250, 'hunter', [{ x: 760, y: 200 }, { x: 860, y: 320 }]),
      E(1000, 250, 'elite', [{ x: 960, y: 200 }, { x: 1060, y: 320 }]),
      E(1050, 600, 'elite', [{ x: 1000, y: 560 }, { x: 1140, y: 660 }]),
      E(1200, 300, 'hunter', [{ x: 1160, y: 260 }, { x: 1260, y: 360 }]),
      E(1200, 650, 'guard', [{ x: 1160, y: 600 }, { x: 1250, y: 700 }]),
      E(300, 450, 'shotgunner', [{ x: 260, y: 420 }, { x: 360, y: 500 }])
    ]
  },
  {
    id: 'impound',
    name: 'IMPOUND',
    sub: 'Locked in the office. Hold the lot until the crew stops coming.',
    entryLabel: 'IMPOUND GATE', entryKind: 'door',
    mood: 'blood',
    w: 1400, h: 900,
    spawn: { x: 120, y: 450 },
    exit: { x: 120, y: 450 },
    goal: { type: 'survive', duration: 40 },
    reinforce: { every: 7, max: 12, types: ['guard', 'brawler', 'hunter'], points: [{ x: 1250, y: 150 }, { x: 1300, y: 750 }, { x: 700, y: 80 }, { x: 500, y: 820 }] },
    walls: [
      W(0, 0, 1400, 28), W(0, 872, 1400, 28), W(0, 28, 28, 844), W(1372, 28, 28, 844),
      W(40, 370, 190, 24), W(40, 506, 190, 24), W(40, 370, 24, 160), W(206, 370, 24, 60), W(206, 490, 24, 40),
      W(560, 28, 28, 300), W(560, 418, 28, 454), W(980, 28, 28, 500), W(980, 618, 28, 254)
    ],
    doors: [D(206, 430, 24, 60)],
    props: [
      P(300, 120, 118, 48, 'car', true, 4), P(820, 120, 118, 48, 'car', true, 4), P(300, 700, 118, 48, 'car', true, 4),
      P(820, 700, 118, 48, 'car', true, 4), P(1300, 400, 24, 24, 'barrel', true, 1), P(650, 450, 24, 24, 'barrel', true, 1),
      P(760, 150, 44, 44, 'vending'), P(760, 700, 44, 44, 'vending')
    ],
    lights: [L(120, 450, 140), L(400, 250, 170), L(800, 450, 180), L(1200, 250, 170), L(1200, 700, 170), L(700, 780, 160)],
    pickups: [{ x: 200, y: 120, weapon: 'pistol' }, { x: 1200, y: 120, weapon: 'shotgun' }, { x: 200, y: 750, weapon: 'smg' }, { x: 1300, y: 800, weapon: 'baton' }, { x: 500, y: 450, weapon: 'baton' }, { x: 700, y: 300, weapon: 'revolver' }],
    enemies: [
      E(300, 300, 'guard', [{ x: 260, y: 250 }, { x: 360, y: 360 }]),
      E(450, 600, 'brawler', [{ x: 400, y: 550 }, { x: 520, y: 660 }]),
      E(650, 250, 'hunter', [{ x: 600, y: 200 }, { x: 720, y: 320 }]),
      E(700, 600, 'shotgunner', [{ x: 650, y: 550 }, { x: 760, y: 660 }]),
      E(800, 450, 'elite', [{ x: 760, y: 400 }, { x: 860, y: 520 }]),
      E(1100, 250, 'brawler', [{ x: 1050, y: 200 }, { x: 1160, y: 320 }]),
      E(1150, 600, 'guard', [{ x: 1100, y: 550 }, { x: 1220, y: 660 }]),
      E(1300, 250, 'hunter', [{ x: 1250, y: 200 }, { x: 1360, y: 320 }]),
      E(1300, 650, 'shotgunner', [{ x: 1250, y: 600 }, { x: 1355, y: 720 }]),
      E(435, 120, 'guard', [{ x: 380, y: 90 }, { x: 480, y: 160 }])
    ]
  },
  {
    id: 'plaza',
    name: 'PLAZA',
    sub: 'Three tapes are scattered across the concourse. Collect them all and leave.',
    entryLabel: 'PLAZA GATE', entryKind: 'door',
    mood: 'sunset',
    w: 1600, h: 900,
    spawn: { x: 120, y: 450 },
    exit: { x: 120, y: 450 },
    goal: { type: 'collect', items: [{ x: 410, y: 150, label: 'TAPE // A' }, { x: 900, y: 120, label: 'TAPE // B' }, { x: 1350, y: 800, label: 'TAPE // C' }] },
    walls: [
      W(0, 0, 1600, 28), W(0, 872, 1600, 28), W(0, 28, 28, 844), W(1572, 28, 28, 844),
      W(40, 370, 190, 24), W(40, 506, 190, 24), W(40, 370, 24, 160), W(206, 370, 24, 60), W(206, 490, 24, 40),
      W(560, 28, 28, 340), W(560, 458, 28, 414), W(1040, 28, 28, 300), W(1040, 418, 28, 454)
    ],
    doors: [D(206, 430, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(700, 700, 90, 34, 'sofa'), P(1200, 120, 90, 34, 'sofa'),
      P(1400, 700, 44, 44, 'vending'), P(900, 450, 56, 30, 'table'), P(400, 600, 24, 24, 'barrel', true, 1),
      P(1300, 450, 24, 24, 'barrel', true, 1), P(820, 250, 54, 54, 'desk', true, 3)
    ],
    lights: [L(120, 450, 140), L(500, 250, 170), L(900, 150, 170), L(900, 600, 170), L(1300, 250, 170), L(1400, 700, 160)],
    pickups: [{ x: 300, y: 700, weapon: 'pistol' }, { x: 650, y: 120, weapon: 'shotgun' }, { x: 1150, y: 750, weapon: 'smg' }, { x: 1450, y: 250, weapon: 'cleaver' }, { x: 750, y: 300, weapon: 'baton' }, { x: 1250, y: 600, weapon: 'revolver' }],
    enemies: [
      E(320, 300, 'guard', [{ x: 280, y: 260 }, { x: 380, y: 360 }]),
      E(450, 700, 'brawler', [{ x: 400, y: 650 }, { x: 520, y: 760 }]),
      E(650, 250, 'hunter', [{ x: 600, y: 200 }, { x: 720, y: 320 }]),
      E(700, 550, 'shotgunner', [{ x: 650, y: 500 }, { x: 760, y: 620 }]),
      E(820, 120, 'guard', [{ x: 780, y: 90 }, { x: 900, y: 160 }]),
      E(950, 400, 'elite', [{ x: 900, y: 360 }, { x: 1020, y: 460 }]),
      E(1150, 250, 'brawler', [{ x: 1100, y: 200 }, { x: 1220, y: 320 }]),
      E(1200, 600, 'hunter', [{ x: 1150, y: 550 }, { x: 1300, y: 660 }]),
      E(1350, 300, 'guard', [{ x: 1300, y: 250 }, { x: 1430, y: 360 }]),
      E(1450, 600, 'shotgunner', [{ x: 1400, y: 550 }, { x: 1520, y: 660 }]),
      E(600, 450, 'brawler', [{ x: 550, y: 420 }, { x: 680, y: 500 }])
    ]
  },
  {
    id: 'porter2',
    name: 'PORTER // REBUILT',
    sub: 'The elevator opens on his new floor. He has been rebuilt. Put him down again.',
    entryLabel: 'ELEVATOR', entryKind: 'elevator',
    mood: 'violet',
    w: 1400, h: 860,
    spawn: { x: 120, y: 430 },
    exit: { x: 120, y: 430 },
    goal: { type: 'boss' },
    boss: { x: 1200, y: 430 },
    walls: [
      W(0, 0, 1400, 28), W(0, 832, 1400, 28), W(0, 28, 28, 804), W(1372, 28, 28, 804),
      W(40, 350, 190, 24), W(40, 486, 190, 24), W(40, 350, 24, 160), W(206, 350, 24, 60), W(206, 470, 24, 40),
      W(560, 28, 28, 300), W(560, 418, 28, 414), W(1000, 28, 28, 360), W(1000, 478, 28, 354)
    ],
    doors: [D(206, 410, 24, 60)],
    props: [
      P(120, 80, 80, 36, 'bed'), P(120, 740, 72, 34, 'desk'), P(300, 300, 60, 30, 'table'),
      P(700, 80, 92, 34, 'sofa'), P(700, 700, 92, 34, 'sofa'), P(1200, 80, 78, 36, 'bed'),
      P(1300, 700, 72, 34, 'desk'), P(900, 650, 44, 58, 'cabinet', true, 3),
      P(1150, 400, 24, 24, 'barrel', true, 1), P(600, 600, 24, 24, 'barrel', true, 1), P(500, 250, 24, 24, 'barrel', true, 1)
    ],
    lights: [L(200, 430, 150), L(400, 250, 170), L(800, 180, 180), L(800, 650, 180), L(1200, 250, 180), L(1200, 650, 180)],
    pickups: [{ x: 300, y: 180, weapon: 'baton' }, { x: 650, y: 120, weapon: 'smg' }, { x: 650, y: 720, weapon: 'shotgun' }, { x: 1280, y: 120, weapon: 'suppressed' }, { x: 700, y: 680, weapon: 'cleaver' }, { x: 520, y: 200, weapon: 'revolver' }],
    enemies: [
      E(600, 200, 'elite', [{ x: 605, y: 180 }, { x: 680, y: 260 }]),
      E(640, 600, 'shotgunner', [{ x: 605, y: 560 }, { x: 680, y: 660 }]),
      E(950, 180, 'brawler', [{ x: 900, y: 150 }, { x: 1050, y: 240 }]),
      E(960, 650, 'hunter', [{ x: 900, y: 600 }, { x: 1050, y: 720 }]),
      E(1200, 400, 'guard', [{ x: 1150, y: 360 }, { x: 1280, y: 440 }]),
      E(330, 250, 'guard', [{ x: 300, y: 220 }, { x: 380, y: 300 }]),
      E(330, 550, 'guard', [{ x: 300, y: 520 }, { x: 380, y: 600 }]),
      E(760, 400, 'elite', [{ x: 720, y: 360 }, { x: 820, y: 460 }])
    ]
  }
];

// Phase 3 — BLACK ICE. The hardest floors; maximum pressure and the final boss.
const PHASE3_MISSIONS = [
  {
    id: 'foundry',
    name: 'FOUNDRY',
    sub: 'Smoke on the foundry floor. Everything down here is hunting you.',
    entryLabel: 'FOUNDRY GATE', entryKind: 'door',
    mood: 'blood',
    w: 1500, h: 1000,
    spawn: { x: 120, y: 500 },
    exit: { x: 120, y: 500 },
    goal: { type: 'eliminate' },
    walls: [
      W(0, 0, 1500, 28), W(0, 972, 1500, 28), W(0, 28, 28, 944), W(1472, 28, 28, 944),
      W(40, 420, 190, 24), W(40, 556, 190, 24), W(40, 420, 24, 160), W(206, 420, 24, 60), W(206, 540, 24, 40),
      W(560, 28, 28, 360), W(560, 478, 28, 494), W(1040, 28, 28, 400), W(1040, 518, 28, 454)
    ],
    doors: [D(206, 480, 24, 60)],
    props: [
      P(300, 150, 90, 34, 'sofa'), P(700, 800, 90, 34, 'sofa'), P(1200, 150, 90, 34, 'sofa'),
      P(900, 500, 56, 30, 'table'), P(400, 700, 24, 24, 'barrel', true, 1), P(1350, 800, 24, 24, 'barrel', true, 1),
      P(700, 300, 40, 40, 'cabinet', true, 3), P(1250, 400, 40, 40, 'cabinet', true, 3), P(950, 800, 80, 28, 'bench')
    ],
    lights: [L(120, 500, 140), L(400, 300, 170), L(800, 180, 180), L(800, 700, 180), L(1250, 300, 180), L(1250, 700, 180)],
    pickups: [{ x: 300, y: 800, weapon: 'pistol' }, { x: 700, y: 120, weapon: 'shotgun' }, { x: 1150, y: 850, weapon: 'smg' }, { x: 1450, y: 300, weapon: 'revolver' }, { x: 800, y: 400, weapon: 'baton' }, { x: 1250, y: 700, weapon: 'cleaver' }],
    enemies: [
      E(320, 300, 'guard', [{ x: 280, y: 250 }, { x: 380, y: 360 }]),
      E(450, 750, 'brawler', [{ x: 400, y: 680 }, { x: 520, y: 820 }]),
      E(650, 250, 'hunter', [{ x: 600, y: 200 }, { x: 720, y: 360 }]),
      E(700, 600, 'shotgunner', [{ x: 650, y: 550 }, { x: 760, y: 660 }]),
      E(820, 150, 'elite', [{ x: 780, y: 120 }, { x: 900, y: 200 }]),
      E(950, 400, 'brawler', [{ x: 900, y: 360 }, { x: 1020, y: 460 }]),
      E(1150, 250, 'guard', [{ x: 1100, y: 200 }, { x: 1220, y: 320 }]),
      E(1200, 650, 'hunter', [{ x: 1150, y: 600 }, { x: 1300, y: 720 }]),
      E(1350, 300, 'elite', [{ x: 1300, y: 250 }, { x: 1430, y: 360 }]),
      E(1400, 650, 'shotgunner', [{ x: 1350, y: 600 }, { x: 1460, y: 720 }]),
      E(600, 450, 'guard', [{ x: 550, y: 420 }, { x: 680, y: 500 }]),
      E(1000, 700, 'elite', [{ x: 950, y: 650 }, { x: 1080, y: 760 }])
    ]
  },
  {
    id: 'vault',
    name: 'THE VAULT',
    sub: 'Four keys, one vault. Collect every key before the door will open.',
    entryLabel: 'VAULT DOOR', entryKind: 'door',
    mood: 'toxic',
    w: 1300, h: 820,
    spawn: { x: 120, y: 410 },
    exit: { x: 120, y: 410 },
    goal: { type: 'collect', items: [{ x: 250, y: 250, label: 'KEY // 01' }, { x: 650, y: 700, label: 'KEY // 02' }, { x: 1050, y: 250, label: 'KEY // 03' }, { x: 1250, y: 700, label: 'KEY // 04' }] },
    walls: [
      W(0, 0, 1300, 28), W(0, 792, 1300, 28), W(0, 28, 28, 764), W(1272, 28, 28, 764),
      W(40, 330, 190, 24), W(40, 466, 190, 24), W(40, 330, 24, 160), W(206, 330, 24, 60), W(206, 450, 24, 40),
      W(500, 28, 28, 280), W(500, 398, 28, 394), W(900, 28, 28, 360), W(900, 478, 28, 314)
    ],
    doors: [D(206, 390, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(700, 650, 90, 34, 'sofa'), P(1100, 120, 44, 44, 'vending'),
      P(600, 300, 54, 54, 'desk', true, 3), P(1000, 650, 54, 54, 'desk', true, 3), P(400, 650, 24, 24, 'barrel', true, 1),
      P(1200, 400, 24, 24, 'barrel', true, 1), P(820, 450, 12, 28, 'glass', false, 1)
    ],
    lights: [L(120, 410, 150), L(400, 250, 170), L(750, 180, 170), L(750, 600, 170), L(1150, 250, 170), L(1150, 650, 170)],
    pickups: [{ x: 300, y: 650, weapon: 'pistol' }, { x: 620, y: 120, weapon: 'shotgun' }, { x: 1000, y: 120, weapon: 'smg' }, { x: 1150, y: 700, weapon: 'revolver' }, { x: 700, y: 400, weapon: 'baton' }, { x: 380, y: 180, weapon: 'cleaver' }],
    enemies: [
      E(300, 300, 'guard', [{ x: 260, y: 260 }, { x: 360, y: 360 }]),
      E(450, 600, 'brawler', [{ x: 400, y: 550 }, { x: 485, y: 660 }]),
      E(600, 200, 'hunter', [{ x: 560, y: 160 }, { x: 680, y: 260 }]),
      E(700, 500, 'shotgunner', [{ x: 650, y: 460 }, { x: 760, y: 560 }]),
      E(800, 120, 'elite', [{ x: 760, y: 90 }, { x: 880, y: 180 }]),
      E(1000, 300, 'brawler', [{ x: 950, y: 260 }, { x: 1060, y: 360 }]),
      E(1100, 550, 'hunter', [{ x: 1050, y: 500 }, { x: 1180, y: 620 }]),
      E(1200, 250, 'guard', [{ x: 1150, y: 200 }, { x: 1255, y: 320 }]),
      E(350, 450, 'shotgunner', [{ x: 300, y: 420 }, { x: 420, y: 500 }])
    ]
  },
  {
    id: 'antenna',
    name: 'ANTENNA',
    sub: 'Cornered under the antenna. Hold the platform until extraction.',
    entryLabel: 'ANTENNA ACCESS', entryKind: 'stairs',
    mood: 'blood',
    w: 1200, h: 800,
    spawn: { x: 120, y: 400 },
    exit: { x: 120, y: 400 },
    goal: { type: 'survive', duration: 60 },
    reinforce: { every: 6, max: 10, types: ['guard', 'brawler', 'hunter', 'elite'], points: [{ x: 1000, y: 80 }, { x: 1050, y: 720 }, { x: 500, y: 80 }, { x: 700, y: 720 }] },
    walls: [
      W(0, 0, 1200, 28), W(0, 772, 1200, 28), W(0, 28, 28, 744), W(1172, 28, 28, 744),
      W(40, 320, 190, 24), W(40, 456, 190, 24), W(40, 320, 24, 160), W(206, 320, 24, 60), W(206, 440, 24, 40),
      W(460, 28, 28, 260), W(460, 378, 28, 394), W(860, 28, 28, 320), W(860, 438, 28, 334)
    ],
    doors: [D(206, 380, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(700, 650, 90, 34, 'sofa'), P(1000, 120, 44, 44, 'vending'),
      P(600, 600, 54, 54, 'desk', true, 3), P(350, 650, 24, 24, 'barrel', true, 1), P(1050, 650, 24, 24, 'barrel', true, 1),
      P(700, 300, 24, 24, 'barrel', true, 1), P(950, 400, 12, 28, 'glass', false, 1)
    ],
    lights: [L(120, 400, 140), L(400, 250, 170), L(750, 180, 170), L(750, 600, 170), L(1050, 300, 170), L(1050, 650, 160)],
    pickups: [{ x: 300, y: 650, weapon: 'pistol' }, { x: 620, y: 120, weapon: 'shotgun' }, { x: 1000, y: 700, weapon: 'smg' }, { x: 1100, y: 250, weapon: 'revolver' }, { x: 700, y: 450, weapon: 'baton' }],
    enemies: [
      E(300, 300, 'guard', [{ x: 260, y: 260 }, { x: 360, y: 360 }]),
      E(420, 600, 'brawler', [{ x: 380, y: 550 }, { x: 500, y: 660 }]),
      E(620, 200, 'hunter', [{ x: 580, y: 160 }, { x: 700, y: 260 }]),
      E(700, 500, 'shotgunner', [{ x: 650, y: 460 }, { x: 780, y: 560 }]),
      E(800, 200, 'elite', [{ x: 800, y: 160 }, { x: 920, y: 260 }]),
      E(950, 550, 'brawler', [{ x: 900, y: 500 }, { x: 1060, y: 620 }]),
      E(1100, 400, 'guard', [{ x: 1050, y: 360 }, { x: 1155, y: 460 }]),
      E(350, 450, 'elite', [{ x: 300, y: 420 }, { x: 420, y: 500 }])
    ]
  },
  {
    id: 'skyline',
    name: 'SKYLINE',
    sub: 'On the rooftop relays. Wire all four charges and take the lift out.',
    entryLabel: 'ROOFTOP LIFT', entryKind: 'elevator',
    mood: 'violet',
    w: 1600, h: 800,
    spawn: { x: 120, y: 400 },
    exit: { x: 120, y: 400 },
    goal: { type: 'sabotage', targets: [{ x: 250, y: 200, label: 'RELAY [1]' }, { x: 700, y: 700, label: 'RELAY [2]' }, { x: 1030, y: 150, label: 'RELAY [3]' }, { x: 1480, y: 750, label: 'RELAY [4]' }] },
    walls: [
      W(0, 0, 1600, 28), W(0, 772, 1600, 28), W(0, 28, 28, 744), W(1572, 28, 28, 744),
      W(40, 320, 190, 24), W(40, 456, 190, 24), W(40, 320, 24, 160), W(206, 320, 24, 60), W(206, 440, 24, 40),
      W(600, 28, 28, 300), W(600, 418, 28, 354), W(1100, 28, 28, 260), W(1100, 378, 28, 394)
    ],
    doors: [D(206, 380, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(800, 650, 90, 34, 'sofa'), P(1300, 120, 90, 34, 'sofa'),
      P(500, 600, 54, 54, 'desk', true, 3), P(1000, 600, 54, 54, 'desk', true, 3), P(1400, 650, 44, 44, 'vending'),
      P(400, 250, 24, 24, 'barrel', true, 1), P(1200, 250, 24, 24, 'barrel', true, 1), P(850, 400, 12, 28, 'glass', false, 1)
    ],
    lights: [L(120, 400, 140), L(500, 150, 170), L(900, 150, 170), L(900, 600, 170), L(1400, 250, 170), L(1400, 650, 160)],
    pickups: [{ x: 300, y: 650, weapon: 'pistol' }, { x: 700, y: 120, weapon: 'shotgun' }, { x: 1150, y: 700, weapon: 'smg' }, { x: 1500, y: 250, weapon: 'revolver' }, { x: 800, y: 300, weapon: 'baton' }, { x: 1350, y: 450, weapon: 'cleaver' }],
    enemies: [
      E(320, 300, 'guard', [{ x: 280, y: 260 }, { x: 380, y: 360 }]),
      E(450, 600, 'brawler', [{ x: 400, y: 550 }, { x: 520, y: 680 }]),
      E(650, 200, 'hunter', [{ x: 645, y: 160 }, { x: 720, y: 260 }]),
      E(700, 500, 'shotgunner', [{ x: 650, y: 460 }, { x: 780, y: 560 }]),
      E(850, 120, 'elite', [{ x: 800, y: 90 }, { x: 920, y: 180 }]),
      E(1000, 400, 'brawler', [{ x: 950, y: 360 }, { x: 1080, y: 460 }]),
      E(1200, 150, 'guard', [{ x: 1150, y: 120 }, { x: 1300, y: 200 }]),
      E(1250, 600, 'hunter', [{ x: 1200, y: 550 }, { x: 1350, y: 660 }]),
      E(1450, 350, 'elite', [{ x: 1400, y: 300 }, { x: 1540, y: 420 }]),
      E(950, 650, 'shotgunner', [{ x: 900, y: 600 }, { x: 1050, y: 720 }])
    ]
  },
  {
    id: 'finale',
    name: 'THE PORTER PROTOCOL',
    sub: 'The last floor. The Porter, his guard, and the end of the file.',
    entryLabel: 'THE PORTER PROTOCOL', entryKind: 'elevator',
    mood: 'violet',
    w: 1400, h: 900,
    spawn: { x: 120, y: 450 },
    exit: { x: 120, y: 450 },
    goal: { type: 'boss' },
    boss: { x: 1150, y: 450 },
    walls: [
      W(0, 0, 1400, 28), W(0, 872, 1400, 28), W(0, 28, 28, 844), W(1372, 28, 28, 844),
      W(40, 370, 190, 24), W(40, 506, 190, 24), W(40, 370, 24, 160), W(206, 370, 24, 60), W(206, 490, 24, 40),
      W(560, 28, 28, 320), W(560, 438, 28, 434), W(1000, 28, 28, 380), W(1000, 498, 28, 374)
    ],
    doors: [D(206, 430, 24, 60)],
    props: [
      P(120, 80, 80, 36, 'bed'), P(300, 300, 60, 30, 'table'), P(700, 80, 92, 34, 'sofa'),
      P(700, 780, 92, 34, 'sofa'), P(1200, 80, 78, 36, 'bed'), P(900, 700, 44, 58, 'cabinet', true, 3),
      P(650, 600, 24, 24, 'barrel', true, 1), P(1150, 400, 24, 24, 'barrel', true, 1), P(500, 250, 24, 24, 'barrel', true, 1)
    ],
    lights: [L(120, 450, 140), L(400, 250, 170), L(800, 180, 180), L(800, 700, 180), L(1250, 250, 180), L(1250, 700, 180)],
    pickups: [{ x: 300, y: 180, weapon: 'baton' }, { x: 650, y: 120, weapon: 'smg' }, { x: 650, y: 750, weapon: 'shotgun' }, { x: 1280, y: 120, weapon: 'suppressed' }, { x: 700, y: 680, weapon: 'cleaver' }, { x: 520, y: 200, weapon: 'revolver' }],
    enemies: [
      E(600, 200, 'elite', [{ x: 605, y: 180 }, { x: 680, y: 260 }]),
      E(600, 600, 'shotgunner', [{ x: 605, y: 560 }, { x: 680, y: 660 }]),
      E(950, 180, 'brawler', [{ x: 900, y: 150 }, { x: 1050, y: 240 }]),
      E(950, 650, 'hunter', [{ x: 900, y: 600 }, { x: 1050, y: 720 }]),
      E(1200, 400, 'guard', [{ x: 1150, y: 360 }, { x: 1280, y: 440 }]),
      E(330, 250, 'guard', [{ x: 300, y: 220 }, { x: 380, y: 300 }]),
      E(330, 550, 'guard', [{ x: 300, y: 520 }, { x: 380, y: 600 }]),
      E(760, 400, 'elite', [{ x: 720, y: 360 }, { x: 820, y: 460 }]),
      E(1150, 700, 'elite', [{ x: 1100, y: 650 }, { x: 1250, y: 760 }])
    ]
  }
];

export const PHASES = [
  { id: 'p1', name: 'MOTEL STATIC', tag: 'PHASE 1', sub: 'Marlow\u2019s incident: five floors from the motel to the Porter.', difficulty: { reaction: 1.00, detect: 1.00, score: 1.00 }, missions: PHASE1_MISSIONS },
  { id: 'p2', name: 'DEEP COVER', tag: 'PHASE 2 // NEW GAME+', sub: 'The signal goes deeper. Harder rooms, same mask.', difficulty: { reaction: 0.88, detect: 1.10, score: 1.25 }, missions: PHASE2_MISSIONS },
  { id: 'p3', name: 'BLACK ICE', tag: 'PHASE 3 // NEW GAME+', sub: 'No backup, no exit. End the Porter protocol.', difficulty: { reaction: 0.78, detect: 1.20, score: 1.60 }, missions: PHASE3_MISSIONS }
];

export const MISSIONS = PHASES.flatMap(p => p.missions);
export const MISSION_COUNT = MISSIONS.length;
export const PHASE_COUNT = PHASES.length;
export const MISSIONS_PER_PHASE = 5;
export const phaseOfMission = i => Math.floor(i / MISSIONS_PER_PHASE);
export const phaseStart = p => p * MISSIONS_PER_PHASE;
