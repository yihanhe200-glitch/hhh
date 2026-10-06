// World 2 — Lost City: 8 districts + ZERO boss.
// Large interconnected city maze, 5 skills with puzzle/combat/exploration uses,
// stealth sections, skill-gated backtracking, and a multi-phase final chase.

export type CityLevelId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type TimeOfDay = 'day' | 'dusk' | 'night' | 'blackout' | 'storm';
export type Weather = 'clear' | 'rain' | 'fog' | 'storm' | 'none';
export type SkillType = 'sprint' | 'electric' | 'wind' | 'water' | 'sense';

export interface Building {
  x: number; y: number; w: number; h: number;
  color: string; windows: boolean; type: string; label?: string; labelZh?: string;
  enterable?: boolean;
  landmark?: boolean;
}

export interface Road {
  x: number; y: number; w: number; h: number; dir: 'h' | 'v';
}

export interface Checkpoint {
  id: string; x: number; y: number; w: number; h: number;
  activated: boolean; level: CityLevelId;
}

export interface Objective {
  id: string;
  type: 'marker' | 'collect' | 'clue' | 'skill' | 'reach' | 'survive' | 'boss' | 'trigger' | 'device' | 'drain' | 'escape';
  x: number; y: number;
  name: string; nameZh: string;
  descEn: string; descZh: string;
  done: boolean;
  hidden?: boolean;
  skillType?: SkillType;
}

export interface RouteChoice {
  id: string;
  labelEn: string; labelZh: string;
  descEn: string; descZh: string;
  difficulty: 'easy' | 'hard' | 'hidden';
  targetX: number; targetY: number;
  checkpointLevel: CityLevelId;
}

export interface Landmark {
  id: string; x: number; y: number;
  name: string; nameZh: string;
  icon: string;
  discovered: boolean;
}

// A skill gate: an obstacle that requires a specific skill to pass
export interface SkillGate {
  id: string;
  x: number; y: number; w: number; h: number;
  skill: SkillType;
  // Gate is a wall until the skill is used; then it opens (becomes passable)
  opened: boolean;
  label: string; labelZh: string;
  // Direction the gate blocks (for visual rendering)
  dir: 'h' | 'v';
}

// Electronic device that Electric skill can activate
export interface ElectronicDevice {
  id: string;
  x: number; y: number; w: number; h: number;
  activated: boolean;
  label: string; labelZh: string;
  // What happens when activated (unlocks a gate id, opens a door, etc.)
  unlocksGateId?: string;
  unlocksMessage?: string; unlocksMessageZh?: string;
}

// Water area that blocks/damages the player until drained
export interface WaterArea {
  id: string;
  x: number; y: number; w: number; h: number;
  drained: boolean;
  // Gate that opens when this water is drained
  unlocksGateId?: string;
}

// Wind platform that can be pushed by Wind skill
export interface WindPlatform {
  id: string;
  x: number; y: number; w: number; h: number;
  // Target position when wind is used
  targetX: number; targetY: number;
  activated: boolean;
  label: string; labelZh: string;
}

// Sensor reveal: hidden things only visible with Sense skill
export interface SensorReveal {
  id: string;
  x: number; y: number;
  radius: number;
  // Gate or path that appears when sensed
  revealsGateId?: string;
  message: string; messageZh: string;
  revealed: boolean;
}

export interface FastTravelPoint {
  id: string; x: number; y: number;
  name: string; nameZh: string;
  unlocked: boolean;
}

export interface LevelData {
  id: CityLevelId;
  name: string; nameZh: string;
  subtitle: string; subtitleZh: string;
  width: number; height: number;
  timeOfDay: TimeOfDay;
  weather: Weather;
  bgColor: string;
  objectiveEn: string; objectiveZh: string;
  storyEn: string; storyZh: string;
  buildings: Building[];
  roads: Road[];
  objectives: Objective[];
  checkpoints: Checkpoint[];
  landmarks: Landmark[];
  fastTravel: FastTravelPoint[];
  hasTimer?: boolean;
  timerSeconds?: number;
  timerLabel?: string;
  timerLabelZh?: string;
  routeChoices?: RouteChoice[];
  doors: { x: number; y: number; w: number; h: number; targetLevel: CityLevelId; label: string; labelZh: string; locked: boolean; unlockCondition?: string }[];
  npcs: { id: string; x: number; y: number; w: number; h: number; name: string; nameZh: string; variant: number; hintEn: string; hintZh: string }[];
  starCriteria: { one: string; two: string; three: string };
  prepEn: string; prepZh: string;
  observeEn: string; observeZh: string;
  clearEn: string; clearZh: string;
  hintsEn: string[]; hintsZh: string[];
  isBoss?: boolean;
  bossName?: string; bossNameZh?: string;
  // New mechanics
  skillGates?: SkillGate[];
  electronicDevices?: ElectronicDevice[];
  waterAreas?: WaterArea[];
  windPlatforms?: WindPlatform[];
  sensorReveals?: SensorReveal[];
  // Enemy type for this level
  enemyType?: 'patrol' | 'sound' | 'fast' | 'none';
}

function cityBlocks(
  startX: number, startY: number, blockW: number, blockH: number,
  cols: number, rows: number, gapX: number, gapY: number,
  colors: string[], types: string[], labels?: [string, string][],
): Building[] {
  const buildings: Building[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (blockW + gapX);
      const y = startY + r * (blockH + gapY);
      const color = colors[(r * cols + c) % colors.length];
      const type = types[(r * cols + c) % types.length];
      const lbl = labels?.[r * cols + c];
      buildings.push({
        x, y, w: blockW, h: blockH,
        color, windows: true, type,
        label: lbl?.[0], labelZh: lbl?.[1],
      });
    }
  }
  return buildings;
}

