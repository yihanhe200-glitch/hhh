import { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, type GameInput } from '@/game/GameEngine';
import type { AreaId, NpcData } from '@/game/worldData';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Character, CharacterAppearance } from '@/types';
import { APPEARANCE_OPTIONS } from '@/types';
import {
  Heart, Zap, Star, X, ArrowLeft, MapPin, Backpack,
  Trophy, Sparkles, Play, ChevronRight, MessageCircle,
  Palette, Sword, Shield, Wand,
} from 'lucide-react';

interface WorldOneProps {
  character: Character;
  onComplete: () => void;
  onExit: () => void;
}

interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'item' | 'battle' | 'puzzle' | 'levelup';
}

interface SkillInfo {
  key: string;
  name: string;
  nameZh: string;
  color: string;
  icon: 'sword' | 'shield' | 'wand';
  descEn: string;
  descZh: string;
}

const SKILLS: SkillInfo[] = [
  { key: 'basic', name: 'Basic Attack', nameZh: '基础攻击', color: '#a7f3d0', icon: 'sword',
    descEn: 'A swift melee strike. No MP cost. Your default attack.',
    descZh: '快速近战打击。不消耗 MP。默认攻击方式。' },
  { key: 'nature_bolt', name: 'Nature Bolt', nameZh: '自然之箭', color: '#4ade80', icon: 'wand',
    descEn: 'Launch a bolt of nature energy. Costs 5 MP. Higher damage than basic attack.',
    descZh: '发射自然能量箭。消耗 5 MP。伤害高于基础攻击。' },
  { key: 'vine_shield', name: 'Vine Shield', nameZh: '树藤护盾', color: '#84cc16', icon: 'shield',
    descEn: 'Wrap vines around you for protection. Costs 8 MP. Reduces incoming damage.',
    descZh: '用树藤缠绕自身进行防护。消耗 8 MP。减少受到的伤害。' },
];

const SKILL_ICONS: Record<string, React.ReactNode> = {
  sword: <Sword className="w-3.5 h-3.5" />,
  shield: <Shield className="w-3.5 h-3.5" />,
  wand: <Wand className="w-3.5 h-3.5" />,
};


