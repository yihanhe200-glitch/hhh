import { useRef, useEffect, useState, useCallback } from 'react';
import { WorldTwoEngine, type CityGameInput, type MinimapData } from '@/game/WorldTwoEngine';
import type { CityLevelId, Objective, Checkpoint, Landmark, SkillType } from '@/game/cityData';
import { CITY_LEVELS } from '@/game/cityData';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Character, CharacterAppearance } from '@/types';
import { APPEARANCE_OPTIONS } from '@/types';
import {
  Heart, Zap, Star, X, MapPin, Backpack, Trophy, Sparkles, Play,
  Palette, Clock, Battery, GitBranch, Wind, Droplets, Eye,
  Flag, Map as MapIcon, Award, BookOpen, Compass, Lightbulb, CheckCircle,
  Footprints, Atom, Radar,
} from 'lucide-react';

interface WorldTwoProps {
  character: Character;
  onComplete: () => void;
  onExit: () => void;
}

interface ToastMsg { id: number; text: string; type: string; }
interface SkillInfo { key: SkillType; name: string; nameZh: string; color: string; icon: React.ReactNode; descEn: string; descZh: string; }

const SKILLS: SkillInfo[] = [
  { key: 'sprint', name: 'Sprint', nameZh: '疾行', color: '#22c55e', icon: <Footprints className="w-3.5 h-3.5" />, descEn: 'Temporarily boost speed. 15 energy. Escape mechs, rush doors.', descZh: '暂时提高速度。消耗 15 能量。逃离机械、冲过门。' },
  { key: 'electric', name: 'Electric', nameZh: '电能', color: '#facc15', icon: <Zap className="w-3.5 h-3.5" />, descEn: 'Power devices, stun mechs, open electronic doors. 10 energy.', descZh: '给设备供电、瘫痪机械、打开电子门。消耗 10 能量。' },
  { key: 'wind', name: 'Wind', nameZh: '风流', color: '#38bdf8', icon: <Wind className="w-3.5 h-3.5" />, descEn: 'Push objects, move platforms, clear obstacles. 12 energy.', descZh: '推动物体、移动平台、清除障碍。消耗 12 能量。' },
  { key: 'water', name: 'Water', nameZh: '水流', color: '#3b82f6', icon: <Droplets className="w-3.5 h-3.5" />, descEn: 'Drain flooded areas, redirect water, open paths. 12 energy.', descZh: '排水、改变水流方向、打开通道。消耗 12 能量。' },
  { key: 'sense', name: 'Sense', nameZh: '感知', color: '#a855f7', icon: <Radar className="w-3.5 h-3.5" />, descEn: 'Reveal hidden paths, patrol routes, weaknesses. 8 energy.', descZh: '揭示隐藏路径、巡逻路线、弱点。消耗 8 能量。' },
];

const ALL_SKILL_KEYS: SkillType[] = ['sprint', 'electric', 'wind', 'water', 'sense'];

