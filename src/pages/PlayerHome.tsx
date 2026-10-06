import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { WORLDS, type Character, type WorldProgress, type WorldStatus } from '@/types';
import StarFieldBackground from '@/components/StarFieldBackground';
import {
  LogOut, Play, Lock, CheckCircle2, Globe, ChevronRight, Sword,
  Shield, Sparkles, Flame, Droplet, Wind, Leaf, Zap, Snowflake,
  Moon, Sun, HelpCircle, Heart, Zap as MpIcon, Star,
} from 'lucide-react';

const AFFINITY_ICONS: Record<string, React.ReactNode> = {
  Fire: <Flame className="w-4 h-4" />, Water: <Droplet className="w-4 h-4" />,
  Wind: <Wind className="w-4 h-4" />, Nature: <Leaf className="w-4 h-4" />,
  Lightning: <Zap className="w-4 h-4" />, Ice: <Snowflake className="w-4 h-4" />,
  Shadow: <Moon className="w-4 h-4" />, Light: <Sun className="w-4 h-4" />,
  Mystery: <HelpCircle className="w-4 h-4" />,
};

const CLASS_ICONS: Record<string, React.ReactNode> = {
  attack: <Sword className="w-4 h-4" />,
  defense: <Shield className="w-4 h-4" />,
  support: <Sparkles className="w-4 h-4" />,
};

interface PlayerHomeProps {
  onNavigate: (page: 'characterCreation' | 'worldMap') => void;
  onEnterWorld: (worldNumber: number) => void;
  onSignOut: () => void;
}

export default function PlayerHome({ onNavigate, onEnterWorld, onSignOut }: PlayerHomeProps) {
  const { profile, session } = useAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  const [worldProgress, setWorldProgress] = useState<WorldProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWorldMap, setShowWorldMap] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!session) return;
      const { data: charData } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      setCharacter(charData as Character | null);

      if (charData) {
        const { data: wpData } = await supabase
          .from('world_progress')
          .select('*')
          .eq('character_id', charData.id)
          .order('world_number', { ascending: true });

        setWorldProgress((wpData as WorldProgress[]) || []);
      }

      setLoading(false);
    }
    loadData();
  }, [session]);

  function getWorldStatus(worldNumber: number): WorldStatus {
    if (worldNumber === 9) {
      const allWorldsDone = [1, 2, 3, 4, 5, 6, 7, 8].every((n) => {
        const wp = worldProgress.find((w) => w.world_number === n);
        return wp?.status === 'completed';
      });
      return allWorldsDone ? 'available' : 'locked';
    }
    const wp = worldProgress.find((w) => w.world_number === worldNumber);
    if (wp) return wp.status;
    // World 1 is available by default if no progress exists
    if (worldNumber === 1 && worldProgress.length === 0) return 'available';
    return 'locked';
  }

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <StarFieldBackground />
        <div className="relative z-10 text-slate-400">Loading...</div>
      </div>
    );
  }

  // No character — prompt creation
  if (!character) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <StarFieldBackground />
        <div className="relative z-10 text-center px-6 max-w-md">
          <h2
            className="text-2xl font-bold text-slate-100 mb-2 tracking-wide"
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
          >
            WELCOME, {profile?.username?.toUpperCase()}
          </h2>
          <p className="text-slate-400 mb-8">
            You don't have a character yet. Create one to begin your adventure.
          </p>
          <button
            onClick={() => onNavigate('characterCreation')}
            className="px-8 py-3.5 rounded-lg text-white font-medium tracking-wide transition-all hover:scale-[1.03] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8c 100%)',
              boxShadow: '0 0 20px rgba(45,90,140,0.3)',
            }}
          >
            CREATE YOUR CHARACTER
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarFieldBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <h2
            className="text-lg font-bold text-slate-100 tracking-wide"
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
          >
            PLAYER HOME
          </h2>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 border border-slate-600/30 hover:border-slate-500/50 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-8">
          <div className="w-full max-w-lg">
            {/* Welcome */}
            <div className="text-center mb-6">
              <p className="text-slate-400 text-sm">Welcome back,</p>
              <h1
                className="text-3xl font-bold text-slate-100 tracking-wide"
                style={{ fontFamily: "'Cinzel', Georgia, serif" }}
              >
                {profile?.username}
              </h1>
            </div>

            {/* Character Card */}
            <div
              className="rounded-2xl border border-slate-600/30 p-6 mb-6"
              style={{
                background: 'rgba(10,14,39,0.7)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 tracking-wide uppercase mb-1">Character</p>
                  <h3 className="text-2xl font-bold text-slate-100">{character.name}</h3>
                  {character.nickname && (
                    <p className="text-sm text-slate-400 italic">"{character.nickname}"</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span className="font-bold tabular-nums">{character.level}</span>
                  </div>
                  <p className="text-xs text-slate-500">Level</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatBox icon={<Heart className="w-4 h-4 text-red-400" />} label="HP" value={character.hp} />
                <StatBox icon={<MpIcon className="w-4 h-4 text-blue-400" />} label="MP" value={character.mp} />
                <StatBox icon={<Sparkles className="w-4 h-4 text-amber-400" />} label="SP" value={character.skill_points} />
              </div>

              {/* Affinity + Class */}
              <div className="flex flex-wrap gap-2 mb-4">
                {character.primary_affinity && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-700/40 text-slate-300 border border-slate-600/30">
                    {AFFINITY_ICONS[character.primary_affinity]} {character.primary_affinity}
                  </span>
                )}
                {character.secondary_affinity && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-700/40 text-slate-300 border border-slate-600/30">
                    {AFFINITY_ICONS[character.secondary_affinity]} {character.secondary_affinity}
                  </span>
                )}
                {character.starting_class && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-700/40 text-slate-300 border border-slate-600/30 capitalize">
                    {CLASS_ICONS[character.starting_class]} {character.starting_class}
                  </span>
                )}
              </div>

              {/* World status */}
              <div className="pt-4 border-t border-slate-700/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">World Progress</span>
                  <span className="text-slate-300">
                    {worldProgress.filter((w) => w.status === 'completed').length} / 8 completed
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => setShowWorldMap(true)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-xl text-white font-medium transition-all hover:scale-[1.02] active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8c 100%)',
                  boxShadow: '0 0 20px rgba(45,90,140,0.3)',
                }}
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-5 h-5" /> WORLD MAP
                </span>
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => onNavigate('characterCreation')}
                className="w-full px-5 py-3 rounded-xl text-slate-300 font-medium border border-slate-600/30 bg-slate-800/30 hover:bg-slate-700/30 transition-all text-sm"
              >
                Create New Character
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* World Map Modal */}
      {showWorldMap && (
        <WorldMapModal
          worldProgress={worldProgress}
          getStatus={getWorldStatus}
          onClose={() => setShowWorldMap(false)}
          onEnterWorld={onEnterWorld}
        />
      )}
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 px-3 py-2 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {icon}
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-200 tabular-nums">{value}</p>
    </div>
  );
}