export default function WorldOne({ character, onComplete, onExit }: WorldOneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<GameInput>({ up: false, down: false, left: false, right: false, attack: false, interact: false });
  const { session } = useAuth();

  const [hp, setHp] = useState(character.hp);
  const [maxHp, setMaxHp] = useState(character.hp);
  const [mp, setMp] = useState(character.mp);
  const [maxMp, setMaxMp] = useState(character.mp);
  const [exp, setExp] = useState(0);
  const [level, setLevel] = useState(character.level);
  const [areaName, setAreaName] = useState('Starting Camp');
  const [areaSubtitle, setAreaSubtitle] = useState('');
  const [tutorial, setTutorial] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [items, setItems] = useState<{ key: string; name: string; qty: number }[]>([]);
  const [bossActive, setBossActive] = useState(false);
  const [bossPhase, setBossPhase] = useState(1);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [playerDead, setPlayerDead] = useState(false);
  const [worldComplete, setWorldComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [npcDialogue, setNpcDialogue] = useState<NpcData | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string>('basic');
  const [editAppearance, setEditAppearance] = useState(false);
  const [appearanceDraft, setAppearanceDraft] = useState<CharacterAppearance>(character.appearance);

  const toastId = useRef(0);
  const hpRef = useRef(hp);
  const hasPotionRef = useRef(false);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Initialize game engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const engine = new GameEngine(canvas, {
      onHpChange: (h, mh) => {
        setHp(h);
        setMaxHp(mh);
        hpRef.current = h;
      },
      onMpChange: (m, mm) => {
        setMp(m);
        setMaxMp(mm);
      },
      onExpChange: (e, l) => {
        setExp(e);
        setLevel(l);
      },
      onAreaChange: (areaId: AreaId, name: string, subtitle: string) => {
        setAreaName(name);
        setAreaSubtitle(subtitle);
        setBossActive(false);
      },
      onTutorial: (text: string) => {
        setTutorial(text);
        setTimeout(() => setTutorial(null), 6000);
      },
      onItemPickup: (itemKey: string, itemName: string) => {
        setItems((prev) => {
          const existing = prev.find((i) => i.key === itemKey);
          if (existing) {
            return prev.map((i) => i.key === itemKey ? { ...i, qty: i.qty + 1 } : i);
          }
          return [...prev, { key: itemKey, name: itemName, qty: 1 }];
        });
        if (itemKey === 'small_healing_potion') hasPotionRef.current = true;
        addToast(`Obtained: ${itemName}!`, 'item');
      },
      onBattleStart: (enemyName: string) => {
        addToast(`Battle: ${enemyName}!`, 'battle');
      },
      onBattleEnd: (_victory: boolean, _exp: number) => {},
      onBossStart: () => {
        setBossActive(true);
        setBossPhase(1);
        addToast('Forest Guardian appears!', 'battle');
      },
      onBossPhaseChange: (phase: number) => {
        setBossPhase(phase);
        addToast(`Phase 2! The Guardian summons vines!`, 'battle');
      },
      onBossDefeated: () => {
        setBossDefeated(true);
        setBossActive(false);
        addToast('Forest Guardian defeated!', 'battle');
        // Add Nature Core
        setItems((prev) => {
          if (prev.find((i) => i.key === 'nature_core')) return prev;
          return [...prev, { key: 'nature_core', name: 'Nature Core', qty: 1 }];
        });
        addToast('Obtained: Nature Core!', 'item');
        setTimeout(() => setWorldComplete(true), 2000);
      },
      onPuzzleSolved: () => {
        addToast('The log has been pushed aside! The path is clear.', 'puzzle');
      },
      onMessage: (text: string) => {
        addToast(text, 'levelup');
      },
      onPlayerDeath: () => {
        setPlayerDead(true);
      },
      onNpcTalk: (npc: NpcData) => {
        setNpcDialogue(npc);
      },
    }, character.appearance);

    engineRef.current = engine;
    engine.setSkillColor('#a7f3d0');
    engine.start();

    // Load saved progress if it exists
    if (session && character) {
      supabase.from('world_progress')
        .select('*')
        .eq('character_id', character.id)
        .eq('world_number', 1)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.status === 'in_progress' && (data as any).save_data) {
            const saveData = (data as any).save_data;
            if (saveData && saveData.area !== undefined && saveData.area > 0) {
              engine.loadSaveState(saveData);
              addToast('Progress restored! / 进度已恢复！', 'info');
            }
          }
        });
    }

    return () => {
      engine.stop();
      window.removeEventListener('resize', resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (playerDead || worldComplete || paused) return;
      const input = inputRef.current;
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': input.up = true; e.preventDefault(); break;
        case 's': case 'arrowdown': input.down = true; e.preventDefault(); break;
        case 'a': case 'arrowleft': input.left = true; e.preventDefault(); break;
        case 'd': case 'arrowright': input.right = true; e.preventDefault(); break;
        case ' ': input.attack = true; e.preventDefault(); break;
        case 'e': input.interact = true; break;
        case 'i': setShowInventory(v => !v); break;
        case 'c': setShowProfile(v => !v); break;
        case 'escape': setPaused(v => !v); break;
        case 'q': usePotion(); break;
      }
      engineRef.current?.setInput(input);
    };

    const up = (e: KeyboardEvent) => {
      const input = inputRef.current;
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': input.up = false; break;
        case 's': case 'arrowdown': input.down = false; break;
        case 'a': case 'arrowleft': input.left = false; break;
        case 'd': case 'arrowright': input.right = false; break;
        case ' ': input.attack = false; break;
        case 'e': input.interact = false; break;
      }
      engineRef.current?.setInput(input);
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerDead, worldComplete, paused]);

  const usePotion = useCallback(() => {
    if (!hasPotionRef.current) return;
    setItems((prev) => {
      const potion = prev.find((i) => i.key === 'small_healing_potion');
      if (!potion || potion.qty <= 0) {
        hasPotionRef.current = false;
        return prev;
      }
      engineRef.current?.useHealingPotion();
      addToast('Used Small Healing Potion (+40 HP)', 'item');
      const newItems = prev.map((i) =>
        i.key === 'small_healing_potion' ? { ...i, qty: i.qty - 1 } : i
      ).filter((i) => i.qty > 0);
      if (!newItems.find((i) => i.key === 'small_healing_potion')) {
        hasPotionRef.current = false;
      }
      return newItems;
    });
  }, [addToast]);

  const handleSkillChange = useCallback((skillKey: string) => {
    const skill = SKILLS.find(s => s.key === skillKey);
    if (!skill) return;
    setSelectedSkill(skillKey);
    engineRef.current?.setSkillColor(skill.color);
    addToast(`Skill: ${skill.name} / ${skill.nameZh}`, 'info');
  }, [addToast]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (paused || playerDead || worldComplete || npcDialogue) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    engineRef.current?.clickNpc(x, y);
  }, [paused, playerDead, worldComplete, npcDialogue]);

  const applyAppearance = useCallback(() => {
    engineRef.current?.updateAppearance(appearanceDraft);
    addToast('Appearance updated! / 外观已更新！', 'info');
    setEditAppearance(false);
  }, [appearanceDraft, addToast]);

  // Save world completion
  const saveWorldCompletion = useCallback(async () => {
    if (!session || !character) return;
    setSaving(true);

    const engine = engineRef.current;
    const playerState = engine?.getPlayerState();

    // Update character stats
    await supabase
      .from('characters')
      .update({
        hp: playerState?.hp ?? character.hp,
        mp: playerState?.mp ?? character.mp,
        exp: (character.exp ?? 0) + (playerState?.exp ?? 0),
        level: playerState?.level ?? character.level,
        skill_points: (character.skill_points ?? 0) + (playerState ? playerState.level - character.level : 0),
        appearance: appearanceDraft,
      })
      .eq('id', character.id);

    // Update world progress
    await supabase
      .from('world_progress')
      .update({ status: 'completed', updated_at: new Date().toISOString(), save_data: null })
      .eq('character_id', character.id)
      .eq('world_number', 1);

    // Unlock world 2
    await supabase
      .from('world_progress')
      .update({ status: 'available', updated_at: new Date().toISOString() })
      .eq('character_id', character.id)
      .eq('world_number', 2);

    // Save items
    for (const item of items) {
      await supabase
        .from('character_items')
        .upsert({
          character_id: character.id,
          item_key: item.key,
          item_name: item.name,
          item_type: item.key === 'nature_core' ? 'core' : 'potion',
          quantity: item.qty,
          world_source: 1,
        }, { onConflict: 'character_id,item_key' });
    }

    // Save abilities (Nature element abilities from World 1)
    const abilities = [
      { ability_key: 'nature_bolt', ability_name: 'Nature Bolt', ability_type: 'attack', element: 'Nature', power: 15, mp_cost: 5 },
      { ability_key: 'vine_shield', ability_name: 'Vine Shield', ability_type: 'defense', element: 'Nature', power: 10, mp_cost: 8 },
    ];
    for (const ab of abilities) {
      await supabase
        .from('character_abilities')
        .upsert({
          character_id: character.id,
          ...ab,
          world_source: 1,
        }, { onConflict: 'character_id,ability_key' });
    }

    setSaving(false);
    onComplete();
  }, [session, character, items, onComplete, appearanceDraft]);

  const saveProgress = useCallback(async () => {
    if (!session || !character) return;
    const saveState = engineRef.current?.getSaveState();
    if (!saveState) return;
    await supabase.from('world_progress').update({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
      save_data: saveState,
    }).eq('character_id', character.id).eq('world_number', 1);
    await supabase.from('characters').update({
      hp: saveState.hp, mp: saveState.mp, appearance: appearanceDraft,
    }).eq('id', character.id);
  }, [session, character, appearanceDraft]);

  const handleExitWithSave = useCallback(async () => {
    await saveProgress();
    onExit();
  }, [saveProgress, onExit]);

  function handleRespawn() {
    // Reset player and go back to area 0
    setPlayerDead(false);
    if (engineRef.current) {
      // Restart engine — go back to starting camp
      const engine = engineRef.current;
      const p = engine.getPlayerState();
      // We need to reset — simplest is to recreate
      // But since engine manages internally, let's just set HP back
      // For now, exit to player home
      onExit();
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      {/* Canvas */}
      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="block w-full h-full cursor-pointer" onClick={handleCanvasClick} />
      </div>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 sm:p-4 flex items-start justify-between gap-3 pointer-events-none">
        {/* Left: HP/MP/EXP */}
        <div
          className="rounded-xl p-3 space-y-2 min-w-[200px] pointer-events-auto"
          style={{ background: 'rgba(10,14,39,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(51,65,85,0.4)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-200 text-sm font-bold w-16 truncate">{character.name}</span>
            <span className="text-amber-400 text-xs flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400" /> Lv.{level}
            </span>
          </div>
          <StatBar icon={<Heart className="w-3.5 h-3.5 text-red-400" />} value={hp} max={maxHp} color="#ef4444" bg="#7f1d1d" />
          <StatBar icon={<Zap className="w-3.5 h-3.5 text-blue-400" />} value={mp} max={maxMp} color="#3b82f6" bg="#1e3a5f" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-12">EXP</span>
            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all duration-300"
                style={{ width: `${(exp % (level * 50)) / (level * 50) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-400 tabular-nums w-12 text-right">{exp}</span>
          </div>
          {/* Active skill indicator */}
          {(() => {
            const sk = SKILLS.find(s => s.key === selectedSkill);
            if (!sk) return null;
            return (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 w-12">Skill</span>
                <div className="flex-1 flex items-center gap-1.5">
                  <span style={{ color: sk.color }}>{SKILL_ICONS[sk.icon]}</span>
                  <span className="text-xs font-medium" style={{ color: sk.color }}>{sk.name}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Center: Area name */}
        <div className="text-center pointer-events-none mt-1">
          <div
            className="px-4 py-1.5 rounded-lg inline-block"
            style={{ background: 'rgba(10,14,39,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(51,65,85,0.3)' }}
          >
            <p className="text-slate-100 text-sm font-bold tracking-wide">{areaName}</p>
            <p className="text-slate-400 text-xs">{areaSubtitle}</p>
          </div>
        </div>

        {/* Right: Buttons */}
        <div className="flex gap-2 pointer-events-auto">
          <HudButton onClick={() => setShowInventory(true)} icon={<Backpack className="w-4 h-4" />} label="Items" hotkey="I" itemCount={items.length}
            tooltip="Open your inventory to view items, change skills, and customize your appearance" />
          <HudButton onClick={() => setShowProfile(true)} icon={<Sparkles className="w-4 h-4" />} label="Profile" hotkey="C"
            tooltip="View your character's stats, level, HP, MP, and affinity" />
          <HudButton onClick={() => setPaused(true)} icon={<X className="w-4 h-4" />} label="Menu" hotkey="Esc"
            tooltip="Pause the game or exit back to Player Home" />
        </div>
      </div>

      {/* Boss HP bar */}
      {bossActive && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div
            className="px-6 py-2 rounded-xl min-w-[300px]"
            style={{ background: 'rgba(10,14,39,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(220,38,38,0.4)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-red-300 text-sm font-bold">Forest Guardian</span>
              <span className="text-slate-400 text-xs">Phase {bossPhase}/2</span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: '100%', background: bossPhase === 2 ? 'linear-gradient(90deg, #dc2626, #991b1b)' : 'linear-gradient(90deg, #ef4444, #b91c1c)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tutorial popup */}
      {tutorial && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-md w-full px-4">
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: 'rgba(10,14,39,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,111,168,0.4)' }}
          >
            <p className="text-blue-200 text-sm">{tutorial}</p>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="absolute top-32 right-4 z-10 space-y-2 pointer-events-none max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-lg px-4 py-2 text-sm animate-slideIn"
            style={{
              background: t.type === 'battle' ? 'rgba(127,29,29,0.85)' :
                t.type === 'item' ? 'rgba(120,53,15,0.85)' :
                t.type === 'levelup' ? 'rgba(22,101,52,0.85)' :
                t.type === 'puzzle' ? 'rgba(30,58,95,0.85)' :
                'rgba(10,14,39,0.85)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${t.type === 'battle' ? 'rgba(220,38,38,0.3)' :
                t.type === 'item' ? 'rgba(251,191,36,0.3)' :
                t.type === 'levelup' ? 'rgba(34,197,94,0.3)' :
                'rgba(59,111,168,0.3)'}`,
            }}
          >
            {t.type === 'item' && <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-400" />}
            {t.type === 'battle' && <Trophy className="w-3.5 h-3.5 inline mr-1 text-red-400" />}
            <span className="text-slate-100">{t.text}</span>
          </div>
        ))}
      </div>

      {/* Mobile controls */}
      <MobileControls
        onMove={(dir, pressed) => {
          if (paused || playerDead || worldComplete) return;
          const input = inputRef.current;
          input[dir] = pressed;
          engineRef.current?.setInput(input);
        }}
        onAttack={() => {
          if (paused || playerDead || worldComplete) return;
          const input = inputRef.current;
          input.attack = true;
          engineRef.current?.setInput(input);
          setTimeout(() => { input.attack = false; engineRef.current?.setInput(input); }, 50);
        }}
        onInteract={() => {
          if (paused || playerDead || worldComplete) return;
          const input = inputRef.current;
          input.interact = true;
          engineRef.current?.setInput(input);
          setTimeout(() => { input.interact = false; engineRef.current?.setInput(input); }, 50);
        }}
        onPotion={usePotion}
      />

      {/* Inventory modal — items, skills, and appearance */}
      {showInventory && (
        <Modal onClose={() => { setShowInventory(false); setEditAppearance(false); }} title="Inventory" wide>
          {!editAppearance ? (
            <>
              {/* Items section */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Items / 物品</p>
                {items.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No items yet</p>
                ) : (
                  items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.key === 'nature_core' ? 'bg-green-900/40' : 'bg-amber-900/30'
                        }`}>
                          {item.key === 'nature_core'
                            ? <Sparkles className="w-5 h-5 text-green-400" />
                            : <Heart className="w-5 h-5 text-red-400" />}
                        </div>
                        <div>
                          <p className="text-slate-100 text-sm font-medium">{item.name}</p>
                          <p className="text-slate-500 text-xs capitalize">{item.key === 'nature_core' ? 'World Core' : 'Potion'}</p>
                        </div>
                      </div>
                      <span className="text-slate-300 font-bold tabular-nums">×{item.qty}</span>
                    </div>
                  ))
                )}
              </div>

              {hasPotionRef.current && (
                <button
                  onClick={usePotion}
                  className="w-full mt-3 py-2.5 rounded-lg text-white text-sm font-medium transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}
                >
                  Use Healing Potion (Q)
                </button>
              )}

              {/* Skills section */}
              <div className="mt-5 pt-4 border-t border-slate-700/30">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Skills / 技能 — Click to equip</p>
                <div className="space-y-2">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill.key}
                      onClick={() => handleSkillChange(skill.key)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                        selectedSkill === skill.key
                          ? 'bg-slate-700/50 border-slate-500/50'
                          : 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-700/30'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${skill.color}22`, border: `1px solid ${skill.color}44` }}>
                        <span style={{ color: skill.color }}>{SKILL_ICONS[skill.icon]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-slate-100 text-sm font-medium">{skill.name}</p>
                          <span className="text-slate-500 text-xs">{skill.nameZh}</span>
                          {selectedSkill === skill.key && (
                            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded"
                              style={{ color: skill.color, background: `${skill.color}22` }}>Equipped</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">{skill.descEn}</p>
                        <p className="text-slate-500 text-xs">{skill.descZh}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Appearance button */}
              <button
                onClick={() => setEditAppearance(true)}
                className="w-full mt-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed)' }}
              >
                <Palette className="w-4 h-4" />
                Change Appearance / 更换外观
              </button>
            </>
          ) : (
            <AppearanceEditor
              draft={appearanceDraft}
              onChange={setAppearanceDraft}
              onApply={applyAppearance}
              onCancel={() => setEditAppearance(false)}
            />
          )}
        </Modal>
      )}

      {/* Profile modal */}
      {showProfile && (
        <Modal onClose={() => setShowProfile(false)} title="Character">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <ProfileItem label="Name" value={character.name} />
              <ProfileItem label="Level" value={String(level)} />
              <ProfileItem label="HP" value={`${hp} / ${maxHp}`} />
              <ProfileItem label="MP" value={`${mp} / ${maxMp}`} />
              <ProfileItem label="EXP" value={String(exp)} />
              <ProfileItem label="Class" value={character.starting_class || '—'} />
            </div>
            <div className="pt-2 border-t border-slate-700/30">
              <p className="text-xs text-slate-500 mb-1">Primary Affinity</p>
              <p className="text-slate-200">{character.primary_affinity}</p>
            </div>
          </div>
        </Modal>
      )}

      {/* NPC dialogue modal */}
      {npcDialogue && (
        <div className="absolute inset-0 z-40 flex items-end justify-center pb-8 px-4"
          style={{ background: 'rgba(3,4,13,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setNpcDialogue(null)}>
          <div
            className="w-full max-w-lg rounded-2xl p-6 border border-green-700/40"
            style={{ background: 'rgba(10,25,18,0.95)', boxShadow: '0 0 30px rgba(34,197,94,0.15)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-slate-100 font-bold text-lg">{npcDialogue.name}</h3>
                <p className="text-slate-400 text-sm">{npcDialogue.nameZh}</p>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/30">
                <p className="text-xs text-green-400 mb-1 font-medium">English</p>
                <p className="text-slate-200 text-sm leading-relaxed">{npcDialogue.hintEn}</p>
              </div>
              <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/30">
                <p className="text-xs text-green-400 mb-1 font-medium">中文</p>
                <p className="text-slate-200 text-sm leading-relaxed">{npcDialogue.hintZh}</p>
              </div>
            </div>
            <button
              onClick={() => setNpcDialogue(null)}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Pause menu */}
      {paused && !playerDead && !worldComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(3,4,13,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-8 text-center max-w-sm w-full mx-4" style={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(51,65,85,0.4)' }}>
            <h2 className="text-2xl font-bold text-slate-100 mb-6 tracking-wide" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              PAUSED
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setPaused(false)}
                className="w-full py-3 rounded-lg text-white font-medium transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d5a8c)' }}
              >
                Resume
              </button>
              <button
                onClick={handleExitWithSave}
                className="w-full py-3 rounded-lg text-slate-300 bg-slate-800/50 border border-slate-600/30 hover:bg-slate-700/50 transition-all text-sm"
              >
                Save & Exit to Player Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Death screen */}
      {playerDead && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(40,5,5,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="text-center max-w-sm w-full mx-4">
            <h2 className="text-3xl font-bold text-red-400 mb-2 tracking-wide" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
              DEFEATED
            </h2>
            <p className="text-slate-400 mb-6">You have fallen in the Whispering Forest...</p>
            <div className="space-y-3">
              <button
                onClick={handleRespawn}
                className="w-full py-3 rounded-lg text-white font-medium transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d5a8c)' }}
              >
                Return to Camp
              </button>
              <button
                onClick={handleExitWithSave}
                className="w-full py-3 rounded-lg text-slate-300 bg-slate-800/50 border border-slate-600/30 text-sm transition-all"
              >
                Save & Exit to Player Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* World Complete screen */}
      {worldComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(3,4,13,0.85)', backdropFilter: 'blur(6px)' }}>
          <div className="rounded-2xl p-8 text-center max-w-md w-full mx-4"
            style={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 0 40px rgba(34,197,94,0.15)' }}>
            <div className="mb-4">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
              <h2 className="text-3xl font-bold text-slate-100 mb-1 tracking-wide" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
                WORLD 1 COMPLETE
              </h2>
              <p className="text-slate-400 text-sm">Whispering Forest has been conquered</p>
            </div>

            <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4 mb-4 text-left space-y-2">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-700/30">
                <div className="w-10 h-10 rounded-lg bg-green-900/40 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-100 font-medium text-sm">Nature Core</p>
                  <p className="text-slate-500 text-xs">World 1 core reward — unlocked</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">EXP Gained</span>
                <span className="text-amber-400 font-bold">+{exp}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Level</span>
                <span className="text-slate-200 font-bold">{level}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Abilities Unlocked</span>
                <span className="text-green-400 font-medium">Nature Bolt, Vine Shield</span>
              </div>
            </div>

            <button
              onClick={saveWorldCompletion}
              disabled={saving}
              className="w-full py-3.5 rounded-lg text-white font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #15803d, #16a34a)', boxShadow: '0 0 20px rgba(22,163,74,0.3)' }}
            >
              {saving ? 'Saving...' : 'CONTINUE'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// --- UI Sub-components ---

function StatBar({ icon, value, max, color, bg }: { icon: React.ReactNode; value: number; max: number; color: string; bg: string }) {
  const pct = Math.max(0, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0">{icon}</span>
      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: bg }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-300 tabular-nums w-12 text-right">{Math.max(0, Math.ceil(value))}/{max}</span>
    </div>
  );
}

function HudButton({ onClick, icon, label, hotkey, itemCount, tooltip }: {
  onClick: () => void; icon: React.ReactNode; label: string; hotkey: string; itemCount?: number; tooltip?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all active:scale-95"
      style={{ background: 'rgba(10,14,39,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(51,65,85,0.4)' }}
    >
      <span className="text-slate-200">{icon}</span>
      <span className="text-[10px] text-slate-400">{label}</span>
      <span className="text-[8px] text-slate-600">{hotkey}</span>
      {itemCount !== undefined && itemCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
          {itemCount}
        </span>
      )}
      {tooltip && (
        <div className="absolute top-full right-0 mt-1 w-48 rounded-lg p-2.5 text-xs text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-left"
          style={{ background: 'rgba(10,14,39,0.97)', border: '1px solid rgba(51,65,85,0.5)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {tooltip}
        </div>
      )}
    </button>
  );
}

function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,4,13,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} rounded-2xl p-6 max-h-[85vh] overflow-y-auto`}
        style={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(51,65,85,0.4)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-100 tracking-wide" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl px-2">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-200 font-medium">{value}</p>
    </div>
  );
}

function MobileControls({
  onMove, onAttack, onInteract, onPotion,
}: {
  onMove: (dir: 'up' | 'down' | 'left' | 'right', pressed: boolean) => void;
  onAttack: () => void;
  onInteract: () => void;
  onPotion: () => void;
}) {
  const btnClass = "w-12 h-12 rounded-full flex items-center justify-center text-slate-200 active:scale-90 transition-transform select-none touch-none";
  const btnStyle: React.CSSProperties = { background: 'rgba(10,14,39,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(51,65,85,0.4)' };

  return (
    <>
      {/* D-pad — bottom left */}
      <div className="md:hidden absolute bottom-4 left-4 z-10 grid grid-cols-3 gap-1 pointer-events-auto" style={{ touchAction: 'none' }}>
        <div />
        <button className={btnClass} style={btnStyle}
          onTouchStart={(e) => { e.preventDefault(); onMove('up', true); }}
          onTouchEnd={(e) => { e.preventDefault(); onMove('up', false); }}>↑</button>
        <div />
        <button className={btnClass} style={btnStyle}
          onTouchStart={(e) => { e.preventDefault(); onMove('left', true); }}
          onTouchEnd={(e) => { e.preventDefault(); onMove('left', false); }}>←</button>
        <div />
        <button className={btnClass} style={btnStyle}
          onTouchStart={(e) => { e.preventDefault(); onMove('right', true); }}
          onTouchEnd={(e) => { e.preventDefault(); onMove('right', false); }}>→</button>
        <div />
        <button className={btnClass} style={btnStyle}
          onTouchStart={(e) => { e.preventDefault(); onMove('down', true); }}
          onTouchEnd={(e) => { e.preventDefault(); onMove('down', false); }}>↓</button>
        <div />
      </div>

      {/* Action buttons — bottom right */}
      <div className="md:hidden absolute bottom-4 right-4 z-10 flex flex-col gap-2 items-end pointer-events-auto" style={{ touchAction: 'none' }}>
        <div className="flex gap-2">
          <button className="w-11 h-11 rounded-full flex items-center justify-center text-amber-300 text-xs active:scale-90 transition-transform"
            style={{ background: 'rgba(120,53,15,0.7)', border: '1px solid rgba(251,191,36,0.3)' }}
            onTouchStart={(e) => { e.preventDefault(); onPotion(); }}>HP</button>
          <button className="w-11 h-11 rounded-full flex items-center justify-center text-blue-300 text-xs active:scale-90 transition-transform"
            style={{ background: 'rgba(30,58,95,0.7)', border: '1px solid rgba(59,111,168,0.3)' }}
            onTouchStart={(e) => { e.preventDefault(); onInteract(); }}>E</button>
        </div>
        <button className="w-16 h-16 rounded-full flex items-center justify-center text-red-300 text-sm font-bold active:scale-90 transition-transform"
          style={{ background: 'rgba(127,29,29,0.7)', border: '1px solid rgba(220,38,38,0.4)' }}
          onTouchStart={(e) => { e.preventDefault(); onAttack(); }}>ATK</button>
      </div>
    </>
  );
}

function AppearanceEditor({ draft, onChange, onApply, onCancel }: {
  draft: CharacterAppearance;
  onChange: (d: CharacterAppearance) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const hairColorSwatches: Record<string, string> = {
    Black: '#1a1510', Brown: '#3a2818', Blonde: '#d4a838', Red: '#a83838',
    White: '#e8e8e8', Silver: '#b8b8c8', Blue: '#3070d0', Green: '#30a040',
    Pink: '#e070b0', Purple: '#8040c0',
  };
  const eyeColorSwatches: Record<string, string> = {
    Brown: '#3a2818', Blue: '#3070d0', Green: '#30a040', Hazel: '#806030',
    Amber: '#d09030', Red: '#c03030', Violet: '#8040c0', Gold: '#d4a830',
    Silver: '#b0b0c0', Heterochromia: '#30a040',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="w-4 h-4 text-purple-400" />
        <p className="text-sm text-slate-300 font-medium">Customize your appearance / 自定义外观</p>
      </div>

      <AppearanceSelect label="Hair Style / 发型" value={draft.hairStyle} options={APPEARANCE_OPTIONS.hairStyle}
        onChange={(v) => onChange({ ...draft, hairStyle: v })} />

      <div>
        <p className="text-xs text-slate-500 mb-1.5">Hair Color / 发色</p>
        <div className="flex flex-wrap gap-2">
          {APPEARANCE_OPTIONS.hairColor.map((c) => (
            <button key={c} onClick={() => onChange({ ...draft, hairColor: c })}
              className={`w-8 h-8 rounded-full border-2 transition-all ${draft.hairColor === c ? 'border-white scale-110' : 'border-slate-600'}`}
              style={{ background: hairColorSwatches[c] ?? '#333' }}
              title={c} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-1.5">Eye Color / 眼睛颜色</p>
        <div className="flex flex-wrap gap-2">
          {APPEARANCE_OPTIONS.eyeColor.map((c) => (
            <button key={c} onClick={() => onChange({ ...draft, eyeColor: c })}
              className={`w-8 h-8 rounded-full border-2 transition-all ${draft.eyeColor === c ? 'border-white scale-110' : 'border-slate-600'}`}
              style={{ background: eyeColorSwatches[c] ?? '#333' }}
              title={c} />
          ))}
        </div>
      </div>

      <AppearanceSelect label="Hair Length / 发长" value={draft.hairLength} options={APPEARANCE_OPTIONS.hairLength}
        onChange={(v) => onChange({ ...draft, hairLength: v })} />
      <AppearanceSelect label="Special Features / 特殊特征" value={draft.specialFeatures} options={APPEARANCE_OPTIONS.specialFeatures}
        onChange={(v) => onChange({ ...draft, specialFeatures: v })} />
      <AppearanceSelect label="Glasses / 眼镜" value={draft.glasses} options={APPEARANCE_OPTIONS.glasses}
        onChange={(v) => onChange({ ...draft, glasses: v })} />
      <AppearanceSelect label="Earrings / 耳环" value={draft.earrings} options={APPEARANCE_OPTIONS.earrings}
        onChange={(v) => onChange({ ...draft, earrings: v })} />
      <AppearanceSelect label="Scars / 疤痕" value={draft.scars} options={APPEARANCE_OPTIONS.scars}
        onChange={(v) => onChange({ ...draft, scars: v })} />

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg text-slate-300 bg-slate-800/50 border border-slate-600/30 text-sm transition-all">
          Cancel
        </button>
        <button onClick={onApply}
          className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed)' }}>
          Apply / 应用
        </button>
      </div>
    </div>
  );
}

function AppearanceSelect({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button key={opt} onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${value === opt ? 'bg-purple-600/40 text-purple-200 border border-purple-500/50' : 'bg-slate-800/40 text-slate-400 border border-slate-700/30 hover:bg-slate-700/30'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
