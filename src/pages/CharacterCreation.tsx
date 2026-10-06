import { useState } from 'react';
import {
  Sword, Shield, Sparkles, ChevronLeft, ChevronRight,
  Dices, Eye, Heart, Flame, Droplet, Wind, Leaf, Zap, Snowflake,
  Moon, Sun, HelpCircle, Check,
} from 'lucide-react';
import {
  AFFINITY_OPTIONS, CLASS_OPTIONS, ORIGIN_OPTIONS, APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE, DEFAULT_PERSONALITY,
  type CharacterAppearance, type CharacterPersonality,
} from '@/types';
import StarFieldBackground from '@/components/StarFieldBackground';

const TOTAL_STEPS = 7;
const TOTAL_PERSONALITY_POINTS = 10;

const AFFINITY_ICONS: Record<string, React.ReactNode> = {
  Fire: <Flame className="w-5 h-5" />,
  Water: <Droplet className="w-5 h-5" />,
  Wind: <Wind className="w-5 h-5" />,
  Nature: <Leaf className="w-5 h-5" />,
  Lightning: <Zap className="w-5 h-5" />,
  Ice: <Snowflake className="w-5 h-5" />,
  Shadow: <Moon className="w-5 h-5" />,
  Light: <Sun className="w-5 h-5" />,
  Mystery: <HelpCircle className="w-5 h-5" />,
};

const AFFINITY_COLORS: Record<string, string> = {
  Fire: '#f97316',
  Water: '#3b82f6',
  Wind: '#14b8a6',
  Nature: '#22c55e',
  Lightning: '#eab308',
  Ice: '#67e8f9',
  Shadow: '#8b5cf6',
  Light: '#fde047',
  Mystery: '#c084fc',
};

interface CharacterCreationProps {
  onComplete: (data: CharacterCreationData) => void;
  onBack: () => void;
}

export interface CharacterCreationData {
  name: string;
  nickname: string;
  age: string;
  gender: string;
  pronouns: string;
  species: string;
  appearance: CharacterAppearance;
  personality: CharacterPersonality;
  primaryAffinity: string;
  secondaryAffinity: string;
  startingClass: string;
  background: string;
  origin: string;
  customOrigin: string;
}