export default function WorldTwo({ character, onComplete, onExit }: WorldTwoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WorldTwoEngine | null>(null);
  const inputRef = useRef<CityGameInput>({ up: false, down: false, left: false, right: false, attack: false, interact: false });
  const { session } = useAuth();

  const [hp, setHp] = useState(character.hp); const [maxHp, setMaxHp] = useState(character.hp);
  const [mp, setMp] = useState(character.mp); const [maxMp, setMaxMp] = useState(character.mp);
  const [energy, setEnergy] = useState(100); const [maxEnergy, setMaxEnergy] = useState(100);
  const [exp, setExp] = useState(0); const [level, setLevel] = useState(character.level);
  const [levelId, setLevelId] = useState<CityLevelId>(0);
  const [levelName, setLevelName] = useState(''); const [levelSubtitle, setLevelSubtitle] = useState('');
  const [objectiveEn, setObjectiveEn] = useState(''); const [objectiveZh, setObjectiveZh] = useState('');
  const [storyEn, setStoryEn] = useState(''); const [storyZh, setStoryZh] = useState('');
  const [showStory, setShowStory] = useState(true);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [items, setItems] = useState<{ key: string; name: string; qty: number }[]>([]);
  const [bossActive, setBossActive] = useState(false); const [bossPhase, setBossPhase] = useState(1);
  const [playerDead, setPlayerDead] = useState(false); const [worldComplete, setWorldComplete] = useState(false);
  const [saving, setSaving] = useState(false); const [paused, setPaused] = useState(false);
  const [npcDlg, setNpcDlg] = useState<{ name: string; nameZh: string; hintEn: string; hintZh: string } | null>(null);
  const [clueDlg, setClueDlg] = useState<Objective | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillType | null>(null);
  const [unlockedSkills, setUnlockedSkills] = useState<Set<SkillType>>(new Set());
  const [editAppearance, setEditAppearance] = useState(false);
  const [appearanceDraft, setAppearanceDraft] = useState<CharacterAppearance>(character.appearance);
  const [hasTimer, setHasTimer] = useState(false); const [timerRemaining, setTimerRemaining] = useState(0); const [timerLabel, setTimerLabel] = useState('');
  const [minimap, setMinimap] = useState<MinimapData | null>(null);
  const [routeChoices, setRouteChoices] = useState<{ id: string; labelEn: string; labelZh: string; descEn: string; descZh: string; difficulty: string }[] | null>(null);
  const [starRating, setStarRating] = useState<{ stars: number; criteria: { one: string; two: string; three: string } } | null>(null);
  const [objectiveComplete, setObjectiveComplete] = useState(false);

  const toastId = useRef(0);
  const addToast = useCallback((text: string, type = 'info') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const resize = () => { const p = canvas.parentElement; if (p) { canvas.width = p.clientWidth; canvas.height = p.clientHeight; } };
    resize(); window.addEventListener('resize', resize);

    const engine = new WorldTwoEngine(canvas, {
      onHpChange: (h, mh) => { setHp(h); setMaxHp(mh); },
      onMpChange: (m, mm) => { setMp(m); setMaxMp(mm); },
      onEnergyChange: (e, me) => { setEnergy(e); setMaxEnergy(me); },
      onExpChange: (e, l) => { setExp(e); setLevel(l); },
      onLevelChange: (lid, name, sub, objEn, objZh, sEn, sZh, ht, ts, tl) => {
        setLevelId(lid); setLevelName(name); setLevelSubtitle(sub);
        setObjectiveEn(objEn); setObjectiveZh(objZh); setStoryEn(sEn); setStoryZh(sZh);
        setShowStory(true); setObjectiveComplete(false);
        setHasTimer(ht); setTimerRemaining(ts); setTimerLabel(tl);
      },
      onObjectiveDone: (obj: Objective) => {
        if (obj.type === 'collect') {
          setItems((prev) => {
            const ex = prev.find((i) => i.key === obj.id);
            if (ex) return prev.map((i) => i.key === obj.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { key: obj.id, name: obj.name, qty: 1 }];
          });
          addToast(`Obtained: ${obj.name} / ${obj.nameZh}`, 'item');
        } else {
          addToast(`Objective: ${obj.name} / ${obj.nameZh}`, 'marker');
        }
      },
      onClueFound: (obj: Objective) => { setClueDlg(obj); },
      onNpcTalk: (_id, name, nameZh, hintEn, hintZh) => { setNpcDlg({ name, nameZh, hintEn, hintZh }); },
      onObjectiveComplete: () => { setObjectiveComplete(true); addToast('Objective complete! / 目标完成！', 'objective'); },
      onMessage: (text) => { addToast(text, 'info'); },
      onPlayerDeath: () => { setPlayerDead(true); },
      onBossStart: () => { setBossActive(true); setBossPhase(1); addToast('City Core Guardian appears! / 城市核心守卫者出现！', 'boss'); },
      onBossPhaseChange: (p) => { setBossPhase(p); addToast(`Phase ${p}! / 第${p}阶段！`, 'boss'); },
      onBossDefeated: () => { setBossActive(false); addToast('Boss defeated! / Boss被击败！', 'boss'); },
      onWorldComplete: () => { setWorldComplete(true); },
      onCheckpointActivated: (cp: Checkpoint) => { addToast(`Checkpoint activated: ${cp.id}`, 'checkpoint'); },
      onTimerTick: (r) => { setTimerRemaining(r); },
      onTimerExpired: () => { addToast('Time expired! Returning to checkpoint. / 时间到！返回检查点。', 'warning'); },
      onLandmarkDiscovered: (lm: Landmark) => { addToast(`Discovered: ${lm.name} / ${lm.nameZh}`, 'landmark'); },
      onMinimapUpdate: (data) => { setMinimap(data); },
      onRouteChoice: (routes) => { setRouteChoices(routes); },
      onStarRating: (stars, criteria) => { setStarRating({ stars, criteria }); },
    }, character.appearance);

    engineRef.current = engine; engine.start();

    // Sync unlocked skills from engine periodically
    const skillSync = setInterval(() => {
      const unlocked = engineRef.current?.getUnlockedSkills();
      if (unlocked) { setUnlockedSkills(new Set(unlocked)); }
    }, 500);

    // Load saved progress if it exists
    if (session && character) {
      supabase.from('world_progress')
        .select('*')
        .eq('character_id', character.id)
        .eq('world_number', 2)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.status === 'in_progress' && (data as any).save_data) {
            const saveData = (data as any).save_data;
            if (saveData && saveData.level !== undefined && saveData.level > 0) {
              engine.loadSaveState(saveData);
              setShowStory(false);
              addToast('Progress restored! / 进度已恢复！', 'info');
            }
          }
        });
    }

    return () => { engine.stop(); window.removeEventListener('resize', resize); clearInterval(skillSync); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (playerDead || worldComplete || paused || showStory || npcDlg || clueDlg || routeChoices) return;
      const input = inputRef.current;
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': input.up = true; e.preventDefault(); break;
        case 's': case 'arrowdown': input.down = true; e.preventDefault(); break;
        case 'a': case 'arrowleft': input.left = true; e.preventDefault(); break;
        case 'd': case 'arrowright': input.right = true; e.preventDefault(); break;
        case ' ': input.attack = true; e.preventDefault(); break;
        case 'e': input.interact = true; break;
        case 'i': setShowInventory(v => !v); break;
        case 'm': setShowMinimap(v => !v); break;
        case 'g': setShowGuide(v => !v); break;
        case 'escape': setPaused(v => !v); break;
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
      }
      engineRef.current?.setInput(input);
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerDead, worldComplete, paused, showStory, npcDlg, clueDlg, routeChoices]);

  const handleSkillChange = useCallback((sk: SkillType) => {
    const s = SKILLS.find(x => x.key === sk); if (!s) return;
    setSelectedSkill(sk); engineRef.current?.setSkillColor(s.color);
    engineRef.current?.setSkill(sk);
    addToast(`Skill: ${s.name} / ${s.nameZh}`, 'info');
  }, [addToast]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (paused || playerDead || worldComplete || npcDlg || clueDlg || showStory || routeChoices) return;
    const c = canvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    engineRef.current?.clickNpc(((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height);
  }, [paused, playerDead, worldComplete, npcDlg, clueDlg, showStory, routeChoices]);

  const applyAppearance = useCallback(() => {
    engineRef.current?.updateAppearance(appearanceDraft);
    addToast('Appearance updated!', 'info'); setEditAppearance(false);
  }, [appearanceDraft, addToast]);

  const selectRoute = useCallback((rid: string) => {
    engineRef.current?.selectRoute(rid); setRouteChoices(null);
    addToast('Route selected!', 'info');
  }, [addToast]);

  // Also clear save data on completion
  const saveCompletion = useCallback(async () => {
    if (!session || !character) return;
    setSaving(true);
    const ps = engineRef.current?.getPlayerState();
    await supabase.from('characters').update({
      hp: ps?.hp ?? character.hp, mp: ps?.mp ?? character.mp,
      exp: (character.exp ?? 0) + (ps?.exp ?? 0) + 500,
      level: ps?.level ?? character.level,
      skill_points: (character.skill_points ?? 0) + 5,
      appearance: appearanceDraft,
    }).eq('id', character.id);
    await supabase.from('world_progress').update({ status: 'completed', updated_at: new Date().toISOString(), save_data: null })
      .eq('character_id', character.id).eq('world_number', 2);
    await supabase.from('world_progress').update({ status: 'available', updated_at: new Date().toISOString() })
      .eq('character_id', character.id).eq('world_number', 3);
    for (const item of items) {
      await supabase.from('character_items').upsert({
        character_id: character.id, item_key: item.key, item_name: item.name,
        item_type: item.key === 'city_core' ? 'core' : 'material', quantity: item.qty, world_source: 2,
      }, { onConflict: 'character_id,item_key' });
    }
    for (const ab of [
      { ability_key: 'sprint', ability_name: 'Sprint', ability_type: 'movement', element: 'None', power: 0, mp_cost: 15 },
      { ability_key: 'electric', ability_name: 'Electric', ability_type: 'utility', element: 'Lightning', power: 0, mp_cost: 10 },
      { ability_key: 'wind', ability_name: 'Wind', ability_type: 'utility', element: 'Air', power: 0, mp_cost: 12 },
      { ability_key: 'water', ability_name: 'Water', ability_type: 'utility', element: 'Water', power: 0, mp_cost: 12 },
      { ability_key: 'sense', ability_name: 'Sense', ability_type: 'utility', element: 'None', power: 0, mp_cost: 8 },
    ]) {
      await supabase.from('character_abilities').upsert({ character_id: character.id, ...ab, world_source: 2 }, { onConflict: 'character_id,ability_key' });
    }
    setSaving(false); onComplete();
  }, [session, character, items, onComplete, appearanceDraft]);

  const saveProgress = useCallback(async () => {
    if (!session || !character) return;
    const saveState = engineRef.current?.getSaveState();
    if (!saveState) return;
    await supabase.from('world_progress').update({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
      save_data: saveState,
    }).eq('character_id', character.id).eq('world_number', 2);
    // Also update character HP/MP/appearance
    await supabase.from('characters').update({
      hp: saveState.hp, mp: saveState.mp, appearance: appearanceDraft,
    }).eq('id', character.id);
  }, [session, character, appearanceDraft]);

  const handleExitWithSave = useCallback(async () => {
    await saveProgress();
    onExit();
  }, [saveProgress, onExit]);

  function handleRespawn() { setPlayerDead(false); engineRef.current?.respawnAtCheckpoint(); }

  const timerColor = timerRemaining < 30 ? '#ef4444' : timerRemaining < 60 ? '#eab308' : '#22c55e';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0"><canvas ref={canvasRef} className="block w-full h-full cursor-pointer" onClick={handleCanvasClick} /></div>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 sm:p-4 flex items-start justify-between gap-3 pointer-events-none">
        <div className="rounded-xl p-3 space-y-2 min-w-[220px] pointer-events-auto"
          style={{ background: 'rgba(10,14,39,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,217,255,0.2)' }}>
          <div className="flex items-center gap-2">
            <span className="text-cyan-300 text-sm font-bold w-16 truncate">{character.name}</span>
            <span className="text-amber-400 text-xs flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400" /> Lv.{level}</span>
          </div>
          <StatBar icon={<Heart className="w-3.5 h-3.5 text-red-400" />} value={hp} max={maxHp} color="#ef4444" bg="#7f1d1d" />
          <StatBar icon={<Zap className="w-3.5 h-3.5 text-blue-400" />} value={mp} max={maxMp} color="#3b82f6" bg="#1e3a5f" />
          <StatBar icon={<Battery className="w-3.5 h-3.5 text-green-400" />} value={energy} max={maxEnergy} color="#22c55e" bg="#1a3a1a" />
          {(() => { const sk = selectedSkill ? SKILLS.find(s => s.key === selectedSkill) : null;
            return <div className="flex items-center gap-2 pt-1"><span className="text-xs text-slate-500 w-12">Skill</span>
              <div className="flex-1 flex items-center gap-1.5">
              {sk ? <><span style={{ color: sk.color }}>{sk.icon}</span>
              <span className="text-xs font-medium" style={{ color: sk.color }}>{sk.name}</span></>
              : <span className="text-xs text-slate-500">None unlocked</span>}</div></div>; })()}
        </div>

        <div className="text-center pointer-events-none mt-1">
          <div className="px-4 py-1.5 rounded-lg inline-block"
            style={{ background: 'rgba(10,14,39,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,217,255,0.2)' }}>
            <p className="text-cyan-100 text-sm font-bold tracking-wide">{levelName}</p>
            <p className="text-slate-400 text-xs">{levelSubtitle}</p>
          </div>
          {hasTimer && (
            <div className="mt-1 px-3 py-1 rounded-lg inline-flex items-center gap-2"
              style={{ background: 'rgba(10,14,39,0.85)', border: `1px solid ${timerColor}44` }}>
              <Clock className="w-3 h-3" style={{ color: timerColor }} />
              <span className="text-sm font-bold tabular-nums" style={{ color: timerColor }}>{timerRemaining}s</span>
              <span className="text-xs text-slate-400">{timerLabel}</span>
            </div>
          )}
          {objectiveComplete && <div className="mt-1 text-xs text-green-400 font-bold">OBJECTIVE COMPLETE</div>}
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <HudBtn onClick={() => setShowGuide(true)} icon={<BookOpen className="w-4 h-4" />} label="Guide" hotkey="G" tooltip="Level guide: prep, observation, clear conditions, hints" />
          <HudBtn onClick={() => setShowMinimap(v => !v)} icon={<MapIcon className="w-4 h-4" />} label="Map" hotkey="M" tooltip="Toggle minimap" />
          <HudBtn onClick={() => setShowInventory(true)} icon={<Backpack className="w-4 h-4" />} label="Items" hotkey="I" itemCount={items.length} tooltip="Inventory & skills" />
          <HudBtn onClick={() => setPaused(true)} icon={<X className="w-4 h-4" />} label="Menu" hotkey="Esc" tooltip="Pause / Exit" />
        </div>
      </div>

      {/* Minimap */}
      {showMinimap && minimap && <MinimapOverlay data={minimap} onClose={() => setShowMinimap(false)} />}

      {/* Boss HP */}
      {bossActive && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="px-6 py-2 rounded-xl"
            style={{ background: 'rgba(10,14,39,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(239,68,68,0.5)' }}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-red-300 text-sm font-bold">ZERO / ZERO</span>
              <span className="text-amber-300 text-xs animate-pulse">CITY SYSTEMS ATTACKING — ESCAPE!</span>
            </div>
          </div>
        </div>
      )}

      {/* Story panel */}
      {showStory && !paused && !playerDead && !worldComplete && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ background: 'rgba(3,4,13,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(0,217,255,0.3)' }}>
            <h3 className="text-cyan-100 font-bold text-lg mb-1">{levelName}</h3>
            <p className="text-slate-400 text-sm mb-4">{levelSubtitle}</p>
            <div className="space-y-3 mb-4">
              <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/30">
                <p className="text-xs text-cyan-400 mb-1 font-medium">Objective / 目标</p>
                <p className="text-slate-200 text-sm">{objectiveEn}</p><p className="text-slate-400 text-sm">{objectiveZh}</p>
              </div>
              <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/30">
                <p className="text-xs text-purple-400 mb-1 font-medium">Story / 剧情</p>
                <p className="text-slate-200 text-sm leading-relaxed">{storyEn}</p>
                <p className="text-slate-400 text-sm leading-relaxed mt-2">{storyZh}</p>
              </div>
            </div>
            <button onClick={() => setShowStory(false)}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #0099cc)' }}>
              <Play className="w-4 h-4" /> Begin / 开始探索
            </button>
            <button onClick={() => setShowGuide(true)}
              className="w-full py-2 rounded-lg text-cyan-200 bg-slate-800/50 border border-cyan-700/30 text-sm transition-all active:scale-95 flex items-center justify-center gap-2 mt-2">
              <BookOpen className="w-4 h-4" /> Read Level Guide / 阅读关卡指南
            </button>
          </div>
        </div>
      )}

      {/* Guide */}
      {showGuide && (() => {
        const lv = CITY_LEVELS[levelId]; if (!lv) return null;
        return (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,4,13,0.8)', backdropFilter: 'blur(6px)' }} onClick={() => setShowGuide(false)}>
            <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6" style={{ background: 'rgba(10,14,39,0.97)', border: '1px solid rgba(0,217,255,0.3)' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-cyan-400" /><h3 className="text-cyan-100 font-bold text-lg">Level Guide / 关卡指南</h3></div>
                <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-slate-200 text-xl px-2">×</button>
              </div>
              <p className="text-xs text-cyan-400 mb-4 font-medium">{lv.name} — {lv.nameZh}</p>

              {/* Before You Start */}
              <div className="rounded-xl p-4 mb-3 border" style={{ background: 'rgba(30,58,95,0.3)', borderColor: 'rgba(59,130,246,0.3)' }}>
                <div className="flex items-center gap-2 mb-2"><Compass className="w-4 h-4 text-blue-400" /><p className="text-blue-300 text-sm font-bold">Before You Start / 开始之前</p></div>
                <p className="text-slate-200 text-sm leading-relaxed">{lv.prepEn}</p>
                <p className="text-slate-400 text-sm leading-relaxed mt-2">{lv.prepZh}</p>
              </div>

              {/* Observation Phase */}
              <div className="rounded-xl p-4 mb-3 border" style={{ background: 'rgba(88,28,135,0.25)', borderColor: 'rgba(168,85,247,0.3)' }}>
                <div className="flex items-center gap-2 mb-2"><Eye className="w-4 h-4 text-purple-400" /><p className="text-purple-300 text-sm font-bold">Observation Phase / 观察阶段</p></div>
                <p className="text-slate-200 text-sm leading-relaxed">{lv.observeEn}</p>
                <p className="text-slate-400 text-sm leading-relaxed mt-2">{lv.observeZh}</p>
              </div>

              {/* How to Clear */}
              <div className="rounded-xl p-4 mb-3 border" style={{ background: 'rgba(22,101,52,0.25)', borderColor: 'rgba(34,197,94,0.3)' }}>
                <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-green-400" /><p className="text-green-300 text-sm font-bold">How to Clear / 通关条件</p></div>
                <p className="text-slate-200 text-sm leading-relaxed">{lv.clearEn}</p>
                <p className="text-slate-400 text-sm leading-relaxed mt-2">{lv.clearZh}</p>
              </div>

              {/* Hints */}
              <div className="rounded-xl p-4 mb-3 border" style={{ background: 'rgba(120,53,15,0.2)', borderColor: 'rgba(251,191,36,0.25)' }}>
                <div className="flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-amber-400" /><p className="text-amber-300 text-sm font-bold">Hints / 提示</p></div>
                <div className="space-y-1.5">
                  {lv.hintsEn.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 text-xs mt-0.5 flex-shrink-0">•</span>
                      <div>
                        <p className="text-slate-200 text-xs leading-relaxed">{h}</p>
                        <p className="text-slate-500 text-xs leading-relaxed">{lv.hintsZh[i]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Star Criteria */}
              <div className="rounded-xl p-4 border" style={{ background: 'rgba(10,14,39,0.5)', borderColor: 'rgba(51,65,85,0.3)' }}>
                <div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-cyan-400" /><p className="text-cyan-300 text-sm font-bold">Star Criteria / 星级标准</p></div>
                <p className="text-xs text-green-400 mb-1">★ {lv.starCriteria.one}</p>
                <p className="text-xs text-amber-400 mb-1">★★ {lv.starCriteria.two}</p>
                <p className="text-xs text-purple-400">★★★ {lv.starCriteria.three}</p>
              </div>

              <button onClick={() => setShowGuide(false)} className="w-full mt-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0099cc)' }}>Close / 关闭</button>
            </div>
          </div>
        );
      })()}

      {/* Toasts */}
      <div className="absolute top-32 right-4 z-10 space-y-2 pointer-events-none max-w-xs">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-lg px-4 py-2 text-sm animate-slideIn"
            style={{
              background: t.type === 'boss' ? 'rgba(88,28,135,0.9)' : t.type === 'item' ? 'rgba(120,53,15,0.85)' :
                t.type === 'marker' ? 'rgba(0,100,150,0.85)' : t.type === 'objective' ? 'rgba(22,101,52,0.85)' :
                t.type === 'warning' ? 'rgba(127,29,29,0.85)' : t.type === 'checkpoint' ? 'rgba(20,80,40,0.85)' :
                t.type === 'landmark' ? 'rgba(60,40,100,0.85)' : 'rgba(10,14,39,0.85)',
              backdropFilter: 'blur(8px)', border: '1px solid rgba(51,65,85,0.3)',
            }}>
            {t.type === 'item' && <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-400" />}
            {t.type === 'marker' && <MapPin className="w-3.5 h-3.5 inline mr-1 text-cyan-400" />}
            {t.type === 'checkpoint' && <Flag className="w-3.5 h-3.5 inline mr-1 text-green-400" />}
            {t.type === 'landmark' && <Award className="w-3.5 h-3.5 inline mr-1 text-purple-400" />}
            {t.type === 'warning' && <X className="w-3.5 h-3.5 inline mr-1 text-red-400" />}
            <span className="text-slate-100">{t.text}</span>
          </div>
        ))}
      </div>

      {/* Route choice modal */}
      {routeChoices && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(3,4,13,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(0,217,255,0.3)' }}>
            <div className="flex items-center gap-2 mb-4"><GitBranch className="w-5 h-5 text-cyan-400" /><h3 className="text-cyan-100 font-bold text-lg">Choose Your Route / 选择路线</h3></div>
            <div className="space-y-3">
              {routeChoices.map((r) => (
                <button key={r.id} onClick={() => selectRoute(r.id)}
                  className="w-full text-left p-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: r.difficulty === 'easy' ? 'rgba(22,101,52,0.3)' : r.difficulty === 'hard' ? 'rgba(120,53,15,0.3)' : 'rgba(88,28,135,0.3)',
                    borderColor: r.difficulty === 'easy' ? 'rgba(34,197,94,0.4)' : r.difficulty === 'hard' ? 'rgba(251,191,36,0.4)' : 'rgba(168,85,247,0.4)',
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-100 text-sm">{r.labelEn}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${r.difficulty === 'easy' ? 'bg-green-900/50 text-green-300' : r.difficulty === 'hard' ? 'bg-amber-900/50 text-amber-300' : 'bg-purple-900/50 text-purple-300'}`}>
                      {r.difficulty === 'easy' ? 'Easy / 简单' : r.difficulty === 'hard' ? 'Hard / 困难' : 'Hidden / 隐藏'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{r.descEn}</p><p className="text-xs text-slate-500">{r.descZh}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile controls */}
      <MobileControls onMove={(dir, pressed) => {
        if (paused || playerDead || worldComplete || showStory || npcDlg || clueDlg || routeChoices) return;
        const input = inputRef.current; input[dir] = pressed; engineRef.current?.setInput(input);
      }} onAttack={() => {
        if (paused || playerDead || worldComplete || showStory || npcDlg || clueDlg || routeChoices) return;
        const input = inputRef.current; input.attack = true; engineRef.current?.setInput(input);
        setTimeout(() => { input.attack = false; engineRef.current?.setInput(input); }, 50);
      }} onInteract={() => {
        if (paused || playerDead || worldComplete || showStory || npcDlg || clueDlg || routeChoices) return;
        const input = inputRef.current; input.interact = true; engineRef.current?.setInput(input);
        setTimeout(() => { input.interact = false; engineRef.current?.setInput(input); }, 50);
      }} onPotion={() => engineRef.current?.useHealingPotion()} />

      {/* Inventory */}
      {showInventory && (
        <Modal onClose={() => { setShowInventory(false); setEditAppearance(false); }} title="Inventory" wide>
          {!editAppearance ? (
            <>
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Items / 物品</p>
                {items.length === 0 ? <p className="text-slate-400 text-sm text-center py-4">No items yet</p> :
                  items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-900/30 border border-cyan-700/30"><Sparkles className="w-5 h-5 text-cyan-400" /></div>
                        <p className="text-slate-100 text-sm font-medium">{item.name}</p>
                      </div>
                      <span className="text-slate-300 font-bold tabular-nums">×{item.qty}</span>
                    </div> ))}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-700/30">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Skills / 技能</p>
                <div className="space-y-2">
                  {SKILLS.map((sk) => {
                    const isUnlocked = unlockedSkills.has(sk.key);
                    return (
                    <button key={sk.key} onClick={() => isUnlocked && handleSkillChange(sk.key)}
                      disabled={!isUnlocked}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${selectedSkill === sk.key ? 'bg-slate-700/50 border-slate-500/50' : isUnlocked ? 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-700/30' : 'bg-slate-900/30 border-slate-800/20 opacity-50 cursor-not-allowed'}`}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${sk.color}22`, border: `1px solid ${sk.color}44` }}>
                        <span style={{ color: sk.color }}>{sk.icon}</span></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><p className="text-slate-100 text-sm font-medium">{sk.name}</p><span className="text-slate-500 text-xs">{sk.nameZh}</span>
                          {!isUnlocked && <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-slate-700/50 text-slate-500">Locked</span>}
                          {isUnlocked && selectedSkill === sk.key && <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded" style={{ color: sk.color, background: `${sk.color}22` }}>Equipped</span>}</div>
                        <p className="text-slate-400 text-xs mt-0.5">{sk.descEn}</p><p className="text-slate-500 text-xs">{sk.descZh}</p>
                      </div>
                    </button> );
                  })}
                </div>
              </div>
              <button onClick={() => setEditAppearance(true)}
                className="w-full mt-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed)' }}>
                <Palette className="w-4 h-4" /> Change Appearance / 更换外观</button>
            </>
          ) : <AppearanceEditor draft={appearanceDraft} onChange={setAppearanceDraft} onApply={applyAppearance} onCancel={() => setEditAppearance(false)} />}
        </Modal>
      )}

      {/* NPC dialogue */}
      {npcDlg && (
        <div className="absolute inset-0 z-40 flex items-end justify-center pb-8 px-4" style={{ background: 'rgba(3,4,13,0.6)', backdropFilter: 'blur(2px)' }} onClick={() => setNpcDlg(null)}>
          <div className="w-full max-w-lg rounded-2xl p-6 border border-cyan-700/40" style={{ background: 'rgba(10,20,35,0.95)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-slate-100 font-bold text-lg mb-1">{npcDlg.name}</h3><p className="text-slate-400 text-sm mb-4">{npcDlg.nameZh}</p>
            <div className="space-y-3 mb-4">
              <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/30"><p className="text-slate-200 text-sm leading-relaxed">{npcDlg.hintEn}</p></div>
              <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/30"><p className="text-slate-400 text-sm leading-relaxed">{npcDlg.hintZh}</p></div>
            </div>
            <button onClick={() => setNpcDlg(null)} className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0099cc)' }}>Continue</button>
          </div>
        </div>
      )}

      {/* Clue dialogue */}
      {clueDlg && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(3,4,13,0.6)', backdropFilter: 'blur(2px)' }} onClick={() => setClueDlg(null)}>
          <div className="w-full max-w-md rounded-2xl p-6 border border-amber-700/40" style={{ background: 'rgba(20,15,5,0.95)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3"><Eye className="w-5 h-5 text-amber-400" /><h3 className="text-amber-100 font-bold">Clue / 线索</h3></div>
            <div className="space-y-3 mb-4">
              <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/30"><p className="text-slate-200 text-sm leading-relaxed">{clueDlg.descEn}</p></div>
              <div className="rounded-lg bg-slate-800/40 p-3 border border-slate-700/30"><p className="text-slate-400 text-sm leading-relaxed">{clueDlg.descZh}</p></div>
            </div>
            <button onClick={() => setClueDlg(null)} className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #78350f, #b45309)' }}>Close</button>
          </div>
        </div>
      )}

      {/* Pause */}
      {paused && !playerDead && !worldComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(3,4,13,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-8 text-center max-w-sm w-full mx-4" style={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(0,217,255,0.2)' }}>
            <h2 className="text-2xl font-bold text-cyan-100 mb-6 tracking-wide" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>PAUSED</h2>
            <div className="space-y-3">
              <button onClick={() => setPaused(false)} className="w-full py-3 rounded-lg text-white font-medium transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0099cc)' }}>Resume</button>
              <button onClick={handleExitWithSave} className="w-full py-3 rounded-lg text-slate-300 bg-slate-800/50 border border-slate-600/30 hover:bg-slate-700/50 transition-all text-sm">Save & Exit to Player Home</button>
            </div>
          </div>
        </div>
      )}

      {/* Death */}
      {playerDead && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(40,5,5,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="text-center max-w-sm w-full mx-4">
            <h2 className="text-3xl font-bold text-red-400 mb-2 tracking-wide" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>DEFEATED</h2>
            <p className="text-slate-400 mb-6">Returning to last checkpoint...</p>
            <button onClick={handleRespawn} className="w-full py-3 rounded-lg text-white font-medium transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d5a8c)' }}>Respawn at Checkpoint</button>
          </div>
        </div>
      )}

      {/* World Complete */}
      {worldComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(3,4,13,0.85)', backdropFilter: 'blur(6px)' }}>
          <div className="rounded-2xl p-8 text-center max-w-md w-full mx-4" style={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(0,217,255,0.3)' }}>
            <Trophy className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
            <h2 className="text-3xl font-bold text-slate-100 mb-1 tracking-wide" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>WORLD 2 COMPLETE</h2>
            <p className="text-slate-400 text-sm mb-4">ZERO has been shut down. The city returns to normal.</p>
            {starRating && (
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3].map((n) => (
                  <Star key={n} className={`w-8 h-8 ${n <= starRating.stars ? 'fill-cyan-400 text-cyan-400' : 'text-slate-700'}`} />
                ))}
              </div>
            )}
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4 mb-4 text-left space-y-2">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-400">EXP Gained</span><span className="text-amber-400 font-bold">+500</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Level</span><span className="text-slate-200 font-bold">{level}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Abilities</span><span className="text-cyan-400 font-medium">Sprint, Electric, Wind, Water, Sense</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Items</span><span className="text-slate-200 font-bold">{items.length}</span></div>
              {starRating && (
                <div className="pt-2 border-t border-slate-700/30">
                  <p className="text-xs text-slate-500 mb-1">Star Criteria:</p>
                  <p className="text-xs text-green-400">★ {starRating.criteria.one}</p>
                  <p className="text-xs text-amber-400">★★ {starRating.criteria.two}</p>
                  <p className="text-xs text-purple-400">★★★ {starRating.criteria.three}</p>
                </div>
              )}
            </div>
            <p className="text-slate-400 text-xs mb-4 italic">The city falls silent. The machines stop. But beyond the city, another dimension awaits...</p>
            <button onClick={saveCompletion} disabled={saving}
              className="w-full py-3.5 rounded-lg text-white font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #006699, #00d9ff)', boxShadow: '0 0 20px rgba(0,217,255,0.3)' }}>
              {saving ? 'Saving...' : 'CONTINUE'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .animate-slideIn { animation: slideIn 0.3s ease-out; }`}</style>
    </div>
  );
}

// --- Sub-components ---

function StatBar({ icon, value, max, color, bg }: { icon: React.ReactNode; value: number; max: number; color: string; bg: string }) {
  const pct = Math.max(0, (value / max) * 100);
  return <div className="flex items-center gap-2"><span className="flex-shrink-0">{icon}</span>
    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: bg }}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} /></div>
    <span className="text-xs text-slate-300 tabular-nums w-12 text-right">{Math.max(0, Math.ceil(value))}/{max}</span></div>;
}

function HudBtn({ onClick, icon, label, hotkey, itemCount, tooltip }: { onClick: () => void; icon: React.ReactNode; label: string; hotkey: string; itemCount?: number; tooltip?: string; }) {
  return <button onClick={onClick} className="group relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all active:scale-95"
    style={{ background: 'rgba(10,14,39,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,217,255,0.2)' }}>
    <span className="text-cyan-200">{icon}</span><span className="text-[10px] text-slate-400">{label}</span><span className="text-[8px] text-slate-600">{hotkey}</span>
    {itemCount !== undefined && itemCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-white text-[10px] flex items-center justify-center font-bold">{itemCount}</span>}
    {tooltip && <div className="absolute top-full right-0 mt-1 w-40 rounded-lg p-2 text-xs text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20" style={{ background: 'rgba(10,14,39,0.97)', border: '1px solid rgba(0,217,255,0.3)' }}>{tooltip}</div>}
  </button>;
}

function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,4,13,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
    <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} rounded-2xl p-6 max-h-[85vh] overflow-y-auto`} style={{ background: 'rgba(10,14,39,0.95)', border: '1px solid rgba(0,217,255,0.2)' }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-cyan-100 tracking-wide" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl px-2">×</button></div>
      {children}
    </div></div>;
}

function MinimapOverlay({ data, onClose }: { data: MinimapData; onClose: () => void }) {
  const mapW = 220, mapH = 160;
  const scaleX = mapW / data.levelW, scaleY = mapH / data.levelH;
  return <div className="absolute top-20 right-4 z-20 rounded-xl p-3 pointer-events-auto" style={{ background: 'rgba(10,14,39,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,217,255,0.3)' }}>
    <div className="flex items-center justify-between mb-2"><span className="text-xs text-cyan-300 font-medium">Minimap</span><button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm">×</button></div>
    <div className="relative rounded-lg overflow-hidden border border-slate-700/40" style={{ width: mapW, height: mapH, background: '#0a0a14' }}>
      {/* Objectives */}
      {data.objectives.map((o, i) => <div key={i} className="absolute w-2 h-2 rounded-full"
        style={{ left: o.x * scaleX - 4, top: o.y * scaleY - 4, background: o.done ? '#22c55e' : '#ffaa00', opacity: o.done ? 0.5 : 0.9 }} />)}
      {/* Checkpoints */}
      {data.checkpoints.map((c, i) => <div key={i} className="absolute w-2 h-2 rounded-sm"
        style={{ left: c.x * scaleX - 3, top: c.y * scaleY - 3, background: c.activated ? '#22c55e' : '#eab308' }} />)}
      {/* Landmarks */}
      {data.landmarks.filter(l => l.discovered).map((l, i) => <div key={i} className="absolute text-xs"
        style={{ left: l.x * scaleX - 6, top: l.y * scaleY - 6 }}>{l.icon}</div>)}
      {/* Doors */}
      {data.doors.map((d, i) => <div key={i} className="absolute w-2 h-2 rounded-sm"
        style={{ left: d.x * scaleX - 3, top: d.y * scaleY - 3, background: d.locked ? '#ef4444' : '#22c55e' }} />)}
      {/* Player */}
      <div className="absolute w-3 h-3 rounded-full border-2 border-white" style={{ left: data.playerX * scaleX - 5, top: data.playerY * scaleY - 5, background: '#00d9ff' }} />
    </div>
    <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-ffaa00" /> Objective</span>
      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-22c55e" /> Checkpoint</span>
      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border-2 border-white bg-00d9ff" /> You</span>
    </div>
  </div>;
}

function MobileControls({ onMove, onAttack, onInteract, onPotion }: { onMove: (d: 'up' | 'down' | 'left' | 'right', p: boolean) => void; onAttack: () => void; onInteract: () => void; onPotion: () => void; }) {
  const bc = "w-12 h-12 rounded-full flex items-center justify-center text-slate-200 active:scale-90 transition-transform select-none touch-none";
  const bs: React.CSSProperties = { background: 'rgba(10,14,39,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,217,255,0.2)' };
  return <>
    <div className="md:hidden absolute bottom-4 left-4 z-10 grid grid-cols-3 gap-1 pointer-events-auto" style={{ touchAction: 'none' }}>
      <div /><button className={bc} style={bs} onTouchStart={(e) => { e.preventDefault(); onMove('up', true); }} onTouchEnd={(e) => { e.preventDefault(); onMove('up', false); }}>↑</button><div />
      <button className={bc} style={bs} onTouchStart={(e) => { e.preventDefault(); onMove('left', true); }} onTouchEnd={(e) => { e.preventDefault(); onMove('left', false); }}>←</button><div />
      <button className={bc} style={bs} onTouchStart={(e) => { e.preventDefault(); onMove('right', true); }} onTouchEnd={(e) => { e.preventDefault(); onMove('right', false); }}>→</button><div />
      <button className={bc} style={bs} onTouchStart={(e) => { e.preventDefault(); onMove('down', true); }} onTouchEnd={(e) => { e.preventDefault(); onMove('down', false); }}>↓</button><div />
    </div>
    <div className="md:hidden absolute bottom-4 right-4 z-10 flex flex-col gap-2 items-end pointer-events-auto" style={{ touchAction: 'none' }}>
      <div className="flex gap-2">
        <button className="w-11 h-11 rounded-full flex items-center justify-center text-amber-300 text-xs active:scale-90" style={{ background: 'rgba(120,53,15,0.7)', border: '1px solid rgba(251,191,36,0.3)' }} onTouchStart={(e) => { e.preventDefault(); onPotion(); }}>HP</button>
        <button className="w-11 h-11 rounded-full flex items-center justify-center text-cyan-300 text-xs active:scale-90" style={{ background: 'rgba(30,58,95,0.7)', border: '1px solid rgba(0,217,255,0.3)' }} onTouchStart={(e) => { e.preventDefault(); onInteract(); }}>E</button>
      </div>
      <button className="w-16 h-16 rounded-full flex items-center justify-center text-cyan-300 text-sm font-bold active:scale-90" style={{ background: 'rgba(10,40,60,0.7)', border: '1px solid rgba(0,217,255,0.4)' }} onTouchStart={(e) => { e.preventDefault(); onAttack(); }}>ATK</button>
    </div>
  </>;
}

function AppearanceEditor({ draft, onChange, onApply, onCancel }: { draft: CharacterAppearance; onChange: (d: CharacterAppearance) => void; onApply: () => void; onCancel: () => void; }) {
  const hcs: Record<string, string> = { Black: '#1a1510', Brown: '#3a2818', Blonde: '#d4a838', Red: '#a83838', White: '#e8e8e8', Silver: '#b8b8c8', Blue: '#3070d0', Green: '#30a040', Pink: '#e070b0', Purple: '#8040c0' };
  const ecs: Record<string, string> = { Brown: '#3a2818', Blue: '#3070d0', Green: '#30a040', Hazel: '#806030', Amber: '#d09030', Red: '#c03030', Violet: '#8040c0', Gold: '#d4a830', Silver: '#b0b0c0', Heterochromia: '#30a040' };
  return <div className="space-y-4">
    <AppearanceSelect label="Hair Style / 发型" value={draft.hairStyle} options={APPEARANCE_OPTIONS.hairStyle} onChange={(v) => onChange({ ...draft, hairStyle: v })} />
    <div><p className="text-xs text-slate-500 mb-1.5">Hair Color</p><div className="flex flex-wrap gap-2">
      {APPEARANCE_OPTIONS.hairColor.map((c) => <button key={c} onClick={() => onChange({ ...draft, hairColor: c })} className={`w-8 h-8 rounded-full border-2 transition-all ${draft.hairColor === c ? 'border-white scale-110' : 'border-slate-600'}`} style={{ background: hcs[c] }} />)}
    </div></div>
    <div><p className="text-xs text-slate-500 mb-1.5">Eye Color</p><div className="flex flex-wrap gap-2">
      {APPEARANCE_OPTIONS.eyeColor.map((c) => <button key={c} onClick={() => onChange({ ...draft, eyeColor: c })} className={`w-8 h-8 rounded-full border-2 transition-all ${draft.eyeColor === c ? 'border-white scale-110' : 'border-slate-600'}`} style={{ background: ecs[c] }} />)}
    </div></div>
    <AppearanceSelect label="Hair Length" value={draft.hairLength} options={APPEARANCE_OPTIONS.hairLength} onChange={(v) => onChange({ ...draft, hairLength: v })} />
    <AppearanceSelect label="Special Features" value={draft.specialFeatures} options={APPEARANCE_OPTIONS.specialFeatures} onChange={(v) => onChange({ ...draft, specialFeatures: v })} />
    <AppearanceSelect label="Glasses" value={draft.glasses} options={APPEARANCE_OPTIONS.glasses} onChange={(v) => onChange({ ...draft, glasses: v })} />
    <div className="flex gap-3 pt-2"><button onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-slate-300 bg-slate-800/50 border border-slate-600/30 text-sm">Cancel</button>
      <button onClick={onApply} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed)' }}>Apply</button></div>
  </div>;
}

function AppearanceSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; }) {
  return <div><p className="text-xs text-slate-500 mb-1.5">{label}</p><div className="flex flex-wrap gap-1.5">
    {options.map((o) => <button key={o} onClick={() => onChange(o)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${value === o ? 'bg-purple-600/40 text-purple-200 border border-purple-500/50' : 'bg-slate-800/40 text-slate-400 border border-slate-700/30'}`}>{o}</button>)}
  </div></div>;
}
