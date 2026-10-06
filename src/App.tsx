import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Character } from '@/types';
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import CharacterCreation, { type CharacterCreationData } from '@/pages/CharacterCreation';
import CharacterProfile from '@/pages/CharacterProfile';
import PlayerHome from '@/pages/PlayerHome';
import WorldOne from '@/pages/WorldOne';
import WorldTwo from '@/pages/WorldTwo';

type Page = 'landing' | 'login' | 'register' | 'characterCreation' | 'characterProfile' | 'playerHome' | 'worldOne' | 'worldTwo';

function AppContent() {
  const { session, loading, signOut } = useAuth();
  const [page, setPage] = useState<Page>('landing');
  const [createdCharacter, setCreatedCharacter] = useState<Character | null>(null);
  const [worldOneCharacter, setWorldOneCharacter] = useState<Character | null>(null);
  const [worldTwoCharacter, setWorldTwoCharacter] = useState<Character | null>(null);
  const [enterWorldNum, setEnterWorldNum] = useState(1);

  // Auto-redirect based on auth state
  useEffect(() => {
    if (loading) return;
    if (session) {
      if (page === 'landing' || page === 'login' || page === 'register') {
        setPage('playerHome');
      }
    } else {
      if (page === 'playerHome' || page === 'characterProfile' || page === 'worldOne') {
        setPage('landing');
      }
    }
  }, [session, loading, page]);

  async function handleCharacterCreate(data: CharacterCreationData) {
    if (!session) return;

    const insertData = {
      name: data.name,
      nickname: data.nickname || null,
      age: data.age || null,
      gender: data.gender || null,
      pronouns: data.pronouns || null,
      species: data.species || null,
      appearance: data.appearance,
      personality: data.personality,
      primary_affinity: data.primaryAffinity,
      secondary_affinity: data.secondaryAffinity,
      starting_class: data.startingClass,
      background: data.background || null,
      origin: data.origin === 'Custom' ? `Custom: ${data.customOrigin}` : data.origin,
    };

    const { data: charData, error } = await supabase
      .from('characters')
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Character creation error:', error);
      return;
    }

    if (charData) {
      const worldProgressRows = Array.from({ length: 9 }, (_, i) => ({
        character_id: charData.id,
        world_number: i + 1,
        status: i === 0 ? 'available' : 'locked',
      }));

      await supabase.from('world_progress').insert(worldProgressRows);

      setCreatedCharacter(charData as Character);
      setPage('characterProfile');
    }
  }

  function handleEnterWorld() {
    async function loadAndEnter() {
      if (!session) return;
      const { data } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (data) {
        // Mark world as in_progress when entering
        const charId = data.id;
        if (enterWorldNum === 1) {
          await supabase.from('world_progress').update({
            status: 'in_progress', updated_at: new Date().toISOString(),
          }).eq('character_id', charId).eq('world_number', 1);
          setWorldOneCharacter(data as Character);
          setPage('worldOne');
        } else if (enterWorldNum === 2) {
          await supabase.from('world_progress').update({
            status: 'in_progress', updated_at: new Date().toISOString(),
          }).eq('character_id', charId).eq('world_number', 2);
          setWorldTwoCharacter(data as Character);
          setPage('worldTwo');
        }
      }
    }
    loadAndEnter();
  }

  function handleWorldOneComplete() {
    setPage('playerHome');
  }

  function handleWorldTwoComplete() {
    setPage('playerHome');
  }

  function handleSignOut() {
    signOut();
    setPage('landing');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm tracking-wide">Loading WorldForge...</div>
      </div>
    );
  }

  if (!session) {
    if (page === 'login') return <AuthPage mode="login" onNavigate={setPage} />;
    if (page === 'register') return <AuthPage mode="register" onNavigate={setPage} />;
    return <LandingPage onNavigate={setPage} />;
  }

  if (page === 'characterCreation') {
    return (
      <CharacterCreation
        onComplete={handleCharacterCreate}
        onBack={() => setPage('playerHome')}
      />
    );
  }

  if (page === 'characterProfile' && createdCharacter) {
    return (
      <CharacterProfile
        character={createdCharacter}
        onEnterWorld={handleEnterWorld}
        onBack={() => setPage('playerHome')}
      />
    );
  }

  if (page === 'worldOne' && worldOneCharacter) {
    return (
      <WorldOne
        character={worldOneCharacter}
        onComplete={handleWorldOneComplete}
        onExit={() => setPage('playerHome')}
      />
    );
  }

  if (page === 'worldTwo' && worldTwoCharacter) {
    return (
      <WorldTwo
        character={worldTwoCharacter}
        onComplete={handleWorldTwoComplete}
        onExit={() => setPage('playerHome')}
      />
    );
  }

  function handleEnterWorldFromMap(worldNumber: number) {
    if (worldNumber !== 1 && worldNumber !== 2) return;
    setEnterWorldNum(worldNumber);
    handleEnterWorld();
  }

  return (
    <PlayerHome
      onNavigate={(p) => setPage(p === 'characterCreation' ? 'characterCreation' : 'playerHome')}
      onEnterWorld={handleEnterWorldFromMap}
      onSignOut={handleSignOut}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
