import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import type { Campaign } from '@shared/schema';
import ChroniclerLogo from '@/components/ChroniclerLogo';
import { Button } from '@/components/ui/button';
import { Sword, BookOpen, Scroll, Flame } from 'lucide-react';

// ── Ember particle data ───────────────────────────────────────────────────────
const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left:  `${5 + Math.random() * 90}%`,
  size:  `${3 + Math.random() * 5}px`,
  dur:   `${5 + Math.random() * 8}s`,
  delay: `${Math.random() * 7}s`,
  drift: `${-30 + Math.random() * 60}px`,
  drift2:`${-20 + Math.random() * 40}px`,
  bottom:`${Math.random() * 30}%`,
  opacity: 0.4 + Math.random() * 0.5,
  color: Math.random() > 0.4 ? 'hsl(18 90% 58%)' : Math.random() > 0.5 ? 'hsl(42 90% 62%)' : 'hsl(0 72% 52%)',
}));

export default function LandingPage() {
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if a campaign/save exists
  const { data: campaign } = useQuery<Campaign>({
    queryKey: ['/api/campaign'],
    retry: false,
  });

  const hasSave = !!campaign && (
    campaign.gameMode === 'custom'
      ? !!campaign.char1
      : true  // heroes mode always has a playable state
  );

  const hasStarted = !!campaign && campaign.gameMode !== 'heroes' || false;
  // Show continue if there are any messages (i.e., game has been played)

  return (
    <div
      ref={containerRef}
      className="landing-bg min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden select-none"
      data-testid="landing-page"
    >
      {/* Ember particles */}
      {EMBERS.map(e => (
        <div
          key={e.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left:   e.left,
            bottom: e.bottom,
            width:  e.size,
            height: e.size,
            background: e.color,
            opacity: 0,
            boxShadow: `0 0 ${parseInt(e.size) * 2}px ${e.color}`,
            animation: `emberFloat ${e.dur} ease-in ${e.delay} infinite`,
            '--drift':  e.drift,
            '--drift2': e.drift2,
          } as React.CSSProperties}
        />
      ))}

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, hsl(20 10% 3% / 0.7) 100%)',
        }}
      />

      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(18 90% 52% / 0.5), hsl(42 88% 58% / 0.8), hsl(18 90% 52% / 0.5), transparent)' }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(18 90% 52% / 0.4), transparent)' }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto">

        {/* Logo */}
        <div className="mb-8 torch-flicker">
          <ChroniclerLogo className="w-20 h-20 mx-auto" style={{ filter: 'drop-shadow(0 0 20px hsl(18 90% 52% / 0.8)) drop-shadow(0 0 40px hsl(18 90% 52% / 0.4))' }} />
        </div>

        {/* Title */}
        <h1
          className="font-display font-bold tracking-widest mb-3 leading-none"
          style={{
            fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
            color: 'hsl(38 28% 88%)',
            textShadow: '0 0 30px hsl(18 90% 52% / 0.7), 0 0 60px hsl(18 90% 52% / 0.3), 0 2px 4px hsl(20 10% 3% / 0.8)',
          }}
        >
          THE CHRONICLER
        </h1>

        {/* Subtitle */}
        <p
          className="font-display tracking-[0.3em] mb-6 uppercase"
          style={{
            fontSize: 'clamp(0.6rem, 2vw, 0.85rem)',
            color: 'hsl(18 80% 58%)',
            textShadow: '0 0 12px hsl(18 90% 52% / 0.5)',
          }}
        >
          AI Dungeon Master
        </p>

        {/* Decorative rune divider */}
        <div className="flex items-center gap-4 mb-8 w-full max-w-sm">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(18 90% 52% / 0.5))' }} />
          <Flame className="w-5 h-5" style={{ color: 'hsl(18 90% 52%)' }} />
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, hsl(18 90% 52% / 0.5), transparent)' }} />
        </div>

        {/* Tagline */}
        <p
          className="font-body italic mb-10 leading-relaxed"
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
            color: 'hsl(38 28% 72%)',
            maxWidth: '34ch',
          }}
        >
          Roll your dice. Narrate your actions.<br />
          Let the story come alive.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
          <Button
            size="lg"
            onClick={() => navigate('/create')}
            className="font-display tracking-widest px-10 py-6 text-base transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, hsl(18 90% 48%), hsl(0 72% 42%))',
              color: 'hsl(38 28% 94%)',
              border: '1px solid hsl(18 90% 55% / 0.6)',
              boxShadow: '0 0 24px hsl(18 90% 52% / 0.4), 0 4px 16px hsl(20 10% 3% / 0.5)',
              letterSpacing: '0.15em',
            }}
            data-testid="button-new-adventure"
          >
            <Sword className="w-5 h-5 mr-2" />
            BEGIN ADVENTURE
          </Button>

          {hasSave && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/game')}
              className="font-display tracking-widest px-8 py-6 text-base transition-all duration-200"
              style={{
                background: 'transparent',
                color: 'hsl(38 28% 78%)',
                border: '1px solid hsl(38 28% 35%)',
                letterSpacing: '0.15em',
              }}
              data-testid="button-continue"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              CONTINUE JOURNEY
            </Button>
          )}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { icon: '🎲', text: 'Physical dice · digital GM' },
            { icon: '🗣️', text: 'Voice narration' },
            { icon: '⚔️', text: 'Full D&D 5e rules' },
            { icon: '✨', text: 'AI-driven story' },
          ].map(({ icon, text }) => (
            <span
              key={text}
              className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-body"
              style={{
                background: 'hsl(22 10% 8% / 0.8)',
                borderColor: 'hsl(28 12% 22%)',
                color: 'hsl(38 20% 60%)',
              }}
            >
              <span>{icon}</span>
              <span>{text}</span>
            </span>
          ))}
        </div>

        {/* Demo link */}
        <button
          onClick={() => navigate('/demo')}
          className="font-display tracking-widest text-xs transition-colors hover:opacity-80"
          style={{ color: 'hsl(18 70% 48%)', letterSpacing: '0.2em' }}
          data-testid="button-watch-demo"
        >
          <Scroll className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />
          WATCH THE DEMO
        </button>
      </div>

      {/* Bottom hero label */}
      <div
        className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none"
      >
        <p
          className="font-display tracking-widest text-xs"
          style={{ color: 'hsl(38 12% 30%)', letterSpacing: '0.25em' }}
        >
          HEROES OF THE BORDERLANDS · D&D 5e
        </p>
      </div>
    </div>
  );
}