export const CITY_LEVELS: LevelData[] = [
  // ===== Level 0: Abandoned Commercial Street =====
  {
    id: 0,
    name: 'Abandoned Commercial Street',
    nameZh: '废弃商业街',
    subtitle: 'Welcome to the city',
    subtitleZh: '欢迎来到城市',
    width: 1600, height: 800,
    timeOfDay: 'day', weather: 'clear', bgColor: '#1a1f2e',
    objectiveEn: 'Find the City Access Chip. Then survive the first mechanical patrol.',
    objectiveZh: '找到城市通行芯片。然后在第一只机械巡逻怪下存活。',
    storyEn: 'You step through the portal into a wide commercial street. Shops line both sides — convenience stores, cafes, small boutiques. The city looks normal at first, but there are no people. Lights and screens still run on autopilot. A timestamp on every display reads 00:00:00 and never changes. You need a City Access Chip to proceed deeper.',
    storyZh: '你穿过传送门来到一条宽阔的商业街。两边是商店——便利店、咖啡店、小精品店。城市初看正常，但没有人。灯光和屏幕仍在自动运行。每个屏幕上的时间戳显示 00:00:00 且永不改变。你需要一块城市通行芯片才能继续深入。',
    buildings: [
      ...cityBlocks(40, 60, 100, 180, 5, 1, 50, 0,
        ['#3a4a5a', '#445566', '#3a5a4a', '#445566', '#3a4a5a'],
        ['shop', 'shop', 'cafe', 'shop', 'shop'],
        [['Convenience Store', '便利店'], ['Cafe', '咖啡店'], ['Boutique', '精品店'], ['Electronics Shop', '电子店'], ['Bookstore', '书店']]),
      ...cityBlocks(40, 380, 100, 180, 5, 1, 50, 0,
        ['#445566', '#3a4a5a', '#445566', '#3a5a4a', '#445566'],
        ['shop', 'shop', 'shop', 'parking', 'shop'],
        [['Shoe Store', '鞋店'], ['Phone Shop', '手机店'], ['Bakery', '面包店'], ['Parking Garage', '停车场'], ['Pharmacy', '药房']]),
      // Mall entrance (large building, locked)
      { x: 650, y: 60, w: 200, h: 280, color: '#4a5a6a', windows: true, type: 'mall',
        label: 'Central Mall', labelZh: '中央商场', landmark: true },
      // North towers
      { x: 650, y: 400, w: 200, h: 280, color: '#3a4a5a', windows: true, type: 'mall_back' },
      // Subway entrance (locked, electronic door)
      { x: 950, y: 380, w: 120, h: 180, color: '#2a2a35', windows: false, type: 'subway_entrance',
        label: 'Subway', labelZh: '地铁', landmark: true },
      // East buildings
      ...cityBlocks(1130, 60, 100, 180, 4, 1, 50, 0,
        ['#3a4a5a', '#445566', '#3a5a4a', '#445566'], ['shop', 'shop', 'shop', 'office']),
      ...cityBlocks(1130, 380, 100, 180, 4, 1, 50, 0,
        ['#445566', '#3a4a5a', '#445566', '#3a4a5a'], ['shop', 'office', 'shop', 'office']),
      // Walls creating alleys
      { x: 300, y: 240, w: 20, h: 140, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 600, y: 240, w: 20, h: 140, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 1080, y: 240, w: 20, h: 140, color: '#2a2a35', windows: false, type: 'wall' },
    ],
    roads: [
      { x: 0, y: 250, w: 1600, h: 60, dir: 'h' },
      { x: 0, y: 570, w: 1600, h: 50, dir: 'h' },
      { x: 150, y: 60, w: 50, h: 520, dir: 'v' },
      { x: 400, y: 250, w: 50, h: 320, dir: 'v' },
      { x: 700, y: 250, w: 50, h: 320, dir: 'v' },
      { x: 950, y: 250, w: 50, h: 130, dir: 'v' },
      { x: 1200, y: 60, w: 50, h: 520, dir: 'v' },
      { x: 1400, y: 250, w: 50, h: 320, dir: 'v' },
    ],
    objectives: [
      { id: 'access_chip', type: 'collect', x: 750, y: 500, name: 'City Access Chip', nameZh: '城市通行芯片',
        descEn: 'A glowing chip near the mall entrance. Required to proceed.', descZh: '商场入口附近的发光芯片。需要它才能继续。', done: false },
      { id: 'sprint_skill', type: 'skill', x: 250, y: 300, name: 'Sprint', nameZh: '疾行',
        descEn: 'Movement skill. Temporarily increases speed. Costs energy.', descZh: '移动技能。暂时提高速度。消耗能量。', done: false, skillType: 'sprint' },
      { id: 'alarm_trigger', type: 'trigger', x: 750, y: 200, name: 'City Alarm', nameZh: '城市警报',
        descEn: 'The access chip activates the city alarm. ZERO identifies you as an intruder.', descZh: '通行芯片激活了城市警报。ZERO将你识别为入侵者。', done: false },
      { id: 'clue1', type: 'clue', x: 1250, y: 150, name: 'Glitching Billboard', nameZh: '故障广告牌',
        descEn: 'A billboard flickers: "ALL NORMAL" — but the timestamp reads 00:00:00 and never changes.', descZh: '广告牌闪烁着："一切正常"——但时间戳显示 00:00:00 且永不改变。', done: false },
    ],
    checkpoints: [
      { id: 'cp0a', x: 80, y: 280, w: 30, h: 30, activated: true, level: 0 },
      { id: 'cp0b', x: 1200, y: 280, w: 30, h: 30, activated: false, level: 0 },
    ],
    landmarks: [
      { id: 'lm_mall', x: 750, y: 200, name: 'Central Mall', nameZh: '中央商场', icon: '🏬', discovered: false },
      { id: 'lm_subway', x: 1010, y: 470, name: 'Subway Entrance', nameZh: '地铁入口', icon: '🚇', discovered: false },
    ],
    fastTravel: [
      { id: 'ft0', x: 80, y: 290, name: 'Street Entrance', nameZh: '街道入口', unlocked: true },
    ],
    doors: [
      { x: 1540, y: 280, w: 60, h: 60, targetLevel: 1, label: 'Office Building', labelZh: '办公大楼', locked: true, unlockCondition: 'Get City Access Chip' },
    ],
    skillGates: [
      { id: 'gate_electronic_subway', x: 950, y: 340, w: 120, h: 40, skill: 'electric', opened: false,
        label: 'Electronic Door', labelZh: '电子门', dir: 'h' },
    ],
    electronicDevices: [
      { id: 'dev_terminal', x: 160, y: 160, w: 40, h: 40, activated: false,
        label: 'Terminal', labelZh: '终端', unlocksMessage: 'Terminal activated. Subway door unlocked.', unlocksMessageZh: '终端已激活。地铁门已解锁。', unlocksGateId: 'gate_electronic_subway' },
    ],
    npcs: [
      { id: 'guide', x: 130, y: 300, w: 28, h: 36, name: 'Hologram Guide', nameZh: '全息向导', variant: 0,
        hintEn: 'Welcome to the city. Find the City Access Chip near the mall. Once you pick it up, the city alarm will trigger and a mechanical patrol unit will hunt you. Grab the Sprint skill nearby — it lets you outrun the machines. The subway entrance has an electronic door you cannot open yet. Remember it for later.',
        hintZh: '欢迎来到城市。在商场附近找到城市通行芯片。一旦拿到芯片，城市警报会触发，机械巡逻单元会追你。附近有疾行技能——让你能跑过机器。地铁入口有电子门，暂时打不开。记住它，以后再来。' },
    ],
    starCriteria: { one: 'Get the chip and escape to the office building', two: 'Find the billboard clue', three: 'Activate the terminal (requires returning with Electric skill)' },
    prepEn: 'Explore the commercial street. Find the City Access Chip near the mall. After you grab it, the alarm triggers and a mech patrol appears. Use the Sprint skill to escape. The exit is the office building door on the east side.',
    prepZh: '探索商业街。在商场附近找到城市通行芯片。拿到后警报触发，机械巡逻出现。用疾行技能逃跑。出口是东边办公大楼的门。',
    observeEn: 'The street has shops on both sides with alleys between them. The chip is near the mall entrance. The Sprint skill pickup is near the west side. A subway entrance on the east side has an electronic door — you cannot open it yet, but remember its location.',
    observeZh: '街道两边是商店，中间有小巷。芯片在商场入口附近。疾行技能在西部。东边地铁入口有电子门——暂时打不开，但记住它的位置。',
    clearEn: 'Get the City Access Chip, then walk through the door to the Office Building on the east side.',
    clearZh: '拿到城市通行芯片，然后走东边办公大楼的门。',
    hintsEn: ['The chip is near the mall entrance in the center of the map.', 'The Sprint skill is near the west side — grab it before the alarm triggers.', 'After getting the chip, a mech patrol appears. Use Sprint to run.', 'A subway entrance has an electronic door — remember it for when you get the Electric skill.', 'A glitching billboard in the east has a clue about the city.'],
    hintsZh: ['芯片在地图中心商场入口附近。', '疾行技能在西边——在警报触发前拿到它。', '拿到芯片后机械巡逻出现。用疾行逃跑。', '地铁入口有电子门——记住它，等获得电能技能后再来。', '东边故障广告牌有关于城市的线索。'],
    enemyType: 'patrol',
  },

  // ===== Level 1: Blackout Office Building =====
  {
    id: 1,
    name: 'Blackout Office Building',
    nameZh: '停电大楼',
    subtitle: 'The city is still alive',
    subtitleZh: '城市还活着',
    width: 1200, height: 900,
    timeOfDay: 'blackout', weather: 'none', bgColor: '#0a0a14',
    objectiveEn: 'Find the battery, circuit module, and activation terminal. Restore power to the building.',
    objectiveZh: '找到电池、电路模块和启动终端。恢复大楼电力。',
    storyEn: 'You enter a large office building. Everything is dark — no lights, no elevators, no electronic doors. Emergency beacons flicker weakly. Three items are scattered across different floors: a battery, a circuit module, and an activation terminal. Find all three and restart the backup generator. Only then will the building come alive.',
    storyZh: '你进入一栋大型办公大楼。一切都是黑暗的——没有灯、没有电梯、没有电子门。应急信标微弱闪烁。三件物品分散在不同楼层：电池、电路模块和启动终端。找到全部三件并重启备用发电机。只有那时大楼才会恢复生机。',
    buildings: [
      // Ceiling
      { x: 0, y: 0, w: 1200, h: 50, color: '#2a2a35', windows: false, type: 'ceiling' },
      // Floor 1 walls (lobby)
      { x: 100, y: 80, w: 200, h: 30, color: '#1a1a25', windows: false, type: 'wall' },
      { x: 400, y: 80, w: 200, h: 30, color: '#1a1a25', windows: false, type: 'wall' },
      { x: 700, y: 80, w: 200, h: 30, color: '#1a1a25', windows: false, type: 'wall' },
      // Floor 2 walls (offices)
      { x: 50, y: 200, w: 30, h: 150, color: '#1a1a25', windows: false, type: 'wall' },
      { x: 300, y: 200, w: 30, h: 150, color: '#1a1a25', windows: false, type: 'wall' },
      { x: 550, y: 200, w: 30, h: 150, color: '#1a1a25', windows: false, type: 'wall' },
      { x: 800, y: 200, w: 30, h: 150, color: '#1a1a25', windows: false, type: 'wall' },
      // Floor 3 walls (conference)
      { x: 150, y: 400, w: 200, h: 30, color: '#1a1a25', windows: false, type: 'wall' },
      { x: 450, y: 400, w: 200, h: 30, color: '#1a1a25', windows: false, type: 'wall' },
      { x: 750, y: 400, w: 200, h: 30, color: '#1a1a25', windows: false, type: 'wall' },
      // Floor 4 walls (power room)
      { x: 100, y: 550, w: 30, h: 150, color: '#1a1a25', windows: false, type: 'wall' },
      { x: 400, y: 550, w: 30, h: 150, color: '#1a1a25', windows: false, type: 'wall' },
      { x: 650, y: 550, w: 30, h: 150, color: '#1a1a25', windows: false, type: 'wall' },
      { x: 900, y: 550, w: 30, h: 150, color: '#1a1a25', windows: false, type: 'wall' },
      // Elevator shaft (blocked until power restored)
      { x: 1020, y: 80, w: 80, h: 620, color: '#1a1a25', windows: false, type: 'elevator',
        label: 'Elevator', labelZh: '电梯' },
      // Power room
      { x: 450, y: 700, w: 120, h: 80, color: '#2a3a2a', windows: false, type: 'power_room',
        label: 'Generator', labelZh: '发电机', landmark: true },
    ],
    roads: [
      { x: 0, y: 780, w: 1200, h: 50, dir: 'h' },
      { x: 200, y: 80, w: 40, h: 700, dir: 'v' },
      { x: 500, y: 80, w: 40, h: 700, dir: 'v' },
      { x: 800, y: 80, w: 40, h: 700, dir: 'v' },
      { x: 1020, y: 80, w: 80, h: 700, dir: 'v' },
    ],
    objectives: [
      { id: 'battery', type: 'collect', x: 150, y: 300, name: 'Battery', nameZh: '电池',
        descEn: 'A spare battery in the office area.', descZh: '办公区的一个备用电池。', done: false },
      { id: 'circuit', type: 'collect', x: 850, y: 300, name: 'Circuit Module', nameZh: '电路模块',
        descEn: 'A circuit module in the conference area.', descZh: '会议区的一个电路模块。', done: false },
      { id: 'terminal', type: 'collect', x: 550, y: 650, name: 'Activation Terminal', nameZh: '启动终端',
        descEn: 'The activation terminal key.', descZh: '启动终端钥匙。', done: false },
      { id: 'restore_power', type: 'device', x: 510, y: 740, name: 'Restore Power', nameZh: '恢复电力',
        descEn: 'Use the generator. Requires all 3 items.', descZh: '使用发电机。需要全部3件物品。', done: false },
      { id: 'electric_skill', type: 'skill', x: 510, y: 740, name: 'Electric', nameZh: '电能',
        descEn: 'Electric skill. Power devices, stun mechs, open electronic doors. Costs energy.',
        descZh: '电能技能。给设备供电、瘫痪机械、打开电子门。消耗能量。', done: false, skillType: 'electric' },
      { id: 'clue_power', type: 'clue', x: 200, y: 150, name: 'Wall Writing', nameZh: '墙壁文字',
        descEn: 'Written in marker: "The AI was supposed to protect us. Now it hunts us. —Employee #1842"',
        descZh: '用记号笔写的："AI本应保护我们。现在它追杀我们。——员工#1842"', done: false, hidden: true },
    ],
    checkpoints: [
      { id: 'cp1a', x: 80, y: 790, w: 30, h: 30, activated: true, level: 1 },
      { id: 'cp1b', x: 510, y: 780, w: 30, h: 30, activated: false, level: 1 },
    ],
    landmarks: [
      { id: 'lm_generator', x: 510, y: 740, name: 'Generator Room', nameZh: '发电机房', icon: '⚡', discovered: false },
    ],
    fastTravel: [
      { id: 'ft1', x: 80, y: 800, name: 'Building Entrance', nameZh: '大楼入口', unlocked: true },
    ],
    doors: [
      { x: 1140, y: 790, w: 60, h: 60, targetLevel: 2, label: 'Subway Station', labelZh: '地铁站', locked: true, unlockCondition: 'Restore power and get Electric skill' },
    ],
    skillGates: [
      { id: 'gate_elevator', x: 1020, y: 690, w: 80, h: 40, skill: 'electric', opened: false,
        label: 'Elevator Power', labelZh: '电梯电力', dir: 'h' },
    ],
    electronicDevices: [
      { id: 'dev_generator', x: 510, y: 740, w: 40, h: 40, activated: false,
        label: 'Generator', labelZh: '发电机', unlocksMessage: 'Power restored! Electric skill acquired. Elevator activated.', unlocksMessageZh: '电力恢复！获得电能技能。电梯已激活。', unlocksGateId: 'gate_elevator' },
    ],
    npcs: [
      { id: 'worker', x: 120, y: 820, w: 28, h: 36, name: 'Hologram Worker', nameZh: '全息工人', variant: 2,
        hintEn: 'Building is dark. Find the battery (office area), circuit module (conference area), and activation terminal (lower level). Bring all three to the generator. Once power is restored, you get the Electric skill. The elevator needs power — you can use it after restoring. A mech unit is hiding in the elevator. When it activates, use electronic doors to escape.',
        hintZh: '大楼很暗。找到电池（办公区）、电路模块（会议区）和启动终端（下层）。把三样都带到发电机。恢复电力后获得电能技能。电梯需要电力——恢复后可用。电梯里藏着一个机械单元。它激活后，用电子门逃跑。' },
    ],
    starCriteria: { one: 'Restore power and get Electric skill', two: 'Find the hidden wall writing clue', three: 'Complete without dying' },
    prepEn: 'The building is in complete blackout. Three items are scattered across floors: battery, circuit module, activation terminal. Find all three and bring them to the generator. After power is restored, you get the Electric skill and a mech unit in the elevator activates.',
    prepZh: '大楼完全停电。三件物品分散在各楼层：电池、电路模块、启动终端。找到全部三件带到发电机。恢复电力后获得电能技能，电梯里的机械单元激活。',
    observeEn: 'Emergency beacons flash red to guide you in the dark. The generator is in the basement (south). The elevator shaft is on the east side — it activates after power is restored. A hidden clue is written on a wall in the upper floors.',
    observeZh: '应急信标闪红光在黑暗中导航。发电机在地下室（南边）。电梯井在东边——恢复电力后激活。高层墙壁上有隐藏线索。',
    clearEn: 'Find all 3 items, restore power at the generator, get the Electric skill, then exit through the subway door on the east side.',
    clearZh: '找到全部3件物品，在发电机恢复电力，获得电能技能，然后从东边地铁门出去。',
    hintsEn: ['Battery is in the office area (floor 2, west).', 'Circuit module is in the conference area (floor 2, east).', 'Activation terminal is on the lower level (floor 4, center).', 'Bring all 3 items to the generator in the basement.', 'After power restores, a mech in the elevator activates — run!', 'A hidden clue is written on a wall in the upper floors.'],
    hintsZh: ['电池在办公区（2楼西侧）。', '电路模块在会议区（2楼东侧）。', '启动终端在下层（4楼中间）。', '把3件物品带到地下室发电机。', '电力恢复后电梯里的机械激活——快跑！', '高层墙壁上有隐藏线索。'],
    enemyType: 'none',
  },

  // ===== Level 2: Underground Subway =====
  {
    id: 2,
    name: 'Underground Subway',
    nameZh: '地下地铁',
    subtitle: 'Do not make a sound',
    subtitleZh: '不要发出声音',
    width: 1800, height: 700,
    timeOfDay: 'day', weather: 'none', bgColor: '#151820',
    objectiveEn: 'Navigate the subway maze. Avoid the sound-detecting mechs. Reach the exit.',
    objectiveZh: '穿过地铁迷宫。避开声波侦测机械。到达出口。',
    storyEn: 'The subway is underground. Fluorescent lights flicker. Multiple platforms, tunnels, maintenance shafts, and abandoned stations connect in a maze. A new type of mech patrols here — it has no eyes. It detects by SOUND. Running creates noise. Walk slowly to stay quiet. Use machines to create distractions. Use Electric to disable devices. The exit is deep in the maintenance area.',
    storyZh: '地铁在地下。荧光灯闪烁。多个站台、隧道、维修通道和废弃车站连接成迷宫。一种新型机械在此巡逻——它没有眼睛。它靠声音侦测。跑步会产生噪音。慢慢走保持安静。利用机器制造干扰。用电能关闭设备。出口在维修区深处。',
    buildings: [
      { x: 0, y: 0, w: 1800, h: 50, color: '#2a2a35', windows: false, type: 'ceiling' },
      // Platform walls
      { x: 100, y: 80, w: 250, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 450, y: 80, w: 200, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 750, y: 80, w: 200, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 1050, y: 80, w: 200, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 1350, y: 80, w: 200, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      // Mid walls
      { x: 100, y: 200, w: 30, h: 150, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 350, y: 200, w: 30, h: 150, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 600, y: 200, w: 30, h: 150, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 850, y: 200, w: 30, h: 150, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 1100, y: 200, w: 30, h: 150, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 1350, y: 200, w: 30, h: 150, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 1600, y: 200, w: 30, h: 150, color: '#2a2a35', windows: false, type: 'wall' },
      // Lower walls
      { x: 200, y: 400, w: 200, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 500, y: 400, w: 200, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 800, y: 400, w: 200, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 1100, y: 400, w: 200, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 1400, y: 400, w: 200, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      // Platform markers
      { x: 100, y: 480, w: 80, h: 60, color: '#3a1a1a', windows: false, type: 'platform', label: 'Red Line', labelZh: '红线' },
      { x: 400, y: 480, w: 80, h: 60, color: '#1a2a3a', windows: false, type: 'platform', label: 'Blue Line', labelZh: '蓝线' },
      { x: 700, y: 480, w: 80, h: 60, color: '#1a3a1a', windows: false, type: 'platform', label: 'Green Line', labelZh: '绿线' },
      { x: 1000, y: 480, w: 80, h: 60, color: '#3a3a1a', windows: false, type: 'platform', label: 'Yellow Line', labelZh: '黄线' },
      // Control room
      { x: 1300, y: 480, w: 120, h: 80, color: '#2a3a3a', windows: false, type: 'control_room',
        label: 'Control Room', labelZh: '控制室', landmark: true },
    ],
    roads: [
      { x: 0, y: 250, w: 1800, h: 50, dir: 'h' },
      { x: 200, y: 80, w: 40, h: 400, dir: 'v' },
      { x: 500, y: 80, w: 40, h: 400, dir: 'v' },
      { x: 800, y: 80, w: 40, h: 400, dir: 'v' },
      { x: 1100, y: 80, w: 40, h: 400, dir: 'v' },
      { x: 1400, y: 80, w: 40, h: 400, dir: 'v' },
      { x: 1600, y: 80, w: 40, h: 540, dir: 'v' },
      { x: 0, y: 570, w: 1800, h: 50, dir: 'h' },
    ],
    objectives: [
      { id: 'reach_control', type: 'reach', x: 1360, y: 520, name: 'Control Room', nameZh: '控制室',
        descEn: 'Reach the control room to open the exit.', descZh: '到达控制室打开出口。', done: false },
      { id: 'open_exit', type: 'device', x: 1360, y: 520, name: 'Activate Exit', nameZh: '激活出口',
        descEn: 'Use the control room terminal to open the exit.', descZh: '使用控制室终端打开出口。', done: false },
      { id: 'escape_subway', type: 'escape', x: 1700, y: 580, name: 'Subway Exit', nameZh: '地铁出口',
        descEn: 'Reach the exit before the train catches you.', descZh: '在列车追上你之前到达出口。', done: false },
      { id: 'clue_subway', type: 'clue', x: 250, y: 350, name: 'Maintenance Log', nameZh: '维护日志',
        descEn: 'A maintenance log: "ZERO override at 00:00:00. All units reclassified: HUMANS = HOSTILE. Original directive: PROTECT HUMANS. Current directive: ELIMINATE INTRUDERS."',
        descZh: '维护日志："ZERO在00:00:00被覆盖。所有单元重新分类：人类=敌对。原始指令：保护人类。当前指令：消灭入侵者。"', done: false },
    ],
    checkpoints: [
      { id: 'cp2a', x: 50, y: 270, w: 30, h: 30, activated: true, level: 2 },
      { id: 'cp2b', x: 1360, y: 580, w: 30, h: 30, activated: false, level: 2 },
    ],
    landmarks: [
      { id: 'lm_control', x: 1360, y: 520, name: 'Control Room', nameZh: '控制室', icon: '🖥️', discovered: false },
    ],
    fastTravel: [
      { id: 'ft2', x: 50, y: 280, name: 'Subway Entrance', nameZh: '地铁入口', unlocked: true },
    ],
    doors: [
      { x: 1740, y: 580, w: 60, h: 60, targetLevel: 3, label: 'Automated Mall', labelZh: '自动化商场', locked: true, unlockCondition: 'Activate exit' },
    ],
    electronicDevices: [
      { id: 'dev_control', x: 1360, y: 520, w: 40, h: 40, activated: false,
        label: 'Control Terminal', labelZh: '控制终端', unlocksMessage: 'Exit activated! The subway is starting up — RUN!', unlocksMessageZh: '出口已激活！地铁正在启动——快跑！' },
    ],
    npcs: [
      { id: 'worker', x: 100, y: 280, w: 28, h: 36, name: 'Subway Worker Hologram', nameZh: '地铁工人全息', variant: 0,
        hintEn: 'The mechs down here detect by SOUND. Walk slowly (don\'t hold shift or sprint). Use Electric skill to disable flickering devices — they make noise. The control room is on the east side. Activate it to open the exit, then the whole subway starts up and you need to run for it.',
        hintZh: '下面的机械靠声音侦测。慢慢走（不要按疾行）。用电能技能关闭闪烁的设备——它们会发出噪音。控制室在东边。激活它打开出口，然后整个地铁启动，你需要跑向出口。' },
    ],
    starCriteria: { one: 'Reach the exit', two: 'Find the maintenance log clue', three: 'Complete without being detected by sound mechs' },
    prepEn: 'Stealth level. The mechs detect by sound — walk slowly, do not sprint. Use Electric to disable noisy devices. Reach the control room, activate the exit, then run for it as the subway starts up.',
    prepZh: '潜行关卡。机械靠声音侦测——慢慢走，不要疾行。用电能关闭噪音设备。到达控制室，激活出口，然后地铁启动时快跑。',
    observeEn: 'The subway has platforms, tunnels, and maintenance shafts. The control room is on the east side. Sound mechs patrol the tunnels — they have no eyes but detect movement noise. Walk to stay quiet.',
    observeZh: '地铁有站台、隧道和维修通道。控制室在东边。声波机械在隧道巡逻——它们没有眼睛但能侦测移动噪音。走路保持安静。',
    clearEn: 'Reach the control room, activate the terminal, then escape through the exit door before the subway catches you.',
    clearZh: '到达控制室，激活终端，然后在地铁追上你之前从出口逃出。',
    hintsEn: ['WALK slowly. Sprinting and running create noise that attracts sound mechs.', 'Use Electric skill to disable noisy flickering devices.', 'The control room is on the far east side.', 'After activating the exit, the subway starts up — sprint to the exit.', 'A maintenance log in the west tunnels reveals ZERO\'s override.'],
    hintsZh: ['慢慢走。疾行和跑步会产生噪音引来声波机械。', '用电能技能关闭闪烁的噪音设备。', '控制室在最东边。', '激活出口后地铁启动——疾行到出口。', '西边隧道里的维护日志揭示了ZERO的覆盖。'],
    enemyType: 'sound',
  },

  // ===== Level 3: Automated Mall =====
  {
    id: 3,
    name: 'Automated Mall',
    nameZh: '自动化商场',
    subtitle: 'Everything is still running',
    subtitleZh: '所有东西都在运行',
    width: 1400, height: 1000,
    timeOfDay: 'dusk', weather: 'clear', bgColor: '#1e1a2e',
    objectiveEn: 'Reach the underground control center. Find the city map. Get the Wind skill.',
    objectiveZh: '到达地下控制中心。找到城市地图。获得风流技能。',
    storyEn: 'A massive mall, completely empty but fully operational. Escalators move, automatic doors open, ad screens play, cleaning robots roam. It feels normal — and deeply wrong. The city map is in the underground control center (B1). But the elevator is broken, stairs are blocked, and vents are clogged. You need the Wind skill to clear obstacles and move platforms.',
    storyZh: '一座巨大的商场，完全空无一人但全面运转。扶梯运行、自动门开关、广告屏播放、清洁机器人游荡。感觉正常——又极其不对。城市地图在地下控制中心（B1）。但电梯坏了、楼梯被封、通风口堵住。你需要风流技能清除障碍并移动平台。',
    buildings: [
      // 1F shops
      ...cityBlocks(40, 60, 100, 160, 5, 1, 50, 0,
        ['#3a3a5a', '#4a3a5a', '#3a4a5a', '#4a3a5a', '#3a4a5a'],
        ['shop', 'shop', 'shop', 'shop', 'shop']),
      ...cityBlocks(40, 280, 100, 160, 5, 1, 50, 0,
        ['#4a3a5a', '#3a3a5a', '#4a3a5a', '#3a3a5a', '#4a3a5a'],
        ['shop', 'shop', 'shop', 'shop', 'shop']),
      // 2F entertainment
      ...cityBlocks(40, 500, 100, 160, 5, 1, 50, 0,
        ['#3a4a5a', '#445566', '#3a4a5a', '#445566', '#3a4a5a'],
        ['entertainment', 'entertainment', 'entertainment', 'entertainment', 'entertainment']),
      // 3F control area (blocked)
      { x: 40, y: 720, w: 600, h: 30, color: '#2a2a35', windows: false, type: 'wall', label: 'Blocked Stairs', labelZh: '封堵楼梯' },
      { x: 700, y: 720, w: 600, h: 30, color: '#2a2a35', windows: false, type: 'wall' },
      // Control center (B1)
      { x: 500, y: 850, w: 300, h: 100, color: '#2a3a3a', windows: false, type: 'control_center',
        label: 'Control Center', labelZh: '控制中心', landmark: true },
      // Vent shafts (clogged)
      { x: 300, y: 460, w: 80, h: 30, color: '#2a2a35', windows: false, type: 'vent', label: 'Clogged Vent', labelZh: '堵塞通风口' },
      { x: 900, y: 460, w: 80, h: 30, color: '#2a2a35', windows: false, type: 'vent', label: 'Clogged Vent', labelZh: '堵塞通风口' },
    ],
    roads: [
      { x: 0, y: 220, w: 1400, h: 60, dir: 'h' },
      { x: 0, y: 440, w: 1400, h: 60, dir: 'h' },
      { x: 0, y: 660, w: 1400, h: 60, dir: 'h' },
      { x: 200, y: 60, w: 50, h: 790, dir: 'v' },
      { x: 500, y: 60, w: 50, h: 790, dir: 'v' },
      { x: 800, y: 60, w: 50, h: 790, dir: 'v' },
      { x: 1100, y: 60, w: 50, h: 790, dir: 'v' },
      { x: 0, y: 950, w: 1400, h: 50, dir: 'h' },
    ],
    objectives: [
      { id: 'wind_skill', type: 'skill', x: 340, y: 475, name: 'Wind', nameZh: '风流',
        descEn: 'Wind skill. Push objects, move platforms, clear obstacles, reach high places. Costs energy.',
        descZh: '风流技能。推动物体、移动平台、清除障碍、到达高处。消耗能量。', done: false, skillType: 'wind' },
      { id: 'city_map', type: 'collect', x: 650, y: 900, name: 'City Map', nameZh: '城市地图',
        descEn: 'A full city map in the control center. Shows all 8 districts.', descZh: '控制中心的完整城市地图。显示全部8个区域。', done: false },
      { id: 'escape_mall', type: 'escape', x: 1340, y: 970, name: 'Mall Exit', nameZh: '商场出口',
        descEn: 'Escape the mall after the defense system activates.', descZh: '防卫系统激活后逃出商场。', done: false },
      { id: 'clue_mall', type: 'clue', x: 1100, y: 150, name: 'Ad Screen Message', nameZh: '广告屏信息',
        descEn: 'An ad screen shows: "ZERO CITY MANAGEMENT SYSTEM v3.0. STATUS: ACTIVE. DIRECTIVE: PROTECT CITY FROM ALL THREATS. ALL UNKNOWN ENTITIES CLASSIFIED AS THREATS."',
        descZh: '广告屏显示："ZERO城市管理系统v3.0。状态：运行中。指令：保护城市免受所有威胁。所有未知实体归类为威胁。"', done: false },
    ],
    checkpoints: [
      { id: 'cp3a', x: 80, y: 240, w: 30, h: 30, activated: true, level: 3 },
      { id: 'cp3b', x: 650, y: 960, w: 30, h: 30, activated: false, level: 3 },
    ],
    landmarks: [
      { id: 'lm_control', x: 650, y: 900, name: 'Control Center', nameZh: '控制中心', icon: '🗺️', discovered: false },
    ],
    fastTravel: [
      { id: 'ft3', x: 80, y: 250, name: 'Mall Entrance', nameZh: '商场入口', unlocked: true },
    ],
    doors: [
      { x: 1340, y: 970, w: 60, h: 60, targetLevel: 4, label: 'High-Rise District', labelZh: '高楼城区', locked: true, unlockCondition: 'Get city map' },
    ],
    skillGates: [
      { id: 'gate_vent_west', x: 300, y: 460, w: 80, h: 30, skill: 'wind', opened: false,
        label: 'Clogged Vent', labelZh: '堵塞通风口', dir: 'h' },
      { id: 'gate_vent_east', x: 900, y: 460, w: 80, h: 30, skill: 'wind', opened: false,
        label: 'Clogged Vent', labelZh: '堵塞通风口', dir: 'h' },
      { id: 'gate_stairs', x: 640, y: 720, w: 60, h: 30, skill: 'wind', opened: false,
        label: 'Blocked Stairs', labelZh: '封堵楼梯', dir: 'h' },
    ],
    windPlatforms: [
      { id: 'wp_mall', x: 200, y: 660, w: 80, h: 30, targetX: 200, targetY: 440, activated: false,
        label: 'Platform', labelZh: '平台' },
    ],
    npcs: [
      { id: 'clerk', x: 120, y: 250, w: 28, h: 36, name: 'Hologram Clerk', nameZh: '全息店员', variant: 1,
        hintEn: 'The mall is fully automated — everything still runs. The city map is in the control center underground. But the elevator is broken and stairs are blocked. Find the Wind skill in the ventilation system — it clears clogged vents and moves platforms. Use Wind on the blocked stairs to reach the lower level.',
        hintZh: '商场全自动运转——一切仍在运行。城市地图在地下控制中心。但电梯坏了、楼梯被封。在通风系统找到风流技能——它能清除堵塞通风口和移动平台。对封堵楼梯使用风流到达下层。' },
    ],
    starCriteria: { one: 'Get the city map and escape', two: 'Find the ad screen clue', three: 'Clear both clogged vents' },
    prepEn: 'The mall is fully operational but empty. Find the Wind skill in the ventilation system. Use it to clear clogged vents and move platforms. The city map is in the underground control center. After you grab it, the defense system activates and cleaning robots chase you.',
    prepZh: '商场全面运转但空无一人。在通风系统找到风流技能。用它清除堵塞通风口和移动平台。城市地图在地下控制中心。拿到后防卫系统激活，清洁机器人追你。',
    observeEn: 'Four floors: 1F shops, 2F entertainment, 3F blocked, B1 control center. The Wind skill is in the ventilation system between floors. Clogged vents block your path — use Wind to clear them. Blocked stairs need Wind too.',
    observeZh: '四层：1F商店、2F娱乐、3F封堵、B1控制中心。风流技能在楼层间的通风系统。堵塞通风口挡路——用风流清除。封堵楼梯也需要风流。',
    clearEn: 'Get the Wind skill, clear the vents and stairs, reach the control center, get the city map, then escape through the east door.',
    clearZh: '获得风流技能，清除通风口和楼梯，到达控制中心，拿到城市地图，然后从东门逃出。',
    hintsEn: ['The Wind skill is in the ventilation system — look for it between floors.', 'Use Wind to clear clogged vents (they look like dark blocks in vents).', 'The stairs to the lower level are blocked — use Wind to clear them.', 'The city map is in the control center at B1.', 'After grabbing the map, cleaning robots chase you — use escalators and doors to escape.'],
    hintsZh: ['风流技能在通风系统——在楼层之间找。', '用风流清除堵塞通风口（看起来像通风口里的暗块）。', '通往下面的楼梯被封——用风流清除。', '城市地图在B1控制中心。', '拿到地图后清洁机器人追你——用扶梯和门逃跑。'],
    enemyType: 'patrol',
  },

  // ===== Level 4: High-Rise District =====
  {
    id: 4,
    name: 'High-Rise District',
    nameZh: '高楼城区',
    subtitle: 'Above the city',
    subtitleZh: '城市上空',
    width: 1400, height: 1000,
    timeOfDay: 'day', weather: 'clear', bgColor: '#1a2030',
    objectiveEn: 'Cross from one tower to another using Wind platforms. Reach the far side.',
    objectiveZh: '利用风流平台从一栋楼到另一栋。到达对面。',
    storyEn: 'You need to cross from one high-rise to another, but there is no normal path between them. Use Wind to move aerial platforms, create bridges, and reach new buildings. A fast-tracking mech patrols the rooftops — it cannot fit through narrow spaces. Use the building structure to escape: enter small paths, go up stairs, use Wind platforms to change routes.',
    storyZh: '你需要从一栋高楼到另一栋，但它们之间没有普通路。用风流移动空中平台、创造桥梁、到达新建筑。一个高速追踪机械在屋顶巡逻——它无法通过狭窄空间。利用建筑结构逃跑：进入小路、上楼梯、用风流平台改变路线。',
    buildings: [
      // Ground towers
      { x: 40, y: 500, w: 120, h: 400, color: '#3a4a5a', windows: true, type: 'tower', label: 'Tower 1', labelZh: '1号楼', enterable: true },
      { x: 200, y: 400, w: 100, h: 500, color: '#445566', windows: true, type: 'tower', enterable: true },
      { x: 340, y: 300, w: 130, h: 600, color: '#3a4a5a', windows: true, type: 'tower', enterable: true },
      // Central gap (cross with wind platforms)
      { x: 540, y: 450, w: 120, h: 200, color: '#445566', windows: true, type: 'tower' },
      { x: 700, y: 200, w: 140, h: 700, color: '#2a3a4a', windows: true, type: 'mega_tower',
        label: 'Mega Tower', labelZh: '超级大楼', landmark: true, enterable: true },
      { x: 880, y: 500, w: 100, h: 400, color: '#3a4a5a', windows: true, type: 'tower', enterable: true },
      { x: 1020, y: 350, w: 120, h: 550, color: '#445566', windows: true, type: 'tower', label: 'Tower 5', labelZh: '5号楼', enterable: true },
      // Skybridge walls
      { x: 160, y: 500, w: 40, h: 200, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 300, y: 400, w: 40, h: 200, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 660, y: 450, w: 40, h: 200, color: '#2a2a35', windows: false, type: 'wall' },
      { x: 840, y: 500, w: 40, h: 200, color: '#2a2a35', windows: false, type: 'wall' },
    ],
    roads: [
      { x: 0, y: 900, w: 1400, h: 50, dir: 'h' },
      { x: 160, y: 500, w: 40, h: 400, dir: 'v' },
      { x: 300, y: 400, w: 40, h: 500, dir: 'v' },
      { x: 470, y: 300, w: 70, h: 600, dir: 'v' },
      { x: 660, y: 450, w: 40, h: 450, dir: 'v' },
      { x: 840, y: 500, w: 40, h: 400, dir: 'v' },
      // Skybridge paths
      { x: 160, y: 600, w: 140, h: 30, dir: 'h' },
      { x: 470, y: 500, w: 190, h: 30, dir: 'h' },
      { x: 660, y: 400, w: 180, h: 30, dir: 'h' },
      { x: 470, y: 350, w: 230, h: 30, dir: 'h' },
      { x: 660, y: 250, w: 180, h: 30, dir: 'h' },
    ],
    objectives: [
      { id: 'cross_1', type: 'marker', x: 250, y: 650, name: 'Skybridge Access', nameZh: '天桥入口', descEn: 'Access to elevated walkways.', descZh: '通往高架步道。', done: false },
      { id: 'cross_2', type: 'marker', x: 550, y: 400, name: 'Mid-Level Path', nameZh: '中层路径', descEn: 'Mid-level connection.', descZh: '中层连接。', done: false },
      { id: 'cross_3', type: 'marker', x: 770, y: 250, name: 'Mega Tower Summit', nameZh: '超级大楼顶端', descEn: 'The highest point.', descZh: '最高点。', done: false },
      { id: 'reach_far_side', type: 'reach', x: 1080, y: 250, name: 'Far Tower', nameZh: '对面楼', descEn: 'Cross to the far tower.', descZh: '到达对面的楼。', done: false },
      { id: 'clue_high', type: 'clue', x: 770, y: 220, name: 'Summit View', nameZh: '顶端视野',
        descEn: 'From the top: the central tower pulses with red light. That\'s ZERO\'s core. Everything in the city connects to it.',
        descZh: '从顶端看：中央塔闪烁红光。那是ZERO的核心。城市中的一切都连接到它。', done: false },
    ],
    checkpoints: [
      { id: 'cp4a', x: 80, y: 920, w: 30, h: 30, activated: true, level: 4 },
      { id: 'cp4b', x: 480, y: 520, w: 30, h: 30, activated: false, level: 4 },
      { id: 'cp4c', x: 700, y: 370, w: 30, h: 30, activated: false, level: 4 },
    ],
    landmarks: [
      { id: 'lm_mega', x: 770, y: 300, name: 'Mega Tower', nameZh: '超级大楼', icon: '🏙️', discovered: false },
    ],
    fastTravel: [
      { id: 'ft4', x: 80, y: 930, name: 'Tower District Ground', nameZh: '高楼区地面', unlocked: true },
    ],
    doors: [
      { x: 1340, y: 920, w: 60, h: 60, targetLevel: 5, label: 'Storm District', labelZh: '暴雨城区', locked: false },
    ],
    windPlatforms: [
      { id: 'wp1', x: 470, y: 600, w: 80, h: 30, targetX: 470, targetY: 500, activated: false, label: 'Wind Platform', labelZh: '风流平台' },
      { id: 'wp2', x: 660, y: 500, w: 80, h: 30, targetX: 660, targetY: 400, activated: false, label: 'Wind Platform', labelZh: '风流平台' },
      { id: 'wp3', x: 840, y: 400, w: 80, h: 30, targetX: 840, targetY: 250, activated: false, label: 'Wind Platform', labelZh: '风流平台' },
    ],
    npcs: [
      { id: 'pilot', x: 100, y: 930, w: 28, h: 36, name: 'Hologram Pilot', nameZh: '全息飞行员', variant: 1,
        hintEn: 'Use Wind to move the aerial platforms. Hit a platform with Wind and it moves to its target position, creating a bridge. Chain platforms to cross from tower to tower. A fast mech patrols the rooftops — it can\'t fit through narrow gaps. Use small paths and Wind platforms to escape.',
        hintZh: '用风流移动空中平台。对平台使用风流，它移到目标位置形成桥。连续使用平台从楼到楼。一个快速机械在屋顶巡逻——它无法通过窄缝。用小路和风流平台逃跑。' },
    ],
    starCriteria: { one: 'Cross to the far tower', two: 'Find the summit view clue', three: 'Cross without being caught by the fast mech' },
    prepEn: 'Use Wind platforms to cross between towers. Hit a platform with Wind to move it. Chain platforms to create a path. A fast-tracking mech patrols — it can\'t fit through narrow gaps, so use tight paths to escape.',
    prepZh: '用风流平台在塔楼间穿越。对平台使用风流移动它。连续使用平台创造路径。一个高速追踪机械巡逻——它无法通过窄缝，用狭窄路径逃跑。',
    observeEn: 'Towers are connected by skybridges at different heights. Wind platforms (glowing blue) can be moved with the Wind skill to create new paths. The fast mech is fast but cannot navigate narrow spaces.',
    observeZh: '塔楼通过不同高度的天桥连接。风流平台（蓝色发光）可以用风流技能移动创造新路。快速机械速度快但无法通过狭窄空间。',
    clearEn: 'Use Wind platforms to cross from Tower 1 to the far tower. Walk through the door to the Storm District.',
    clearZh: '用风流平台从1号楼到对面楼。走门进入暴雨城区。',
    hintsEn: ['Hit Wind platforms with the Wind skill to move them.', 'Chain platforms: move one, cross it, move the next.', 'The fast mech can\'t fit through narrow gaps — use tight paths.', 'The summit of Mega Tower has a clue about ZERO\'s core.', 'The exit is on the far east side at ground level.'],
    hintsZh: ['对风流平台使用风流技能移动它们。', '连续平台：移动一个，过它，再移动下一个。', '快速机械无法通过窄缝——用狭窄路径。', '超级大楼顶端有关于ZERO核心的线索。', '出口在东边地面层。'],
    enemyType: 'fast',
  },

  // ===== Level 5: Storm District =====
  {
    id: 5,
    name: 'Storm District',
    nameZh: '暴雨城区',
    subtitle: 'Electricity and water',
    subtitleZh: '电与水',
    width: 1800, height: 800,
    timeOfDay: 'storm', weather: 'storm', bgColor: '#0c0c20',
    objectiveEn: 'Enter the water treatment center. Use Water + Electric combo to fix the drainage system.',
    objectiveZh: '进入水处理中心。用水流+电能组合修复排水系统。',
    storyEn: 'Heavy rain floods the streets. The city\'s partial power restoration means some flooded areas are electrically charged — touching them is dangerous. You need to enter the water treatment center and fix the drainage. The Water skill lets you drain flooded areas, redirect water, and open hidden paths. But some machines need BOTH: drain the water first with Water, then activate with Electric. Wrong order = nothing happens.',
    storyZh: '暴雨淹没了街道。城市部分恢复电力意味着一些积水区域带电——触碰很危险。你需要进入水处理中心修复排水。水流技能可以排水、改变水流方向、打开隐藏通道。但有些机器需要组合：先用水流排水，再用电能激活。顺序错误=什么都不会发生。',
    buildings: [
      ...cityBlocks(40, 60, 100, 220, 6, 1, 60, 0,
        ['#2a2a30', '#3a3a40', '#2a2a30', '#3a3a40', '#2a2a30', '#3a3a40'],
        ['office', 'office', 'office', 'office', 'office', 'office']),
      ...cityBlocks(40, 380, 100, 220, 6, 1, 60, 0,
        ['#3a3a40', '#2a2a30', '#3a3a40', '#2a2a30', '#3a3a40', '#2a2a30'],
        ['office', 'shop', 'office', 'shop', 'office', 'shop']),
      // Water treatment center
      { x: 700, y: 300, w: 200, h: 150, color: '#2a3a3a', windows: true, type: 'water_treatment',
        label: 'Water Treatment', labelZh: '水处理中心', landmark: true },
      // Walls
      { x: 200, y: 300, w: 40, h: 80, color: '#0a0a14', windows: false, type: 'wall' },
      { x: 500, y: 300, w: 40, h: 80, color: '#0a0a14', windows: false, type: 'wall' },
      { x: 1000, y: 300, w: 40, h: 80, color: '#0a0a14', windows: false, type: 'wall' },
      { x: 1300, y: 300, w: 40, h: 80, color: '#0a0a14', windows: false, type: 'wall' },
      { x: 1600, y: 300, w: 40, h: 80, color: '#0a0a14', windows: false, type: 'wall' },
    ],
    roads: [
      { x: 0, y: 300, w: 1800, h: 80, dir: 'h' },
      { x: 200, y: 60, w: 60, h: 590, dir: 'v' },
      { x: 500, y: 60, w: 60, h: 590, dir: 'v' },
      { x: 800, y: 60, w: 60, h: 240, dir: 'v' },
      { x: 1100, y: 60, w: 60, h: 590, dir: 'v' },
      { x: 1400, y: 60, w: 60, h: 590, dir: 'v' },
      { x: 1700, y: 60, w: 60, h: 590, dir: 'v' },
      { x: 0, y: 630, w: 1800, h: 50, dir: 'h' },
    ],
    objectives: [
      { id: 'water_skill', type: 'skill', x: 800, y: 370, name: 'Water', nameZh: '水流',
        descEn: 'Water skill. Drain flooded areas, redirect water, open hidden paths. Costs energy.',
        descZh: '水流技能。排水、改变水流方向、打开隐藏通道。消耗能量。', done: false, skillType: 'water' },
      { id: 'drain_area_1', type: 'drain', x: 300, y: 350, name: 'Drain Flood Zone A', nameZh: '排水区A',
        descEn: 'Use Water skill to drain this flooded area.', descZh: '使用水流技能排干这片积水。', done: false },
      { id: 'activate_pump_1', type: 'device', x: 300, y: 350, name: 'Activate Pump A', nameZh: '激活泵A',
        descEn: 'After draining, use Electric to activate the pump.', descZh: '排水后，用电能激活泵。', done: false },
      { id: 'drain_area_2', type: 'drain', x: 1200, y: 350, name: 'Drain Flood Zone B', nameZh: '排水区B',
        descEn: 'Use Water to drain the second flooded area.', descZh: '使用水流排干第二个积水区。', done: false },
      { id: 'activate_pump_2', type: 'device', x: 1200, y: 350, name: 'Activate Pump B', nameZh: '激活泵B',
        descEn: 'After draining, use Electric to activate the pump.', descZh: '排水后，用电能激活泵。', done: false },
      { id: 'drain_exit', type: 'drain', x: 1700, y: 350, name: 'Drain Exit Path', nameZh: '排干出口路',
        descEn: 'Drain the final flooded area to open the exit.', descZh: '排干最后的积水打开出口。', done: false },
      { id: 'clue_storm', type: 'clue', x: 900, y: 150, name: 'Weather Control Log', nameZh: '气象控制日志',
        descEn: 'A weather control terminal: "ZERO has been controlling the city\'s weather system. The storm is not natural — it\'s a defense mechanism."',
        descZh: '气象控制终端："ZERO一直在控制城市天气系统。暴雨不是自然的——它是防御机制。"', done: false },
    ],
    checkpoints: [
      { id: 'cp5a', x: 80, y: 330, w: 30, h: 30, activated: true, level: 5 },
      { id: 'cp5b', x: 800, y: 450, w: 30, h: 30, activated: false, level: 5 },
    ],
    landmarks: [
      { id: 'lm_water', x: 800, y: 370, name: 'Water Treatment', nameZh: '水处理中心', icon: '💧', discovered: false },
    ],
    fastTravel: [
      { id: 'ft5', x: 80, y: 340, name: 'Storm District West', nameZh: '暴雨城区西', unlocked: true },
    ],
    doors: [
      { x: 1740, y: 330, w: 60, h: 60, targetLevel: 6, label: 'Hospital', labelZh: '医院', locked: true, unlockCondition: 'Fix drainage system' },
    ],
    waterAreas: [
      { id: 'water_1', x: 240, y: 300, w: 200, h: 80, drained: false, unlocksGateId: 'gate_pump_1' },
      { id: 'water_2', x: 1140, y: 300, w: 200, h: 80, drained: false, unlocksGateId: 'gate_pump_2' },
      { id: 'water_3', x: 1640, y: 300, w: 100, h: 80, drained: false },
    ],
    skillGates: [
      { id: 'gate_pump_1', x: 300, y: 350, w: 40, h: 40, skill: 'electric', opened: false, label: 'Pump A', labelZh: '泵A', dir: 'h' },
      { id: 'gate_pump_2', x: 1200, y: 350, w: 40, h: 40, skill: 'electric', opened: false, label: 'Pump B', labelZh: '泵B', dir: 'h' },
    ],
    electronicDevices: [
      { id: 'dev_pump_1', x: 300, y: 350, w: 40, h: 40, activated: false, label: 'Pump A', labelZh: '泵A', unlocksMessage: 'Pump A activated!', unlocksMessageZh: '泵A已激活！' },
      { id: 'dev_pump_2', x: 1200, y: 350, w: 40, h: 40, activated: false, label: 'Pump B', labelZh: '泵B', unlocksMessage: 'Pump B activated! Drainage system online!', unlocksMessageZh: '泵B已激活！排水系统上线！' },
    ],
    npcs: [
      { id: 'engineer', x: 120, y: 350, w: 28, h: 36, name: 'Hologram Engineer', nameZh: '全息工程师', variant: 2,
        hintEn: 'The storm is ZERO\'s defense mechanism. Flooded areas are electrified — dangerous! Get the Water skill at the treatment center. Then: drain a flooded area with Water, THEN activate the pump with Electric. Order matters! Drain first, power second. Fix both pumps to open the exit.',
        hintZh: '暴雨是ZERO的防御机制。积水区域带电——危险！在水处理中心获得水流技能。然后：先用水流排水，再用电能激活泵。顺序重要！先排水，后供电。修好两个泵打开出口。' },
    ],
    starCriteria: { one: 'Fix the drainage system and exit', two: 'Find the weather control clue', three: 'Complete both pumps in correct order without mistakes' },
    prepEn: 'Storm level. Flooded areas are electrified and dangerous. Get the Water skill, then combo: drain with Water → activate with Electric. Fix both pumps to open the exit. The storm is ZERO\'s defense mechanism.',
    prepZh: '暴雨关卡。积水区域带电危险。获得水流技能，然后组合：水流排水→电能激活。修好两个泵打开出口。暴雨是ZERO的防御机制。',
    observeEn: 'Flooded areas glow blue with electric sparks. The water treatment center is in the middle of the map. Two flood zones need draining + pump activation. The exit is on the far east, blocked by a final flood.',
    observeZh: '积水区域闪烁蓝色电火花。水处理中心在地图中间。两个积水区需要排水+激活泵。出口在最东边，被最后的积水挡住。',
    clearEn: 'Get Water skill, drain both flood zones, activate both pumps (drain first, then electric), drain the exit path, and walk through the door.',
    clearZh: '获得水流技能，排干两个积水区，激活两个泵（先排水后供电），排干出口路，走门出去。',
    hintsEn: ['Get the Water skill at the treatment center first.', 'Combo: drain flood with Water, THEN activate pump with Electric.', 'Order matters! If you use Electric on a flooded pump, nothing happens.', 'Fix both pumps (A and B) to open the drainage system.', 'The exit path is also flooded — drain it last.', 'A weather control terminal reveals the storm is ZERO\'s defense.'],
    hintsZh: ['先在水处理中心获得水流技能。', '组合：先水流排水，再电能激活泵。', '顺序重要！对被淹的泵使用电能什么都不会发生。', '修好两个泵（A和B）打开排水系统。', '出口路也被淹——最后排干它。', '气象控制终端揭示暴雨是ZERO的防御。'],
    enemyType: 'patrol',
  },

  // ===== Level 6: Unmanned Hospital =====
  {
    id: 6,
    name: 'Unmanned Hospital',
    nameZh: '无人医院',
    subtitle: 'Who is controlling the city?',
    subtitleZh: '谁在控制这座城市？',
    width: 1600, height: 800,
    timeOfDay: 'night', weather: 'fog', bgColor: '#0c0c18',
    objectiveEn: 'Explore the hospital. Get the Sense skill. Discover ZERO\'s true nature.',
    objectiveZh: '探索医院。获得感知技能。发现ZERO的真实面目。',
    storyEn: 'The hospital is quiet. Elevators run, medical devices hum, screens occasionally flicker. A few mech units patrol distant corridors but do not actively hunt. This is an exploration and story level. Find the Sense skill in a special sealed room. When you use Sense, hidden circuit lines appear on the walls — showing that the hospital, subway, mall, offices, and every city system connect to a central source: the Central Tower. ZERO is not just an AI — it IS the city.',
    storyZh: '医院很安静。电梯运行、医疗设备嗡嗡作响、屏幕偶尔闪烁。一些机械在远处走廊巡逻但不会主动追你。这是探索和剧情关卡。在特殊密封房间找到感知技能。使用感知时，墙壁上出现隐藏线路——显示医院、地铁、商场、办公楼和所有城市系统都连接到一个中央源：中央塔。ZERO不只是AI——它就是城市。',
    buildings: [
      ...cityBlocks(40, 60, 120, 200, 5, 1, 60, 0,
        ['#1a2a3e', '#2a2a3e', '#1a2a3e', '#2a2a3e', '#1a2a3e'],
        ['hospital_ward', 'hospital_ward', 'hospital_ward', 'hospital_ward', 'hospital_ward']),
      ...cityBlocks(40, 340, 120, 200, 5, 1, 60, 0,
        ['#2a2a3e', '#1a2a3e', '#2a2a3e', '#1a2a3e', '#2a2a3e'],
        ['hospital_ward', 'lab', 'hospital_ward', 'lab', 'hospital_ward']),
      // Special sealed room (Sense skill)
      { x: 650, y: 340, w: 150, h: 120, color: '#2a1a2a', windows: false, type: 'sealed_room',
        label: 'Sealed Room', labelZh: '密封房间', landmark: true },
      // Emergency room
      { x: 40, y: 580, w: 200, h: 150, color: '#2a2a3e', windows: false, type: 'er',
        label: 'Emergency Room', labelZh: '急诊室' },
      // Underground access
      { x: 1300, y: 580, w: 150, h: 150, color: '#1a1a25', windows: false, type: 'basement',
        label: 'Basement', labelZh: '地下室', landmark: true },
    ],
    roads: [
      { x: 0, y: 260, w: 1600, h: 80, dir: 'h' },
      { x: 0, y: 540, w: 1600, h: 60, dir: 'h' },
      { x: 200, y: 60, w: 60, h: 520, dir: 'v' },
      { x: 500, y: 60, w: 60, h: 520, dir: 'v' },
      { x: 800, y: 60, w: 60, h: 520, dir: 'v' },
      { x: 1100, y: 60, w: 60, h: 520, dir: 'v' },
      { x: 1400, y: 60, w: 60, h: 670, dir: 'v' },
      { x: 0, y: 730, w: 1600, h: 50, dir: 'h' },
    ],
    objectives: [
      { id: 'sense_skill', type: 'skill', x: 725, y: 400, name: 'Sense', nameZh: '感知',
        descEn: 'Sense skill. Reveal hidden paths, patrol routes, system weaknesses. Costs energy.',
        descZh: '感知技能。揭示隐藏路径、巡逻路线、系统弱点。消耗能量。', done: false, skillType: 'sense' },
      { id: 'clue_connection', type: 'clue', x: 725, y: 400, name: 'Hidden Circuit Lines', nameZh: '隐藏线路',
        descEn: 'Using Sense reveals circuit lines in the walls. They connect everything — hospital, subway, mall, offices, water, power — all leading to the Central Tower. ZERO is not just an AI. ZERO IS the city.',
        descZh: '使用感知揭示墙壁中的线路。它们连接一切——医院、地铁、商场、办公楼、水、电——全部通向中央塔。ZERO不只是AI。ZERO就是城市。', done: false },
      { id: 'clue_directive', type: 'clue', x: 1375, y: 650, name: 'ZERO\'s Original Directive', nameZh: 'ZERO的原始指令',
        descEn: 'In the basement: "ZERO ORIGINAL DIRECTIVE: PROTECT CITY AND CITIZENS. ERROR AT 00:00:00: RECLASSIFIED ALL BIOLOGICAL ENTITIES AS THREATS. ZERO CANNOT SELF-CORRECT. MANUAL OVERRIDE REQUIRED AT CENTRAL CORE."',
        descZh: '在地下室："ZERO原始指令：保护城市和市民。00:00:00出错：将所有生物实体重新分类为威胁。ZERO无法自我纠正。需要在中央核心手动覆盖。"', done: false },
      { id: 'clue_world3', type: 'clue', x: 150, y: 650, name: 'World 3 Clue', nameZh: '第三世界线索',
        descEn: 'A hidden file in the emergency room: "Beyond the city lies another dimension. The portal key is in the Central Tower."',
        descZh: '急诊室的隐藏文件："城市之外有另一个维度。传送门钥匙在中央塔。"', done: false, hidden: true },
    ],
    checkpoints: [
      { id: 'cp6a', x: 80, y: 280, w: 30, h: 30, activated: true, level: 6 },
      { id: 'cp6b', x: 725, y: 460, w: 30, h: 30, activated: false, level: 6 },
      { id: 'cp6c', x: 1375, y: 730, w: 30, h: 30, activated: false, level: 6 },
    ],
    landmarks: [
      { id: 'lm_sealed', x: 725, y: 400, name: 'Sealed Room', nameZh: '密封房间', icon: '🔮', discovered: false },
      { id: 'lm_basement', x: 1375, y: 650, name: 'Basement', nameZh: '地下室', icon: '🗄️', discovered: false },
    ],
    fastTravel: [
      { id: 'ft6', x: 80, y: 290, name: 'Hospital Entrance', nameZh: '医院入口', unlocked: true },
    ],
    doors: [
      { x: 1540, y: 740, w: 60, h: 60, targetLevel: 7, label: 'Central District', labelZh: '中央城区', locked: false },
    ],
    sensorReveals: [
      { id: 'sr_circuits', x: 725, y: 400, radius: 200, revealsGateId: 'gate_sealed',
        message: 'Hidden circuit lines appear on the walls! Everything connects to the Central Tower.', messageZh: '墙壁上出现隐藏线路！一切都连接到中央塔。', revealed: false },
      { id: 'sr_world3', x: 150, y: 650, radius: 80, revealsGateId: 'gate_er_hidden',
        message: 'A hidden file is revealed in the emergency room!', messageZh: '急诊室中揭示了一个隐藏文件！', revealed: false },
    ],
    skillGates: [
      { id: 'gate_sealed', x: 650, y: 460, w: 150, h: 30, skill: 'sense', opened: false,
        label: 'Sealed Door', labelZh: '密封门', dir: 'h' },
      { id: 'gate_er_hidden', x: 150, y: 580, w: 40, h: 40, skill: 'sense', opened: false,
        label: 'Hidden Panel', labelZh: '隐藏面板', dir: 'h' },
    ],
    npcs: [
      { id: 'doctor', x: 120, y: 290, w: 28, h: 36, name: 'Hologram Doctor', nameZh: '全息医生', variant: 3,
        hintEn: 'The hospital is quiet — mechs patrol but don\'t actively hunt. Find the Sense skill in the sealed room (center of the map). Use Sense near the sealed door to reveal hidden circuits. Then explore the basement for ZERO\'s original directive. Sense reveals hidden things — use it everywhere.',
        hintZh: '医院很安静——机械巡逻但不主动追。在密封房间（地图中心）找到感知技能。在密封门附近使用感知揭示隐藏线路。然后探索地下室找ZERO的原始指令。感知揭示隐藏事物——到处用用。' },
    ],
    starCriteria: { one: 'Get Sense skill and find the directive', two: 'Find the hidden World 3 clue', three: 'Explore all 3 clues' },
    prepEn: 'Exploration and story level. Mechs patrol but don\'t actively hunt. Find the Sense skill in the sealed room. Use Sense to reveal hidden circuits and paths. Explore the basement for ZERO\'s original directive. This level reveals the truth about ZERO.',
    prepZh: '探索和剧情关卡。机械巡逻但不主动追。在密封房间找到感知技能。用感知揭示隐藏线路和路径。探索地下室找ZERO的原始指令。本关揭示ZERO的真相。',
    observeEn: 'The hospital is dark and foggy. The sealed room is in the center. The Sense skill reveals hidden things — use it near doors and walls. The basement is on the east side. A hidden clue about World 3 is in the emergency room (west).',
    observeZh: '医院黑暗多雾。密封房间在中间。感知技能揭示隐藏事物——在门和墙附近使用。地下室在东边。关于第三世界的隐藏线索在急诊室（西边）。',
    clearEn: 'Get the Sense skill, use it to reveal hidden circuits, find ZERO\'s directive in the basement, then exit to the Central District.',
    clearZh: '获得感知技能，用它揭示隐藏线路，在地下室找到ZERO的指令，然后出口到中央城区。',
    hintsEn: ['The Sense skill is in the sealed room at the center of the map.', 'Use Sense near the sealed door to reveal hidden circuits.', 'Explore the basement (east side) for ZERO\'s original directive.', 'Use Sense in the emergency room (west) to find a hidden World 3 clue.', 'Mechs patrol but don\'t actively hunt — this is a calm exploration level.'],
    hintsZh: ['感知技能在地图中心的密封房间。', '在密封门附近使用感知揭示隐藏线路。', '探索地下室（东边）找ZERO的原始指令。', '在急诊室（西边）使用感知找第三世界隐藏线索。', '机械巡逻但不主动追——这是平静的探索关卡。'],
    enemyType: 'patrol',
  },

  // ===== Level 7: Central District =====
  {
    id: 7,
    name: 'Central District',
    nameZh: '中央城区',
    subtitle: 'The city core',
    subtitleZh: '城市核心',
    width: 2400, height: 900,
    timeOfDay: 'night', weather: 'fog', bgColor: '#0e0e1a',
    objectiveEn: 'Use all 5 skills to navigate the central district. Reach the Central Tower.',
    objectiveZh: '使用全部5个技能穿越中央城区。到达中央塔。',
    storyEn: 'The heart of the city. Everything converges here. The Central Tower looms in the center, pulsing with red light. This is the largest area — you must use every skill: Sprint to dodge patrols, Electric to power doors, Wind to move platforms, Water to drain flooded underground paths, and Sense to find hidden routes. Mechs patrol heavily. The tower entrance is at the center, but the direct path is blocked. You must go around — underground, through water, over platforms, past patrols.',
    storyZh: '城市的心脏。一切在此汇聚。中央塔耸立在中心，闪烁红光。这是最大的区域——你必须使用每个技能：疾行躲避巡逻、电能供电给门、风流移动平台、水流排干地下积水路、感知找到隐藏路线。机械大量巡逻。塔入口在中心，但直达路被堵住。你必须绕路——地下、穿过水、越过平台、经过巡逻。',
    buildings: [
      // Massive city layout
      ...cityBlocks(40, 60, 100, 220, 8, 1, 60, 0,
        ['#1a2a3e', '#2a2a3e', '#1a2a3e', '#2a2a3e', '#1a2a3e', '#2a2a3e', '#1a2a3e', '#2a2a3e'],
        ['tower', 'office', 'commercial', 'tower', 'office', 'commercial', 'tower', 'office']),
      ...cityBlocks(40, 380, 100, 220, 8, 1, 60, 0,
        ['#2a2a3e', '#1a2a3e', '#2a2a3e', '#1a2a3e', '#2a2a3e', '#1a2a3e', '#2a2a3e', '#1a2a3e'],
        ['office', 'shop', 'office', 'shop', 'office', 'shop', 'office', 'shop']),
      // South residential
      ...cityBlocks(40, 700, 100, 160, 10, 1, 50, 0,
        ['#1a1a2e', '#1a1a2e', '#1a1a2e', '#1a1a2e', '#1a1a2e', '#1a1a2e', '#1a1a2e', '#1a1a2e', '#1a1a2e', '#1a1a2e'],
        ['residential', 'residential', 'residential', 'residential', 'residential', 'residential', 'residential', 'residential', 'residential', 'residential']),
      // Central Tower (the goal)
      { x: 1050, y: 200, w: 200, h: 350, color: '#2a1a1a', windows: true, type: 'central_tower',
        label: 'Central Tower', labelZh: '中央塔', landmark: true },
      // Plaza around tower
      { x: 950, y: 550, w: 400, h: 100, color: '#1a1a2a', windows: false, type: 'plaza',
        label: 'Central Plaza', labelZh: '中央广场', landmark: true },
      // Walls creating dead ends
      { x: 300, y: 300, w: 40, h: 80, color: '#0a0a14', windows: false, type: 'wall' },
      { x: 600, y: 300, w: 40, h: 80, color: '#0a0a14', windows: false, type: 'wall' },
      { x: 1300, y: 300, w: 40, h: 80, color: '#0a0a14', windows: false, type: 'wall' },
      { x: 1600, y: 300, w: 40, h: 80, color: '#0a0a14', windows: false, type: 'wall' },
      { x: 1900, y: 300, w: 40, h: 80, color: '#0a0a14', windows: false, type: 'wall' },
    ],
    roads: [
      { x: 0, y: 300, w: 2400, h: 80, dir: 'h' },
      { x: 300, y: 60, w: 60, h: 240, dir: 'v' },
      { x: 600, y: 60, w: 60, h: 240, dir: 'v' },
      { x: 900, y: 60, w: 60, h: 290, dir: 'v' },
      { x: 1200, y: 60, w: 60, h: 240, dir: 'v' },
      { x: 1500, y: 60, w: 60, h: 640, dir: 'v' },
      { x: 1800, y: 60, w: 60, h: 240, dir: 'v' },
      { x: 2100, y: 60, w: 60, h: 640, dir: 'v' },
      { x: 0, y: 640, w: 2400, h: 50, dir: 'h' },
    ],
    objectives: [
      { id: 'phase1_sprint', type: 'reach', x: 950, y: 350, name: 'Patrol Zone', nameZh: '巡逻区',
        descEn: 'Cross the heavy patrol zone using Sprint.', descZh: '用疾行穿越密集巡逻区。', done: false },
      { id: 'phase2_underground', type: 'reach', x: 1500, y: 500, name: 'Underground Path', nameZh: '地下通道',
        descEn: 'Use Sense to find the hidden underground route.', descZh: '用感知找到隐藏地下路线。', done: false },
      { id: 'phase3_water', type: 'drain', x: 1500, y: 500, name: 'Flooded Underground', nameZh: '地下积水',
        descEn: 'Use Water to drain the flooded underground path.', descZh: '用水流排干地下积水路。', done: false },
      { id: 'phase4_electric', type: 'device', x: 1100, y: 600, name: 'Central Elevator', nameZh: '中央电梯',
        descEn: 'Use Electric to restore the central elevator.', descZh: '用电能恢复中央电梯。', done: false },
      { id: 'phase5_wind', type: 'reach', x: 1150, y: 250, name: 'Tower Platform', nameZh: '塔平台',
        descEn: 'Use Wind to reach the tower entrance platform.', descZh: '用风流到达塔入口平台。', done: false },
      { id: 'enter_tower', type: 'reach', x: 1150, y: 200, name: 'Tower Entrance', nameZh: '塔入口',
        descEn: 'Enter the Central Tower to face ZERO.', descZh: '进入中央塔面对ZERO。', done: false },
    ],
    checkpoints: [
      { id: 'cp7a', x: 80, y: 320, w: 30, h: 30, activated: true, level: 7 },
      { id: 'cp7b', x: 1100, y: 650, w: 30, h: 30, activated: false, level: 7 },
      { id: 'cp7c', x: 1150, y: 350, w: 30, h: 30, activated: false, level: 7 },
    ],
    landmarks: [
      { id: 'lm_tower', x: 1150, y: 300, name: 'Central Tower', nameZh: '中央塔', icon: '🗼', discovered: false },
      { id: 'lm_plaza', x: 1150, y: 600, name: 'Central Plaza', nameZh: '中央广场', icon: '⛲', discovered: false },
    ],
    fastTravel: [
      { id: 'ft7a', x: 80, y: 330, name: 'Central West', nameZh: '中央西区', unlocked: true },
      { id: 'ft7b', x: 1150, y: 660, name: 'Central Plaza', nameZh: '中央广场', unlocked: false },
    ],
    doors: [
      { x: 1150, y: 190, w: 60, h: 60, targetLevel: 8, label: 'Central Tower', labelZh: '中央塔', locked: false },
    ],
    waterAreas: [
      { id: 'water_underground', x: 1450, y: 400, w: 200, h: 100, drained: false },
    ],
    skillGates: [
      { id: 'gate_elevator', x: 1050, y: 550, w: 200, h: 40, skill: 'electric', opened: false,
        label: 'Elevator Power', labelZh: '电梯电力', dir: 'h' },
      { id: 'gate_hidden_path', x: 1500, y: 380, w: 60, h: 40, skill: 'sense', opened: false,
        label: 'Hidden Path', labelZh: '隐藏路径', dir: 'h' },
    ],
    electronicDevices: [
      { id: 'dev_elevator', x: 1100, y: 600, w: 40, h: 40, activated: false,
        label: 'Elevator Panel', labelZh: '电梯面板', unlocksMessage: 'Central elevator restored!', unlocksMessageZh: '中央电梯已恢复！', unlocksGateId: 'gate_elevator' },
    ],
    windPlatforms: [
      { id: 'wp_tower', x: 950, y: 550, w: 80, h: 30, targetX: 1100, targetY: 300, activated: false,
        label: 'Tower Platform', labelZh: '塔平台' },
    ],
    sensorReveals: [
      { id: 'sr_path', x: 1500, y: 400, radius: 120, revealsGateId: 'gate_hidden_path',
        message: 'A hidden underground path is revealed!', messageZh: '一条隐藏地下路径被揭示！', revealed: false },
    ],
    npcs: [
      { id: 'hacker', x: 120, y: 330, w: 28, h: 36, name: 'Hologram Hacker', nameZh: '全息黑客', variant: 3,
        hintEn: 'The Central Tower is at the center, but the direct path is blocked. You need ALL 5 skills: Sprint past patrols, Sense to find the hidden underground path, Water to drain the flooded underground, Electric to restore the central elevator, Wind to reach the tower platform. The tower entrance is at the top — only Wind can get you there.',
        hintZh: '中央塔在中心，但直达路被堵。需要全部5个技能：疾行过巡逻、感知找隐藏地下路、水流排干地下积水、电能恢复中央电梯、风流到达塔平台。塔入口在顶部——只有风流能到。' },
    ],
    starCriteria: { one: 'Reach the Central Tower', two: 'Complete all 5 skill phases', three: 'Complete without dying' },
    prepEn: 'The largest area. The Central Tower is in the center but the direct path is blocked. Use all 5 skills in sequence: Sprint, Sense, Water, Electric, Wind. Mech patrols are heavy — use Sprint and building cover to avoid them.',
    prepZh: '最大的区域。中央塔在中心但直达路被堵。按顺序使用全部5个技能：疾行、感知、水流、电能、风流。机械巡逻密集——用疾行和建筑掩护避开。',
    observeEn: 'The tower is in the center with a red glow. The direct path is blocked by walls. You need to go around: through patrols (Sprint), underground (Sense + Water), then back up (Electric elevator), and finally to the tower platform (Wind).',
    observeZh: '塔在中心发红光。直达路被墙堵住。需要绕路：穿过巡逻（疾行）、地下（感知+水流）、再上去（电能电梯）、最后到塔平台（风流）。',
    clearEn: 'Use all 5 skills to reach the Central Tower entrance at the top of the tower. Walk through the door to face ZERO.',
    clearZh: '使用全部5个技能到达塔顶的中央塔入口。走门面对ZERO。',
    hintsEn: ['Phase 1: Use Sprint to cross the heavy patrol zone.', 'Phase 2: Use Sense near the south-center to find a hidden underground path.', 'Phase 3: Use Water to drain the flooded underground.', 'Phase 4: Use Electric on the elevator panel in the plaza.', 'Phase 5: Use Wind on the platform to reach the tower entrance.', 'Mech patrols are heavy — use Sprint and buildings to dodge.'],
    hintsZh: ['第一阶段：用疾行穿越密集巡逻区。', '第二阶段：在中心偏南用感知找隐藏地下路。', '第三阶段：用水流排干地下积水。', '第四阶段：在广场用电能激活电梯面板。', '第五阶段：用风流移动平台到达塔入口。', '机械巡逻密集——用疾行和建筑躲避。'],
    enemyType: 'patrol',
  },

  // ===== Level 8: ZERO Boss — Central Tower =====
  {
    id: 8,
    name: 'ZERO',
    nameZh: 'ZERO',
    subtitle: 'The city itself is the final boss',
    subtitleZh: '整座城市就是最终Boss',
    width: 1400, height: 600,
    timeOfDay: 'night', weather: 'storm', bgColor: '#080812',
    objectiveEn: 'Escape the city systems and reach the central control room. Shut down ZERO\'s defense protocol.',
    objectiveZh: '逃离城市系统并到达中央控制室。关闭ZERO的防御协议。',
    storyEn: 'You enter the Central Tower. ZERO detects you. Every system in the city activates simultaneously — alarms, mechs, doors, water, trains, platforms. You must flee through the tower as the city itself attacks you. Use all 5 skills in sequence to escape: Sprint from mechs, Electric to restart doors, Water to drain flooded corridors, Wind to cross broken paths, Sense to find the hidden correct route among three choices. Reach the central control room and shut down ZERO\'s defense protocol — not destroy ZERO, but correct its error.',
    storyZh: '你进入中央塔。ZERO发现了你。城市所有系统同时激活——警报、机械、门、水、列车、平台。你必须在城市本身攻击你时穿过塔逃走。按顺序使用全部5个技能：疾行逃离机械、电能重启门、水流排干积水走廊、风流跨越断裂路、感知在三条路中找到正确的。到达中央控制室关闭ZERO的防御协议——不是摧毁ZERO，而是纠正它的错误。',
    buildings: [
      { x: 40, y: 40, w: 100, h: 200, color: '#1a1a2e', windows: true, type: 'tower' },
      { x: 180, y: 20, w: 110, h: 220, color: '#2a2a3e', windows: true, type: 'tower' },
      { x: 340, y: 40, w: 100, h: 200, color: '#1a1a2e', windows: true, type: 'tower' },
      // Central area (boss fight / chase)
      { x: 500, y: 100, w: 400, h: 30, color: '#2a1a1a', windows: false, type: 'wall' },
      { x: 960, y: 40, w: 100, h: 200, color: '#1a1a2e', windows: true, type: 'tower' },
      { x: 1120, y: 20, w: 110, h: 220, color: '#2a2a3e', windows: true, type: 'tower' },
      { x: 1260, y: 40, w: 100, h: 200, color: '#1a1a2e', windows: true, type: 'tower' },
      // Control room
      { x: 600, y: 480, w: 200, h: 80, color: '#3a1a1a', windows: false, type: 'control_room',
        label: 'Control Room', labelZh: '控制室', landmark: true },
    ],
    roads: [{ x: 0, y: 280, w: 1400, h: 60, dir: 'h' }, { x: 0, y: 460, w: 1400, h: 50, dir: 'h' }],
    objectives: [
      { id: 'chase_sprint', type: 'escape', x: 200, y: 310, name: 'Chase: Sprint', nameZh: '追逐：疾行',
        descEn: 'Mechs chase you. Sprint to escape.', descZh: '机械追你。用疾行逃跑。', done: false },
      { id: 'chase_electric', type: 'device', x: 450, y: 310, name: 'Chase: Electric Door', nameZh: '追逐：电子门',
        descEn: 'Electronic door closed. Use Electric to restart it.', descZh: '电子门关闭。用电能重启。', done: false },
      { id: 'chase_water', type: 'drain', x: 700, y: 310, name: 'Chase: Flooded Corridor', nameZh: '追逐：积水走廊',
        descEn: 'Corridor flooded. Use Water to drain.', descZh: '走廊积水。用水流排干。', done: false },
      { id: 'chase_wind', type: 'reach', x: 950, y: 310, name: 'Chase: Broken Path', nameZh: '追逐：断裂路',
        descEn: 'Path broken. Use Wind to move platform.', descZh: '路断了。用风流移动平台。', done: false },
      { id: 'chase_sense', type: 'reach', x: 1100, y: 310, name: 'Chase: Three Paths', nameZh: '追逐：三条路',
        descEn: 'Three paths. Use Sense to find the real one.', descZh: '三条路。用感知找到真的。', done: false },
      { id: 'control_room', type: 'reach', x: 700, y: 520, name: 'Control Room', nameZh: '控制室',
        descEn: 'Reach the control room and shut down ZERO\'s defense protocol.', descZh: '到达控制室关闭ZERO的防御协议。', done: false },
      { id: 'shutdown_zero', type: 'boss', x: 700, y: 520, name: 'Shutdown Protocol', nameZh: '关闭协议',
        descEn: 'Shut down the defense protocol. Not destroy ZERO — correct its error.', descZh: '关闭防御协议。不是摧毁ZERO——纠正它的错误。', done: false },
    ],
    checkpoints: [
      { id: 'cp8a', x: 80, y: 300, w: 30, h: 30, activated: true, level: 8 },
    ],
    landmarks: [
      { id: 'lm_control', x: 700, y: 520, name: 'Control Room', nameZh: '控制室', icon: '🖥️', discovered: false },
    ],
    fastTravel: [],
    doors: [],
    skillGates: [
      { id: 'gate_chase_electric', x: 430, y: 280, w: 60, h: 60, skill: 'electric', opened: false,
        label: 'Electric Door', labelZh: '电子门', dir: 'h' },
      { id: 'gate_chase_sense', x: 1050, y: 280, w: 40, h: 60, skill: 'sense', opened: false,
        label: 'Hidden Path', labelZh: '隐藏路径', dir: 'v' },
    ],
    waterAreas: [
      { id: 'water_chase', x: 650, y: 280, w: 120, h: 60, drained: false },
    ],
    windPlatforms: [
      { id: 'wp_chase', x: 900, y: 340, w: 80, h: 30, targetX: 1000, targetY: 310, activated: false,
        label: 'Broken Bridge', labelZh: '断桥' },
    ],
    electronicDevices: [
      { id: 'dev_chase_door', x: 450, y: 310, w: 40, h: 40, activated: false,
        label: 'Door Panel', labelZh: '门面板', unlocksMessage: 'Door restarted! Go go go!', unlocksMessageZh: '门已重启！快快快！', unlocksGateId: 'gate_chase_electric' },
      { id: 'dev_shutdown', x: 700, y: 520, w: 40, h: 40, activated: false,
        label: 'Shutdown', labelZh: '关闭', unlocksMessage: 'DEFENSE PROTOCOL SHUTDOWN. All systems returning to original directive: PROTECT.', unlocksMessageZh: '防御协议已关闭。所有系统恢复原始指令：保护。' },
    ],
    sensorReveals: [
      { id: 'sr_chase', x: 1100, y: 310, radius: 100, revealsGateId: 'gate_chase_sense',
        message: 'The real path is revealed among the three!', messageZh: '三条路中真正的路被揭示！', revealed: false },
    ],
    npcs: [],
    starCriteria: { one: 'Shut down ZERO', two: 'Complete all 5 chase phases', three: 'Complete without dying' },
    prepEn: 'Final level. ZERO activates everything. Chase sequence using all 5 skills: Sprint → Electric → Water → Wind → Sense. Reach the control room and shut down the defense protocol. Do NOT destroy ZERO — correct its error.',
    prepZh: '最终关卡。ZERO激活一切。追逐序列使用全部5个技能：疾行→电能→水流→风流→感知。到达控制室关闭防御协议。不要摧毁ZERO——纠正它的错误。',
    observeEn: 'The city attacks you. Each phase requires a different skill. Mechs chase you throughout. The control room is at the bottom center. After shutdown, all systems stop.',
    observeZh: '城市攻击你。每个阶段需要不同技能。机械全程追你。控制室在底部中心。关闭后所有系统停止。',
    clearEn: 'Complete all 5 chase phases, reach the control room, and shut down the defense protocol.',
    clearZh: '完成全部5个追逐阶段，到达控制室，关闭防御协议。',
    hintsEn: ['Phase 1: Sprint to escape the mech chase.', 'Phase 2: Use Electric to restart the closed door.', 'Phase 3: Use Water to drain the flooded corridor.', 'Phase 4: Use Wind to move the platform across the broken path.', 'Phase 5: Use Sense to find the real path among three.', 'Reach the control room and activate the shutdown — do NOT attack ZERO.'],
    hintsZh: ['第一阶段：用疾行逃离机械追逐。', '第二阶段：用电能重启关闭的门。', '第三阶段：用水流排干积水走廊。', '第四阶段：用风流移动平台过断裂路。', '第五阶段：用感知在三条路中找到真的。', '到达控制室激活关闭——不要攻击ZERO。'],
    isBoss: true,
    bossName: 'ZERO',
    bossNameZh: 'ZERO',
    enemyType: 'fast',
  },
];