function WorldMapModal({
  worldProgress: _worldProgress,
  getStatus,
  onClose,
  onEnterWorld,
}: {
  worldProgress: WorldProgress[];
  getStatus: (n: number) => WorldStatus;
  onClose: () => void;
  onEnterWorld: (worldNumber: number) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,4,13,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-600/30 p-6"
        style={{
          background: 'rgba(10,14,39,0.95)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-xl font-bold text-slate-100 tracking-wide"
              style={{ fontFamily: "'Cinzel', Georgia, serif" }}
            >
              WORLD MAP
            </h2>
            <p className="text-sm text-slate-400 mt-1">Choose a world to enter or replay</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none px-2"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          {WORLDS.map((world) => {
            const status = getStatus(world.number);
            const isFinal = world.number === 9;
            return (
              <div
                key={world.number}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  status === 'locked'
                    ? 'border-slate-700/20 opacity-50'
                    : 'border-slate-600/30 hover:border-slate-500/50 hover:bg-slate-700/20'
                }`}
                style={{ background: 'rgba(15,23,42,0.5)' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                    status === 'completed' ? 'bg-green-900/30 text-green-400' :
                    status === 'available' || status === 'in_progress' ? 'bg-blue-900/30 text-blue-300' :
                    'bg-slate-800/50 text-slate-500'
                  }`}>
                    {isFinal ? '★' : world.number}
                  </div>
                  <div>
                    <h3 className="text-slate-100 font-medium text-sm">
                      {isFinal && '⚔ '}
                      {world.name}
                    </h3>
                    <p className="text-xs text-slate-500">{world.theme}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {status === 'completed' && (
                    <>
                      <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> COMPLETED
                      </span>
                      <button
                        onClick={() => { onClose(); onEnterWorld(world.number); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 transition-all active:scale-95 flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" /> REPLAY
                      </button>
                    </>
                  )}
                  {status === 'available' && (
                    <button
                      onClick={() => { onClose(); onEnterWorld(world.number); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all active:scale-95 flex items-center gap-1"
                      style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d5a8c)' }}
                    >
                      <Play className="w-3 h-3" /> ENTER
                    </button>
                  )}
                  {status === 'in_progress' && (
                    <button
                      onClick={() => { onClose(); onEnterWorld(world.number); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all active:scale-95 flex items-center gap-1"
                      style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d5a8c)' }}
                    >
                      <Play className="w-3 h-3" /> CONTINUE
                    </button>
                  )}
                  {status === 'locked' && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <Lock className="w-4 h-4" /> LOCKED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-500 mt-4 text-center">
          Worlds 1 and 2 are available now. More worlds coming soon.
        </p>
      </div>
    </div>
  );
}
