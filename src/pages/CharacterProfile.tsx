import {
  Sword, Shield, Sparkles, Flame, Droplet, Wind, Leaf, Zap, Snowflake,
  Moon, Sun, HelpCircle, Heart, Star,
} from 'lucide-react';
import StarFieldBackground from '@/components/StarFieldBackground';
import type { Character } from '@/types';

const AFFINITY_ICONS: Record<string, React.ReactNode> = {
  Fire: <Flame className="w-5 h-5" />, Water: <Droplet className="w-5 h-5" />,
  Wind: <Wind className="w-5 h-5" />, Nature: <Leaf className="w-5 h-5" />,
  Lightning: <Zap className="w-5 h-5" />, Ice: <Snowflake className="w-5 h-5" />,
  Shadow: <Moon className="w-5 h-5" />, Light: <Sun className="w-5 h-5" />,
  Mystery: <HelpCircle className="w-5 h-5" />,
};

const AFFINITY_COLORS: Record<string, string> = {
  Fire: '#f97316', Water: '#3b82f6', Wind: '#14b8a6', Nature: '#22c55e',
  Lightning: '#eab308', Ice: '#67e8f9', Shadow: '#8b5cf6', Light: '#fde047',
  Mystery: '#c084fc',
};

const CLASS_ICONS: Record<string, React.ReactNode> = {
  attack: <Sword className="w-5 h-5" />,
  defense: <Shield className="w-5 h-5" />,
  support: <Sparkles className="w-5 h-5" />,
};

interface CharacterProfileProps {
  character: Character;
  onEnterWorld: () => void;
  onBack: () => void;
}

export default function CharacterProfile({ character, onEnterWorld, onBack }: CharacterProfileProps) {
  const personalityEntries = Object.entries(character.personality) as [string, number][];

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-8">
      <StarFieldBackground />

      <div className="relative z-10 w-full max-w-lg">
        {/* Card */}
        <div
          className="rounded-2xl border border-slate-600/30 overflow-hidden"
          style={{
            background: 'rgba(10,14,39,0.7)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Header banner */}
          <div
            className="px-6 py-6 text-center relative"
            style={{
              background: 'linear-gradient(180deg, rgba(30,58,95,0.3) 0%, transparent 100%)',
            }}
          >
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-30"
              style={{
                background: `radial-gradient(circle, ${AFFINITY_COLORS[character.primary_affinity || ''] || '#3b6fa8'}, transparent)`,
              }}
            />
            <p className="text-xs text-slate-500 tracking-[0.2em] uppercase mb-2 relative">Character Profile</p>
            <h1
              className="text-3xl font-bold text-slate-100 tracking-wide relative"
              style={{ fontFamily: "'Cinzel', Georgia, serif" }}
            >
              {character.name}
            </h1>
            {character.nickname && (
              <p className="text-slate-400 italic mt-1 relative">"{character.nickname}"</p>
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-1">
            <Row label="NAME" value={character.name} />
            {character.age && <Row label="AGE" value={character.age} />}
            {character.species && <Row label="SPECIES" value={character.species} />}

            {/* Personality */}
            <div className="pt-3 border-t border-slate-700/30 mt-3">
              <p className="text-xs text-slate-500 tracking-wide uppercase mb-2">Personality</p>
              <div className="space-y-2">
                {personalityEntries.map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-slate-300 capitalize text-sm w-20">{key}</span>
                    <div className="flex-1 flex gap-0.5">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div
                          key={i}
                          className="flex-1 h-2 rounded-sm transition-all"
                          style={{
                            background: i < val
                              ? 'linear-gradient(90deg, #3b6fa8, #2d5a8c)'
                              : 'rgba(51,65,85,0.3)',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-slate-400 text-sm tabular-nums w-6 text-right">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Affinity */}
            <div className="pt-3 border-t border-slate-700/30 mt-3">
              <p className="text-xs text-slate-500 tracking-wide uppercase mb-2">Affinity</p>
              <div className="flex gap-3">
                {character.primary_affinity && (
                  <AffinityBadge name={character.primary_affinity} label="Primary" />
                )}
                {character.secondary_affinity && (
                  <AffinityBadge name={character.secondary_affinity} label="Secondary" />
                )}
              </div>
            </div>

            <Row
              label="CLASS"
              value={
                <span className="flex items-center gap-1.5 capitalize">
                  {CLASS_ICONS[character.starting_class || '']} {character.starting_class}
                </span>
              }
            />
            <Row
              label="ORIGIN"
              value={character.origin === 'Custom' ? (character as unknown as { customOrigin?: string }).customOrigin || 'Custom' : character.origin || '—'}
            />

            {/* Stats */}
            <div className="pt-3 border-t border-slate-700/30 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <StatTile icon={<Star className="w-4 h-4 text-amber-400" />} label="LEVEL" value={character.level} />
                <StatTile icon={<Heart className="w-4 h-4 text-red-400" />} label="HP" value={character.hp} />
                <StatTile icon={<Zap className="w-4 h-4 text-blue-400" />} label="MP" value={character.mp} />
                <StatTile icon={<Sparkles className="w-4 h-4 text-purple-400" />} label="SKILL POINTS" value={character.skill_points} />
              </div>
            </div>

            {/* Backstory */}
            {character.background && (
              <div className="pt-3 border-t border-slate-700/30 mt-3">
                <p className="text-xs text-slate-500 tracking-wide uppercase mb-2">Backstory</p>
                <p className="text-sm text-slate-300 leading-relaxed">{character.background}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onBack}
            className="px-5 py-3 rounded-lg text-slate-300 bg-slate-800/50 border border-slate-600/30 hover:bg-slate-700/50 transition-all active:scale-95"
          >
            BACK
          </button>
          <button
            onClick={onEnterWorld}
            className="flex-1 py-3.5 rounded-lg text-white font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              boxShadow: '0 0 25px rgba(22,163,74,0.4)',
            }}
          >
            ENTER WORLD 1
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-slate-500 text-xs tracking-wide">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-100 tabular-nums">{value}</p>
    </div>
  );
}

function AffinityBadge({ name, label }: { name: string; label: string }) {
  const color = AFFINITY_COLORS[name] || '#64748b';
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{
        background: `${color}15`,
        border: `1px solid ${color}30`,
      }}
    >
      <span style={{ color }}>{AFFINITY_ICONS[name]}</span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium" style={{ color }}>{name}</p>
      </div>
    </div>
  );
}
