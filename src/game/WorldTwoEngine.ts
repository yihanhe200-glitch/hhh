import {
  CITY_LEVELS, type CityLevelId, type LevelData, type Objective,
  type Building, type Checkpoint, type Landmark, type SkillType,
  type SkillGate, type ElectronicDevice, type WaterArea, type WindPlatform, type SensorReveal,
} from './cityData';
import type { CharacterAppearance } from '@/types';

export interface CityPlayer {
  x: number; y: number; w: number; h: number;
  speed: number; hp: number; maxHp: number; mp: number; maxMp: number;
  attack: number; attackCooldown: number; hitFlash: number; invincible: number;
  facing: 'up' | 'down' | 'left' | 'right';
  walkPhase: number; isMoving: boolean;
  level: number; exp: number;
  energy: number; maxEnergy: number;
}

export interface CityEnemy {
  x: number; y: number; w: number; h: number;
  patrolX: number; patrolY: number;
  patrolRange: number;
  state: 'patrol' | 'chase' | 'stunned';
  stateTimer: number;
  speed: number;
  chaseSpeed: number;
  hp: number; maxHp: number;
  damage: number;
  attackCooldown: number;
  hitFlash: number;
  color: string;
  name: string;
  patrolPhase: number;
  alertRange: number;
  loseRange: number;
  killable?: boolean;
  dead?: boolean;
  deathParticles?: number;
  variant?: 'mechanical';
  enemyType?: 'patrol' | 'sound' | 'fast' | 'none';
}

export interface CityBoss {
  hp: number; maxHp: number; phase: number;
  x: number; y: number; w: number; h: number;
  attackCooldown: number; hitFlash: number; isDefeated: boolean;
  spritePhase: number;
  lasers: { x: number; y: number; vx: number; vy: number; active: boolean; color: string }[];
  moveTimer: number; targetX: number; targetY: number;
  pattern: number; patternStep: number;
}

export interface CityParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  type: 'spark' | 'damage' | 'glow' | 'heal' | 'neon' | 'rain' | 'electric' | 'water' | 'wind';
}

export interface CityAmbientParticle {
  x: number; y: number; vx: number; vy: number;
  size: number; opacity: number; phase: number; color: string;
}

export interface MinimapData {
  levelId: CityLevelId;
  playerX: number; playerY: number;
  levelW: number; levelH: number;
  landmarks: { x: number; y: number; name: string; icon: string; discovered: boolean }[];
  objectives: { x: number; y: number; done: boolean; type: string }[];
  checkpoints: { x: number; y: number; activated: boolean }[];
  doors: { x: number; y: number; locked: boolean }[];
  visited: boolean[];
}

export interface CityCallbacks {
  onHpChange: (hp: number, maxHp: number) => void;
  onMpChange: (mp: number, maxMp: number) => void;
  onEnergyChange: (energy: number, maxEnergy: number) => void;
  onExpChange: (exp: number, level: number) => void;
  onLevelChange: (lid: CityLevelId, name: string, subtitle: string, objEn: string, objZh: string, storyEn: string, storyZh: string, hasTimer: boolean, timerSec: number, timerLabel: string) => void;
  onObjectiveDone: (obj: Objective) => void;
  onClueFound: (obj: Objective) => void;
  onNpcTalk: (id: string, name: string, nameZh: string, hintEn: string, hintZh: string) => void;
  onObjectiveComplete: (lid: CityLevelId) => void;
  onMessage: (text: string) => void;
  onPlayerDeath: () => void;
  onBossStart: () => void;
  onBossPhaseChange: (phase: number) => void;
  onBossDefeated: () => void;
  onWorldComplete: () => void;
  onCheckpointActivated: (cp: Checkpoint) => void;
  onTimerTick: (remaining: number) => void;
  onTimerExpired: () => void;
  onLandmarkDiscovered: (lm: Landmark) => void;
  onMinimapUpdate: (data: MinimapData) => void;
  onRouteChoice: (routes: { id: string; labelEn: string; labelZh: string; descEn: string; descZh: string; difficulty: string }[]) => void;
  onStarRating: (stars: number, criteria: { one: string; two: string; three: string }) => void;
}

export interface CityGameInput {
  up: boolean; down: boolean; left: boolean; right: boolean;
  attack: boolean; interact: boolean;
}

interface SaveState {
  level: number; playerX: number; playerY: number;
  hp: number; maxHp: number; mp: number; maxMp: number;
  energy: number; maxEnergy: number; exp: number; level_stat: number;
}

const NEON_COLORS = ['#ff2d95', '#00d9ff', '#ffaa00', '#a855f7', '#22d3ee', '#f472b6'];
const EYE_COLORS: Record<string, string> = {
  Brown: '#3a2818', Blue: '#3070d0', Green: '#30a040', Hazel: '#806030',
  Amber: '#d09030', Red: '#c03030', Violet: '#8040c0', Gold: '#d4a830',
  Silver: '#b0b0c0', Heterochromia: '#3070d0',
};
const HAIR_COLORS: Record<string, string> = {
  Black: '#1a1510', Brown: '#3a2818', Blonde: '#d4a838', Red: '#a83838',
  White: '#e8e8e8', Silver: '#b8b8c8', Blue: '#3070d0', Green: '#30a040',
  Pink: '#e070b0', Purple: '#8040c0',
};

const SKILL_COLORS: Record<SkillType, string> = {
  sprint: '#22d3ee', electric: '#f97316', wind: '#93c5fd', water: '#3b82f6', sense: '#a855f7',
};

