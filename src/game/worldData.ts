export interface GameEnemy {
  id: string;
  type: 'forest_slime' | 'forest_wolf';
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hitFlash: number;
  isAlive: boolean;
  expReward: number;
  attackCooldown: number;
  spritePhase: number;
}

export interface BossState {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  phase: number;
  x: number;
  y: number;
  w: number;
  h: number;
  attackCooldown: number;
  hitFlash: number;
  vineCooldown: number;
  vines: Vine[];
  isDefeated: boolean;
  spritePhase: number;
}

export interface Vine {
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  warningTime: number;
  activeTime: number;
  hit: boolean;
}

export interface Chest {
  x: number;
  y: number;
  w: number;
  h: number;
  opened: boolean;
  itemKey: string;
  itemName: string;
}

export interface RockPuzzle {
  rockX: number;
  rockY: number;
  rockW: number;
  rockH: number;
  logX: number;
  logY: number;
  logW: number;
  logH: number;
  logMoved: boolean;
  pathCleared: boolean;
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  attackCooldown: number;
  attackRange: number;
  hitFlash: number;
  invincible: number;
  exp: number;
  level: number;
  facing: 'up' | 'down' | 'left' | 'right';
  walkPhase: number;
  isMoving: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'leaf' | 'glow' | 'damage' | 'heal';
  text?: string;
}

export interface TransitionState {
  active: boolean;
  alpha: number;
  targetArea: AreaId;
  direction: 'out' | 'in';
}

export type AreaId = 0 | 1 | 2 | 3 | 4;

export interface AreaConnection {
  fromX: number;
  toArea: AreaId;
  spawnX: number;
  spawnY: number;
}

export interface NpcData {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  nameZh: string;
  variant: number;
  hintEn: string;
  hintZh: string;
}

export interface AreaData {
  id: AreaId;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  bgColor: string;
  connections: AreaConnection[];
  trees: { x: number; y: number; w: number; h: number; variant: number }[];
  decorations: { x: number; y: number; type: string; variant: number }[];
  grassPatches: { x: number; y: number; w: number; h: number }[];
  rocks: { x: number; y: number; w: number; h: number }[];
  walls: { x: number; y: number; w: number; h: number }[];
  waterAreas?: { x: number; y: number; w: number; h: number }[];
  hasGlowingSymbols?: boolean;
  npcs: NpcData[];
}