export default function CharacterCreation({ onComplete, onBack }: CharacterCreationProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);

  // Step 1 — Basic Info
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [species, setSpecies] = useState('');

  // Step 2 — Appearance
  const [appearance, setAppearance] = useState<CharacterAppearance>({ ...DEFAULT_APPEARANCE });

  // Step 3 — Personality
  const [personality, setPersonality] = useState<CharacterPersonality>({ ...DEFAULT_PERSONALITY });

  // Step 4 — Affinity
  const [primaryAffinity, setPrimaryAffinity] = useState('');
  const [secondaryAffinity, setSecondaryAffinity] = useState('');

  // Step 5 — Class
  const [startingClass, setStartingClass] = useState('');

  // Step 6 — Background
  const [background, setBackground] = useState('');
  const [origin, setOrigin] = useState('');
  const [customOrigin, setCustomOrigin] = useState('');

  // Step 7 — Profile (review)
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personalityTotal = Object.values(personality).reduce((a, b) => a + b, 0);

  function randomizeAppearance() {
    const rand = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
    setAppearance({
      hairStyle: rand(APPEARANCE_OPTIONS.hairStyle),
      hairColor: rand(APPEARANCE_OPTIONS.hairColor),
      hairLength: rand(APPEARANCE_OPTIONS.hairLength),
      eyeColor: rand(APPEARANCE_OPTIONS.eyeColor),
      eyeType: rand(APPEARANCE_OPTIONS.eyeType),
      faceShape: rand(APPEARANCE_OPTIONS.faceShape),
      eyebrows: rand(APPEARANCE_OPTIONS.eyebrows),
      mouth: rand(APPEARANCE_OPTIONS.mouth),
      height: rand(APPEARANCE_OPTIONS.height),
      bodyType: rand(APPEARANCE_OPTIONS.bodyType),
      glasses: rand(APPEARANCE_OPTIONS.glasses),
      earrings: rand(APPEARANCE_OPTIONS.earrings),
      scars: rand(APPEARANCE_OPTIONS.scars),
      birthmarks: rand(APPEARANCE_OPTIONS.birthmarks),
      specialFeatures: rand(APPEARANCE_OPTIONS.specialFeatures),
    });
  }

  function adjustPersonality(key: keyof CharacterPersonality, delta: number) {
    setPersonality((prev) => {
      const current = prev[key];
      const newVal = Math.max(0, Math.min(10, current + delta));
      if (delta > 0) {
        const newTotal = Object.values(prev).reduce((a, b) => a + b, 0) - current + newVal;
        if (newTotal > TOTAL_PERSONALITY_POINTS) return prev;
      }
      return { ...prev, [key]: newVal };
    });
  }

  function canProceed(): boolean {
    switch (step) {
      case 1: return name.trim().length > 0;
      case 2: return true;
      case 3: return personalityTotal === TOTAL_PERSONALITY_POINTS;
      case 4: return primaryAffinity !== '' && secondaryAffinity !== '' && primaryAffinity !== secondaryAffinity;
      case 5: return startingClass !== '';
      case 6: return origin !== '';
      case 7: return true;
      default: return false;
    }
  }

  function next() {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep(step + 1);
    }
  }

  function back() {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    } else {
      onBack();
    }
  }

  function handleCreate() {
    setCreating(true);
    setError(null);
    onComplete({
      name: name.trim(),
      nickname: nickname.trim(),
      age: age.trim(),
      gender: gender.trim(),
      pronouns: pronouns.trim(),
      species: species.trim(),
      appearance,
      personality,
      primaryAffinity,
      secondaryAffinity,
      startingClass,
      background: background.trim(),
      origin: origin === 'Custom' ? 'Custom' : origin,
      customOrigin: origin === 'Custom' ? customOrigin.trim() : '',
    });
  }

  const stepNames = ['Basic Info', 'Appearance', 'Personality', 'Affinity', 'Class', 'Background', 'Profile'];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarFieldBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-6 pb-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-lg sm:text-xl font-bold text-slate-100 tracking-wide"
                style={{ fontFamily: "'Cinzel', Georgia, serif" }}
              >
                CHARACTER CREATION
              </h2>
              <span className="text-sm text-slate-400 tabular-nums">
                {step} / {TOTAL_STEPS}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-full transition-all duration-500"
                  style={{
                    background: i + 1 <= step
                      ? 'linear-gradient(90deg, #2d5a8c, #3b6fa8)'
                      : 'rgba(51,65,85,0.4)',
                    boxShadow: i + 1 <= step ? '0 0 8px rgba(59,111,168,0.4)' : 'none',
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Step {step} — {stepNames[step - 1]}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-4 overflow-y-auto">
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-600/30 p-6 sm:p-8"
            style={{
              background: 'rgba(10,14,39,0.7)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Step 1 — Basic Info */}
            {step === 1 && (
              <StepContainer direction={direction}>
                <StepTitle>Basic Information</StepTitle>
                <StepSubtitle>Tell us about your adventurer</StepSubtitle>
                <div className="space-y-4 mt-6">
                  <Field label="Name *" >
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder="Enter character name" />
                  </Field>
                  <Field label="Nickname">
                    <input value={nickname} onChange={(e) => setNickname(e.target.value)}
                      className={inputClass}
                      placeholder="Optional alias or title" />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Age">
                      <input value={age} onChange={(e) => setAge(e.target.value)}
                        className={inputClass} placeholder="e.g. 24" />
                    </Field>
                    <Field label="Gender">
                      <input value={gender} onChange={(e) => setGender(e.target.value)}
                        className={inputClass} placeholder="e.g. Female" />
                    </Field>
                    <Field label="Pronouns">
                      <input value={pronouns} onChange={(e) => setPronouns(e.target.value)}
                        className={inputClass} placeholder="e.g. she/her" />
                    </Field>
                  </div>
                  <Field label="Species">
                    <input value={species} onChange={(e) => setSpecies(e.target.value)}
                      className={inputClass} placeholder="e.g. Human, Elf, Beastkin" />
                  </Field>
                </div>
              </StepContainer>
            )}

            {/* Step 2 — Appearance */}
            {step === 2 && (
              <StepContainer direction={direction}>
                <div className="flex items-center justify-between mb-1">
                  <StepTitle>Appearance</StepTitle>
                  <button
                    onClick={randomizeAppearance}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 border border-slate-500/30 transition-all hover:scale-[1.03] active:scale-95"
                  >
                    <Dices className="w-4 h-4" /> Randomize
                  </button>
                </div>
                <StepSubtitle>Customize how your character looks</StepSubtitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {(
                    [
                      ['hairStyle', 'Hair Style'], ['hairColor', 'Hair Color'],
                      ['hairLength', 'Hair Length'], ['eyeColor', 'Eye Color'],
                      ['eyeType', 'Eye Type'], ['faceShape', 'Face Shape'],
                      ['eyebrows', 'Eyebrows'], ['mouth', 'Mouth'],
                      ['height', 'Height'], ['bodyType', 'Body Type'],
                      ['glasses', 'Glasses'], ['earrings', 'Earrings'],
                      ['scars', 'Scars'], ['birthmarks', 'Birthmarks'],
                      ['specialFeatures', 'Special Features'],
                    ] as [keyof CharacterAppearance, string][]
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <select
                        value={appearance[key]}
                        onChange={(e) => setAppearance({ ...appearance, [key]: e.target.value })}
                        className={inputClass}
                      >
                        {APPEARANCE_OPTIONS[key].map((opt) => (
                          <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              </StepContainer>
            )}

            {/* Step 3 — Personality */}
            {step === 3 && (
              <StepContainer direction={direction}>
                <StepTitle>Personality</StepTitle>
                <StepSubtitle>
                  Distribute {TOTAL_PERSONALITY_POINTS} points across your traits
                </StepSubtitle>
                <div className="mt-4 mb-6">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-400">Points Remaining</span>
                    <span className={`font-bold tabular-nums ${personalityTotal === TOTAL_PERSONALITY_POINTS ? 'text-green-400' : 'text-amber-400'}`}>
                      {TOTAL_PERSONALITY_POINTS - personalityTotal}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(personalityTotal / TOTAL_PERSONALITY_POINTS) * 100}%`,
                        background: personalityTotal === TOTAL_PERSONALITY_POINTS
                          ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                          : 'linear-gradient(90deg, #f59e0b, #d97706)',
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  {(Object.keys(personality) as (keyof CharacterPersonality)[]).map((key) => (
                    <div key={key} className="flex items-center gap-4">
                      <span className="text-slate-200 capitalize w-24 text-sm">{key}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <button
                          onClick={() => adjustPersonality(key, -1)}
                          disabled={personality[key] === 0}
                          className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 flex items-center justify-center"
                        >
                          −
                        </button>
                        <div className="flex-1 flex gap-1">
                          {Array.from({ length: 10 }, (_, i) => (
                            <div
                              key={i}
                              className="flex-1 h-6 rounded transition-all duration-200"
                              style={{
                                background: i < personality[key]
                                  ? 'linear-gradient(180deg, #3b6fa8, #2d5a8c)'
                                  : 'rgba(51,65,85,0.3)',
                                boxShadow: i < personality[key] ? '0 0 4px rgba(59,111,168,0.4)' : 'none',
                              }}
                            />
                          ))}
                        </div>
                        <span className="w-6 text-center text-slate-200 font-bold tabular-nums text-sm">
                          {personality[key]}
                        </span>
                        <button
                          onClick={() => adjustPersonality(key, 1)}
                          disabled={personality[key] === 10 || personalityTotal >= TOTAL_PERSONALITY_POINTS}
                          className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {personalityTotal < TOTAL_PERSONALITY_POINTS && (
                  <p className="text-amber-400/70 text-sm mt-4">
                    You still have {TOTAL_PERSONALITY_POINTS - personalityTotal} points to allocate.
                  </p>
                )}
                {personalityTotal === TOTAL_PERSONALITY_POINTS && (
                  <p className="text-green-400/70 text-sm mt-4 flex items-center gap-1">
                    <Check className="w-4 h-4" /> All points allocated!
                  </p>
                )}
              </StepContainer>
            )}

            {/* Step 4 — Affinity */}
            {step === 4 && (
              <StepContainer direction={direction}>
                <StepTitle>Element Affinity</StepTitle>
                <StepSubtitle>Choose your primary and secondary elements</StepSubtitle>
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-300 mb-3">Primary Affinity</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {AFFINITY_OPTIONS.map((aff) => (
                        <AffinityButton
                          key={aff}
                          name={aff}
                          selected={primaryAffinity === aff}
                          disabled={secondaryAffinity === aff}
                          onClick={() => setPrimaryAffinity(aff)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-300 mb-3">Secondary Affinity</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {AFFINITY_OPTIONS.map((aff) => (
                        <AffinityButton
                          key={aff}
                          name={aff}
                          selected={secondaryAffinity === aff}
                          disabled={primaryAffinity === aff}
                          onClick={() => setSecondaryAffinity(aff)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </StepContainer>
            )}

            {/* Step 5 — Class */}
            {step === 5 && (
              <StepContainer direction={direction}>
                <StepTitle>Starting Class</StepTitle>
                <StepSubtitle>Choose your initial combat direction</StepSubtitle>
                <div className="mt-6 space-y-3">
                  {CLASS_OPTIONS.map((cls) => {
                    const icon = cls.icon === 'sword' ? <Sword className="w-6 h-6" /> :
                      cls.icon === 'shield' ? <Shield className="w-6 h-6" /> :
                      <Sparkles className="w-6 h-6" />;
                    return (
                      <button
                        key={cls.id}
                        onClick={() => setStartingClass(cls.id)}
                        className={`w-full text-left p-5 rounded-xl border transition-all duration-300 flex items-start gap-4 ${
                          startingClass === cls.id
                            ? 'border-blue-400/60 bg-blue-900/20 scale-[1.01]'
                            : 'border-slate-600/30 bg-slate-800/30 hover:border-slate-500/50 hover:bg-slate-700/20'
                        }`}
                      >
                        <div className={`p-3 rounded-lg ${
                          startingClass === cls.id ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700/50 text-slate-400'
                        }`}>
                          {icon}
                        </div>
                        <div>
                          <h3 className="text-slate-100 font-medium text-lg">{cls.name}</h3>
                          <p className="text-slate-400 text-sm mt-1">{cls.desc}</p>
                        </div>
                        {startingClass === cls.id && (
                          <Check className="w-5 h-5 text-blue-400 ml-auto mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </StepContainer>
            )}

            {/* Step 6 — Background */}
            {step === 6 && (
              <StepContainer direction={direction}>
                <StepTitle>Background</StepTitle>
                <StepSubtitle>Where does your character come from?</StepSubtitle>
                <div className="mt-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-medium text-slate-300 mb-3">Origin</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ORIGIN_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setOrigin(opt)}
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                            origin === opt
                              ? 'border-blue-400/60 bg-blue-900/20 text-blue-200'
                              : 'border-slate-600/30 bg-slate-800/30 text-slate-300 hover:border-slate-500/50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  {origin === 'Custom' && (
                    <Field label="Custom Origin">
                      <input value={customOrigin} onChange={(e) => setCustomOrigin(e.target.value)}
                        className={inputClass} placeholder="Describe your origin" />
                    </Field>
                  )}
                  <Field label="Backstory">
                    <textarea
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      className={`${inputClass} min-h-[120px] resize-y`}
                      placeholder="Write your character's background story..."
                      maxLength={1000}
                    />
                    <p className="text-xs text-slate-500 mt-1 text-right">{background.length}/1000</p>
                  </Field>
                </div>
              </StepContainer>
            )}

            {/* Step 7 — Profile Preview */}
            {step === 7 && (
              <StepContainer direction={direction}>
                <StepTitle>Character Profile</StepTitle>
                <StepSubtitle>Review your character before creating</StepSubtitle>
                <div className="mt-6 rounded-xl border border-slate-600/30 overflow-hidden">
                  <div className="bg-slate-800/40 px-5 py-3 border-b border-slate-600/20 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400 tracking-wide">CHARACTER PREVIEW</span>
                  </div>
                  <div className="p-5 space-y-3">
                    <ProfileRow label="NAME" value={name} />
                    <ProfileRow label="NICKNAME" value={nickname || '—'} />
                    <ProfileRow label="AGE" value={age || '—'} />
                    <ProfileRow label="GENDER" value={gender || '—'} />
                    <ProfileRow label="PRONOUNS" value={pronouns || '—'} />
                    <ProfileRow label="SPECIES" value={species || '—'} />
                    <div className="pt-2 border-t border-slate-700/30">
                      <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Personality</p>
                      <div className="flex flex-wrap gap-2">
                        {(Object.entries(personality) as [string, number][]).map(([k, v]) => (
                          <span key={k} className="text-xs px-2 py-1 rounded bg-slate-700/40 text-slate-300 capitalize">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-700/30">
                      <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Affinity</p>
                      <div className="flex gap-3">
                        <AffinityBadge name={primaryAffinity} />
                        <AffinityBadge name={secondaryAffinity} />
                      </div>
                    </div>
                    <ProfileRow label="CLASS" value={startingClass ? startingClass.charAt(0).toUpperCase() + startingClass.slice(1) : '—'} />
                    <ProfileRow label="ORIGIN" value={origin === 'Custom' ? customOrigin || 'Custom' : origin} />
                    <ProfileRow label="LEVEL" value="1" />
                    <ProfileRow label="HP" value="100" />
                    <ProfileRow label="MP" value="50" />
                    <ProfileRow label="SKILL POINTS" value="0" />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 text-sm text-red-300 bg-red-900/30 border border-red-700/30 rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}
              </StepContainer>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="px-4 sm:px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <button
              onClick={back}
              disabled={creating}
              className="flex items-center gap-1 px-5 py-3 rounded-lg text-slate-300 bg-slate-800/50 border border-slate-600/30 hover:bg-slate-700/50 transition-all active:scale-95 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> BACK
            </button>

            {step < TOTAL_STEPS ? (
              <button
                onClick={next}
                disabled={!canProceed()}
                className="flex items-center gap-1 px-5 py-3 rounded-lg text-white font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: canProceed()
                    ? 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8c 100%)'
                    : 'rgba(30,58,95,0.3)',
                  boxShadow: canProceed() ? '0 0 15px rgba(45,90,140,0.3)' : 'none',
                }}
              >
                NEXT <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating || !canProceed()}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                  boxShadow: '0 0 20px rgba(22,163,74,0.4)',
                }}
              >
                {creating ? 'Creating...' : 'CREATE CHARACTER'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-600/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm';

function StepContainer({ children, direction }: { children: React.ReactNode; direction: number }) {
  return (
    <div
      className="transition-all duration-300"
      style={{
        opacity: 1,
        transform: direction === 0 ? 'none' : direction > 0 ? 'translateX(0)' : 'translateX(0)',
      }}
    >
      {children}
    </div>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xl font-bold text-slate-100 tracking-wide"
      style={{ fontFamily: "'Cinzel', Georgia, serif" }}
    >
      {children}
    </h3>
  );
}

function StepSubtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400 mt-1">{children}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

function AffinityButton({ name, selected, disabled, onClick }: {
  name: string; selected: boolean; disabled: boolean; onClick: () => void;
}) {
  const color = AFFINITY_COLORS[name] || '#64748b';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-all duration-200 ${
        selected
          ? 'border-transparent scale-[1.05]'
          : disabled
            ? 'border-slate-700/20 opacity-30 cursor-not-allowed'
            : 'border-slate-600/30 hover:border-slate-500/50 hover:scale-[1.02]'
      }`}
      style={selected ? {
        background: `linear-gradient(135deg, ${color}25, ${color}10)`,
        boxShadow: `0 0 15px ${color}40`,
      } : {
        background: 'rgba(15,23,42,0.5)',
      }}
    >
      <span style={{ color }} className="transition-transform">
        {AFFINITY_ICONS[name]}
      </span>
      <span className={`text-xs font-medium ${selected ? 'text-slate-100' : 'text-slate-400'}`}>
        {name}
      </span>
      {selected && (
        <Check className="w-3.5 h-3.5 absolute top-1.5 right-1.5" style={{ color }} />
      )}
    </button>
  );
}

function AffinityBadge({ name }: { name: string }) {
  if (!name) return null;
  const color = AFFINITY_COLORS[name] || '#64748b';
  return (
    <span
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
      style={{
        background: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {AFFINITY_ICONS[name]} {name}
    </span>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500 text-xs tracking-wide">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}