export class WorldTwoEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private cb: CityCallbacks;
  private appearance: CharacterAppearance;

  private player: CityPlayer;
  private currentLevel: CityLevelId = 0;
  private levelData: LevelData;
  private camera = { x: 0, y: 0 };

  private input: CityGameInput = { up: false, down: false, left: false, right: false, attack: false, interact: false };
  private frame = 0;
  private running = false;
  private rafId = 0;

  private particles: CityParticle[] = [];
  private ambientParticles: CityAmbientParticle[] = [];
  private rainParticles: CityParticle[] = [];

  private boss: CityBoss | null = null;
  private bossActive = false;
  private enemies: CityEnemy[] = [];
  private worldComplete = false;
  private playerDead = false;

  private currentObjectives: Objective[] = [];
  private currentCheckpoints: Checkpoint[] = [];
  private currentLandmarks: Landmark[] = [];
  private lastCheckpoint: { x: number; y: number; level: CityLevelId } = { x: 80, y: 440, level: 0 };

  private timerRemaining = 0;
  private timerActive = false;
  private timerLabel = '';

  private interactCooldown = 0;
  private transitionTimer = 0;
  private transitioning = false;
  private pendingLevel: CityLevelId | null = null;

  private objectivesDone = 0;
  private totalObjectives = 0;
  private wrongAttempts = 0;
  private levelStartTime = 0;
  private healingPotionsUsed = 0;
  private diedThisLevel = false;

  private skillColor = '#00d9ff';
  private selectedSkill: SkillType | null = null;
  private unlockedSkills: Set<SkillType> = new Set();
  private sprintActive = 0;
  private visitedAreas: Set<string> = new Set();

  private routeChoiceTriggered = false;
  private triggerActivated = false;
  private levelCompleteFired = false;

  constructor(canvas: HTMLCanvasElement, cb: CityCallbacks, appearance: CharacterAppearance) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cb = cb;
    this.appearance = appearance;
    this.levelData = CITY_LEVELS[0];

    this.player = {
      x: 80, y: 440, w: 28, h: 36,
      speed: 2.8, hp: 120, maxHp: 120, mp: 40, maxMp: 40,
      attack: 15, attackCooldown: 0, hitFlash: 0, invincible: 0,
      facing: 'right', walkPhase: 0, isMoving: false, level: 1, exp: 0,
      energy: 100, maxEnergy: 100,
    };

    this.initLevel(0);
  }

  start() { if (this.running) return; this.running = true; this.loop(); }
  stop() { this.running = false; cancelAnimationFrame(this.rafId); }

  private loop = () => {
    if (!this.running) return;
    this.update();
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private initLevel(levelId: CityLevelId) {
    this.currentLevel = levelId;
    const data = CITY_LEVELS[levelId];
    this.levelData = data;

    this.currentObjectives = data.objectives.map(o => ({ ...o }));
    this.currentCheckpoints = data.checkpoints.map(c => ({ ...c }));
    this.currentLandmarks = data.landmarks.map(l => ({ ...l }));

    for (const obj of this.currentObjectives) {
      if (this.isInsideBuilding(obj.x, obj.y)) {
        const moved = this.pushOutOfBuildingsAt(obj.x, obj.y);
        obj.x = moved.x; obj.y = moved.y;
      }
    }
    for (const cp of this.currentCheckpoints) {
      if (this.isInsideBuilding(cp.x + cp.w / 2, cp.y + cp.h / 2)) {
        const moved = this.pushOutOfBuildingsAt(cp.x + cp.w / 2, cp.y + cp.h / 2);
        cp.x = moved.x - cp.w / 2; cp.y = moved.y - cp.h / 2;
      }
    }
    for (const lm of this.currentLandmarks) {
      if (this.isInsideBuilding(lm.x, lm.y)) {
        const moved = this.pushOutOfBuildingsAt(lm.x, lm.y);
        lm.x = moved.x; lm.y = moved.y;
      }
    }
    for (const door of data.doors) {
      if (this.isInsideBuilding(door.x + door.w / 2, door.y + door.h / 2)) {
        const moved = this.pushOutOfBuildingsAt(door.x + door.w / 2, door.y + door.h / 2);
        door.x = moved.x - door.w / 2; door.y = moved.y - door.h / 2;
      }
    }
    for (const npc of data.npcs) {
      if (this.isInsideBuilding(npc.x + npc.w / 2, npc.y + npc.h / 2)) {
        const moved = this.pushOutOfBuildingsAt(npc.x + npc.w / 2, npc.y + npc.h / 2);
        npc.x = moved.x - npc.w / 2; npc.y = moved.y - npc.h / 2;
      }
    }

    this.objectivesDone = this.currentObjectives.filter(o => o.done).length;
    this.totalObjectives = this.currentObjectives.filter(o => o.type !== 'clue' && o.type !== 'trigger').length;
    this.wrongAttempts = 0;
    this.levelStartTime = this.frame;
    this.diedThisLevel = false;
    this.routeChoiceTriggered = false;
    this.triggerActivated = false;
    this.levelCompleteFired = false;

    const cp = this.currentCheckpoints.find(c => c.activated);
    if (cp && cp.level === levelId) { this.player.x = cp.x; this.player.y = cp.y + 20; }
    else { this.player.x = 80; this.player.y = 440; }
    this.pushOutOfBuildings();
    this.player.facing = 'right';

    if (data.hasTimer && data.timerSeconds) {
      this.timerRemaining = data.timerSeconds;
      this.timerActive = true;
      this.timerLabel = data.timerLabel || 'Timer';
    } else { this.timerActive = false; this.timerRemaining = 0; }

    this.ambientParticles = [];
    const tod = data.timeOfDay;
    const pCount = tod === 'night' ? 30 : tod === 'blackout' ? 8 : tod === 'storm' ? 15 : 18;
    for (let i = 0; i < pCount; i++) {
      this.ambientParticles.push({
        x: Math.random() * data.width, y: Math.random() * data.height,
        vx: (Math.random() - 0.5) * 0.3, vy: -Math.random() * 0.4 - 0.1,
        size: 1 + Math.random() * 2, opacity: 0.3 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: tod === 'night' ? NEON_COLORS[i % NEON_COLORS.length] : '#aaddff',
      });
    }

    this.rainParticles = [];
    if (data.weather === 'rain' || data.weather === 'storm') {
      for (let i = 0; i < 100; i++) {
        this.rainParticles.push({
          x: Math.random() * data.width, y: Math.random() * data.height,
          vx: -1, vy: 8 + Math.random() * 4,
          life: 100, maxLife: 100, color: 'rgba(150,180,200,0.3)', size: 1, type: 'rain',
        });
      }
    }

    // Enemies
    this.enemies = [];
    const enemySpawns = this.getEnemySpawns(levelId);
    const etype = data.enemyType ?? 'patrol';
    for (const spawn of enemySpawns) {
      const cs = etype === 'fast' ? 2.5 * 1.5 : 1.5;
      this.enemies.push({
        x: spawn.x, y: spawn.y, w: 28, h: 32,
        patrolX: spawn.x, patrolY: spawn.y, patrolRange: spawn.range ?? 150,
        state: 'patrol', stateTimer: 0,
        speed: etype === 'fast' ? 1.4 : 0.9, chaseSpeed: cs,
        hp: spawn.hp ?? 50, maxHp: spawn.hp ?? 50,
        damage: spawn.damage ?? 8,
        attackCooldown: 0, hitFlash: 0,
        color: spawn.color ?? '#3a1a4a', name: spawn.name,
        patrolPhase: Math.random() * Math.PI * 2,
        alertRange: etype === 'sound' ? 200 : 140, loseRange: etype === 'sound' ? 280 : 220,
        enemyType: etype,
      });
    }

    // Boss (chase — keep structure for lasers, no HP combat)
    if (data.isBoss) {
      this.boss = {
        hp: 999, maxHp: 999, phase: 1,
        x: 600, y: 150, w: 120, h: 100,
        attackCooldown: 90, hitFlash: 0, isDefeated: false,
        spritePhase: 0, lasers: [], moveTimer: 0,
        targetX: 600, targetY: 150, pattern: 0, patternStep: 0,
      };
      this.bossActive = true;
      this.cb.onBossStart();
    } else { this.boss = null; this.bossActive = false; }

    this.camera.x = 0; this.camera.y = 0;

    this.cb.onLevelChange(
      data.id, data.name, data.subtitle, data.objectiveEn, data.objectiveZh,
      data.storyEn, data.storyZh,
      data.hasTimer ?? false, data.timerSeconds ?? 0, data.timerLabel ?? ''
    );
    this.cb.onEnergyChange(this.player.energy, this.player.maxEnergy);
    this.updateMinimap();
  }

  private update() {
    this.frame++;

    if (this.playerDead || this.worldComplete) { this.updateParticles(); return; }

    if (this.transitioning) {
      this.transitionTimer++;
      if (this.transitionTimer > 30) {
        this.transitioning = false; this.transitionTimer = 0;
        if (this.pendingLevel !== null) {
          this.initLevel(this.pendingLevel);
          this.pendingLevel = null;
          this.cb.onHpChange(this.player.hp, this.player.maxHp);
          this.cb.onMpChange(this.player.mp, this.player.maxMp);
        }
      }
      this.updateParticles();
      return;
    }

    this.updatePlayer();
    this.updateEnemies();
    this.updateParticles();
    this.updateAmbient();
    this.updateRain();
    if (this.boss && this.bossActive) this.updateBoss();
    this.updateTimer();

    if (this.interactCooldown > 0) this.interactCooldown--;
    if (this.player.attackCooldown > 0) this.player.attackCooldown--;
    if (this.player.hitFlash > 0) this.player.hitFlash--;
    if (this.player.invincible > 0) this.player.invincible--;
    if (this.sprintActive > 0) this.sprintActive--;
    for (const e of this.enemies) { if (e.hitFlash > 0) e.hitFlash--; if (e.attackCooldown > 0) e.attackCooldown--; }

    this.updateCamera();
    this.updateMinimap();
  }

  private updatePlayer() {
    const p = this.player;
    const input = this.input;
    let dx = 0, dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    p.isMoving = (dx !== 0 || dy !== 0);
    if (p.isMoving) {
      const len = Math.sqrt(dx * dx + dy * dy);
      const mult = this.sprintActive > 0 ? 2 : 1;
      const speed = p.speed * mult;
      dx = dx / len * speed;
      dy = dy / len * speed;

      const oldX = p.x;
      p.x += dx;
      if (this.checkBuildingCollision()) p.x = oldX;
      // Water edge damage
      if (this.checkWaterEdgeDamage()) { /* damage already applied */ }

      const oldY = p.y;
      p.y += dy;
      if (this.checkBuildingCollision()) p.y = oldY;
      this.checkWaterEdgeDamage();

      p.walkPhase += 0.25;
      if (Math.abs(dx) > Math.abs(dy)) p.facing = dx > 0 ? 'right' : 'left';
      else p.facing = dy > 0 ? 'down' : 'up';
    }

    p.x = Math.max(0, Math.min(this.levelData.width - p.w, p.x));
    p.y = Math.max(0, Math.min(this.levelData.height - p.h, p.y));

    if (input.interact && this.interactCooldown === 0) {
      this.handleInteract();
      this.interactCooldown = 15;
    }

    // Space = use skill
    if (input.attack && p.attackCooldown === 0) {
      this.useSkill();
      p.attackCooldown = 25;
    }

    // Check objectives (proximity)
    for (const obj of this.currentObjectives) {
      if (obj.done) continue;
      if (obj.hidden && !this.isObjectiveVisible(obj)) continue;
      const dist = Math.hypot(p.x + p.w / 2 - obj.x, p.y + p.h / 2 - obj.y);
      const range = 45;

      if (dist < range) {
        if (obj.type === 'clue') {
          obj.done = true;
          this.cb.onClueFound(obj);
          this.spawnNeonParticles(obj.x, obj.y);
        } else if (obj.type === 'trigger') {
          obj.done = true;
          this.spawnTriggerMonsters();
        } else if (obj.type === 'skill') {
          obj.done = true;
          this.objectivesDone++;
          if (obj.skillType) { this.unlockedSkills.add(obj.skillType); }
          this.cb.onObjectiveDone(obj);
          this.spawnNeonParticles(obj.x, obj.y);
          this.cb.onMessage(`${obj.name} unlocked! / ${obj.nameZh} 已解锁！`);
        } else if (obj.type === 'escape' || obj.type === 'reach') {
          obj.done = true;
          this.objectivesDone++;
          this.cb.onObjectiveDone(obj);
          this.spawnNeonParticles(obj.x, obj.y);
        } else if (obj.type === 'marker') {
          obj.done = true;
          this.objectivesDone++;
          this.cb.onObjectiveDone(obj);
          this.spawnNeonParticles(obj.x, obj.y);
          this.checkLandmarkDiscovery(obj.x, obj.y);
        } else if (obj.type === 'collect') {
          obj.done = true;
          this.objectivesDone++;
          this.cb.onObjectiveDone(obj);
          this.spawnNeonParticles(obj.x, obj.y);
        } else if (obj.type === 'survive') {
          obj.done = true;
          this.objectivesDone++;
          this.cb.onObjectiveDone(obj);
        }
        // device / drain / boss types are handled via useSkill() proximity
      }
    }

    this.checkLevelCompletion();

    // Checkpoints
    for (const cp of this.currentCheckpoints) {
      if (!cp.activated) {
        const d = Math.hypot(p.x + p.w / 2 - (cp.x + cp.w / 2), p.y + p.h / 2 - (cp.y + cp.h / 2));
        if (d < 35) {
          cp.activated = true;
          this.lastCheckpoint = { x: cp.x, y: cp.y + 20, level: this.currentLevel };
          this.cb.onCheckpointActivated(cp);
          this.spawnNeonParticles(cp.x + cp.w / 2, cp.y + cp.h / 2);
        }
      }
    }

    // Landmarks
    for (const lm of this.currentLandmarks) {
      if (!lm.discovered) {
        const d = Math.hypot(p.x + p.w / 2 - lm.x, p.y + p.h / 2 - lm.y);
        if (d < 60) { lm.discovered = true; this.cb.onLandmarkDiscovered(lm); }
      }
    }

    // Doors
    for (const door of this.levelData.doors) {
      if (p.x + p.w > door.x && p.x < door.x + door.w &&
          p.y + p.h > door.y && p.y < door.y + door.h) {
        if (!door.locked) { this.transitionToLevel(door.targetLevel); }
        break;
      }
    }

    // Route choice
    if (this.levelData.routeChoices && !this.routeChoiceTriggered) {
      const dStart = Math.hypot(p.x - 80, p.y - 440);
      if (dStart > 100) {
        this.routeChoiceTriggered = true;
        this.cb.onRouteChoice(this.levelData.routeChoices.map(r => ({
          id: r.id, labelEn: r.labelEn, labelZh: r.labelZh,
          descEn: r.descEn, descZh: r.descZh, difficulty: r.difficulty,
        })));
      }
    }

    input.interact = false;
    input.attack = false;
  }

  // --- Skill system ---
  private useSkill() {
    const p = this.player;
    const skill = this.selectedSkill;

    // Even with no skill selected, the player can melee-attack nearby enemies (Space bar)
    if (!skill) {
      this.meleeAttack();
      return;
    }
    const costs: Record<SkillType, number> = { sprint: 15, electric: 10, wind: 12, water: 12, sense: 8 };
    const cost = costs[skill];
    if (p.energy < cost) {
      // Not enough energy — fall back to melee attack so player can still defend
      this.meleeAttack();
      this.cb.onMessage('Not enough energy! / 能量不足！');
      return;
    }

    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const checkRange = 80;
    let didSomething = false;

    if (skill === 'sprint') {
      this.sprintActive = 180;
      this.spawnSprintParticles(cx, cy);
      didSomething = true;
    } else if (skill === 'electric') {
      // Activate nearby electronic devices
      for (const dev of this.levelData.electronicDevices ?? []) {
        if (dev.activated) continue;
        const d = Math.hypot(cx - (dev.x + dev.w / 2), cy - (dev.y + dev.h / 2));
        if (d < checkRange) {
          dev.activated = true;
          this.spawnElectricParticles(dev.x + dev.w / 2, dev.y + dev.h / 2);
          if (dev.unlocksGateId) this.openGate(dev.unlocksGateId);
          if (dev.unlocksMessage) this.cb.onMessage(dev.unlocksMessage);
          didSomething = true;
          // Complete device objectives near this device
          this.completeObjectiveNear(dev.x + dev.w / 2, dev.y + dev.h / 2, 'device');
          // Boss shutdown device
          if (dev.id === 'dev_shutdown') { this.handleBossShutdown(); }
        }
      }
      // Open electric skill gates
      for (const gate of this.levelData.skillGates ?? []) {
        if (gate.skill !== 'electric' || gate.opened) continue;
        const d = Math.hypot(cx - (gate.x + gate.w / 2), cy - (gate.y + gate.h / 2));
        if (d < checkRange) { gate.opened = true; didSomething = true; this.spawnNeonParticles(gate.x + gate.w / 2, gate.y + gate.h / 2); }
      }
    } else if (skill === 'wind') {
      for (const wp of this.levelData.windPlatforms ?? []) {
        if (wp.activated) continue;
        const d = Math.hypot(cx - (wp.x + wp.w / 2), cy - (wp.y + wp.h / 2));
        if (d < checkRange) {
          wp.activated = true;
          wp.x = wp.targetX; wp.y = wp.targetY;
          this.spawnWindParticles(wp.x + wp.w / 2, wp.y + wp.h / 2);
          didSomething = true;
        }
      }
      for (const gate of this.levelData.skillGates ?? []) {
        if (gate.skill !== 'wind' || gate.opened) continue;
        const d = Math.hypot(cx - (gate.x + gate.w / 2), cy - (gate.y + gate.h / 2));
        if (d < checkRange) { gate.opened = true; didSomething = true; this.spawnNeonParticles(gate.x + gate.w / 2, gate.y + gate.h / 2); }
      }
    } else if (skill === 'water') {
      for (const wa of this.levelData.waterAreas ?? []) {
        if (wa.drained) continue;
        const d = Math.hypot(cx - (wa.x + wa.w / 2), cy - (wa.y + wa.h / 2));
        if (d < checkRange) {
          wa.drained = true;
          this.spawnWaterParticles(wa.x + wa.w / 2, wa.y + wa.h / 2);
          if (wa.unlocksGateId) this.openGate(wa.unlocksGateId);
          didSomething = true;
          this.completeObjectiveNear(wa.x + wa.w / 2, wa.y + wa.h / 2, 'drain');
        }
      }
      for (const gate of this.levelData.skillGates ?? []) {
        if (gate.skill !== 'water' || gate.opened) continue;
        const d = Math.hypot(cx - (gate.x + gate.w / 2), cy - (gate.y + gate.h / 2));
        if (d < checkRange) { gate.opened = true; didSomething = true; this.spawnNeonParticles(gate.x + gate.w / 2, gate.y + gate.h / 2); }
      }
    } else if (skill === 'sense') {
      for (const sr of this.levelData.sensorReveals ?? []) {
        if (sr.revealed) continue;
        const d = Math.hypot(cx - sr.x, cy - sr.y);
        if (d < Math.max(checkRange, sr.radius)) {
          sr.revealed = true;
          if (sr.revealsGateId) this.openGate(sr.revealsGateId);
          this.cb.onMessage(`${sr.message} / ${sr.messageZh}`);
          this.spawnNeonParticles(sr.x, sr.y);
          didSomething = true;
        }
      }
      for (const gate of this.levelData.skillGates ?? []) {
        if (gate.skill !== 'sense' || gate.opened) continue;
        const d = Math.hypot(cx - (gate.x + gate.w / 2), cy - (gate.y + gate.h / 2));
        if (d < checkRange) { gate.opened = true; didSomething = true; this.spawnNeonParticles(gate.x + gate.w / 2, gate.y + gate.h / 2); }
      }
    }

    if (didSomething || skill === 'sprint') {
      p.energy -= cost;
      if (p.energy < 0) p.energy = 0;
      this.cb.onEnergyChange(p.energy, p.maxEnergy);
      this.spawnAttackParticles(cx, cy);
    }
    // If the skill didn't do anything useful, still let player melee-attack enemies
    if (!didSomething && skill !== 'sprint') {
      this.meleeAttack();
    }
  }

  private meleeAttack() {
    const p = this.player;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const range = 55;
    let hitSomething = false;
    for (const e of this.enemies) {
      if (e.dead || e.state === 'stunned') continue;
      const d = Math.hypot(cx - (e.x + e.w / 2), cy - (e.y + e.h / 2));
      if (d < range + e.w / 2) {
        e.hp -= p.attack;
        e.hitFlash = 8;
        hitSomething = true;
        // Knockback enemy away from player
        const ang = Math.atan2(e.y + e.h / 2 - cy, e.x + e.w / 2 - cx);
        const kbx = e.x + Math.cos(ang) * 25;
        const kby = e.y + Math.sin(ang) * 25;
        const oldX = e.x, oldY = e.y;
        e.x = kbx; if (this.checkEnemyBuildingCollision(e)) e.x = oldX;
        e.y = kby; if (this.checkEnemyBuildingCollision(e)) e.y = oldY;
        // Stun the enemy temporarily
        e.state = 'stunned';
        e.stateTimer = 240; // 4 seconds stun
        if (e.killable && e.hp <= 0) {
          e.dead = true; e.deathParticles = 30;
          this.spawnExplosionParticles(e.x + e.w / 2, e.y + e.h / 2, e.color);
          this.cb.onMessage(`${e.name} destroyed! / ${e.name} 已销毁！`);
        }
        this.spawnAttackParticles(e.x + e.w / 2, e.y + e.h / 2);
      }
    }
    // Also damage boss if close (only for pushing back / stunning lasers feel)
    if (this.boss && this.bossActive && !this.boss.isDefeated) {
      const b = this.boss;
      const bd = Math.hypot(cx - (b.x + b.w / 2), cy - (b.y + b.h / 2));
      if (bd < range + b.w / 2) {
        b.hitFlash = 8;
        hitSomething = true;
        this.spawnAttackParticles(b.x + b.w / 2, b.y + b.h / 2);
      }
    }
    if (hitSomething) {
      this.spawnAttackParticles(cx, cy);
    }
  }

  private openGate(gateId: string) {
    for (const gate of this.levelData.skillGates ?? []) {
      if (gate.id === gateId) {
        gate.opened = true;
        this.spawnNeonParticles(gate.x + gate.w / 2, gate.y + gate.h / 2);
      }
    }
  }

  private completeObjectiveNear(x: number, y: number, type: string) {
    for (const obj of this.currentObjectives) {
      if (obj.done || obj.type !== type) continue;
      const d = Math.hypot(x - obj.x, y - obj.y);
      if (d < 60) {
        obj.done = true;
        this.objectivesDone++;
        this.cb.onObjectiveDone(obj);
        this.spawnNeonParticles(obj.x, obj.y);
      }
    }
  }

  private handleBossShutdown() {
    if (this.worldComplete) return;
    // Complete boss objective
    for (const obj of this.currentObjectives) {
      if (obj.type === 'boss' && !obj.done) {
        obj.done = true;
        this.objectivesDone++;
        this.cb.onObjectiveDone(obj);
      }
    }
    if (this.boss) { this.boss.isDefeated = true; this.bossActive = false; }
    this.cb.onBossDefeated();
    this.worldComplete = true;
    const stars = this.calculateStars();
    this.cb.onStarRating(stars, this.levelData.starCriteria);
    setTimeout(() => this.cb.onWorldComplete(), 2000);
  }

  private spawnSprintParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
        life: 20, maxLife: 20, color: '#22d3ee', size: 3, type: 'spark',
      });
    }
  }
  private spawnElectricParticles(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const ang = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x, y, vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3,
        life: 25, maxLife: 25, color: '#f97316', size: 2 + Math.random() * 2, type: 'electric',
      });
    }
  }
  private spawnWindParticles(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 20,
        vx: 3 + Math.random() * 2, vy: (Math.random() - 0.5) * 2,
        life: 25, maxLife: 25, color: '#93c5fd', size: 2, type: 'wind',
      });
    }
  }
  private spawnWaterParticles(x: number, y: number) {
    for (let i = 0; i < 14; i++) {
      const ang = (Math.PI * 2 * i) / 14;
      this.particles.push({
        x, y, vx: Math.cos(ang) * 2.5, vy: Math.sin(ang) * 2.5,
        life: 30, maxLife: 30, color: '#3b82f6', size: 2 + Math.random() * 2, type: 'water',
      });
    }
  }

  // --- Collision ---
  private checkBuildingCollision(): boolean {
    const p = this.player;
    for (const b of this.levelData.buildings) {
      if (b.type === 'ceiling') continue;
      if (p.x + p.w > b.x && p.x < b.x + b.w && p.y + p.h > b.y && p.y < b.y + b.h) return true;
    }
    // Closed skill gates act as walls
    for (const gate of this.levelData.skillGates ?? []) {
      if (gate.opened) continue;
      if (p.x + p.w > gate.x && p.x < gate.x + gate.w && p.y + p.h > gate.y && p.y < gate.y + gate.h) return true;
    }
    // Undrained water areas act as walls
    for (const wa of this.levelData.waterAreas ?? []) {
      if (wa.drained) continue;
      if (p.x + p.w > wa.x && p.x < wa.x + wa.w && p.y + p.h > wa.y && p.y < wa.y + wa.h) return true;
    }
    // Unactivated wind platforms act as walls (they're obstacles until moved)
    for (const wp of this.levelData.windPlatforms ?? []) {
      if (wp.activated) continue;
      if (p.x + p.w > wp.x && p.x < wp.x + wp.w && p.y + p.h > wp.y && p.y < wp.y + wp.h) return true;
    }
    return false;
  }

  private checkWaterEdgeDamage(): boolean {
    const p = this.player;
    for (const wa of this.levelData.waterAreas ?? []) {
      if (wa.drained) continue;
      // If player is very close to edge but not inside (blocked), damage
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      const dist = Math.hypot(cx - (wa.x + wa.w / 2), cy - (wa.y + wa.h / 2));
      if (dist < Math.max(wa.w, wa.h) / 2 + 20 && dist > Math.max(wa.w, wa.h) / 2 - 5) {
        if (p.invincible <= 0) {
          p.hp -= 3; p.hitFlash = 4; p.invincible = 40;
          this.cb.onHpChange(p.hp, p.maxHp);
          this.spawnAttackParticles(cx, cy);
          if (p.hp <= 0) { p.hp = 0; this.playerDead = true; this.cb.onPlayerDeath(); }
          return true;
        }
      }
    }
    return false;
  }

  private isInsideBuilding(x: number, y: number): boolean {
    for (const b of this.levelData.buildings) {
      if (b.type === 'ceiling') continue;
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
    }
    return false;
  }

  private pushOutOfBuildingsAt(x: number, y: number): { x: number; y: number } {
    let bx = x, by = y;
    for (let attempt = 0; attempt < 20; attempt++) {
      let collided = false;
      for (const b of this.levelData.buildings) {
        if (b.type === 'ceiling') continue;
        if (bx > b.x && bx < b.x + b.w && by > b.y && by < b.y + b.h) {
          const dL = bx - b.x, dR = b.x + b.w - bx, dT = by - b.y, dB = b.y + b.h - by;
          const m = Math.min(dL, dR, dT, dB);
          if (m === dL) bx = b.x - 5; else if (m === dR) bx = b.x + b.w + 5;
          else if (m === dT) by = b.y - 5; else by = b.y + b.h + 5;
          collided = true; break;
        }
      }
      if (!collided) break;
    }
    bx = Math.max(20, Math.min(this.levelData.width - 20, bx));
    by = Math.max(20, Math.min(this.levelData.height - 20, by));
    return { x: bx, y: by };
  }

  private isObjectiveVisible(obj: Objective): boolean {
    const d = Math.hypot(this.player.x + this.player.w / 2 - obj.x, this.player.y + this.player.h / 2 - obj.y);
    return d < 80;
  }

  private checkLandmarkDiscovery(x: number, y: number) {
    for (const lm of this.currentLandmarks) {
      if (!lm.discovered) {
        const d = Math.hypot(x - lm.x, y - lm.y);
        if (d < 100) { lm.discovered = true; this.cb.onLandmarkDiscovered(lm); }
      }
    }
  }

  private handleInteract() {
    const p = this.player;
    for (const npc of this.levelData.npcs) {
      const d = Math.hypot(p.x + p.w / 2 - (npc.x + npc.w / 2), p.y + p.h / 2 - (npc.y + npc.h / 2));
      if (d < 60) { this.cb.onNpcTalk(npc.id, npc.name, npc.nameZh, npc.hintEn, npc.hintZh); return; }
    }
  }

  private checkLevelCompletion() {
    const completableTypes = ['drain', 'device', 'escape', 'reach', 'skill', 'boss', 'marker', 'collect', 'survive'];
    const activeObjs = this.currentObjectives.filter(o => completableTypes.includes(o.type));
    if (activeObjs.length > 0 && activeObjs.every(o => o.done)) {
      for (const door of this.levelData.doors) { if (door.unlockCondition) door.locked = false; }
      if (!this.levelCompleteFired) {
        this.levelCompleteFired = true;
        this.cb.onObjectiveComplete(this.currentLevel);
      }
    }
    // Special: all clues done also unlocks
    const clues = this.currentObjectives.filter(o => o.type === 'clue');
    if (clues.length > 0 && clues.every(c => c.done) && !this.levelCompleteFired) {
      for (const door of this.levelData.doors) { if (door.unlockCondition) door.locked = false; }
      this.levelCompleteFired = true;
      this.cb.onObjectiveComplete(this.currentLevel);
    }
  }

  private calculateStars(): number {
    let stars = 1;
    if (this.wrongAttempts === 0 && !this.diedThisLevel) stars = 2;
    if (this.healingPotionsUsed === 0 && stars === 2) stars = 3;
    return stars;
  }

  private transitionToLevel(target: CityLevelId) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.transitionTimer = 0;
    this.pendingLevel = target;
  }

  selectRoute(routeId: string) {
    if (!this.levelData.routeChoices) return;
    const route = this.levelData.routeChoices.find(r => r.id === routeId);
    if (!route) return;
    this.player.x = route.targetX; this.player.y = route.targetY;
    this.pushOutOfBuildings();
    this.lastCheckpoint = { x: this.player.x, y: this.player.y, level: this.currentLevel };
  }

  private pushOutOfBuildings() {
    const p = this.player;
    for (let attempt = 0; attempt < 8; attempt++) {
      let collided = false;
      for (const b of this.levelData.buildings) {
        if (b.type === 'ceiling') continue;
        if (p.x + p.w > b.x && p.x < b.x + b.w && p.y + p.h > b.y && p.y < b.y + b.h) {
          const dL = p.x + p.w - b.x, dR = b.x + b.w - p.x, dT = p.y + p.h - b.y, dB = b.y + b.h - p.y;
          const m = Math.min(dL, dR, dT, dB);
          if (m === dL) p.x = b.x - p.w - 2; else if (m === dR) p.x = b.x + b.w + 2;
          else if (m === dT) p.y = b.y - p.h - 2; else p.y = b.y + b.h + 2;
          collided = true; break;
        }
      }
      if (!collided) break;
    }
    p.x = Math.max(0, Math.min(this.levelData.width - p.w, p.x));
    p.y = Math.max(0, Math.min(this.levelData.height - p.h, p.y));
  }

  private getEnemySpawns(levelId: CityLevelId): { x: number; y: number; range?: number; hp?: number; damage?: number; color?: string; name: string }[] {
    const spawns: { x: number; y: number; range?: number; hp?: number; damage?: number; color?: string; name: string }[] = [];
    switch (levelId) {
      case 0:
        spawns.push({ x: 600, y: 350, range: 200, name: 'Drone' }, { x: 1000, y: 250, range: 180, name: 'Drone' });
        break;
      case 1: spawns.push({ x: 400, y: 500, range: 160, name: 'Neon Wraith', color: '#4a2a5a', damage: 6 }); break;
      case 2: spawns.push({ x: 500, y: 300, range: 200, name: 'Sentinel', color: '#2a3a4a', damage: 8 }); break;
      case 3: spawns.push({ x: 400, y: 400, range: 180, name: 'Sound Hunter', color: '#1a3a3a', damage: 7 }); break;
      case 4: spawns.push({ x: 600, y: 350, range: 200, name: 'Stalker', color: '#2a1a3a', damage: 12, hp: 80 }); break;
      case 5: spawns.push({ x: 700, y: 350, range: 250, name: 'Fast Hunter', color: '#3a1a2a', damage: 10, hp: 60 }); break;
      case 6: spawns.push({ x: 500, y: 350, range: 250, name: 'Core Sentinel', color: '#3a2a5a', damage: 10, hp: 60 },
                            { x: 1000, y: 400, range: 200, name: 'Core Sentinel', color: '#3a2a5a', damage: 10, hp: 60 }); break;
      case 7: spawns.push({ x: 500, y: 350, range: 250, name: 'Echo Drone', color: '#3a1a3a', damage: 10 },
                           { x: 1100, y: 350, range: 250, name: 'Echo Drone', color: '#3a1a3a', damage: 10 }); break;
      case 8: spawns.push({ x: 300, y: 300, range: 300, name: 'ZERO Mech', color: '#5a2a2a', damage: 12, hp: 80 },
                           { x: 800, y: 350, range: 300, name: 'ZERO Mech', color: '#5a2a2a', damage: 12, hp: 80 }); break;
    }
    return spawns;
  }

  private spawnTriggerMonsters() {
    if (this.triggerActivated) return;
    this.triggerActivated = true;
    const cx = this.levelData.width / 2;
    const positions = [{ x: cx - 250, y: 300 }, { x: cx + 250, y: 300 }, { x: cx - 150, y: 500 }, { x: cx + 150, y: 500 }];
    for (const pos of positions) {
      const sp = this.pushOutOfBuildingsAt(pos.x, pos.y);
      this.enemies.push({
        x: sp.x, y: sp.y, w: 32, h: 34,
        patrolX: sp.x, patrolY: sp.y, patrolRange: 200,
        state: 'chase', stateTimer: 0,
        speed: 1.0, chaseSpeed: 1.8, hp: 40, maxHp: 40, damage: 10,
        attackCooldown: 0, hitFlash: 0, color: '#5a6a7a', name: 'Mech Guardian',
        patrolPhase: 0, alertRange: 300, loseRange: 400,
        killable: true, dead: false, deathParticles: 0, variant: 'mechanical', enemyType: 'patrol',
      });
    }
    this.cb.onMessage('ALARM TRIGGERED! Mechanical guardians activated! / 警报触发！机械守卫已启动！');
    this.spawnNeonParticles(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
  }

  private updateEnemies() {
    const p = this.player;
    const isLoud = p.isMoving && (this.sprintActive > 0 || true); // sound enemies detect fast movement
    for (const e of this.enemies) {
      if (e.dead) { e.deathParticles = (e.deathParticles ?? 0) - 1; continue; }
      if (e.state === 'stunned') { e.stateTimer--; if (e.stateTimer <= 0) { e.state = 'patrol'; e.hp = e.maxHp; } continue; }

      const distToPlayer = Math.hypot(p.x + p.w / 2 - (e.x + e.w / 2), p.y + p.h / 2 - (e.y + e.h / 2));
      const etype = e.enemyType ?? 'patrol';

      if (e.state === 'chase') {
        if (distToPlayer > e.loseRange) { e.state = 'patrol'; continue; }
        const ang = Math.atan2(p.y + p.h / 2 - (e.y + e.h / 2), p.x + p.w / 2 - (e.x + e.w / 2));
        // Don't move closer than 45px — prevents latching onto the player
        if (distToPlayer > 45) {
          const dx = Math.cos(ang) * e.chaseSpeed, dy = Math.sin(ang) * e.chaseSpeed;
          const oldX = e.x, oldY = e.y;
          e.x += dx; if (this.checkEnemyBuildingCollision(e)) e.x = oldX;
          e.y += dy; if (this.checkEnemyBuildingCollision(e)) e.y = oldY;
        } else {
          // Back off slightly if too close, so the player can escape
          const backX = e.x - Math.cos(ang) * 1.2;
          const backY = e.y - Math.sin(ang) * 1.2;
          const oldX = e.x, oldY = e.y;
          e.x = backX; if (this.checkEnemyBuildingCollision(e)) e.x = oldX;
          e.y = backY; if (this.checkEnemyBuildingCollision(e)) e.y = oldY;
        }

        if (distToPlayer < 42 && e.attackCooldown <= 0 && p.invincible <= 0) {
          p.hp -= e.damage; p.hitFlash = 6; p.invincible = 60; e.attackCooldown = 90;
          this.cb.onHpChange(p.hp, p.maxHp);
          this.spawnAttackParticles(p.x + p.w / 2, p.y + p.h / 2);
          // Knockback: push enemy away from player after attack
          const kbx = e.x - Math.cos(ang) * 35;
          const kby = e.y - Math.sin(ang) * 35;
          const oldX2 = e.x, oldY2 = e.y;
          e.x = kbx; if (this.checkEnemyBuildingCollision(e)) e.x = oldX2;
          e.y = kby; if (this.checkEnemyBuildingCollision(e)) e.y = oldY2;
          if (p.hp <= 0) { p.hp = 0; this.playerDead = true; this.cb.onPlayerDeath(); }
        }
      } else {
        // Patrol
        e.patrolPhase += 0.02;
        const tx = e.patrolX + Math.cos(e.patrolPhase) * e.patrolRange;
        const ty = e.patrolY + Math.sin(e.patrolPhase * 0.7) * e.patrolRange * 0.5;
        const dx = tx - e.x, dy = ty - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          const mx = (dx / dist) * e.speed, my = (dy / dist) * e.speed;
          const oldX = e.x, oldY = e.y;
          e.x += mx; if (this.checkEnemyBuildingCollision(e)) e.x = oldX;
          e.y += my; if (this.checkEnemyBuildingCollision(e)) e.y = oldY;
        }
        // Detection logic by type
        if (etype === 'sound') {
          // Only chase if player is moving fast (sprinting)
          const fastMoving = p.isMoving && this.sprintActive > 0;
          if (fastMoving && distToPlayer < e.alertRange) e.state = 'chase';
        } else {
          if (distToPlayer < e.alertRange) e.state = 'chase';
        }
      }

      e.x = Math.max(0, Math.min(this.levelData.width - e.w, e.x));
      e.y = Math.max(0, Math.min(this.levelData.height - e.h, e.y));
    }
    this.enemies = this.enemies.filter(e => !e.dead || (e.deathParticles ?? 0) > 0);
  }

  private checkEnemyBuildingCollision(e: CityEnemy): boolean {
    for (const b of this.levelData.buildings) {
      if (b.type === 'ceiling') continue;
      if (e.x + e.w > b.x && e.x < b.x + b.w && e.y + e.h > b.y && e.y < b.y + b.h) return true;
    }
    for (const gate of this.levelData.skillGates ?? []) {
      if (gate.opened) continue;
      if (e.x + e.w > gate.x && e.x < gate.x + gate.w && e.y + e.h > gate.y && e.y < gate.y + gate.h) return true;
    }
    for (const wa of this.levelData.waterAreas ?? []) {
      if (wa.drained) continue;
      if (e.x + e.w > wa.x && e.x < wa.x + wa.w && e.y + e.h > wa.y && e.y < wa.y + wa.h) return true;
    }
    return false;
  }

  private spawnExplosionParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 20; i++) {
      const ang = (Math.PI * 2 * i) / 20, spd = 2 + Math.random() * 3;
      this.particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        life: 40, maxLife: 40, color: i % 3 === 0 ? '#ff6600' : i % 3 === 1 ? '#ffaa00' : color,
        size: 2 + Math.random() * 2, type: 'neon' });
    }
  }

  respawnAtCheckpoint() {
    this.player.x = this.lastCheckpoint.x; this.player.y = this.lastCheckpoint.y;
    this.pushOutOfBuildings();
    // On death: HP and energy are cut in half (not fully restored)
    this.player.hp = Math.max(1, Math.ceil(this.player.maxHp / 2));
    this.player.energy = Math.max(0, Math.ceil(this.player.maxEnergy / 2));
    this.player.invincible = 60;
    this.sprintActive = 0;
    this.diedThisLevel = true;
    this.cb.onHpChange(this.player.hp, this.player.maxHp);
    this.cb.onEnergyChange(this.player.energy, this.player.maxEnergy);
    if (this.levelData.hasTimer && this.levelData.timerSeconds) {
      this.timerRemaining = this.levelData.timerSeconds; this.timerActive = true;
    }
    // Reset enemies to patrol state so player has a breather
    for (const e of this.enemies) {
      e.state = 'patrol'; e.stateTimer = 0; e.attackCooldown = 0;
      e.hp = e.maxHp;
    }
  }

  private updateBoss() {
    if (!this.boss || this.boss.isDefeated) return;
    const b = this.boss;
    b.spritePhase += 0.03;
    b.moveTimer++;
    if (b.moveTimer > 120) {
      b.moveTimer = 0;
      b.targetX = 200 + Math.random() * 1000; b.targetY = 100 + Math.random() * 150;
    }
    b.x += (b.targetX - b.x) * 0.02; b.y += (b.targetY - b.y) * 0.02;

    b.attackCooldown--;
    if (b.attackCooldown <= 0) {
      b.attackCooldown = 60;
      b.patternStep++;
      const angle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
      // Chase phase lasers — escalating
      const phase = Math.min(3, 1 + Math.floor(this.objectivesDone / 2));
      if (phase === 1) {
        b.lasers.push({ x: b.x + b.w / 2, y: b.y + b.h / 2,
          vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4, active: true, color: '#00d9ff' });
      } else if (phase === 2) {
        for (let i = -1; i <= 1; i++) {
          b.lasers.push({ x: b.x + b.w / 2, y: b.y + b.h / 2,
            vx: Math.cos(angle + i * 0.3) * 4, vy: Math.sin(angle + i * 0.3) * 4, active: true, color: '#a855f7' });
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 * i) / 5 + b.spritePhase * 0.5;
          b.lasers.push({ x: b.x + b.w / 2, y: b.y + b.h / 2,
            vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5, active: true, color: '#ef4444' });
        }
        b.lasers.push({ x: b.x + b.w / 2, y: b.y + b.h / 2,
          vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, active: true, color: '#ef4444' });
      }
    }

    for (const laser of b.lasers) {
      if (!laser.active) continue;
      laser.x += laser.vx; laser.y += laser.vy;
      if (this.player.invincible <= 0) {
        const d = Math.hypot(laser.x - (this.player.x + this.player.w / 2), laser.y - (this.player.y + this.player.h / 2));
        if (d < 22) {
          const dmg = 8 + 4;
          this.player.hp -= dmg; this.player.hitFlash = 6; this.player.invincible = 40;
          this.cb.onHpChange(this.player.hp, this.player.maxHp);
          laser.active = false;
          if (this.player.hp <= 0) { this.player.hp = 0; this.playerDead = true; this.cb.onPlayerDeath(); }
        }
      }
      if (laser.x < -50 || laser.x > this.levelData.width + 50 || laser.y < -50 || laser.y > this.levelData.height + 50) laser.active = false;
    }
    b.lasers = b.lasers.filter(l => l.active);
    if (b.hitFlash > 0) b.hitFlash--;
  }

  private updateTimer() {
    if (!this.timerActive) return;
    this.timerRemaining -= 1 / 60;
    this.cb.onTimerTick(Math.ceil(this.timerRemaining));
    if (this.timerRemaining <= 0) { this.timerActive = false; this.timerRemaining = 0; this.cb.onTimerExpired(); this.respawnAtCheckpoint(); }
  }

  private updateParticles() {
    for (const p of this.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateAmbient() {
    for (const p of this.ambientParticles) {
      p.x += p.vx; p.y += p.vy; p.phase += 0.02;
      if (p.y < -10) { p.y = this.levelData.height + 10; p.x = Math.random() * this.levelData.width; }
      if (p.x < -10) p.x = this.levelData.width + 10;
      if (p.x > this.levelData.width + 10) p.x = -10;
    }
  }

  private updateRain() {
    for (const r of this.rainParticles) {
      r.x += r.vx; r.y += r.vy;
      if (r.y > this.levelData.height) { r.y = -10; r.x = Math.random() * this.levelData.width; }
    }
  }

  private updateCamera() {
    const tx = this.player.x - this.canvas.width / 2 + this.player.w / 2;
    const ty = this.player.y - this.canvas.height / 2 + this.player.h / 2;
    this.camera.x += (tx - this.camera.x) * 0.1;
    this.camera.y += (ty - this.camera.y) * 0.1;
    this.camera.x = Math.max(0, Math.min(this.levelData.width - this.canvas.width, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.levelData.height - this.canvas.height, this.camera.y));
    if (this.levelData.width < this.canvas.width) this.camera.x = (this.levelData.width - this.canvas.width) / 2;
    if (this.levelData.height < this.canvas.height) this.camera.y = (this.levelData.height - this.canvas.height) / 2;
  }

  private updateMinimap() {
    this.cb.onMinimapUpdate({
      levelId: this.currentLevel, playerX: this.player.x, playerY: this.player.y,
      levelW: this.levelData.width, levelH: this.levelData.height,
      landmarks: this.currentLandmarks.map(l => ({ x: l.x, y: l.y, name: l.name, icon: l.icon, discovered: l.discovered })),
      objectives: this.currentObjectives.filter(o => !o.hidden || o.done).map(o => ({ x: o.x, y: o.y, done: o.done, type: o.type })),
      checkpoints: this.currentCheckpoints.map(c => ({ x: c.x, y: c.y, activated: c.activated })),
      doors: this.levelData.doors.map(d => ({ x: d.x, y: d.y, locked: d.locked })),
      visited: [],
    });
  }

  private spawnNeonParticles(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 - 2,
        life: 30, maxLife: 30, color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
        size: 2 + Math.random() * 2, type: 'neon' });
    }
  }

  private spawnAttackParticles(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({ x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
        life: 15, maxLife: 15, color: this.skillColor, size: 3, type: 'spark' });
    }
  }

  // --- Rendering ---

  private render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    this.drawBackground();
    this.drawRoads();
    this.drawBuildings();
    this.drawWaterAreas();
    this.drawWindPlatforms();
    this.drawSkillGates();
    this.drawSensorReveals();
    this.drawElectronicDevices();
    this.drawCheckpoints();
    this.drawObjectives();
    this.drawDoors();
    this.drawNpcs();
    this.drawPlayer();
    this.drawEnemies();
    if (this.boss) this.drawBoss();
    this.drawLasers();
    this.drawParticles();
    this.drawAmbient();
    this.drawRain();
    this.drawFog();
    this.drawStorm();

    ctx.restore();

    if (this.transitioning) {
      const alpha = this.transitionTimer < 15 ? this.transitionTimer / 15 : 1 - (this.transitionTimer - 15) / 15;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.drawVignette();
  }

  private drawBackground() {
    const ctx = this.ctx;
    const data = this.levelData;
    const tod = data.timeOfDay;
    const grad = ctx.createLinearGradient(0, 0, 0, data.height);
    if (tod === 'day') { grad.addColorStop(0, '#2a3050'); grad.addColorStop(0.5, '#1a1f2e'); grad.addColorStop(1, '#15201a'); }
    else if (tod === 'dusk') { grad.addColorStop(0, '#3a2040'); grad.addColorStop(0.4, '#2a1a30'); grad.addColorStop(1, '#1e1a2e'); }
    else if (tod === 'night') { grad.addColorStop(0, '#0a0a18'); grad.addColorStop(0.5, '#0c0c18'); grad.addColorStop(1, '#080812'); }
    else if (tod === 'storm') { grad.addColorStop(0, '#0c0c20'); grad.addColorStop(0.5, '#0a0a18'); grad.addColorStop(1, '#080812'); }
    else { grad.addColorStop(0, '#050510'); grad.addColorStop(1, '#020208'); }
    ctx.fillStyle = grad;
    ctx.fillRect(this.camera.x - 20, this.camera.y - 20, this.canvas.width + 40, this.canvas.height + 40);

    if (tod === 'night' || tod === 'storm') {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137.5) % data.width, sy = (i * 73.3) % (data.height * 0.3);
        ctx.globalAlpha = (Math.sin(this.frame * 0.05 + i) * 0.3 + 0.7) * 0.4;
        ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.save(); ctx.globalAlpha = 0.12;
    for (let i = 0; i < 15; i++) {
      const bx = (i * 100 + 30) % data.width, bw = 60 + (i % 4) * 25, bh = 80 + (i % 3) * 50;
      ctx.fillStyle = tod === 'blackout' ? '#0a0a14' : '#1a1a2a';
      ctx.fillRect(bx, 60, bw, bh);
      if (tod !== 'blackout') {
        ctx.fillStyle = 'rgba(255,220,100,0.1)';
        for (let wy = 0; wy < bh - 20; wy += 15)
          for (let wx = 0; wx < bw - 10; wx += 12)
            if ((wx + wy + i) % 3 === 0) ctx.fillRect(bx + wx + 3, 60 + wy + 3, 4, 6);
      }
    }
    ctx.restore();
  }

  private drawRoads() {
    const ctx = this.ctx;
    const tod = this.levelData.timeOfDay;
    for (const road of this.levelData.roads) {
      ctx.fillStyle = tod === 'blackout' ? '#0a0a12' : '#1a1a22';
      ctx.fillRect(road.x, road.y, road.w, road.h);
      if (tod !== 'blackout') {
        ctx.strokeStyle = 'rgba(200,200,100,0.2)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
        ctx.beginPath();
        if (road.dir === 'h') { ctx.moveTo(road.x, road.y + road.h / 2); ctx.lineTo(road.x + road.w, road.y + road.h / 2); }
        else { ctx.moveTo(road.x + road.w / 2, road.y); ctx.lineTo(road.x + road.w / 2, road.y + road.h); }
        ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }

  private drawBuildings() {
    const ctx = this.ctx;
    const tod = this.levelData.timeOfDay;
    for (const b of this.levelData.buildings) {
      if (b.type === 'ceiling') {
        ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
        for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(200,220,255,0.12)'; ctx.fillRect(b.x + 60 + i * 120, b.y + 30, 40, 8); }
        continue;
      }
      if (b.type === 'wall') { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h); continue; }
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = this.lightenHex(b.color, 15); ctx.fillRect(b.x, b.y, 3, b.h);
      ctx.fillStyle = this.darkenHex(b.color, 15); ctx.fillRect(b.x + b.w - 3, b.y, 3, b.h);
      if (b.windows) {
        if (tod !== 'blackout') {
          const wc = tod === 'night' ? 'rgba(255,200,100,0.5)' : tod === 'dusk' ? 'rgba(255,180,120,0.4)' : tod === 'storm' ? 'rgba(200,200,100,0.3)' : 'rgba(150,200,255,0.2)';
          for (let wy = 12; wy < b.h - 15; wy += 16)
            for (let wx = 7; wx < b.w - 10; wx += 14) {
              const lit = (wx + wy + Math.floor(b.x / 10)) % 3 !== 0;
              ctx.fillStyle = lit ? wc : 'rgba(30,30,40,0.3)';
              ctx.fillRect(b.x + wx, b.y + wy, 7, 9);
            }
        } else {
          for (let wy = 12; wy < b.h - 15; wy += 16)
            for (let wx = 7; wx < b.w - 10; wx += 14) { ctx.fillStyle = 'rgba(10,10,15,0.5)'; ctx.fillRect(b.x + wx, b.y + wy, 7, 9); }
          ctx.fillStyle = 'rgba(255,50,50,0.2)'; ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + 20, 12, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (b.type === 'tower' || b.type === 'mega_tower') {
        ctx.fillStyle = this.darkenHex(b.color, 10); ctx.fillRect(b.x + 5, b.y - 10, b.w - 10, 10);
        ctx.fillStyle = '#333'; ctx.fillRect(b.x + b.w / 2 - 1, b.y - 25, 2, 15);
        if (Math.sin(this.frame * 0.05) > 0) { ctx.fillStyle = 'rgba(255,50,50,0.7)'; ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y - 25, 3, 0, Math.PI * 2); ctx.fill(); }
      }
      if (b.label && b.landmark) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        const tw = ctx.measureText(b.label).width;
        ctx.fillRect(b.x + b.w / 2 - tw / 2 - 4, b.y - 18, tw + 8, 12);
        ctx.fillStyle = '#00d9ff'; ctx.fillText(b.label, b.x + b.w / 2, b.y - 8);
      }
    }
  }

  // --- New entity draw methods ---

  private drawSkillGates() {
    const ctx = this.ctx;
    for (const gate of this.levelData.skillGates ?? []) {
      const color = SKILL_COLORS[gate.skill];
      if (gate.opened) {
        ctx.save(); ctx.globalAlpha = 0.3;
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
        ctx.setLineDash([]); ctx.restore();
      } else {
        const pulse = Math.sin(this.frame * 0.06) * 0.2 + 0.8;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `${color}33`; ctx.fillRect(gate.x - 3, gate.y - 3, gate.w + 6, gate.h + 6);
        ctx.restore();
        ctx.fillStyle = `${color}aa`; ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
        ctx.fillStyle = `${color}`; ctx.globalAlpha = pulse;
        ctx.fillRect(gate.x + 2, gate.y + 2, gate.w - 4, gate.h - 4);
        ctx.globalAlpha = 1;
        // Skill icon letter
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        const letter = gate.skill === 'electric' ? '⚡' : gate.skill === 'wind' ? '🌬' : gate.skill === 'water' ? '💧' : gate.skill === 'sense' ? '👁' : '⚡';
        ctx.fillText(letter, gate.x + gate.w / 2, gate.y + gate.h / 2 + 4);
      }
    }
  }

  private drawElectronicDevices() {
    const ctx = this.ctx;
    for (const dev of this.levelData.electronicDevices ?? []) {
      const cx = dev.x + dev.w / 2, cy = dev.y + dev.h / 2;
      const pulse = Math.sin(this.frame * 0.08) * 0.3 + 0.7;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const color = dev.activated ? '#22c55e' : '#f97316';
      ctx.fillStyle = `${color}33`; ctx.beginPath(); ctx.arc(cx, cy, 20 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = dev.activated ? '#1a3a2a' : '#3a2a1a';
      ctx.fillRect(dev.x, dev.y, dev.w, dev.h);
      ctx.fillStyle = color; ctx.globalAlpha = pulse;
      ctx.fillRect(dev.x + 4, dev.y + 4, dev.w - 8, dev.h - 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(dev.activated ? '✓' : '⚡', cx, cy + 5);
      ctx.font = '7px sans-serif'; ctx.fillStyle = '#aaa';
      ctx.fillText(dev.label, cx, dev.y - 4);
    }
  }

  private drawWaterAreas() {
    const ctx = this.ctx;
    for (const wa of this.levelData.waterAreas ?? []) {
      if (wa.drained) {
        ctx.save(); ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#1a2a3a'; ctx.fillRect(wa.x, wa.y, wa.w, wa.h);
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.strokeRect(wa.x, wa.y, wa.w, wa.h); ctx.setLineDash([]);
        ctx.restore();
      } else {
        const pulse = Math.sin(this.frame * 0.05) * 0.15 + 0.85;
        ctx.fillStyle = `rgba(30,80,180,${pulse * 0.7})`;
        ctx.fillRect(wa.x, wa.y, wa.w, wa.h);
        ctx.fillStyle = `rgba(60,140,240,${pulse * 0.4})`;
        ctx.fillRect(wa.x, wa.y, wa.w, 4);
        // Electric spark particles
        if (this.frame % 8 === 0) {
          this.particles.push({
            x: wa.x + Math.random() * wa.w, y: wa.y + Math.random() * wa.h,
            vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
            life: 10, maxLife: 10, color: '#60a5fa', size: 1.5, type: 'electric',
          });
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(100,200,255,${pulse * 0.5})`; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const sx = wa.x + Math.random() * wa.w, sy = wa.y + Math.random() * wa.h;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 4, sy + 2); ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  private drawWindPlatforms() {
    const ctx = this.ctx;
    for (const wp of this.levelData.windPlatforms ?? []) {
      const pulse = Math.sin(this.frame * 0.06) * 0.2 + 0.8;
      ctx.save();
      if (!wp.activated) ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#93c5fd'; ctx.fillRect(wp.x, wp.y, wp.w, wp.h);
      ctx.fillStyle = '#60a5fa'; ctx.fillRect(wp.x, wp.y, wp.w, 4);
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1;
      ctx.strokeRect(wp.x, wp.y, wp.w, wp.h);
      // Arrows showing it can move
      if (!wp.activated) {
        ctx.strokeStyle = `rgba(147,197,253,${pulse})`; ctx.lineWidth = 2;
        const ax = wp.x + wp.w / 2, ay = wp.y + wp.h / 2;
        const dx = wp.targetX - wp.x, dy = wp.targetY - wp.y;
        const ang = Math.atan2(dy, dx);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + Math.cos(ang) * 15, ay + Math.sin(ang) * 15); ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawSensorReveals() {
    const ctx = this.ctx;
    for (const sr of this.levelData.sensorReveals ?? []) {
      const pulse = Math.sin(this.frame * 0.08) * 0.3 + 0.7;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (sr.revealed) {
        ctx.fillStyle = `rgba(168,85,247,${pulse * 0.2})`;
        ctx.beginPath(); ctx.arc(sr.x, sr.y, sr.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(200,150,255,${pulse * 0.6})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sr.x, sr.y, sr.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#a855f7'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('👁', sr.x, sr.y + 4);
      } else if (this.selectedSkill === 'sense') {
        // Faint hint when sense skill is selected
        ctx.fillStyle = `rgba(168,85,247,${pulse * 0.08})`;
        ctx.beginPath(); ctx.arc(sr.x, sr.y, sr.radius * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawCheckpoints() {
    const ctx = this.ctx;
    for (const cp of this.currentCheckpoints) {
      const pulse = Math.sin(this.frame * 0.05) * 0.3 + 0.7;
      ctx.save();
      if (cp.activated) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(34,197,94,${pulse * 0.3})`; ctx.beginPath(); ctx.arc(cp.x + cp.w / 2, cp.y + cp.h / 2, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(74,222,128,${pulse * 0.8})`; ctx.beginPath(); ctx.arc(cp.x + cp.w / 2, cp.y + cp.h / 2, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('CP', cp.x + cp.w / 2, cp.y + cp.h / 2 + 3);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(251,191,36,${pulse * 0.3})`; ctx.beginPath(); ctx.arc(cp.x + cp.w / 2, cp.y + cp.h / 2, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(251,191,36,${pulse * 0.6})`; ctx.beginPath(); ctx.arc(cp.x + cp.w / 2, cp.y + cp.h / 2, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawObjectives() {
    const ctx = this.ctx;
    for (const obj of this.currentObjectives) {
      if (obj.done && obj.type !== 'collect') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(0,217,255,0.1)'; ctx.beginPath(); ctx.arc(obj.x, obj.y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); continue;
      }
      if (obj.done) continue;
      if (obj.hidden && !this.isObjectiveVisible(obj)) continue;

      const pulse = Math.sin(this.frame * 0.05) * 0.3 + 0.7;
      const bob = Math.sin(this.frame * 0.04) * 3;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';

      if (obj.type === 'marker') {
        ctx.fillStyle = `rgba(0,217,255,${pulse * 0.2})`; ctx.beginPath(); ctx.arc(obj.x, obj.y, 25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(0,217,255,${pulse * 0.5})`; ctx.fillRect(obj.x - 3, obj.y - 30, 6, 30);
        ctx.fillStyle = `rgba(150,240,255,${pulse * 0.8})`; ctx.beginPath(); ctx.arc(obj.x, obj.y - 30, 5, 0, Math.PI * 2); ctx.fill();
      } else if (obj.type === 'collect') {
        ctx.fillStyle = `rgba(255,170,0,${pulse * 0.2})`; ctx.beginPath(); ctx.arc(obj.x, obj.y + bob, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,200,50,${pulse * 0.8})`; ctx.beginPath(); ctx.arc(obj.x, obj.y + bob, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${pulse * 0.5})`; ctx.beginPath(); ctx.arc(obj.x - 2, obj.y + bob - 2, 2, 0, Math.PI * 2); ctx.fill();
      } else if (obj.type === 'clue') {
        ctx.fillStyle = `rgba(255,200,50,${pulse * 0.3})`; ctx.beginPath(); ctx.arc(obj.x, obj.y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,220,100,${pulse * 0.8})`; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('?', obj.x, obj.y + 5);
      } else if (obj.type === 'reach' || obj.type === 'escape') {
        ctx.fillStyle = `rgba(168,85,247,${pulse * 0.3})`; ctx.beginPath(); ctx.arc(obj.x, obj.y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(200,150,255,${pulse * 0.6})`; ctx.beginPath(); ctx.arc(obj.x, obj.y, 5, 0, Math.PI * 2); ctx.fill();
      } else if (obj.type === 'skill') {
        const sc = obj.skillType ? SKILL_COLORS[obj.skillType] : '#00d9ff';
        ctx.fillStyle = `${sc}33`; ctx.beginPath(); ctx.arc(obj.x, obj.y, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `${sc}${Math.floor(pulse * 200).toString(16).padStart(2, '0')}`;
        ctx.beginPath(); ctx.arc(obj.x, obj.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('+', obj.x, obj.y + 4);
      } else if (obj.type === 'device') {
        ctx.fillStyle = `rgba(249,115,22,${pulse * 0.3})`; ctx.beginPath(); ctx.arc(obj.x, obj.y, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f97316'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⚡', obj.x, obj.y + 5);
      } else if (obj.type === 'drain') {
        ctx.fillStyle = `rgba(59,130,246,${pulse * 0.3})`; ctx.beginPath(); ctx.arc(obj.x, obj.y, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3b82f6'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('💧', obj.x, obj.y + 5);
      } else if (obj.type === 'boss') {
        ctx.fillStyle = `rgba(239,68,68,${pulse * 0.3})`; ctx.beginPath(); ctx.arc(obj.x, obj.y, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⏻', obj.x, obj.y + 5);
      } else if (obj.type === 'trigger') {
        const fp = Math.sin(this.frame * 0.12) * 0.4 + 0.6;
        ctx.fillStyle = `rgba(255,40,40,${fp * 0.3})`; ctx.beginPath(); ctx.arc(obj.x, obj.y, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,60,60,${fp * 0.7})`; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) { const a = (Math.PI * 2 * i) / 4 + this.frame * 0.05; ctx.beginPath(); ctx.arc(obj.x, obj.y, 16, a, a + 0.6); ctx.stroke(); }
        ctx.fillStyle = '#8a2020'; ctx.fillRect(obj.x - 10, obj.y - 10, 20, 20);
        ctx.fillStyle = `rgba(255,60,60,${fp})`; ctx.fillRect(obj.x - 7, obj.y - 7, 14, 14);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('!', obj.x, obj.y + 4);
      } else if (obj.type === 'survive') {
        ctx.fillStyle = `rgba(34,197,94,${pulse * 0.3})`; ctx.beginPath(); ctx.arc(obj.x, obj.y, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#22c55e'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⏱', obj.x, obj.y + 4);
      }
      ctx.restore();
    }
  }

  private drawDoors() {
    const ctx = this.ctx;
    for (const door of this.levelData.doors) {
      const pulse = Math.sin(this.frame * 0.05) * 0.3 + 0.7;
      if (door.locked) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(239,68,68,${pulse * 0.2})`; ctx.fillRect(door.x - 3, door.y - 3, door.w + 6, door.h + 6);
        ctx.restore();
        ctx.fillStyle = '#4a2020'; ctx.fillRect(door.x, door.y, door.w, door.h);
        ctx.fillStyle = '#ef4444'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🔒', door.x + door.w / 2, door.y + door.h / 2 + 5);
      } else {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(34,197,94,${pulse * 0.2})`; ctx.fillRect(door.x - 3, door.y - 3, door.w + 6, door.h + 6);
        ctx.restore();
        ctx.fillStyle = '#1a3a2a'; ctx.fillRect(door.x, door.y, door.w, door.h);
        ctx.fillStyle = '#22c55e'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(door.label, door.x + door.w / 2, door.y + door.h / 2 - 2);
        ctx.font = '7px sans-serif'; ctx.fillStyle = '#86efac';
        ctx.fillText(door.labelZh, door.x + door.w / 2, door.y + door.h / 2 + 8);
        ctx.fillStyle = `rgba(34,197,94,${pulse})`;
        ctx.beginPath(); ctx.moveTo(door.x + door.w + 5, door.y + door.h / 2 - 5);
        ctx.lineTo(door.x + door.w + 12, door.y + door.h / 2); ctx.lineTo(door.x + door.w + 5, door.y + door.h / 2 + 5);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  private drawNpcs() {
    const ctx = this.ctx;
    for (const npc of this.levelData.npcs) {
      const bob = Math.sin(this.frame * 0.04 + npc.variant) * 2;
      const ny = npc.y + bob, cx = npc.x + npc.w / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, npc.y + npc.h + 2, npc.w / 2, 4, 0, 0, Math.PI * 2); ctx.fill();
      const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
      if (dist < 80) {
        const pulse = Math.sin(this.frame * 0.08) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(0,217,255,${pulse * 0.8})`; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Press E', cx, npc.y - 12 + Math.sin(this.frame * 0.05) * 2);
      }
      const palettes = [
        { jacket: '#3a4a5a', pants: '#2a3a4a', hair: '#1a1510', skin: '#e0b890' },
        { jacket: '#5a3a4a', pants: '#3a2a3a', hair: '#3a2818', skin: '#d4a574' },
        { jacket: '#4a5a3a', pants: '#3a4a2a', hair: '#2a1810', skin: '#e0b890' },
        { jacket: '#3a3a5a', pants: '#2a2a4a', hair: '#4a3070', skin: '#d4a574' },
        { jacket: '#5a4a3a', pants: '#4a3a2a', hair: '#1a1a2a', skin: '#e0b890' },
      ];
      const c = palettes[npc.variant % palettes.length];
      ctx.fillStyle = c.pants; ctx.fillRect(cx - 5, ny + npc.h - 8, 4, 8); ctx.fillRect(cx + 1, ny + npc.h - 8, 4, 8);
      ctx.fillStyle = c.jacket;
      ctx.beginPath(); ctx.moveTo(cx - 8, ny + 13); ctx.lineTo(cx + 8, ny + 13);
      ctx.lineTo(cx + 7, ny + npc.h - 8); ctx.lineTo(cx - 7, ny + npc.h - 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = this.darkenHex(c.jacket, 10); ctx.fillRect(cx - 7, ny + 13, 3, npc.h - 21);
      ctx.fillStyle = c.jacket; ctx.fillRect(cx - 10, ny + 14, 3, 10); ctx.fillRect(cx + 7, ny + 14, 3, 10);
      ctx.fillStyle = c.skin; ctx.fillRect(cx - 10, ny + 22, 3, 3); ctx.fillRect(cx + 7, ny + 22, 3, 3); ctx.fillRect(cx - 2, ny + 10, 4, 3);
      ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(cx, ny + 7, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.hair; ctx.beginPath(); ctx.arc(cx, ny + 5, 8, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 6, ny + 3, 12, 2);
      ctx.fillStyle = '#1a1a2a'; ctx.beginPath(); ctx.arc(cx - 3, ny + 8, 1.5, 0, Math.PI * 2); ctx.arc(cx + 3, ny + 8, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(cx - 2.5, ny + 7.5, 0.4, 0, Math.PI * 2); ctx.arc(cx + 3.5, ny + 7.5, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.font = '7px sans-serif'; ctx.textAlign = 'center';
      const label = `${npc.name} / ${npc.nameZh}`, tw = ctx.measureText(label).width;
      ctx.fillRect(cx - tw / 2 - 4, npc.y - 22, tw + 8, 10);
      ctx.fillStyle = '#00d9ff'; ctx.fillText(label, cx, npc.y - 14);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player, a = this.appearance;
    const cx = p.x + p.w / 2;
    const walkCycle = p.isMoving ? Math.sin(p.walkPhase) : 0;
    const bob = p.isMoving ? Math.abs(Math.sin(p.walkPhase)) * 1.5 : 0;
    const py = p.y + bob;
    const hf = p.hitFlash > 0;

    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(cx, p.y + p.h + 2, p.w / 2 + 1, 5, 0, 0, Math.PI * 2); ctx.fill();

    const skinColor = hf ? '#fff' : '#e0b890';
    const hairColor = a ? (HAIR_COLORS[a.hairColor] ?? '#3a2818') : '#3a2818';
    const eyeColor = a ? (EYE_COLORS[a.eyeColor] ?? '#1a1a2a') : '#1a1a2a';
    const tunic = hf ? '#fff' : '#2a3a5a';
    const tunicShade = hf ? '#fff' : '#1a2a4a';

    if (a?.specialFeatures === 'Tail') {
      const tailSway = Math.sin(p.walkPhase * 0.5) * 4;
      ctx.fillStyle = hf ? '#fff' : tunic;
      ctx.beginPath(); ctx.moveTo(cx - 6, py + p.h - 14);
      ctx.quadraticCurveTo(cx - 14 + tailSway, py + p.h - 10, cx - 12 + tailSway, py + p.h - 2);
      ctx.quadraticCurveTo(cx - 8 + tailSway, py + p.h + 2, cx - 4, py + p.h - 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = hf ? '#fff' : this.lightenHex(tunic, 20);
      ctx.beginPath(); ctx.arc(cx - 12 + tailSway, py + p.h - 2, 3, 0, Math.PI * 2); ctx.fill();
    }

    if (a?.specialFeatures === 'Wings') {
      const wingFlap = Math.sin(this.frame * 0.15) * 3;
      ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = hf ? '#fff' : 'rgba(200,210,230,0.7)';
      ctx.beginPath(); ctx.moveTo(cx - 8, py + 14);
      ctx.quadraticCurveTo(cx - 20 - wingFlap, py + 8, cx - 18 - wingFlap, py + 22);
      ctx.quadraticCurveTo(cx - 14, py + 20, cx - 8, py + 18); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 8, py + 14);
      ctx.quadraticCurveTo(cx + 20 + wingFlap, py + 8, cx + 18 + wingFlap, py + 22);
      ctx.quadraticCurveTo(cx + 14, py + 20, cx + 8, py + 18); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hf ? '#fff' : 'rgba(150,160,180,0.5)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx - 8, py + 14); ctx.lineTo(cx - 16 - wingFlap, py + 18);
      ctx.moveTo(cx + 8, py + 14); ctx.lineTo(cx + 16 + wingFlap, py + 18); ctx.stroke();
      ctx.restore();
    }

    const legY = py + p.h - 8;
    ctx.fillStyle = hf ? '#fff' : '#1a1a2a';
    ctx.fillRect(cx - 6, legY, 5, 8 + Math.abs(walkCycle * 3));
    ctx.fillRect(cx + 1, legY, 5, 8 + Math.abs(-walkCycle * 3));
    ctx.fillStyle = hf ? '#fff' : '#0a0a1a';
    ctx.beginPath(); ctx.ellipse(cx - 3, legY + 8 + Math.abs(walkCycle * 3) + 1, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - 7, legY + 6 + Math.abs(walkCycle * 3), 7, 3);
    ctx.beginPath(); ctx.ellipse(cx + 4, legY + 8 + Math.abs(-walkCycle * 3) + 1, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx + 1, legY + 6 + Math.abs(-walkCycle * 3), 7, 3);
    ctx.fillStyle = hf ? '#fff' : '#000010';
    ctx.fillRect(cx - 7, legY + 9 + Math.abs(walkCycle * 3), 8, 1);
    ctx.fillRect(cx + 1, legY + 9 + Math.abs(-walkCycle * 3), 8, 1);

    ctx.fillStyle = tunic;
    ctx.beginPath(); ctx.moveTo(cx - 9, py + 13); ctx.lineTo(cx + 9, py + 13);
    ctx.lineTo(cx + 8, py + p.h - 8); ctx.lineTo(cx - 8, py + p.h - 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = tunicShade; ctx.fillRect(cx - 8, py + 13, 3, p.h - 21);
    ctx.fillStyle = hf ? '#fff' : '#5a3a20'; ctx.fillRect(cx - 9, py + p.h - 14, 18, 3);
    ctx.fillStyle = hf ? '#fff' : '#c4a030'; ctx.fillRect(cx - 2, py + p.h - 14, 4, 3);

    ctx.fillStyle = tunic; ctx.fillRect(cx - 11, py + 14 + (-walkCycle * 4), 4, 12); ctx.fillRect(cx + 7, py + 14 + (walkCycle * 4), 4, 12);
    ctx.fillStyle = skinColor; ctx.fillRect(cx - 11, py + 24 + (-walkCycle * 4), 4, 3); ctx.fillRect(cx + 7, py + 24 + (walkCycle * 4), 4, 3); ctx.fillRect(cx - 2, py + 10, 4, 4);
    ctx.fillStyle = skinColor; ctx.beginPath(); ctx.arc(cx, py + 7, 8.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = hf ? '#fff' : hairColor;
    const hs = a?.hairStyle ?? 'Short', hl = a?.hairLength ?? 'Medium';
    if (hs === 'Bald') { }
    else if (hs === 'Spiky' || hs === 'Undercut') {
      ctx.beginPath(); ctx.arc(cx, py + 5, 8.5, Math.PI, 0); ctx.fill();
      for (const sx of [-6, -3, 0, 3, 6]) { ctx.beginPath(); ctx.moveTo(cx + sx - 2, py + 3); ctx.lineTo(cx + sx, py - 4 - Math.abs(sx) % 3); ctx.lineTo(cx + sx + 2, py + 3); ctx.closePath(); ctx.fill(); }
    } else if (hs === 'Long' || hl === 'Long' || hl === 'Very Long') {
      const hlp = hl === 'Very Long' ? 20 : 16;
      ctx.beginPath(); ctx.arc(cx, py + 5, 8.5, Math.PI, 0); ctx.fill();
      ctx.fillRect(cx - 8, py + 3, 4, hlp); ctx.fillRect(cx + 4, py + 3, 4, hlp);
      ctx.beginPath(); ctx.arc(cx, py + 6, 8, 0, Math.PI * 2); ctx.fill();
    } else if (hs === 'Curly') {
      for (let i = -7; i <= 7; i += 3) { ctx.beginPath(); ctx.arc(cx + i, py + 4 - Math.abs(i) * 0.2, 4, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.beginPath(); ctx.arc(cx, py + 5, 8.5, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 7, py + 3, 14, 3);
    }

    let eyeOffX = 0, eyeOffY = 0;
    switch (p.facing) { case 'up': eyeOffY = -3; break; case 'down': eyeOffY = 1; break; case 'left': eyeOffX = -2; break; case 'right': eyeOffX = 2; break; }
    if (p.facing !== 'up') {
      ctx.fillStyle = hf ? '#fff' : '#f0f0e8';
      ctx.beginPath(); ctx.ellipse(cx - 3 + eyeOffX, py + 8 + eyeOffY, 2.5, 2, 0, 0, Math.PI * 2); ctx.ellipse(cx + 3 + eyeOffX, py + 8 + eyeOffY, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = eyeColor; ctx.beginPath(); ctx.arc(cx - 3 + eyeOffX, py + 8 + eyeOffY, 1.8, 0, Math.PI * 2); ctx.arc(cx + 3 + eyeOffX, py + 8 + eyeOffY, 1.8, 0, Math.PI * 2); ctx.fill();
      if (a?.eyeColor === 'Heterochromia') { ctx.fillStyle = '#30a040'; ctx.beginPath(); ctx.arc(cx + 3 + eyeOffX, py + 8 + eyeOffY, 1.8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#0a0a10'; ctx.beginPath(); ctx.arc(cx - 3 + eyeOffX, py + 8 + eyeOffY, 0.8, 0, Math.PI * 2); ctx.arc(cx + 3 + eyeOffX, py + 8 + eyeOffY, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(cx - 2.5 + eyeOffX, py + 7.5 + eyeOffY, 0.5, 0, Math.PI * 2); ctx.arc(cx + 3.5 + eyeOffX, py + 7.5 + eyeOffY, 0.5, 0, Math.PI * 2); ctx.fill();
    } else { ctx.fillStyle = hf ? '#fff' : hairColor; ctx.beginPath(); ctx.arc(cx, py + 7, 8.5, 0, Math.PI * 2); ctx.fill(); }

    if (a?.specialFeatures === 'Horns') {
      ctx.fillStyle = hf ? '#fff' : '#9a8a7a';
      ctx.beginPath(); ctx.moveTo(cx - 6, py + 1); ctx.lineTo(cx - 10, py - 7); ctx.lineTo(cx - 3, py + 1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 6, py + 1); ctx.lineTo(cx + 10, py - 7); ctx.lineTo(cx + 3, py + 1); ctx.closePath(); ctx.fill();
    } else if (a?.specialFeatures === 'Pointed Ears') {
      ctx.fillStyle = skinColor;
      ctx.beginPath(); ctx.moveTo(cx - 9, py + 6); ctx.lineTo(cx - 13, py + 2); ctx.lineTo(cx - 8, py + 9); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 9, py + 6); ctx.lineTo(cx + 13, py + 2); ctx.lineTo(cx + 8, py + 9); ctx.closePath(); ctx.fill();
    } else if (a?.specialFeatures === 'Fangs') {
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - 2, py + 11, 1.5, 2.5); ctx.fillRect(cx + 1, py + 11, 1.5, 2.5);
    } else if (a?.specialFeatures === 'Freckles') {
      ctx.fillStyle = hf ? '#fff' : 'rgba(180,140,100,0.5)';
      for (const fx of [-4, -2, 0, 2, 4]) { ctx.beginPath(); ctx.arc(cx + fx, py + 10, 0.7, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + fx - 1, py + 12, 0.5, 0, Math.PI * 2); ctx.fill(); }
    } else if (a?.specialFeatures === 'Glowing Tattoos') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const pulse = Math.sin(this.frame * 0.08) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(100,200,255,${pulse * 0.6})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 6, py + 15); ctx.lineTo(cx - 4, py + 20); ctx.lineTo(cx - 6, py + 25);
      ctx.moveTo(cx + 6, py + 15); ctx.lineTo(cx + 4, py + 20); ctx.lineTo(cx + 6, py + 25); ctx.stroke();
      ctx.fillStyle = `rgba(100,200,255,${pulse * 0.4})`; ctx.beginPath(); ctx.arc(cx - 5, py + 18, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, py + 22, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    if (a?.scars && a.scars !== 'None' && a.scars !== 'Multiple') {
      ctx.strokeStyle = 'rgba(200,120,100,0.7)'; ctx.lineWidth = 1; ctx.beginPath();
      if (a.scars === 'Cheek') { ctx.moveTo(cx - 5 + eyeOffX, py + 9); ctx.lineTo(cx - 3 + eyeOffX, py + 12); }
      else if (a.scars === 'Eye') { ctx.moveTo(cx - 5 + eyeOffX, py + 6); ctx.lineTo(cx - 2 + eyeOffX, py + 10); }
      else if (a.scars === 'Forehead') { ctx.moveTo(cx - 3, py + 2); ctx.lineTo(cx + 2, py + 5); }
      else if (a.scars === 'Arm') { ctx.moveTo(cx - 10, py + 18); ctx.lineTo(cx - 8, py + 22); }
      ctx.stroke();
    } else if (a?.scars === 'Multiple') {
      ctx.strokeStyle = 'rgba(200,120,100,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(cx - 5, py + 4); ctx.lineTo(cx - 2, py + 7); ctx.moveTo(cx + 3, py + 9); ctx.lineTo(cx + 5, py + 12);
      ctx.moveTo(cx - 10, py + 18); ctx.lineTo(cx - 8, py + 22); ctx.stroke();
    }

    if (a?.earrings && a.earrings !== 'None') {
      const ec = '#fde047', es = '#c0c0d0';
      if (a.earrings === 'Studs') { ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(cx - 8, py + 10, 1.2, 0, Math.PI * 2); ctx.arc(cx + 8, py + 10, 1.2, 0, Math.PI * 2); ctx.fill(); }
      else if (a.earrings === 'Hoops') { ctx.strokeStyle = ec; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx - 8, py + 11, 2.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 8, py + 11, 2.5, 0, Math.PI * 2); ctx.stroke(); }
      else if (a.earrings === 'Dangling') { ctx.strokeStyle = ec; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx - 8, py + 10); ctx.lineTo(cx - 8, py + 13); ctx.moveTo(cx + 8, py + 10); ctx.lineTo(cx + 8, py + 13); ctx.stroke(); ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(cx - 8, py + 13.5, 1.5, 0, Math.PI * 2); ctx.arc(cx + 8, py + 13.5, 1.5, 0, Math.PI * 2); ctx.fill(); }
      else if (a.earrings === 'Multiple') { ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(cx - 8, py + 10, 1, 0, Math.PI * 2); ctx.arc(cx + 8, py + 10, 1, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = es; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(cx - 9, py + 12, 2, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 9, py + 12, 2, 0, Math.PI * 2); ctx.stroke(); }
      else if (a.earrings === 'Cuff') { ctx.strokeStyle = es; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx - 8, py + 8, 3, Math.PI * 0.3, Math.PI * 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 8, py + 8, 3, Math.PI * 0.1, Math.PI * 0.7); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(cx - 8, py + 9.5, 0.5, 0, Math.PI * 2); ctx.arc(cx + 8, py + 9.5, 0.5, 0, Math.PI * 2); ctx.fill();
    }

    // Sprint aura
    if (this.sprintActive > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const pulse = Math.sin(this.frame * 0.2) * 0.2 + 0.5;
      ctx.strokeStyle = `rgba(34,211,238,${pulse})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, py + p.h / 2, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(34,211,238,${pulse * 0.1})`; ctx.beginPath(); ctx.arc(cx, py + p.h / 2, 22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (p.attackCooldown > 15) {
      const alpha = (p.attackCooldown - 15) / 10;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = this.skillColor; ctx.globalAlpha = alpha; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, py + p.h / 2, 30, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (p.invincible > 0 && p.invincible % 6 < 3) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(p.x, py, p.w, p.h); }
  }

  private drawEnemies() {
    const ctx = this.ctx;
    for (const e of this.enemies) {
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      const hf = e.hitFlash > 0, stunned = e.state === 'stunned', chasing = e.state === 'chase';
      if (e.dead) {
        const dp = e.deathParticles ?? 0;
        if (dp > 0) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const alpha = dp / 30;
          ctx.fillStyle = `rgba(255,120,40,${alpha * 0.5})`; ctx.beginPath(); ctx.arc(cx, cy, e.w / 2 * (2 - alpha), 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = `rgba(255,180,60,${alpha})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, e.w / 2 * (1.5 - alpha * 0.5), 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        continue;
      }
      if (chasing) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,50,50,0.15)'; ctx.beginPath(); ctx.arc(cx, cy, e.alertRange, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', cx, e.y - 4);
      }
      if (e.variant === 'mechanical') {
        ctx.fillStyle = hf ? '#fff' : stunned ? '#444' : e.color; ctx.fillRect(cx - e.w / 2, cy - e.h / 2, e.w, e.h);
        ctx.fillStyle = hf ? '#fff' : stunned ? '#333' : '#7a8a9a'; ctx.fillRect(cx - e.w / 2 + 2, cy - e.h / 2 + 2, e.w - 4, 4); ctx.fillRect(cx - e.w / 2 + 2, cy + e.h / 2 - 6, e.w - 4, 4);
        ctx.strokeStyle = hf ? '#fff' : '#3a4a5a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy - e.h / 2); ctx.lineTo(cx, cy + e.h / 2); ctx.stroke();
        ctx.fillStyle = hf ? '#fff' : stunned ? '#555' : '#9aaaba'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = hf ? '#fff' : '#3a4a5a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.stroke();
        for (let gi = 0; gi < 6; gi++) { const ga = (Math.PI * 2 * gi) / 6 + this.frame * 0.02; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ga) * 5, cy + Math.sin(ga) * 5); ctx.lineTo(cx + Math.cos(ga) * 8, cy + Math.sin(ga) * 8); ctx.stroke(); }
        ctx.fillStyle = '#2a3a4a';
        for (const ry of [-8, 0, 8]) { ctx.beginPath(); ctx.arc(cx - e.w / 2 + 3, cy + ry, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + e.w / 2 - 3, cy + ry, 1.5, 0, Math.PI * 2); ctx.fill(); }
      } else {
        ctx.fillStyle = hf ? '#fff' : stunned ? '#555' : e.color; ctx.beginPath(); ctx.ellipse(cx, cy, e.w / 2, e.h / 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (!stunned) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const pulse = Math.sin(this.frame * 0.1) * 0.3 + 0.7;
        const glowColor = e.variant === 'mechanical' ? (chasing ? `rgba(255,60,60,${pulse * 0.6})` : `rgba(255,170,40,${pulse * 0.4})`) : (chasing ? `rgba(255,80,80,${pulse * 0.5})` : `rgba(180,100,200,${pulse * 0.3})`);
        ctx.fillStyle = glowColor; ctx.beginPath(); ctx.arc(cx, cy, e.variant === 'mechanical' ? 3 : 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = chasing ? '#ff4444' : stunned ? '#666' : e.variant === 'mechanical' ? '#ff6600' : '#ffaa44';
      if (e.variant === 'mechanical') { ctx.fillRect(cx - 7, cy - e.h / 2 + 7, 4, 2); ctx.fillRect(cx + 3, cy - e.h / 2 + 7, 4, 2); }
      else { ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 1.8, 0, Math.PI * 2); ctx.arc(cx + 4, cy - 2, 1.8, 0, Math.PI * 2); ctx.fill(); }
      if (stunned) { ctx.fillStyle = '#fde047'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.floor(e.stateTimer / 30) % 2 === 0 ? '★ ★' : '☆ ☆', cx, e.y - 4); }
      if (e.hp < e.maxHp && !stunned) { ctx.fillStyle = '#333'; ctx.fillRect(e.x, e.y - 6, e.w, 3); ctx.fillStyle = '#ef4444'; ctx.fillRect(e.x, e.y - 6, e.w * (e.hp / e.maxHp), 3); }
    }
  }

  private drawBoss() {
    if (!this.boss) return;
    const ctx = this.ctx, b = this.boss;
    const sway = Math.sin(b.spritePhase) * 4, by = b.y + sway;
    const hf = b.hitFlash > 0;
    const bodyColor = hf ? '#fff' : '#3a4a6a';
    const coreColor = '#ef4444';
    ctx.fillStyle = bodyColor; ctx.fillRect(b.x, by, b.w, b.h);
    ctx.fillStyle = this.darkenHex(bodyColor, 15); ctx.fillRect(b.x + b.w / 2 - 25, by - 30, 50, 35);
    const pulse = Math.sin(this.frame * 0.1) * 0.3 + 0.7;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `${coreColor}aa`; ctx.beginPath(); ctx.arc(b.x + b.w / 2, by - 12, 12 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = coreColor; ctx.beginPath(); ctx.arc(b.x + b.w / 2, by - 12, 6 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = this.darkenHex(bodyColor, 10); ctx.fillRect(b.x - 15, by + 20, 20, 40); ctx.fillRect(b.x + b.w - 5, by + 20, 20, 40);
    ctx.strokeStyle = coreColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(b.x + 10 + i * 25, by + 10); ctx.lineTo(b.x + 10 + i * 25, by + 50); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  private drawLasers() {
    if (!this.boss) return;
    const ctx = this.ctx;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const laser of this.boss.lasers) {
      if (!laser.active) continue;
      ctx.fillStyle = laser.color; ctx.beginPath(); ctx.arc(laser.x, laser.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = laser.color + '44'; ctx.beginPath(); ctx.arc(laser.x, laser.y, 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  private drawAmbient() {
    const ctx = this.ctx;
    const tod = this.levelData.timeOfDay;
    for (const p of this.ambientParticles) {
      const pulse = Math.sin(p.phase) * 0.3 + 0.7;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (tod === 'night' || tod === 'dusk' || tod === 'storm') {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.opacity * pulse * 0.4; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = p.opacity * pulse * 0.08; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2); ctx.fill();
      } else if (tod === 'blackout') {
        ctx.fillStyle = 'rgba(255,100,50,0.5)'; ctx.globalAlpha = p.opacity * pulse * 0.3; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(200,220,255,0.3)'; ctx.globalAlpha = p.opacity * pulse * 0.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawRain() {
    if (this.levelData.weather !== 'rain' && this.levelData.weather !== 'storm') return;
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(150,180,200,0.3)'; ctx.lineWidth = 1;
    for (const r of this.rainParticles) { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.vx * 2, r.y + r.vy * 2); ctx.stroke(); }
  }

  private drawFog() {
    const ctx = this.ctx;
    const w = this.levelData.weather;
    if (w === 'fog' || this.levelData.timeOfDay === 'night' || this.levelData.timeOfDay === 'blackout') {
      ctx.save(); ctx.globalAlpha = w === 'fog' ? 0.08 : 0.05;
      ctx.fillStyle = this.levelData.timeOfDay === 'blackout' ? '#000' : '#1a1a2a';
      for (let i = 0; i < 3; i++) {
        const fx = (i * 400 + this.frame * 0.2) % (this.levelData.width + 200) - 100;
        const fy = this.levelData.height * 0.6 + Math.sin(this.frame * 0.005 + i) * 30;
        ctx.beginPath(); ctx.ellipse(fx, fy, 150, 50, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawStorm() {
    if (this.levelData.weather !== 'storm') return;
    const ctx = this.ctx;
    if (Math.random() < 0.005) { ctx.fillStyle = 'rgba(200,220,255,0.15)'; ctx.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height); }
  }

  private drawVignette() {
    const ctx = this.ctx;
    const tod = this.levelData.timeOfDay;
    if (tod === 'night' || tod === 'blackout' || tod === 'storm') {
      const grad = ctx.createRadialGradient(this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 4, this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 1.2);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, tod === 'blackout' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private lightenHex(hex: string, amount: number): string {
    const r = Math.min(255, (parseInt(hex.slice(1, 3), 16) || 0) + amount);
    const g = Math.min(255, (parseInt(hex.slice(3, 5), 16) || 0) + amount);
    const b = Math.min(255, (parseInt(hex.slice(5, 7), 16) || 0) + amount);
    return `rgb(${r}, ${g}, ${b})`;
  }
  private darkenHex(hex: string, amount: number): string {
    const r = Math.max(0, (parseInt(hex.slice(1, 3), 16) || 0) - amount);
    const g = Math.max(0, (parseInt(hex.slice(3, 5), 16) || 0) - amount);
    const b = Math.max(0, (parseInt(hex.slice(5, 7), 16) || 0) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // --- Public API ---
  setInput(input: Partial<CityGameInput>) { Object.assign(this.input, input); }
  updateAppearance(ap: CharacterAppearance) { this.appearance = ap; }
  setSkillColor(color: string) { this.skillColor = color; }
  setSkill(skill: SkillType | null) { this.selectedSkill = skill; }
  getUnlockedSkills(): SkillType[] { return Array.from(this.unlockedSkills); }

  clickNpc(canvasX: number, canvasY: number): boolean {
    const wx = canvasX + this.camera.x, wy = canvasY + this.camera.y;
    for (const npc of this.levelData.npcs) {
      if (wx >= npc.x - 10 && wx <= npc.x + npc.w + 10 && wy >= npc.y - 10 && wy <= npc.y + npc.h + 10) {
        this.cb.onNpcTalk(npc.id, npc.name, npc.nameZh, npc.hintEn, npc.hintZh);
        return true;
      }
    }
    return false;
  }

  getPlayerState() { return { ...this.player }; }
  useHealingPotion() {
    if (this.player.hp < this.player.maxHp) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
      this.healingPotionsUsed++;
      this.cb.onHpChange(this.player.hp, this.player.maxHp);
    }
  }
  getCurrentLevelId() { return this.currentLevel; }
  getWrongAttempts() { return this.wrongAttempts; }

  // --- Save / Resume ---
  getSaveState() {
    return {
      level: this.currentLevel,
      playerX: Math.round(this.player.x), playerY: Math.round(this.player.y),
      hp: this.player.hp, maxHp: this.player.maxHp,
      mp: this.player.mp, maxMp: this.player.maxMp,
      energy: this.player.energy, maxEnergy: this.player.maxEnergy,
      exp: this.player.exp, level_stat: this.player.level,
    };
  }

  loadSaveState(state: SaveState) {
    this.initLevel(state.level as CityLevelId);
    this.player.x = state.playerX; this.player.y = state.playerY;
    this.player.hp = state.hp; this.player.maxHp = state.maxHp;
    this.player.mp = state.mp; this.player.maxMp = state.maxMp;
    this.player.energy = state.energy; this.player.maxEnergy = state.maxEnergy;
    this.player.exp = state.exp; this.player.level = state.level_stat;
    this.cb.onHpChange(this.player.hp, this.player.maxHp);
    this.cb.onMpChange(this.player.mp, this.player.maxMp);
    this.cb.onEnergyChange(this.player.energy, this.player.maxEnergy);
  }
}