export const AREAS: AreaData[] = [
  {
    id: 0,
    name: 'Starting Camp',
    subtitle: 'A quiet clearing where your journey begins',
    width: 900,
    height: 560,
    bgColor: '#102018',
    connections: [
      { fromX: 870, toArea: 1, spawnX: 40, spawnY: 280 },
    ],
    trees: [
      { x: 100, y: 60, w: 50, h: 70, variant: 0 },
      { x: 200, y: 40, w: 45, h: 65, variant: 1 },
      { x: 350, y: 50, w: 55, h: 75, variant: 0 },
      { x: 500, y: 45, w: 48, h: 68, variant: 1 },
      { x: 650, y: 55, w: 52, h: 72, variant: 0 },
      { x: 120, y: 460, w: 50, h: 70, variant: 1 },
      { x: 300, y: 470, w: 45, h: 65, variant: 0 },
      { x: 550, y: 465, w: 52, h: 72, variant: 1 },
      { x: 720, y: 460, w: 48, h: 68, variant: 0 },
    ],
    decorations: [
      { x: 420, y: 250, type: 'campfire', variant: 0 },
      { x: 380, y: 220, type: 'tent', variant: 0 },
      { x: 470, y: 220, type: 'tent', variant: 1 },
      { x: 250, y: 350, type: 'bush', variant: 0 },
      { x: 600, y: 340, type: 'bush', variant: 1 },
      { x: 150, y: 300, type: 'flower', variant: 0 },
      { x: 700, y: 320, type: 'flower', variant: 1 },
    ],
    grassPatches: [
      { x: 50, y: 200, w: 80, h: 40 },
      { x: 600, y: 380, w: 100, h: 50 },
      { x: 300, y: 150, w: 60, h: 30 },
    ],
    rocks: [
      { x: 180, y: 180, w: 20, h: 18 },
      { x: 680, y: 400, w: 25, h: 22 },
    ],
    walls: [],
    npcs: [
      { id: 'camp_guide', x: 300, y: 280, w: 28, h: 36, name: 'Old Ranger', nameZh: '老巡林员', variant: 0,
        hintEn: 'Welcome, traveler! Use WASD or Arrow Keys to move. Head east to enter the forest path. Press E to interact with objects and people.',
        hintZh: '欢迎，旅行者！用 WASD 或方向键移动。向东走进入林间小路。按 E 键与物体和人物互动。' },
    ],
  },
  {
    id: 1,
    name: 'Forest Path',
    subtitle: 'A winding trail through the whispering trees',
    width: 1000,
    height: 560,
    bgColor: '#0d1a14',
    connections: [
      { fromX: 970, toArea: 2, spawnX: 40, spawnY: 280 },
    ],
    trees: [
      { x: 80, y: 30, w: 55, h: 75, variant: 0 },
      { x: 250, y: 20, w: 50, h: 70, variant: 1 },
      { x: 420, y: 30, w: 58, h: 78, variant: 0 },
      { x: 600, y: 25, w: 48, h: 68, variant: 1 },
      { x: 780, y: 30, w: 55, h: 75, variant: 0 },
      { x: 100, y: 460, w: 52, h: 72, variant: 1 },
      { x: 300, y: 470, w: 48, h: 68, variant: 0 },
      { x: 500, y: 465, w: 55, h: 75, variant: 1 },
      { x: 700, y: 460, w: 50, h: 70, variant: 0 },
      { x: 880, y: 470, w: 52, h: 72, variant: 1 },
    ],
    decorations: [
      { x: 350, y: 380, type: 'bush', variant: 0 },
      { x: 650, y: 200, type: 'bush', variant: 1 },
      { x: 200, y: 350, type: 'flower', variant: 0 },
      { x: 820, y: 340, type: 'flower', variant: 1 },
    ],
    grassPatches: [
      { x: 150, y: 200, w: 60, h: 30 },
      { x: 550, y: 380, w: 80, h: 40 },
    ],
    rocks: [
      { x: 180, y: 400, w: 22, h: 20 },
    ],
    walls: [],
    npcs: [
      { id: 'forest_hunter', x: 200, y: 300, w: 28, h: 36, name: 'Forest Hunter', nameZh: '森林猎人', variant: 1,
        hintEn: 'Forest Slimes roam this path! Press SPACE to attack. Defeat them to earn EXP and grow stronger. There is no turning back now!',
        hintZh: '林间小路上有森林史莱姆出没！按空格键攻击。击败它们可以获得经验值并变强。现在已经没有回头路了！' },
    ],
  },
  {
    id: 2,
    name: 'Creek Area',
    subtitle: 'A gentle stream blocks your path',
    width: 900,
    height: 560,
    bgColor: '#0c1822',
    connections: [
      { fromX: 870, toArea: 3, spawnX: 40, spawnY: 280 },
    ],
    trees: [
      { x: 60, y: 30, w: 50, h: 70, variant: 0 },
      { x: 200, y: 20, w: 55, h: 75, variant: 1 },
      { x: 700, y: 30, w: 52, h: 72, variant: 0 },
      { x: 830, y: 25, w: 48, h: 68, variant: 1 },
      { x: 80, y: 460, w: 52, h: 72, variant: 1 },
      { x: 300, y: 470, w: 48, h: 68, variant: 0 },
      { x: 700, y: 460, w: 55, h: 75, variant: 1 },
    ],
    decorations: [
      { x: 150, y: 350, type: 'flower', variant: 0 },
      { x: 750, y: 350, type: 'flower', variant: 1 },
    ],
    grassPatches: [
      { x: 50, y: 200, w: 60, h: 30 },
    ],
    rocks: [
      { x: 380, y: 250, w: 45, h: 40 },
    ],
    walls: [],
    waterAreas: [
      { x: 420, y: 180, w: 60, h: 220 },
    ],
    npcs: [
      { id: 'creek_scholar', x: 200, y: 320, w: 28, h: 36, name: 'Wandering Scholar', nameZh: '流浪学者', variant: 2,
        hintEn: 'A rock blocks the stream crossing. Press E near the log to push it aside and clear a path. A treasure chest lies beyond!',
        hintZh: '一块石头挡住了过溪的路。在木头附近按 E 键把它推开，就能通过。前面有一个宝箱！' },
    ],
  },
  {
    id: 3,
    name: 'Deep Forest',
    subtitle: 'Glowing symbols appear on the ancient trees',
    width: 1000,
    height: 560,
    bgColor: '#091613',
    connections: [
      { fromX: 970, toArea: 4, spawnX: 40, spawnY: 280 },
    ],
    trees: [
      { x: 50, y: 20, w: 60, h: 85, variant: 0 },
      { x: 180, y: 10, w: 55, h: 78, variant: 1 },
      { x: 320, y: 20, w: 62, h: 88, variant: 0 },
      { x: 480, y: 15, w: 58, h: 82, variant: 1 },
      { x: 630, y: 20, w: 60, h: 85, variant: 0 },
      { x: 790, y: 10, w: 55, h: 78, variant: 1 },
      { x: 920, y: 20, w: 58, h: 82, variant: 0 },
      { x: 60, y: 450, w: 60, h: 85, variant: 1 },
      { x: 220, y: 460, w: 55, h: 78, variant: 0 },
      { x: 400, y: 450, w: 62, h: 88, variant: 1 },
      { x: 580, y: 460, w: 58, h: 82, variant: 0 },
      { x: 760, y: 450, w: 60, h: 85, variant: 1 },
      { x: 900, y: 460, w: 55, h: 78, variant: 0 },
    ],
    decorations: [
      { x: 250, y: 350, type: 'mushroom', variant: 0 },
      { x: 550, y: 300, type: 'mushroom', variant: 1 },
      { x: 750, y: 380, type: 'glow_spot', variant: 0 },
      { x: 150, y: 250, type: 'glow_spot', variant: 1 },
    ],
    grassPatches: [
      { x: 300, y: 300, w: 50, h: 25 },
      { x: 650, y: 350, w: 60, h: 30 },
    ],
    rocks: [
      { x: 200, y: 380, w: 25, h: 22 },
      { x: 700, y: 250, w: 22, h: 20 },
    ],
    walls: [],
    hasGlowingSymbols: true,
    npcs: [
      { id: 'mystery_girl', x: 200, y: 300, w: 28, h: 36, name: 'Mysterious Girl', nameZh: '神秘少女', variant: 3,
        hintEn: 'Those glowing symbols on the trees... they are old. Older than the forest itself. Forest Wolves guard this place. Press SPACE to fight, and keep moving east to find the ancient clearing.',
        hintZh: '树上那些发光的符号……它们很古老。比这片森林本身还要古老。森林狼守卫着这个地方。按空格键战斗，继续向东走就能找到古老的空地。' },
    ],
  },
  {
    id: 4,
    name: 'Boss Area',
    subtitle: 'A vast clearing with an ancient tree at its heart',
    width: 800,
    height: 560,
    bgColor: '#0b1410',
    connections: [],
    trees: [
      { x: 40, y: 20, w: 55, h: 75, variant: 0 },
      { x: 180, y: 10, w: 60, h: 82, variant: 1 },
      { x: 600, y: 15, w: 58, h: 80, variant: 0 },
      { x: 730, y: 20, w: 55, h: 75, variant: 1 },
      { x: 50, y: 460, w: 55, h: 75, variant: 1 },
      { x: 250, y: 460, w: 60, h: 82, variant: 0 },
      { x: 550, y: 460, w: 58, h: 80, variant: 1 },
      { x: 720, y: 460, w: 55, h: 75, variant: 0 },
    ],
    decorations: [],
    grassPatches: [
      { x: 100, y: 350, w: 80, h: 40 },
      { x: 550, y: 350, w: 80, h: 40 },
    ],
    rocks: [],
    walls: [],
    npcs: [
      { id: 'temple_guardian_npc', x: 150, y: 300, w: 28, h: 36, name: 'Temple Guardian', nameZh: '神庙守卫', variant: 4,
        hintEn: 'The Forest Guardian sleeps in the ancient tree ahead. Step forward to awaken it. Attack with SPACE and dodge its vines in phase two. You cannot flee — defeat it to claim the Nature Core!',
        hintZh: '森林守护者在前面那棵古树中沉睡。走上前去唤醒它。用空格键攻击，在第二阶段躲避它的树藤。你无法逃跑——击败它才能获得自然核心！' },
    ],
  },
];
