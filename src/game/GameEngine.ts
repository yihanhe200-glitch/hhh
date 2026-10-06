import { AREAS, type AreaId, type Player, type GameEnemy, type BossState, type Chest, type RockPuzzle, type Particle, type TransitionState, type AreaData, type NpcData } from './worldData';
import type { CharacterAppearance } from '@/types';

export interface GameCallbacks {
  onHpChange: (hp: number, maxHp: number) => void;
  onMpChange: (mp: number, maxMp: number) => void;
  onExpChange: (exp: number, level: number) => void;
  onAreaChange: (areaId: AreaId, name: string, subtitle: string) => void;
  onTutorial: (text: string) => void;
  onItemPickup: (itemKey: string, itemName: string) => void;
  onBattleStart: (enemyName: string) => void;
  onBattleEnd: (victory: boolean, expGained: number) => void;
  onBossStart: () => void;
  onBossPhaseChange: (phase: number) => void;
  onBossDefeated: () => void;
  onPuzzleSolved: () => void;
  onMessage: (text: string) => void;
  onPlayerDeath: () => void;
  onNpcTalk: (npc: NpcData) => void;
}

export interface GameInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  interact: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: GameCallbacks;
  private input: GameInput = { up: false, down: false, left: false, right: false, attack: false, interact: false };

  private currentArea: AreaId = 0;
  private camera = { x: 0, y: 0 };
  private player: Player;
  private enemies: GameEnemy[] = [];
  private boss: BossState | null = null;
  private chests: Chest[] = [];
  private puzzle: RockPuzzle | null = null;
  private particles: Particle[] = [];
  private transition: TransitionState = { active: false, alpha: 0, targetArea: 0, direction: 'out' };
  private ambientParticles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; phase: number }[] = [];
  private frame = 0;
  private running = false;
  private bossTriggered = false;
  private bossDefeatedHandled = false;
  private rafId = 0;
  private appearance: CharacterAppearance | null = null;
  private currentNpcs: NpcData[] = [];
  private skillColor: string = '#a7f3d0';

  // Tutorial flags
  private tutorialsShown = new Set<number>();

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks, appearance?: CharacterAppearance) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cb = cb;
    this.appearance = appearance ?? null;
    this.player = {
      x: 420, y: 300, w: 28, h: 36, speed: 3,
      hp: 100, maxHp: 100, mp: 50, maxMp: 50,
      attack: 15, attackCooldown: 0, attackRange: 50,
      hitFlash: 0, invincible: 0,
      exp: 0, level: 1,
      facing: 'down', walkPhase: 0, isMoving: false,
    };
    this.initArea(0);
  }

  setInput(input: Partial<GameInput>) {
    Object.assign(this.input, input);
  }

  updateAppearance(ap: CharacterAppearance) {
    this.appearance = ap;
  }

  setSkillColor(color: string) {
    this.skillColor = color;
  }

  clickNpc(canvasX: number, canvasY: number): boolean {
    const worldX = canvasX + this.camera.x;
    const worldY = canvasY + this.camera.y;
    for (const npc of this.currentNpcs) {
      if (worldX >= npc.x - 10 && worldX <= npc.x + npc.w + 10 &&
          worldY >= npc.y - 10 && worldY <= npc.y + npc.h + 10) {
        this.cb.onNpcTalk(npc);
        return true;
      }
    }
    return false;
  }

  getSkillColor() {
    return this.skillColor;
  }

  start() {
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  getCanvasSize() {
    return { w: this.canvas.width, h: this.canvas.height };
  }

  private initArea(areaId: AreaId) {
    const area = AREAS[areaId];
    this.currentArea = areaId;
    this.enemies = [];
    this.boss = null;
    this.chests = [];
    this.puzzle = null;
    this.bossTriggered = false;
    this.bossDefeatedHandled = false;
    this.currentNpcs = area.npcs ? [...area.npcs] : [];

    // Ambient particles
    this.ambientParticles = [];
    const pCount = areaId === 3 ? 30 : areaId === 2 ? 22 : 16;
    for (let i = 0; i < pCount; i++) {
      this.ambientParticles.push({
        x: Math.random() * area.width,
        y: Math.random() * area.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Area-specific setup
    if (areaId === 1) {
      // Forest Path — Forest Slimes
      this.enemies = [
        this.createEnemy('forest_slime', 400, 250, 's1'),
        this.createEnemy('forest_slime', 600, 320, 's2'),
        this.createEnemy('forest_slime', 750, 220, 's3'),
      ];
    }

    if (areaId === 2) {
      // Creek Area — puzzle + chest
      this.puzzle = {
        rockX: 380, rockY: 250, rockW: 45, rockH: 40,
        logX: 480, logY: 300, logW: 70, logH: 20,
        logMoved: false, pathCleared: false,
      };
      this.chests = [
        { x: 700, y: 380, w: 40, h: 32, opened: false, itemKey: 'small_healing_potion', itemName: 'Small Healing Potion' },
      ];
    }

    if (areaId === 3) {
      // Deep Forest — Forest Wolves + slimes
      this.enemies = [
        this.createEnemy('forest_wolf', 350, 250, 'w1'),
        this.createEnemy('forest_slime', 550, 350, 's4'),
        this.createEnemy('forest_wolf', 750, 280, 'w2'),
      ];
    }

    if (areaId === 4) {
      // Boss Area — setup boss on trigger
    }

    this.cb.onAreaChange(areaId, area.name, area.subtitle);
    this.showAreaTutorial(areaId);
  }

  private createEnemy(type: 'forest_slime' | 'forest_wolf', x: number, y: number, id: string): GameEnemy {
    const isSlime = type === 'forest_slime';
    return {
      id,
      type,
      name: isSlime ? 'Forest Slime' : 'Forest Wolf',
      hp: isSlime ? 30 : 45,
      maxHp: isSlime ? 30 : 45,
      attack: isSlime ? 5 : 8,
      x, y,
      w: isSlime ? 32 : 36,
      h: isSlime ? 26 : 32,
      vx: 0, vy: 0,
      hitFlash: 0,
      isAlive: true,
      expReward: isSlime ? 15 : 25,
      attackCooldown: 0,
      spritePhase: Math.random() * Math.PI * 2,
    };
  }

  private showAreaTutorial(areaId: AreaId) {
    if (this.tutorialsShown.has(areaId)) return;
    this.tutorialsShown.add(areaId);
    switch (areaId) {
      case 0:
        this.cb.onTutorial('Welcome to Whispering Forest! Use WASD or Arrow Keys to move. Press E near the edge to enter the forest path.');
        break;
      case 1:
        this.cb.onTutorial('Forest Slimes ahead! Press SPACE to attack. Defeat them to gain EXP.');
        break;
      case 2:
        this.cb.onTutorial('A rock blocks the path. Press E near the log to push it aside and clear the way!');
        break;
      case 3:
        this.cb.onTutorial('The trees glow with strange symbols... Forest Wolves patrol here. Be careful!');
        break;
      case 4:
        this.cb.onTutorial('A massive ancient tree stands in the clearing. Step forward to challenge the Forest Guardian...');
        break;
    }
  }

  private loop = () => {
    if (!this.running) return;
    this.frame++;
    this.update();
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update() {
    if (this.transition.active) {
      this.updateTransition();
      return;
    }

    this.updatePlayer();
    this.updateEnemies();
    this.updateBoss();
    this.updateParticles();
    this.updateAmbient();
    this.updateCamera();

    // Check area transitions
    const area = AREAS[this.currentArea];
    for (const conn of area.connections) {
      if (this.player.x + this.player.w > conn.fromX && this.player.x < conn.fromX + 30) {
        if (this.input.right || (conn.fromX < 100 && this.input.left)) {
          this.startTransition(conn.toArea, conn.spawnX, conn.spawnY);
          return;
        }
      }
    }

    // Check NPC interactions
    if (this.input.interact) {
      for (const npc of this.currentNpcs) {
        const dx = Math.abs(this.player.x - npc.x);
        const dy = Math.abs(this.player.y - npc.y);
        if (dx < 55 && dy < 55) {
          this.cb.onNpcTalk(npc);
          this.input.interact = false;
          return;
        }
      }

      // Check chest interactions
      for (const chest of this.chests) {
        if (chest.opened) continue;
        const dx = Math.abs(this.player.x - chest.x);
        const dy = Math.abs(this.player.y - chest.y);
        if (dx < 60 && dy < 60) {
          chest.opened = true;
          this.cb.onItemPickup(chest.itemKey, chest.itemName);
          this.spawnPickupParticles(chest.x + 20, chest.y);
          this.input.interact = false;
        }
      }

      // Check puzzle interaction
      if (this.puzzle && !this.puzzle.logMoved) {
        const dx = Math.abs(this.player.x - this.puzzle.logX);
        const dy = Math.abs(this.player.y - this.puzzle.logY);
        if (dx < 50 && dy < 50) {
          this.puzzle.logMoved = true;
          this.puzzle.pathCleared = true;
          this.cb.onPuzzleSolved();
          this.spawnPickupParticles(this.puzzle.logX, this.puzzle.logY);
          this.input.interact = false;
        }
      }
    }

    // Boss trigger in area 4
    if (this.currentArea === 4 && !this.bossTriggered && this.player.x > 300) {
      this.bossTriggered = true;
      this.boss = {
        name: 'Forest Guardian',
        hp: 200, maxHp: 200, attack: 10,
        phase: 1, x: 580, y: 240, w: 80, h: 100,
        attackCooldown: 90, hitFlash: 0,
        vineCooldown: 180, vines: [], isDefeated: false,
        spritePhase: 0,
      };
      this.cb.onBossStart();
    }

    if (this.boss && this.boss.isDefeated && !this.bossDefeatedHandled) {
      this.bossDefeatedHandled = true;
      this.cb.onBossDefeated();
    }
  }

  private updateTransition() {
    if (this.transition.direction === 'out') {
      this.transition.alpha += 0.04;
      if (this.transition.alpha >= 1) {
        this.transition.alpha = 1;
        this.currentArea = this.transition.targetArea;
        this.initArea(this.transition.targetArea);
        // Set player position
        this.player.x = this.transition.targetArea === 0 ? 830 : 40;
        this.player.y = 280;
        this.transition.direction = 'in';
      }
    } else {
      this.transition.alpha -= 0.04;
      if (this.transition.alpha <= 0) {
        this.transition.alpha = 0;
        this.transition.active = false;
      }
    }
  }

  private startTransition(toArea: AreaId, spawnX: number, spawnY: number) {
    this.transition.active = true;
    this.transition.direction = 'out';
    this.transition.alpha = 0;
    this.transition.targetArea = toArea;
    // Store spawn position for use after transition completes
    this.pendingSpawn = { x: spawnX, y: spawnY };
  }

  private pendingSpawn: { x: number; y: number } | null = null;

  private updatePlayer() {
    const p = this.player;
    p.isMoving = false;

    let dx = 0, dy = 0;
    if (this.input.up) { dy -= 1; p.facing = 'up'; p.isMoving = true; }
    if (this.input.down) { dy += 1; p.facing = 'down'; p.isMoving = true; }
    if (this.input.left) { dx -= 1; p.facing = 'left'; p.isMoving = true; }
    if (this.input.right) { dx += 1; p.facing = 'right'; p.isMoving = true; }

    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    const area = AREAS[this.currentArea];
    const newX = p.x + dx * p.speed;
    const newY = p.y + dy * p.speed;

    // Bounds
    const minX = 20;
    const maxX = area.width - p.w - 20;
    const minY = 110;
    const maxY = area.height - p.h - 30;

    p.x = Math.max(minX, Math.min(maxX, newX));
    p.y = Math.max(minY, Math.min(maxY, newY));

    // Tree collision
    for (const tree of area.trees) {
      if (this.rectCollide(p.x, p.y, p.w, p.h, tree.x + 10, tree.y + tree.h - 30, tree.w - 20, 30)) {
        p.x = newX - dx * p.speed;
        p.y = newY - dy * p.speed;
        if (dx !== 0 && this.rectCollide(p.x, p.y, p.w, p.h, tree.x + 10, tree.y + tree.h - 30, tree.w - 20, 30)) {
          p.x = p.x - dx * p.speed;
        }
        if (dy !== 0 && this.rectCollide(p.x, p.y, p.w, p.h, tree.x + 10, tree.y + tree.h - 30, tree.w - 20, 30)) {
          p.y = p.y - dy * p.speed;
        }
      }
    }

    // Rock collision
    for (const rock of area.rocks) {
      if (this.rectCollide(p.x, p.y, p.w, p.h, rock.x, rock.y, rock.w, rock.h)) {
        p.x = newX - dx * p.speed;
        p.y = newY - dy * p.speed;
      }
    }

    // Puzzle rock collision
    if (this.puzzle && !this.puzzle.pathCleared) {
      if (this.rectCollide(p.x, p.y, p.w, p.h, this.puzzle.rockX, this.puzzle.rockY, this.puzzle.rockW, this.puzzle.rockH)) {
        p.x = newX - dx * p.speed;
        p.y = newY - dy * p.speed;
      }
      // Water blocks passage
      if (AREAS[this.currentArea].waterAreas) {
        for (const water of AREAS[this.currentArea].waterAreas!) {
          if (this.rectCollide(p.x, p.y, p.w, p.h, water.x, water.y, water.w, water.h)) {
            p.x = newX - dx * p.speed;
            p.y = newY - dy * p.speed;
          }
        }
      }
    }

    // Walk animation
    if (p.isMoving) {
      p.walkPhase += 0.2;
    } else {
      p.walkPhase *= 0.9;
    }

    // Attack
    if (p.attackCooldown > 0) p.attackCooldown--;
    if (this.input.attack && p.attackCooldown <= 0) {
      p.attackCooldown = 25;
      this.performAttack();
    }

    // Hit flash
    if (p.hitFlash > 0) p.hitFlash--;
    if (p.invincible > 0) p.invincible--;

    // Regen MP slowly
    if (this.frame % 60 === 0 && p.mp < p.maxMp) {
      p.mp = Math.min(p.maxMp, p.mp + 1);
      this.cb.onMpChange(p.mp, p.maxMp);
    }
  }

  private performAttack() {
    const p = this.player;
    const range = p.attackRange;
    let ax = p.x, ay = p.y, aw = range, ah = range;

    switch (p.facing) {
      case 'up': ay = p.y - range; ax = p.x + p.w / 2 - range / 2; break;
      case 'down': ay = p.y + p.h; ax = p.x + p.w / 2 - range / 2; break;
      case 'left': ax = p.x - range; ay = p.y + p.h / 2 - range / 2; break;
      case 'right': ax = p.x + p.w; ay = p.y + p.h / 2 - range / 2; break;
    }

    // Attack particles — colored by current skill
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: ax + aw / 2 + (Math.random() - 0.5) * 30,
        y: ay + ah / 2 + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 15, maxLife: 15,
        color: this.skillColor, size: 3, type: 'spark',
      });
    }

    // Hit enemies
    for (const e of this.enemies) {
      if (!e.isAlive) continue;
      if (this.rectCollide(ax, ay, aw, ah, e.x, e.y, e.w, e.h)) {
        e.hp -= p.attack;
        e.hitFlash = 10;
        e.vx = (e.x - p.x) * 0.1;
        e.vy = (e.y - p.y) * 0.1;
        this.spawnDamageText(e.x + e.w / 2, e.y, p.attack);
        if (e.hp <= 0) {
          e.isAlive = false;
          this.player.exp += e.expReward;
          this.spawnDeathParticles(e.x + e.w / 2, e.y + e.h / 2);
          this.checkLevelUp();
          this.cb.onExpChange(this.player.exp, this.player.level);
        }
      }
    }

    // Hit boss
    if (this.boss && !this.boss.isDefeated) {
      if (this.rectCollide(ax, ay, aw, ah, this.boss.x, this.boss.y, this.boss.w, this.boss.h)) {
        this.boss.hp -= p.attack;
        this.boss.hitFlash = 10;
        this.spawnDamageText(this.boss.x + this.boss.w / 2, this.boss.y, p.attack);
        // Phase transition
        if (this.boss.hp <= this.boss.maxHp / 2 && this.boss.phase === 1) {
          this.boss.phase = 2;
          this.cb.onBossPhaseChange(2);
        }
        if (this.boss.hp <= 0) {
          this.boss.hp = 0;
          this.boss.isDefeated = true;
          this.player.exp += 100;
          this.checkLevelUp();
          this.cb.onExpChange(this.player.exp, this.player.level);
          this.spawnDeathParticles(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2);
        }
      }
    }
  }

  private checkLevelUp() {
    const needed = this.player.level * 50;
    if (this.player.exp >= needed) {
      this.player.level++;
      this.player.exp -= needed;
      this.player.maxHp += 20;
      this.player.hp = this.player.maxHp;
      this.player.maxMp += 10;
      this.player.mp = this.player.maxMp;
      this.player.attack += 5;
      this.cb.onHpChange(this.player.hp, this.player.maxHp);
      this.cb.onMpChange(this.player.mp, this.player.maxMp);
      this.cb.onMessage(`Level Up! You are now Level ${this.player.level}!`);
      this.spawnHealParticles(this.player.x + this.player.w / 2, this.player.y);
    }
  }

  private updateEnemies() {
    for (const e of this.enemies) {
      if (!e.isAlive) continue;
      e.spritePhase += 0.05;

      // Apply knockback
      e.x += e.vx;
      e.y += e.vy;
      e.vx *= 0.85;
      e.vy *= 0.85;

      // Simple AI — move toward player if within range
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 200) {
        const speed = e.type === 'forest_wolf' ? 1.5 : 0.8;
        if (dist > 30) {
          e.x += (dx / dist) * speed;
          e.y += (dy / dist) * speed;
        }
      }

      // Attack player
      if (e.attackCooldown > 0) e.attackCooldown--;
      if (dist < 40 && e.attackCooldown <= 0 && this.player.invincible <= 0) {
        e.attackCooldown = 60;
        this.player.hp -= e.attack;
        this.player.hitFlash = 15;
        this.player.invincible = 30;
        this.spawnDamageText(this.player.x + this.player.w / 2, this.player.y, e.attack, '#fca5a5');
        this.cb.onHpChange(this.player.hp, this.player.maxHp);
        if (this.player.hp <= 0) {
          this.player.hp = 0;
          this.cb.onPlayerDeath();
        }
      }

      if (e.hitFlash > 0) e.hitFlash--;
    }
  }

  private updateBoss() {
    if (!this.boss || this.boss.isDefeated) return;
    const b = this.boss;
    b.spritePhase += 0.03;

    if (b.hitFlash > 0) b.hitFlash--;
    if (b.attackCooldown > 0) b.attackCooldown--;

    // Boss movement — slow approach
    const dx = this.player.x - b.x;
    const dist = Math.abs(dx);
    if (dist > 80) {
      b.x += Math.sign(dx) * 0.5;
    }

    // Phase 1: simple attacks
    // Phase 2: vine summon + faster attacks
    if (b.attackCooldown <= 0) {
      const playerDist = Math.sqrt(dx * dx + (this.player.y - b.y) ** 2);
      if (playerDist < 100 && this.player.invincible <= 0) {
        b.attackCooldown = b.phase === 2 ? 50 : 80;
        this.player.hp -= b.attack;
        this.player.hitFlash = 15;
        this.player.invincible = 30;
        this.spawnDamageText(this.player.x + this.player.w / 2, this.player.y, b.attack, '#fca5a5');
        this.cb.onHpChange(this.player.hp, this.player.maxHp);
        if (this.player.hp <= 0) {
          this.player.hp = 0;
          this.cb.onPlayerDeath();
        }
      }
    }

    // Vine attacks (phase 2)
    if (b.phase === 2) {
      if (b.vineCooldown > 0) b.vineCooldown--;
      if (b.vineCooldown <= 0) {
        b.vineCooldown = 120;
        // Spawn 2-3 vines near player
        const count = 3;
        for (let i = 0; i < count; i++) {
          const vx = this.player.x + (Math.random() - 0.5) * 150;
          const vy = this.player.y + (Math.random() - 0.5) * 100;
          b.vines.push({
            x: vx, y: vy, w: 30, h: 40,
            active: false, warningTime: 60,
            activeTime: 0, hit: false,
          });
        }
      }

      for (const vine of b.vines) {
        if (vine.warningTime > 0) {
          vine.warningTime--;
          if (vine.warningTime <= 0) {
            vine.active = true;
            vine.activeTime = 40;
          }
        } else if (vine.activeTime > 0) {
          vine.activeTime--;
          if (!vine.hit && this.player.invincible <= 0) {
            if (this.rectCollide(this.player.x, this.player.y, this.player.w, this.player.h, vine.x, vine.y, vine.w, vine.h)) {
              vine.hit = true;
              this.player.hp -= b.attack - 2;
              this.player.hitFlash = 15;
              this.player.invincible = 30;
              this.spawnDamageText(this.player.x + this.player.w / 2, this.player.y, b.attack - 2, '#fca5a5');
              this.cb.onHpChange(this.player.hp, this.player.maxHp);
              if (this.player.hp <= 0) {
                this.player.hp = 0;
                this.cb.onPlayerDeath();
              }
            }
          }
        }
      }
      b.vines = b.vines.filter(v => v.warningTime > 0 || v.activeTime > 0);
    }
  }

  private updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.type === 'damage') {
        p.vy += 0.1;
      } else if (p.type === 'heal') {
        p.vy -= 0.2;
      }
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateAmbient() {
    for (const p of this.ambientParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.phase += 0.02;
      if (p.y < -10) { p.y = AREAS[this.currentArea].height + 10; p.x = Math.random() * AREAS[this.currentArea].width; }
      if (p.x < -10) p.x = AREAS[this.currentArea].width;
      if (p.x > AREAS[this.currentArea].width + 10) p.x = 0;
    }
  }

  private updateCamera() {
    const area = AREAS[this.currentArea];
    const targetX = this.player.x - this.canvas.width / 2 + this.player.w / 2;
    const targetY = this.player.y - this.canvas.height / 2 + this.player.h / 2;
    this.camera.x += (Math.max(0, Math.min(area.width - this.canvas.width, targetX)) - this.camera.x) * 0.1;
    this.camera.y += (Math.max(0, Math.min(area.height - this.canvas.height, targetY)) - this.camera.y) * 0.1;

    // If area is smaller than canvas, center it
    if (area.width <= this.canvas.width) this.camera.x = (area.width - this.canvas.width) / 2;
    if (area.height <= this.canvas.height) this.camera.y = (area.height - this.canvas.height) / 2;
  }

  private spawnDamageText(x: number, y: number, amount: number, color = '#fde047') {
    this.particles.push({
      x, y, vx: (Math.random() - 0.5) * 1, vy: -2,
      life: 40, maxLife: 40, color, size: 16, type: 'damage', text: `-${amount}`,
    });
  }

  private spawnDeathParticles(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 30, maxLife: 30,
        color: '#86efac', size: 4, type: 'spark',
      });
    }
  }

  private spawnPickupParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 1,
        life: 35, maxLife: 35,
        color: '#fde047', size: 3, type: 'spark',
      });
    }
  }

  private spawnHealParticles(x: number, y: number) {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 1,
        vy: -Math.random() * 2 - 0.5,
        life: 40, maxLife: 40,
        color: '#4ade80', size: 4, type: 'heal',
      });
    }
  }

  private rectCollide(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  // --- Rendering ---

  private render() {
    const ctx = this.ctx;
    const area = AREAS[this.currentArea];

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // Sky gradient background
    this.drawSky(area);

    // Distant background trees (depth layer)
    this.drawBackgroundTrees(area);

    // Ground texture
    this.drawGround(area);

    // Sun rays (light shafts through canopy)
    this.drawSunRays(area);

    // Water
    if (area.waterAreas) {
      for (const water of area.waterAreas) {
        this.drawWater(water.x, water.y, water.w, water.h);
      }
    }

    // Grass patches
    for (const g of area.grassPatches) {
      this.drawGrass(g.x, g.y, g.w, g.h);
    }

    // Decorations (behind trees)
    for (const d of area.decorations) {
      this.drawDecoration(d.x, d.y, d.type, d.variant);
    }

    // Trees
    for (const tree of area.trees) {
      this.drawTree(tree.x, tree.y, tree.w, tree.h, tree.variant);
    }

    // Glowing symbols (Deep Forest)
    if (area.hasGlowingSymbols) {
      this.drawGlowingSymbols();
    }

    // Rocks
    for (const rock of area.rocks) {
      this.drawRock(rock.x, rock.y, rock.w, rock.h);
    }

    // Puzzle
    if (this.puzzle) {
      this.drawPuzzle();
    }

    // Chests
    for (const chest of this.chests) {
      this.drawChest(chest);
    }

    // Area transition indicators
    for (const conn of area.connections) {
      this.drawTransitionArrow(conn.fromX, conn.fromX < 100);
    }

    // Enemies
    for (const e of this.enemies) {
      if (e.isAlive) this.drawEnemy(e);
    }

    // Boss
    if (this.boss) this.drawBoss(this.boss);

    // NPCs
    for (const npc of this.currentNpcs) {
      this.drawNpc(npc);
    }

    // Player
    this.drawPlayer();

    // Particles
    for (const p of this.particles) {
      this.drawParticle(p);
    }

    // Ambient particles (fireflies / pollen)
    this.drawAmbient();

    // Fog overlay — soft mist near bottom
    this.drawFog(area);

    ctx.restore();

    // Transition overlay
    if (this.transition.active) {
      ctx.fillStyle = `rgba(0,0,0,${this.transition.alpha})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private drawSky(area: AreaData) {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, area.height);
    // Dreamy gradient — warmer at top (sun direction), cooler at bottom
    const topColor = this.lightenColor(area.bgColor, 25);
    const midColor = this.lightenColor(area.bgColor, 10);
    grad.addColorStop(0, topColor);
    grad.addColorStop(0.4, midColor);
    grad.addColorStop(1, area.bgColor);
    ctx.fillStyle = grad;
    ctx.fillRect(this.camera.x - 20, this.camera.y - 20, this.canvas.width + 40, this.canvas.height + 40);
  }

  private drawBackgroundTrees(area: AreaData) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.25;
    const offsetY = -20;
    const treeColors = ['#0a2018', '#0c1e16', '#0a1c14'];
    for (let i = 0; i < 8; i++) {
      const x = (i * 180 + 60) % area.width;
      const w = 80 + (i % 3) * 20;
      const h = 120 + (i % 2) * 30;
      ctx.fillStyle = treeColors[i % 3];
      // Trunk
      ctx.fillRect(x + w / 2 - 6, offsetY + h - 40, 12, 40);
      // Canopy — multiple overlapping circles for organic shape
      const cy = offsetY + h / 2 - 15;
      ctx.beginPath();
      ctx.arc(x + w / 2, cy, w / 2, 0, Math.PI * 2);
      ctx.arc(x + w / 2 - 15, cy + 10, w / 3, 0, Math.PI * 2);
      ctx.arc(x + w / 2 + 15, cy + 5, w / 3, 0, Math.PI * 2);
      ctx.arc(x + w / 2, cy - 15, w / 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSunRays(area: AreaData) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rayCount = 5;
    const drift = Math.sin(this.frame * 0.003) * 15;
    for (let i = 0; i < rayCount; i++) {
      const x = (area.width / rayCount) * i + 80 + drift;
      const alpha = 0.04 + Math.sin(this.frame * 0.01 + i) * 0.02;
      ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 80, 0);
      ctx.lineTo(x + 140, area.height);
      ctx.lineTo(x + 20, area.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFog(area: AreaData) {
    const ctx = this.ctx;
    ctx.save();
    const drift = Math.sin(this.frame * 0.002) * 20;
    // Bottom fog
    const grad = ctx.createLinearGradient(0, area.height - 120, 0, area.height);
    grad.addColorStop(0, 'rgba(180, 210, 200, 0)');
    grad.addColorStop(0.5, 'rgba(180, 210, 200, 0.06)');
    grad.addColorStop(1, 'rgba(200, 220, 210, 0.12)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.camera.x - 20, area.height - 120 + drift, this.canvas.width + 40, 140);
    // Mid fog patches
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = 'rgba(200, 220, 210, 1)';
    for (let i = 0; i < 4; i++) {
      const fx = (i * 280 + this.frame * 0.1) % (area.width + 200) - 100;
      const fy = area.height * 0.55 + Math.sin(this.frame * 0.005 + i) * 20;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 120, 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGround(area: AreaData) {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, area.height);
    grad.addColorStop(0, this.lightenColor(area.bgColor, 5));
    grad.addColorStop(0.3, this.lightenColor(area.bgColor, 12));
    grad.addColorStop(0.7, this.lightenColor(area.bgColor, 4));
    grad.addColorStop(1, area.bgColor);
    ctx.fillStyle = grad;
    ctx.fillRect(this.camera.x - 20, this.camera.y - 20, this.canvas.width + 40, this.canvas.height + 40);

    // Forest floor — scattered leaves and pebbles
    for (let i = 0; i < 80; i++) {
      const px = (i * 137.5) % area.width;
      const py = (i * 73.3) % area.height;
      const sz = 1.5 + (i % 3);
      // Tiny fallen leaves
      ctx.fillStyle = i % 4 === 0 ? 'rgba(120, 90, 50, 0.25)' : i % 4 === 1 ? 'rgba(60, 80, 45, 0.25)' : 'rgba(45, 55, 40, 0.3)';
      ctx.beginPath();
      ctx.ellipse(px, py, sz * 1.5, sz, (i * 0.3) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // Soft dappled light spots on ground
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const lx = (i * 200 + 100 + Math.sin(this.frame * 0.004 + i) * 10) % area.width;
      const ly = (i * 130 + 80) % (area.height - 100) + 50;
      const la = 0.025 + Math.sin(this.frame * 0.008 + i) * 0.015;
      ctx.fillStyle = `rgba(255, 240, 200, ${la})`;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 50, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGrass(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    // Soft ground patch
    const grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w / 2);
    grad.addColorStop(0, 'rgba(44, 90, 55, 0.35)');
    grad.addColorStop(1, 'rgba(34, 70, 45, 0.1)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lush grass blades — more blades, varied heights
    const sway = Math.sin(this.frame * 0.025) * 2.5;
    const blades = Math.floor(w / 8);
    for (let i = 0; i < blades; i++) {
      const gx = x + (w / blades) * i + 3;
      const bh = h * (0.6 + (i % 3) * 0.15);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(90, 160, 100, 0.45)' : 'rgba(70, 130, 85, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gx, y + h);
      ctx.quadraticCurveTo(gx + sway, y + h / 2, gx + sway * 1.5, y + h - bh);
      ctx.stroke();
      // Tip highlight
      ctx.fillStyle = 'rgba(130, 200, 130, 0.3)';
      ctx.beginPath();
      ctx.arc(gx + sway * 1.5, y + h - bh, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTree(x: number, y: number, w: number, h: number, variant: number) {
    const ctx = this.ctx;
    const cx = x + w / 2;
    const sway = Math.sin(this.frame * 0.01 + x * 0.01) * 1.5;

    // Trunk — tapered with bark texture
    const trunkW = 14;
    const trunkH = h - 35;
    ctx.fillStyle = '#3a2515';
    ctx.beginPath();
    ctx.moveTo(cx - trunkW / 2, y + h);
    ctx.lineTo(cx - trunkW / 2 + 2, y + h - trunkH);
    ctx.lineTo(cx + trunkW / 2 - 2, y + h - trunkH);
    ctx.lineTo(cx + trunkW / 2, y + h);
    ctx.closePath();
    ctx.fill();
    // Bark shadow
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(cx - trunkW / 2, y + h - trunkH, 4, trunkH);
    // Bark lines
    ctx.strokeStyle = 'rgba(20, 12, 5, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - trunkW / 2 + 3 + i * 3, y + h - trunkH + 5);
      ctx.lineTo(cx - trunkW / 2 + 4 + i * 3, y + h - 5);
      ctx.stroke();
    }

    // Roots flare
    ctx.fillStyle = '#3a2515';
    ctx.beginPath();
    ctx.ellipse(cx - 6, y + h, 8, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 6, y + h, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Canopy — dreamy layered organic shape
    const cy = y + h / 2 - 10 + sway;
    const canopyDark = variant === 0 ? '#143820' : '#103020';
    const canopyMid = variant === 0 ? '#1d5030' : '#1a4028';
    const canopyLight = variant === 0 ? '#2d7045' : '#285a38';
    const canopyHL = variant === 0 ? '#3a8a55' : '#356d42';

    // Outer canopy — large organic blob
    ctx.fillStyle = canopyDark;
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
    ctx.arc(cx - w / 3, cy + 8, w / 3, 0, Math.PI * 2);
    ctx.arc(cx + w / 3, cy + 6, w / 3, 0, Math.PI * 2);
    ctx.arc(cx, cy - w / 4, w / 3, 0, Math.PI * 2);
    ctx.fill();

    // Mid layer
    ctx.fillStyle = canopyMid;
    ctx.beginPath();
    ctx.arc(cx - w / 8, cy - h / 8, w / 2.5, 0, Math.PI * 2);
    ctx.arc(cx + w / 6, cy - h / 12, w / 3, 0, Math.PI * 2);
    ctx.fill();

    // Light highlights (sunlit side)
    ctx.fillStyle = canopyLight;
    ctx.beginPath();
    ctx.arc(cx - w / 5, cy - h / 5, w / 4, 0, Math.PI * 2);
    ctx.fill();

    // Bright spot
    ctx.fillStyle = canopyHL;
    ctx.beginPath();
    ctx.arc(cx - w / 4, cy - h / 4, w / 6, 0, Math.PI * 2);
    ctx.fill();

    // Magical glow rim
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(100, 200, 130, 0.06)';
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawRock(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    ctx.fillStyle = '#4a4a52';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a5a62';
    ctx.beginPath();
    ctx.ellipse(x + w / 3, y + h / 3, w / 3, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWater(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    // Base water — dreamy teal gradient
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, 'rgba(40, 100, 130, 0.55)');
    grad.addColorStop(0.5, 'rgba(30, 80, 110, 0.5)');
    grad.addColorStop(1, 'rgba(25, 65, 90, 0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Inner glow
    const wave = Math.sin(this.frame * 0.03) * 3;
    ctx.fillStyle = 'rgba(60, 130, 170, 0.2)';
    ctx.fillRect(x + 5, y + 5 + wave, w - 10, h - 10);

    // Shimmer lines — animated
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(150, 220, 250, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const wy = y + 20 + i * 40 + wave;
      const offset = Math.sin(this.frame * 0.04 + i) * 8;
      ctx.moveTo(x + 5, wy);
      ctx.quadraticCurveTo(x + w / 2 + offset, wy - 3, x + w - 5, wy);
      ctx.stroke();
    }
    ctx.restore();

    // Sparkle highlights
    for (let i = 0; i < 3; i++) {
      const sx = x + 10 + (i * w / 3) + Math.sin(this.frame * 0.05 + i * 2) * 5;
      const sy = y + 30 + i * 60 + wave;
      const sparkle = Math.sin(this.frame * 0.08 + i) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(200, 240, 255, ${sparkle * 0.3})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bank edges
    ctx.fillStyle = 'rgba(60, 80, 50, 0.3)';
    ctx.fillRect(x - 3, y, 6, h);
    ctx.fillRect(x + w - 3, y, 6, h);
  }

  private drawDecoration(x: number, y: number, type: string, variant: number) {
    const ctx = this.ctx;
    switch (type) {
      case 'campfire': {
        const flicker = Math.sin(this.frame * 0.2) * 0.3 + 0.7;
        ctx.fillStyle = '#3d2817';
        ctx.fillRect(x - 15, y + 10, 30, 8);
        ctx.fillStyle = `rgba(255, ${100 + flicker * 80}, 30, ${flicker})`;
        ctx.beginPath();
        ctx.moveTo(x, y - 15);
        ctx.quadraticCurveTo(x - 8, y, x - 5, y + 10);
        ctx.lineTo(x + 5, y + 10);
        ctx.quadraticCurveTo(x + 8, y, x, y - 15);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 200, 50, ${flicker * 0.6})`;
        ctx.beginPath();
        ctx.arc(x, y + 5, 20, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'tent': {
        ctx.fillStyle = variant === 0 ? '#5a4030' : '#4a3825';
        ctx.beginPath();
        ctx.moveTo(x - 20, y + 25);
        ctx.lineTo(x, y - 15);
        ctx.lineTo(x + 20, y + 25);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3a2820';
        ctx.beginPath();
        ctx.moveTo(x, y - 15);
        ctx.lineTo(x + 20, y + 25);
        ctx.lineTo(x - 5, y + 25);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'bush': {
        const bushColors = variant === 0 ? ['#1a4028', '#224a30'] : ['#153820', '#1d4028'];
        // Base bush — overlapping organic blobs
        ctx.fillStyle = bushColors[0];
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.arc(x - 12, y + 5, 12, 0, Math.PI * 2);
        ctx.arc(x + 12, y + 5, 12, 0, Math.PI * 2);
        ctx.arc(x, y - 5, 14, 0, Math.PI * 2);
        ctx.fill();
        // Light highlight
        ctx.fillStyle = bushColors[1];
        ctx.beginPath();
        ctx.arc(x - 4, y - 4, 10, 0, Math.PI * 2);
        ctx.fill();
        // Small berries
        ctx.fillStyle = variant === 0 ? 'rgba(200, 80, 100, 0.6)' : 'rgba(120, 160, 220, 0.5)';
        ctx.beginPath();
        ctx.arc(x - 6, y + 2, 2, 0, Math.PI * 2);
        ctx.arc(x + 8, y + 4, 2, 0, Math.PI * 2);
        ctx.arc(x + 2, y - 8, 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'flower': {
        const colors = ['#f472b6', '#fbbf24', '#a78bfa', '#fb923c'];
        const fc = colors[variant % colors.length];
        const sway = Math.sin(this.frame * 0.03 + x * 0.01) * 1.5;
        // Stem
        ctx.strokeStyle = 'rgba(50, 100, 60, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y + 12);
        ctx.quadraticCurveTo(x + sway, y + 5, x + sway, y);
        ctx.stroke();
        // Petals
        ctx.fillStyle = fc;
        const fx = x + sway;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6;
          ctx.beginPath();
          ctx.ellipse(fx + Math.cos(angle) * 5, y - 2 + Math.sin(angle) * 5, 4, 3, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        // Center
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(fx, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `${fc}33`;
        ctx.beginPath();
        ctx.arc(fx, y - 2, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'mushroom': {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x - 3, y, 6, 12);
        ctx.fillStyle = variant === 0 ? '#dc2626' : '#e11d48';
        ctx.beginPath();
        ctx.arc(x, y, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x - 4, y - 3, 2, 0, Math.PI * 2);
        ctx.arc(x + 3, y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'glow_spot': {
        const pulse = Math.sin(this.frame * 0.03 + variant) * 0.3 + 0.7;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Large soft glow
        ctx.fillStyle = `rgba(100, 220, 150, ${pulse * 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.fill();
        // Medium glow
        ctx.fillStyle = `rgba(130, 240, 170, ${pulse * 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        // Bright core
        ctx.fillStyle = `rgba(180, 255, 200, ${pulse * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
    }
  }

  private drawGlowingSymbols() {
    const ctx = this.ctx;
    const area = AREAS[this.currentArea];
    const pulse = Math.sin(this.frame * 0.04) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(100, 255, 150, ${pulse * 0.5})`;
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    const symbols = ['✦', '✧', '◈', '❂'];
    // Draw on some trees
    for (let i = 0; i < area.trees.length; i += 2) {
      const tree = area.trees[i];
      ctx.fillText(symbols[i % symbols.length], tree.x + tree.w / 2, tree.y + tree.h / 2);
    }
    // Glow
    ctx.fillStyle = `rgba(100, 255, 150, ${pulse * 0.1})`;
    for (let i = 0; i < area.trees.length; i += 2) {
      const tree = area.trees[i];
      ctx.beginPath();
      ctx.arc(tree.x + tree.w / 2, tree.y + tree.h / 2, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPuzzle() {
    if (!this.puzzle) return;
    const ctx = this.ctx;
    // Rock
    if (!this.puzzle.pathCleared) {
      this.drawRock(this.puzzle.rockX, this.puzzle.rockY, this.puzzle.rockW, this.puzzle.rockH);
    }
    // Log
    if (!this.puzzle.logMoved) {
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(this.puzzle.logX, this.puzzle.logY, this.puzzle.logW, this.puzzle.logH);
      ctx.fillStyle = '#4a3018';
      ctx.beginPath();
      ctx.arc(this.puzzle.logX, this.puzzle.logY + this.puzzle.logH / 2, this.puzzle.logH / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.puzzle.logX + this.puzzle.logW, this.puzzle.logY + this.puzzle.logH / 2, this.puzzle.logH / 2, 0, Math.PI * 2);
      ctx.fill();
      // Rings on log ends
      ctx.strokeStyle = '#3a2010';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.puzzle.logX, this.puzzle.logY + this.puzzle.logH / 2, this.puzzle.logH / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.puzzle.logX + this.puzzle.logW, this.puzzle.logY + this.puzzle.logH / 2, this.puzzle.logH / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawChest(chest: Chest) {
    const ctx = this.ctx;
    if (chest.opened) {
      ctx.fillStyle = '#4a3010';
      ctx.fillRect(chest.x, chest.y + 8, chest.w, chest.h - 8);
      ctx.fillStyle = '#3a2008';
      ctx.fillRect(chest.x + 3, chest.y, chest.w - 6, 10);
    } else {
      const pulse = Math.sin(this.frame * 0.05) * 0.3 + 0.7;
      // Glow
      ctx.fillStyle = `rgba(253, 224, 71, ${pulse * 0.15})`;
      ctx.beginPath();
      ctx.arc(chest.x + chest.w / 2, chest.y + chest.h / 2, 30, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = '#6a4a20';
      ctx.fillRect(chest.x, chest.y + 8, chest.w, chest.h - 8);
      ctx.fillStyle = '#5a3a18';
      ctx.fillRect(chest.x + 3, chest.y, chest.w - 6, 12);
      // Lock
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(chest.x + chest.w / 2 - 4, chest.y + 8, 8, 6);
    }
  }

  private drawTransitionArrow(x: number, isLeft: boolean) {
    const ctx = this.ctx;
    const pulse = Math.sin(this.frame * 0.06) * 0.3 + 0.7;
    const y = 280;
    ctx.fillStyle = `rgba(150, 200, 255, ${pulse * 0.4})`;
    ctx.beginPath();
    if (isLeft) {
      ctx.moveTo(x + 20, y - 15);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x + 20, y + 15);
    } else {
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x + 15, y);
      ctx.lineTo(x, y + 15);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawEnemy(e: GameEnemy) {
    const ctx = this.ctx;
    const bob = Math.sin(e.spritePhase) * 3;
    const ey = e.y + bob;
    const hf = e.hitFlash > 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, e.y + e.h + 1, e.w / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (e.type === 'forest_slime') {
      // Cute slime — gelatinous, translucent
      const slimeColor = hf ? '#fff' : '#5dd97a';
      const slimeLight = hf ? '#fff' : '#7ee89a';
      const slimeDark = hf ? '#fff' : '#3ab85a';
      // Body — rounded blob
      ctx.fillStyle = slimeColor;
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 2, ey + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bottom shade
      ctx.fillStyle = slimeDark;
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 2, ey + e.h / 2 + 4, e.w / 2 - 2, e.h / 3, 0, 0, Math.PI);
      ctx.fill();
      // Top highlight — glossy
      ctx.fillStyle = slimeLight;
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 3, ey + e.h / 4, e.w / 5, e.h / 7, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Shine spot
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 3 - 1, ey + e.h / 5, 2, 0, Math.PI * 2);
      ctx.fill();
      // Eyes — cute, expressive
      ctx.fillStyle = '#1a1a2a';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2 - 6, ey + e.h / 2 - 1, 2.5, 0, Math.PI * 2);
      ctx.arc(e.x + e.w / 2 + 6, ey + e.h / 2 - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2 - 5.5, ey + e.h / 2 - 1.5, 0.8, 0, Math.PI * 2);
      ctx.arc(e.x + e.w / 2 + 6.5, ey + e.h / 2 - 1.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
      // Little mouth
      ctx.strokeStyle = '#1a1a2a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2, ey + e.h / 2 + 4, 2, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else {
      // Wolf — stylized, not scary
      const wolfColor = hf ? '#fff' : '#8a9aaa';
      const wolfLight = hf ? '#fff' : '#a0b5c5';
      const wolfDark = hf ? '#fff' : '#6a7a8a';
      // Body
      ctx.fillStyle = wolfColor;
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 2, ey + e.h / 2 + 2, e.w / 2, e.h / 2 - 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Belly
      ctx.fillStyle = wolfLight;
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 2, ey + e.h / 2 + 4, e.w / 3, e.h / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = wolfColor;
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2, ey + e.h / 4, e.w / 3, 0, Math.PI * 2);
      ctx.fill();
      // Ears — pointed
      ctx.fillStyle = wolfDark;
      ctx.beginPath();
      ctx.moveTo(e.x + 6, ey + 2);
      ctx.lineTo(e.x + 10, ey - 8);
      ctx.lineTo(e.x + 15, ey + 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(e.x + e.w - 15, ey + 2);
      ctx.lineTo(e.x + e.w - 10, ey - 8);
      ctx.lineTo(e.x + e.w - 6, ey + 2);
      ctx.closePath();
      ctx.fill();
      // Inner ears
      ctx.fillStyle = wolfLight;
      ctx.beginPath();
      ctx.moveTo(e.x + 8, ey);
      ctx.lineTo(e.x + 10, ey - 5);
      ctx.lineTo(e.x + 12, ey);
      ctx.closePath();
      ctx.fill();
      // Eyes — amber, not menacing
      ctx.fillStyle = '#d4a830';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2 - 6, ey + e.h / 4, 2.5, 0, Math.PI * 2);
      ctx.arc(e.x + e.w / 2 + 6, ey + e.h / 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a2a';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2 - 6, ey + e.h / 4, 1, 0, Math.PI * 2);
      ctx.arc(e.x + e.w / 2 + 6, ey + e.h / 4, 1, 0, Math.PI * 2);
      ctx.fill();
      // Nose
      ctx.fillStyle = '#3a3a4a';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2, ey + e.h / 4 + 4, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // HP bar — rounded, cleaner
    const hpRatio = e.hp / e.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(e.x - 1, ey - 9, e.w + 2, 5, 2);
    ctx.fill();
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
    ctx.beginPath();
    ctx.roundRect(e.x, ey - 8, e.w * hpRatio, 3, 1.5);
    ctx.fill();
  }

  private drawBoss(b: BossState) {
    const ctx = this.ctx;
    const sway = Math.sin(b.spritePhase) * 5;

    // Vines (phase 2)
    for (const vine of b.vines) {
      if (vine.warningTime > 0) {
        const warningAlpha = (1 - vine.warningTime / 60) * 0.5;
        ctx.fillStyle = `rgba(220, 50, 50, ${warningAlpha})`;
        ctx.beginPath();
        ctx.arc(vine.x + vine.w / 2, vine.y + vine.h / 2, vine.w, 0, Math.PI * 2);
        ctx.fill();
      }
      if (vine.active && vine.activeTime > 0) {
        const alpha = vine.activeTime / 40;
        ctx.fillStyle = `rgba(34, 80, 40, ${alpha})`;
        ctx.fillRect(vine.x, vine.y, vine.w, vine.h);
        ctx.strokeStyle = `rgba(74, 140, 90, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(vine.x, vine.y, vine.w, vine.h);
        // Thorns
        ctx.fillStyle = `rgba(50, 100, 55, ${alpha})`;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(vine.x + (vine.w / 3) * i + 5, vine.y);
          ctx.lineTo(vine.x + (vine.w / 3) * i + 8, vine.y - 8);
          ctx.lineTo(vine.x + (vine.w / 3) * i + 11, vine.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // Ancient tree boss
    const bx = b.x;
    const by = b.y + sway;

    // Trunk
    ctx.fillStyle = b.hitFlash > 0 ? '#8b7355' : '#3d2817';
    ctx.fillRect(bx + 20, by + 40, 40, 60);
    ctx.fillStyle = '#2a1c10';
    ctx.fillRect(bx + 20, by + 40, 10, 60);

    // Canopy — large
    ctx.fillStyle = b.hitFlash > 0 ? '#fff' : (b.phase === 2 ? '#1a3a1a' : '#1a4a2a');
    ctx.beginPath();
    ctx.arc(bx + b.w / 2, by + 20, b.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx + b.w / 2 - 20, by + 10, b.w / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx + b.w / 2 + 20, by + 15, b.w / 3, 0, Math.PI * 2);
    ctx.fill();

    // Glowing eyes
    const eyePulse = Math.sin(this.frame * 0.1) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, ${b.phase === 2 ? '50' : '100'}, 50, ${eyePulse})`;
    ctx.beginPath();
    ctx.arc(bx + 30, by + 55, 5, 0, Math.PI * 2);
    ctx.arc(bx + 50, by + 55, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 0, 0, ${eyePulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(bx + 30, by + 55, 12, 0, Math.PI * 2);
    ctx.arc(bx + 50, by + 55, 12, 0, Math.PI * 2);
    ctx.fill();

    // Boss HP bar
    const hpRatio = b.hp / b.maxHp;
    const barW = 200;
    const barX = b.x + b.w / 2 - barW / 2;
    const barY = b.y - 20;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, 10);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(barX, barY, barW, 6);
    ctx.fillStyle = hpRatio > 0.5 ? '#dc2626' : hpRatio > 0.25 ? '#ea580c' : '#991b1b';
    ctx.fillRect(barX, barY, barW * hpRatio, 6);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Forest Guardian — Phase ${b.phase}`, bx + b.w / 2, barY - 5);
  }

  private drawNpc(npc: NpcData) {
    const ctx = this.ctx;
    const bob = Math.sin(this.frame * 0.04 + npc.variant) * 2;
    const ny = npc.y + bob;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(npc.x + npc.w / 2, npc.y + npc.h, npc.w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Interaction indicator
    const dx = Math.abs(this.player.x - npc.x);
    const dy = Math.abs(this.player.y - npc.y);
    if (dx < 80 && dy < 80) {
      const pulse = Math.sin(this.frame * 0.08) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(167, 243, 208, ${pulse * 0.8})`;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press E', npc.x + npc.w / 2, npc.y - 12 + Math.sin(this.frame * 0.05) * 2);
    }

    // Variant-based appearance — richer palette
    const colors = [
      { tunic: '#6b5d4f', tunicShade: '#5a4d3f', hair: '#3a2818', skin: '#e0b890', hairStyle: 'Short' },
      { tunic: '#4a5d3f', tunicShade: '#3a4d2f', hair: '#2a1810', skin: '#d4a574', hairStyle: 'Long' },
      { tunic: '#5a4a6d', tunicShade: '#4a3a5d', hair: '#1a1a2a', skin: '#e0b890', hairStyle: 'Curly' },
      { tunic: '#4a3a5d', tunicShade: '#3a2a4d', hair: '#4a3070', skin: '#d4a574', hairStyle: 'Spiky' },
      { tunic: '#3a4a5d', tunicShade: '#2a3a4d', hair: '#5a4030', skin: '#e0b890', hairStyle: 'Short' },
    ];
    const c = colors[npc.variant % colors.length];
    const ncx = npc.x + npc.w / 2;
    const npcBob = Math.sin(this.frame * 0.03 + npc.variant) * 1;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(ncx, npc.y + npc.h + 2, npc.w / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(ncx - 5, ny + npc.h - 8, 4, 8);
    ctx.fillRect(ncx + 1, ny + npc.h - 8, 4, 8);

    // Body / tunic
    ctx.fillStyle = c.tunic;
    ctx.beginPath();
    ctx.moveTo(ncx - 8, ny + 13);
    ctx.lineTo(ncx + 8, ny + 13);
    ctx.lineTo(ncx + 7, ny + npc.h - 8);
    ctx.lineTo(ncx - 7, ny + npc.h - 8);
    ctx.closePath();
    ctx.fill();
    // Shade
    ctx.fillStyle = c.tunicShade;
    ctx.fillRect(ncx - 7, ny + 13, 3, npc.h - 21);
    // Belt
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(ncx - 8, ny + npc.h - 13, 16, 2);

    // Arms
    ctx.fillStyle = c.tunic;
    ctx.fillRect(ncx - 10, ny + 14, 3, 10);
    ctx.fillRect(ncx + 7, ny + 14, 3, 10);
    ctx.fillStyle = c.skin;
    ctx.fillRect(ncx - 10, ny + 22, 3, 3);
    ctx.fillRect(ncx + 7, ny + 22, 3, 3);

    // Neck
    ctx.fillStyle = c.skin;
    ctx.fillRect(ncx - 2, ny + 10, 4, 3);

    // Head
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(ncx, ny + 7, 8, 0, Math.PI * 2);
    ctx.fill();

    // Hair — style varies by variant
    ctx.fillStyle = c.hair;
    if (c.hairStyle === 'Long') {
      ctx.beginPath();
      ctx.arc(ncx, ny + 5, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(ncx - 7, ny + 3, 3, 14);
      ctx.fillRect(ncx + 4, ny + 3, 3, 14);
    } else if (c.hairStyle === 'Spiky') {
      ctx.beginPath();
      ctx.arc(ncx, ny + 5, 8, Math.PI, 0);
      ctx.fill();
      for (const sx of [-5, -2, 1, 4]) {
        ctx.beginPath();
        ctx.moveTo(ncx + sx - 2, ny + 3);
        ctx.lineTo(ncx + sx, ny - 3);
        ctx.lineTo(ncx + sx + 2, ny + 3);
        ctx.closePath();
        ctx.fill();
      }
    } else if (c.hairStyle === 'Curly') {
      for (let i = -6; i <= 6; i += 3) {
        ctx.beginPath();
        ctx.arc(ncx + i, ny + 4 - Math.abs(i) * 0.2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(ncx, ny + 5, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(ncx - 6, ny + 3, 12, 2);
    }

    // Eyes
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath();
    ctx.arc(ncx - 3, ny + 8, 1.5, 0, Math.PI * 2);
    ctx.arc(ncx + 3, ny + 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(ncx - 2.5, ny + 7.5, 0.4, 0, Math.PI * 2);
    ctx.arc(ncx + 3.5, ny + 7.5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Name label
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const label = `${npc.name} / ${npc.nameZh}`;
    const tw = ctx.measureText(label).width;
    ctx.fillRect(npc.x + npc.w / 2 - tw / 2 - 4, npc.y - 24, tw + 8, 12);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(label, npc.x + npc.w / 2, npc.y - 15);
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    const a = this.appearance;
    const cx = p.x + p.w / 2;

    // Walk animation — limbs swing
    const walkCycle = p.isMoving ? Math.sin(p.walkPhase) : 0;
    const bob = p.isMoving ? Math.abs(Math.sin(p.walkPhase)) * 1.5 : 0;
    const py = p.y + bob;
    const hf = p.hitFlash > 0;

    // --- Shadow (soft, perspective-elliptical) ---
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, p.y + p.h + 2, p.w / 2 + 1, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Color maps from appearance ---
    const hairColorMap: Record<string, string> = {
      Black: '#1a1510', Brown: '#3a2818', Blonde: '#d4a838', Red: '#a83838',
      White: '#e8e8e8', Silver: '#b8b8c8', Blue: '#3070d0', Green: '#30a040',
      Pink: '#e070b0', Purple: '#8040c0',
    };
    const eyeColorMap: Record<string, string> = {
      Brown: '#3a2818', Blue: '#3070d0', Green: '#30a040', Hazel: '#806030',
      Amber: '#d09030', Red: '#c03030', Violet: '#8040c0', Gold: '#d4a830',
      Silver: '#b0b0c0', Heterochromia: '#3070d0',
    };
    const skinColor = hf ? '#fff' : '#e0b890';
    const hairColor = a ? (hairColorMap[a.hairColor] ?? '#3a2818') : '#3a2818';
    const eyeColor = a ? (eyeColorMap[a.eyeColor] ?? '#1a1a2a') : '#1a1a2a';

    // Tunic/clothing colors — adventurer-style
    const tunicColor = hf ? '#fff' : '#3a6a4a';
    const tunicShade = hf ? '#fff' : '#2a5a3a';
    const tunicLight = hf ? '#fff' : '#4a8a5a';

    // --- TAIL (behind body, before legs) ---
    if (a?.specialFeatures === 'Tail') {
      const tailSway = Math.sin(p.walkPhase * 0.5) * 4;
      ctx.fillStyle = hf ? '#fff' : tunicColor;
      ctx.beginPath();
      ctx.moveTo(cx - 6, py + p.h - 14);
      ctx.quadraticCurveTo(cx - 14 + tailSway, py + p.h - 10, cx - 12 + tailSway, py + p.h - 2);
      ctx.quadraticCurveTo(cx - 8 + tailSway, py + p.h + 2, cx - 4, py + p.h - 8);
      ctx.closePath();
      ctx.fill();
      // Tail tip
      ctx.fillStyle = hf ? '#fff' : tunicLight;
      ctx.beginPath();
      ctx.arc(cx - 12 + tailSway, py + p.h - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- WINGS (behind body) ---
    if (a?.specialFeatures === 'Wings') {
      const wingFlap = Math.sin(this.frame * 0.15) * 3;
      ctx.save();
      ctx.globalAlpha = 0.8;
      // Left wing
      ctx.fillStyle = hf ? '#fff' : 'rgba(200, 210, 230, 0.7)';
      ctx.beginPath();
      ctx.moveTo(cx - 8, py + 14);
      ctx.quadraticCurveTo(cx - 20 - wingFlap, py + 8, cx - 18 - wingFlap, py + 22);
      ctx.quadraticCurveTo(cx - 14, py + 20, cx - 8, py + 18);
      ctx.closePath();
      ctx.fill();
      // Right wing
      ctx.beginPath();
      ctx.moveTo(cx + 8, py + 14);
      ctx.quadraticCurveTo(cx + 20 + wingFlap, py + 8, cx + 18 + wingFlap, py + 22);
      ctx.quadraticCurveTo(cx + 14, py + 20, cx + 8, py + 18);
      ctx.closePath();
      ctx.fill();
      // Wing detail lines
      ctx.strokeStyle = hf ? '#fff' : 'rgba(150, 160, 180, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - 8, py + 14); ctx.lineTo(cx - 16 - wingFlap, py + 18);
      ctx.moveTo(cx + 8, py + 14); ctx.lineTo(cx + 16 + wingFlap, py + 18);
      ctx.stroke();
      ctx.restore();
    }

    // --- LEGS ---
    const legY = py + p.h - 8;
    const legSwingL = walkCycle * 3;
    const legSwingR = -walkCycle * 3;
    // Left leg
    ctx.fillStyle = hf ? '#fff' : '#3a2a18';
    ctx.fillRect(cx - 6, legY, 5, 8 + Math.abs(legSwingL));
    // Right leg
    ctx.fillRect(cx + 1, legY, 5, 8 + Math.abs(legSwingR));
    // Feet / boots — proper shoe shape
    ctx.fillStyle = hf ? '#fff' : '#2a1a0a';
    // Left foot
    ctx.beginPath();
    ctx.ellipse(cx - 3, legY + 8 + Math.abs(legSwingL) + 1, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 7, legY + 6 + Math.abs(legSwingL), 7, 3);
    // Right foot
    ctx.beginPath();
    ctx.ellipse(cx + 4, legY + 8 + Math.abs(legSwingR) + 1, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx + 1, legY + 6 + Math.abs(legSwingR), 7, 3);
    // Shoe soles
    ctx.fillStyle = hf ? '#fff' : '#1a0a00';
    ctx.fillRect(cx - 7, legY + 9 + Math.abs(legSwingL), 8, 1);
    ctx.fillRect(cx + 1, legY + 9 + Math.abs(legSwingR), 8, 1);

    // --- BODY / TUNIC ---
    // Torso — slightly tapered, with shading
    ctx.fillStyle = tunicColor;
    ctx.beginPath();
    ctx.moveTo(cx - 9, py + 13);
    ctx.lineTo(cx + 9, py + 13);
    ctx.lineTo(cx + 8, py + p.h - 8);
    ctx.lineTo(cx - 8, py + p.h - 8);
    ctx.closePath();
    ctx.fill();
    // Shaded side
    ctx.fillStyle = tunicShade;
    ctx.fillRect(cx - 8, py + 13, 3, p.h - 21);
    // Belt
    ctx.fillStyle = hf ? '#fff' : '#5a3a20';
    ctx.fillRect(cx - 9, py + p.h - 14, 18, 3);
    // Belt buckle
    ctx.fillStyle = hf ? '#fff' : '#c4a030';
    ctx.fillRect(cx - 2, py + p.h - 14, 4, 3);
    // Collar / chest detail
    ctx.fillStyle = tunicLight;
    ctx.fillRect(cx - 5, py + 13, 10, 3);
    // Center seam
    ctx.strokeStyle = hf ? '#fff' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, py + 16);
    ctx.lineTo(cx, py + p.h - 14);
    ctx.stroke();

    // --- ARMS ---
    const armSwingL = -walkCycle * 4;
    const armSwingR = walkCycle * 4;
    // Left arm
    ctx.fillStyle = tunicColor;
    ctx.fillRect(cx - 11, py + 14 + armSwingL, 4, 12);
    // Right arm
    ctx.fillRect(cx + 7, py + 14 + armSwingR, 4, 12);
    // Hands
    ctx.fillStyle = skinColor;
    ctx.fillRect(cx - 11, py + 24 + armSwingL, 4, 3);
    ctx.fillRect(cx + 7, py + 24 + armSwingR, 4, 3);

    // --- NECK ---
    ctx.fillStyle = skinColor;
    ctx.fillRect(cx - 2, py + 10, 4, 4);

    // --- HEAD ---
    // Face shape — slightly rounded
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(cx, py + 7, 8.5, 0, Math.PI * 2);
    ctx.fill();
    // Face shadow (opposite of light)
    ctx.fillStyle = hf ? '#fff' : 'rgba(160, 120, 80, 0.2)';
    ctx.beginPath();
    ctx.arc(cx + 3, py + 8, 6, 0, Math.PI * 2);
    ctx.fill();

    // --- HAIR ---
    ctx.fillStyle = hf ? '#fff' : hairColor;
    const hairStyle = a?.hairStyle ?? 'Short';
    const hairLen = a?.hairLength ?? 'Medium';

    if (hairStyle === 'Bald') {
      // No hair at all
    } else if (hairStyle === 'Spiky' || hairStyle === 'Undercut') {
      // Spiky hair — triangular peaks
      ctx.beginPath();
      ctx.arc(cx, py + 5, 8.5, Math.PI, 0);
      ctx.fill();
      // Spikes
      const spikes = [-6, -3, 0, 3, 6];
      for (const sx of spikes) {
        ctx.beginPath();
        ctx.moveTo(cx + sx - 2, py + 3);
        ctx.lineTo(cx + sx, py - 4 - Math.abs(sx) % 3);
        ctx.lineTo(cx + sx + 2, py + 3);
        ctx.closePath();
        ctx.fill();
      }
    } else if (hairStyle === 'Long' || hairLen === 'Long' || hairLen === 'Very Long') {
      // Long flowing hair
      const hairLenPx = hairLen === 'Very Long' ? 20 : 16;
      ctx.beginPath();
      ctx.arc(cx, py + 5, 8.5, Math.PI, 0);
      ctx.fill();
      // Side curtains
      ctx.fillRect(cx - 8, py + 3, 4, hairLenPx);
      ctx.fillRect(cx + 4, py + 3, 4, hairLenPx);
      // Back hair
      ctx.beginPath();
      ctx.arc(cx, py + 6, 8, 0, Math.PI * 2);
      ctx.fill();
      // Hair sheen
      ctx.fillStyle = hf ? '#fff' : this.lightenHex(hairColor, 30);
      ctx.beginPath();
      ctx.arc(cx - 3, py + 3, 3, Math.PI, Math.PI * 1.8);
      ctx.fill();
    } else if (hairStyle === 'Curly') {
      // Curly — bumpy outline
      for (let i = -7; i <= 7; i += 3) {
        ctx.beginPath();
        ctx.arc(cx + i, py + 4 - Math.abs(i) * 0.2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Short / default — clean cap
      ctx.beginPath();
      ctx.arc(cx, py + 5, 8.5, Math.PI, 0);
      ctx.fill();
      // Bangs
      ctx.fillRect(cx - 7, py + 3, 14, 3);
      // Hair sheen
      ctx.fillStyle = hf ? '#fff' : this.lightenHex(hairColor, 25);
      ctx.beginPath();
      ctx.arc(cx - 3, py + 3, 3, Math.PI, Math.PI * 1.8);
      ctx.fill();
    }

    // --- EARS ---
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(cx - 8, py + 8, 2, 0, Math.PI * 2);
    ctx.arc(cx + 8, py + 8, 2, 0, Math.PI * 2);
    ctx.fill();

    // --- SPECIAL FEATURES ---
    if (a?.specialFeatures === 'Horns') {
      ctx.fillStyle = hf ? '#fff' : '#9a8a7a';
      ctx.beginPath();
      ctx.moveTo(cx - 6, py + 1);
      ctx.lineTo(cx - 10, py - 7);
      ctx.lineTo(cx - 3, py + 1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 6, py + 1);
      ctx.lineTo(cx + 10, py - 7);
      ctx.lineTo(cx + 3, py + 1);
      ctx.closePath();
      ctx.fill();
      // Horn shading
      ctx.fillStyle = hf ? '#fff' : 'rgba(60,50,40,0.3)';
      ctx.beginPath();
      ctx.moveTo(cx - 6, py + 1); ctx.lineTo(cx - 8, py - 3); ctx.lineTo(cx - 5, py); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 6, py + 1); ctx.lineTo(cx + 8, py - 3); ctx.lineTo(cx + 5, py); ctx.closePath(); ctx.fill();
    } else if (a?.specialFeatures === 'Pointed Ears') {
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.moveTo(cx - 9, py + 6);
      ctx.lineTo(cx - 13, py + 2);
      ctx.lineTo(cx - 8, py + 9);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 9, py + 6);
      ctx.lineTo(cx + 13, py + 2);
      ctx.lineTo(cx + 8, py + 9);
      ctx.closePath();
      ctx.fill();
      // Inner ear
      ctx.fillStyle = hf ? '#fff' : 'rgba(180,140,100,0.4)';
      ctx.beginPath(); ctx.moveTo(cx - 9, py + 6); ctx.lineTo(cx - 11, py + 4); ctx.lineTo(cx - 8, py + 7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 9, py + 6); ctx.lineTo(cx + 11, py + 4); ctx.lineTo(cx + 8, py + 7); ctx.closePath(); ctx.fill();
    } else if (a?.specialFeatures === 'Fangs') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 2, py + 11, 1.5, 2.5);
      ctx.fillRect(cx + 1, py + 11, 1.5, 2.5);
    } else if (a?.specialFeatures === 'Freckles') {
      ctx.fillStyle = hf ? '#fff' : 'rgba(180,140,100,0.5)';
      for (const fx of [-4, -2, 0, 2, 4]) {
        ctx.beginPath(); ctx.arc(cx + fx, py + 10, 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + fx - 1, py + 12, 0.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (a?.specialFeatures === 'Glowing Tattoos') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = Math.sin(this.frame * 0.08) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(100, 200, 255, ${pulse * 0.6})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, py + 15); ctx.lineTo(cx - 4, py + 20); ctx.lineTo(cx - 6, py + 25);
      ctx.moveTo(cx + 6, py + 15); ctx.lineTo(cx + 4, py + 20); ctx.lineTo(cx + 6, py + 25);
      ctx.stroke();
      ctx.fillStyle = `rgba(100, 200, 255, ${pulse * 0.4})`;
      ctx.beginPath(); ctx.arc(cx - 5, py + 18, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, py + 22, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // --- EYES (facing direction) ---
    let eyeOffX = 0, eyeOffY = 0;
    switch (p.facing) {
      case 'up': eyeOffY = -3; break;
      case 'down': eyeOffY = 1; break;
      case 'left': eyeOffX = -2; break;
      case 'right': eyeOffX = 2; break;
    }

    if (p.facing !== 'up') {
      // Eye whites (subtle)
      ctx.fillStyle = hf ? '#fff' : '#f0f0e8';
      ctx.beginPath();
      ctx.ellipse(cx - 3 + eyeOffX, py + 8 + eyeOffY, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 3 + eyeOffX, py + 8 + eyeOffY, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Iris — the actual eye color
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(cx - 3 + eyeOffX, py + 8 + eyeOffY, 1.8, 0, Math.PI * 2);
      ctx.arc(cx + 3 + eyeOffX, py + 8 + eyeOffY, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // Heterochromia — right eye green
      if (a?.eyeColor === 'Heterochromia') {
        ctx.fillStyle = '#30a040';
        ctx.beginPath();
        ctx.arc(cx + 3 + eyeOffX, py + 8 + eyeOffY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      // Pupil
      ctx.fillStyle = '#0a0a10';
      ctx.beginPath();
      ctx.arc(cx - 3 + eyeOffX, py + 8 + eyeOffY, 0.8, 0, Math.PI * 2);
      ctx.arc(cx + 3 + eyeOffX, py + 8 + eyeOffY, 0.8, 0, Math.PI * 2);
      ctx.fill();
      // Eye shine
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(cx - 2.5 + eyeOffX, py + 7.5 + eyeOffY, 0.5, 0, Math.PI * 2);
      ctx.arc(cx + 3.5 + eyeOffX, py + 7.5 + eyeOffY, 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Facing up — show back of head/hair, no eyes
      ctx.fillStyle = hf ? '#fff' : hairColor;
      ctx.beginPath();
      ctx.arc(cx, py + 7, 8.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- EYEBROWS ---
    if (p.facing !== 'up' && a?.specialFeatures !== 'Fangs') {
      ctx.strokeStyle = hf ? '#fff' : this.darkenHex(hairColor, 20);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 5 + eyeOffX, py + 5 + eyeOffY);
      ctx.lineTo(cx - 1 + eyeOffX, py + 5.5 + eyeOffY);
      ctx.moveTo(cx + 1 + eyeOffX, py + 5.5 + eyeOffY);
      ctx.lineTo(cx + 5 + eyeOffX, py + 5 + eyeOffY);
      ctx.stroke();
    }

    // --- MOUTH (subtle expression) ---
    if (p.facing === 'down') {
      ctx.strokeStyle = 'rgba(120, 80, 50, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, py + 11, 2, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }

    // --- GLASSES ---
    if (a?.glasses && a.glasses !== 'None') {
      ctx.strokeStyle = a.glasses === 'Sunglasses' ? '#1a1a2a' : '#2a2a3a';
      ctx.lineWidth = a.glasses === 'Sunglasses' ? 2 : 1.2;
      ctx.beginPath();
      ctx.arc(cx - 3 + eyeOffX, py + 8 + eyeOffY, 3.2, 0, Math.PI * 2);
      ctx.arc(cx + 3 + eyeOffX, py + 8 + eyeOffY, 3.2, 0, Math.PI * 2);
      ctx.moveTo(cx, py + 8 + eyeOffY);
      ctx.lineTo(cx, py + 8 + eyeOffY);
      ctx.stroke();
      if (a.glasses === 'Sunglasses') {
        ctx.fillStyle = 'rgba(20, 20, 30, 0.7)';
        ctx.beginPath();
        ctx.arc(cx - 3 + eyeOffX, py + 8 + eyeOffY, 3, 0, Math.PI * 2);
        ctx.arc(cx + 3 + eyeOffX, py + 8 + eyeOffY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- SCARS ---
    if (a?.scars && a.scars !== 'None' && a.scars !== 'Multiple') {
      ctx.strokeStyle = 'rgba(200, 120, 100, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (a.scars === 'Cheek') { ctx.moveTo(cx - 5 + eyeOffX, py + 9); ctx.lineTo(cx - 3 + eyeOffX, py + 12); }
      else if (a.scars === 'Eye') { ctx.moveTo(cx - 5 + eyeOffX, py + 6); ctx.lineTo(cx - 2 + eyeOffX, py + 10); }
      else if (a.scars === 'Forehead') { ctx.moveTo(cx - 3, py + 2); ctx.lineTo(cx + 2, py + 5); }
      ctx.stroke();
    } else if (a?.scars === 'Multiple') {
      ctx.strokeStyle = 'rgba(200, 120, 100, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, py + 4); ctx.lineTo(cx - 2, py + 7);
      ctx.moveTo(cx + 3, py + 9); ctx.lineTo(cx + 5, py + 12);
      ctx.stroke();
    }

    // --- EARRINGS ---
    if (a?.earrings && a.earrings !== 'None') {
      const earringColor = '#fde047'; // gold default
      const earringSilver = '#c0c0d0';
      if (a.earrings === 'Studs') {
        ctx.fillStyle = earringColor;
        ctx.beginPath(); ctx.arc(cx - 8, py + 10, 1.2, 0, Math.PI * 2); ctx.arc(cx + 8, py + 10, 1.2, 0, Math.PI * 2); ctx.fill();
      } else if (a.earrings === 'Hoops') {
        ctx.strokeStyle = earringColor; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx - 8, py + 11, 2.5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 8, py + 11, 2.5, 0, Math.PI * 2); ctx.stroke();
      } else if (a.earrings === 'Dangling') {
        ctx.strokeStyle = earringColor; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx - 8, py + 10); ctx.lineTo(cx - 8, py + 13); ctx.moveTo(cx + 8, py + 10); ctx.lineTo(cx + 8, py + 13); ctx.stroke();
        ctx.fillStyle = earringColor;
        ctx.beginPath(); ctx.arc(cx - 8, py + 13.5, 1.5, 0, Math.PI * 2); ctx.arc(cx + 8, py + 13.5, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (a.earrings === 'Multiple') {
        ctx.fillStyle = earringColor;
        ctx.beginPath(); ctx.arc(cx - 8, py + 10, 1, 0, Math.PI * 2); ctx.arc(cx + 8, py + 10, 1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = earringSilver; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(cx - 9, py + 12, 2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 9, py + 12, 2, 0, Math.PI * 2); ctx.stroke();
      } else if (a.earrings === 'Cuff') {
        ctx.strokeStyle = earringSilver; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx - 8, py + 8, 3, Math.PI * 0.3, Math.PI * 0.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 8, py + 8, 3, Math.PI * 0.1, Math.PI * 0.7); ctx.stroke();
      }
      // Sparkle on all earring types
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(cx - 8, py + 9.5, 0.5, 0, Math.PI * 2); ctx.arc(cx + 8, py + 9.5, 0.5, 0, Math.PI * 2); ctx.fill();
    }

    // --- ATTACK EFFECT ---
    if (p.attackCooldown > 15) {
      const alpha = (p.attackCooldown - 15) / 10;
      const sc = this.hexToRgb(this.skillColor);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      switch (p.facing) {
        case 'up': ctx.arc(cx, py, p.attackRange / 2, 0, Math.PI); break;
        case 'down': ctx.arc(cx, py + p.h, p.attackRange / 2, Math.PI, 0); break;
        case 'left': ctx.arc(p.x, py + p.h / 2, p.attackRange / 2, -Math.PI / 2, Math.PI / 2); break;
        case 'right': ctx.arc(p.x + p.w, py + p.h / 2, p.attackRange / 2, Math.PI / 2, -Math.PI / 2); break;
      }
      ctx.stroke();
      // Inner glow
      ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${alpha * 0.4})`;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();
    }

    // --- INVINCIBILITY FLASH ---
    if (p.invincible > 0 && p.invincible % 6 < 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(p.x, py, p.w, p.h);
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

  private drawParticle(p: Particle) {
    const ctx = this.ctx;
    const alpha = p.life / p.maxLife;
    if (p.type === 'damage' && p.text) {
      ctx.fillStyle = p.color;
      ctx.font = `bold ${p.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = alpha;
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawAmbient() {
    const ctx = this.ctx;
    const isDeep = this.currentArea === 3;
    const isCreek = this.currentArea === 2;
    for (const p of this.ambientParticles) {
      const pulse = Math.sin(p.phase) * 0.3 + 0.7;
      const color = isDeep ? '150, 255, 180' : isCreek ? '180, 230, 250' : '200, 240, 190';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // Glow halo
      ctx.fillStyle = `rgba(${color}, ${p.opacity * pulse * 0.15})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = `rgba(${color}, ${p.opacity * pulse})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      // Bright center
      ctx.fillStyle = `rgba(255, 255, 240, ${p.opacity * pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private lightenColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.min(255, r + amount);
    const ng = Math.min(255, g + amount);
    const nb = Math.min(255, b + amount);
    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const r = parseInt(hex.slice(1, 3), 16) || 167;
    const g = parseInt(hex.slice(3, 5), 16) || 243;
    const b = parseInt(hex.slice(5, 7), 16) || 208;
    return { r, g, b };
  }

  // Public state accessors for UI
  getPlayerState() {
    return { ...this.player };
  }

  // Use healing potion
  useHealingPotion() {
    if (this.player.hp < this.player.maxHp) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
      this.cb.onHpChange(this.player.hp, this.player.maxHp);
      this.spawnHealParticles(this.player.x + this.player.w / 2, this.player.y);
    }
  }

  isBossDefeated() {
    return this.boss?.isDefeated ?? false;
  }

  areEnemiesCleared() {
    return this.enemies.every(e => !e.isAlive);
  }

  // --- Save / Resume ---
  getSaveState() {
    return {
      area: this.currentArea,
      playerX: Math.round(this.player.x),
      playerY: Math.round(this.player.y),
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      mp: this.player.mp,
      maxMp: this.player.maxMp,
      exp: this.player.exp,
      level: this.player.level,
    };
  }

  loadSaveState(state: { area: number; playerX: number; playerY: number; hp: number; maxHp: number; mp: number; maxMp: number; exp: number; level: number }) {
    this.currentArea = state.area as 0 | 1 | 2 | 3 | 4;
    this.player.x = state.playerX;
    this.player.y = state.playerY;
    this.player.hp = state.hp;
    this.player.maxHp = state.maxHp;
    this.player.mp = state.mp;
    this.player.maxMp = state.maxMp;
    this.player.exp = state.exp;
    this.player.level = state.level;
    this.cb.onHpChange(this.player.hp, this.player.maxHp);
    this.cb.onMpChange(this.player.mp, this.player.maxMp);
  }
}
