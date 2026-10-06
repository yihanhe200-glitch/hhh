import { useState, useEffect } from 'react';
import StarFieldBackground from '@/components/StarFieldBackground';
import { useAuth } from '@/context/AuthContext';

interface LandingPageProps {
  onNavigate: (page: 'login' | 'register') => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const { session, loading } = useAuth();
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTitleVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <StarFieldBackground />

      <div
        className="relative z-10 text-center px-6 max-w-3xl mx-auto transition-all duration-1000"
        style={{
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? 'translateY(0)' : 'translateY(30px)',
        }}
      >
        {/* Glowing orb behind title */}
        <div className="relative mb-6">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.15), rgba(99,102,241,0.05), transparent)',
            }}
          />
        </div>

        {/* Title */}
        <h1
          className="text-5xl sm:text-7xl font-bold tracking-[0.15em] mb-4 relative"
          style={{
            background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 50%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 40px rgba(99,102,241,0.3)',
            fontFamily: "'Cinzel', 'Trajan Pro', Georgia, serif",
          }}
        >
          WORLD FORGE
        </h1>

        {/* Decorative line */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-slate-400/50" />
          <span className="text-slate-400/60 text-lg">✦</span>
          <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-slate-400/50" />
        </div>

        {/* Tagline */}
        <p
          className="text-lg sm:text-xl text-slate-300/80 mb-12 font-light tracking-wide max-w-xl mx-auto"
          style={{ fontFamily: "'Cinzel', Georgia, serif" }}
        >
          Create your character. Enter the worlds. Become a legend.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => onNavigate('register')}
            disabled={loading}
            className="group relative px-10 py-4 min-w-[220px] rounded-lg font-medium tracking-wide text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8c 100%)',
              boxShadow: '0 0 20px rgba(45,90,140,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <span className="relative z-10">CREATE ACCOUNT</span>
            <div
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, #2d5a8c 0%, #3b6fa8 100%)',
                boxShadow: '0 0 30px rgba(59,111,168,0.5)',
              }}
            />
          </button>

          <button
            onClick={() => onNavigate('login')}
            disabled={loading}
            className="group relative px-10 py-4 min-w-[220px] rounded-lg font-medium tracking-wide text-slate-200 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 border border-slate-500/30 hover:border-slate-400/50"
            style={{
              background: 'rgba(15,23,42,0.6)',
              backdropFilter: 'blur(8px)',
            }}
          >
            LOG IN
          </button>
        </div>

        {session && !loading && (
          <p className="mt-8 text-sm text-slate-400/60">
            You are already logged in — redirecting to your home...
          </p>
        )}
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
    </div>
  );
}
