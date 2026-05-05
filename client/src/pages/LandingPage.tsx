import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import type { Campaign } from '@shared/schema';
import ChroniclerLogo from '@/components/ChroniclerLogo';
import { Sword, BookOpen, Scroll, Flame } from 'lucide-react';

// ── Ember particle data ───────────────────────────────────────────────────────
const EMBERS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left:  `${3 + Math.random() * 94}%`,
  size:  `${3 + Math.random() * 5}px`,
  dur:   `${5 + Math.random() * 9}s`,
  delay: `${Math.random() * 8}s`,
  drift: `${-35 + Math.random() * 70}px`,
  drift2:`${-22 + Math.random() * 44}px`,
  bottom:`${Math.random() * 28}%`,
  opacity: 0.45 + Math.random() * 0.5,
  isSpark: Math.random() > 0.72,
  color: Math.random() > 0.45
    ? 'hsl(18 90% 56%)'
    : Math.random() > 0.5
      ? 'hsl(42 92% 64%)'
      : 'hsl(0 75% 52%)',
}));

export default function LandingPage() {
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: campaign } = useQuery<Campaign>({
    queryKey: ['/api/campaign'],
    retry: false,
  });

  const hasSave = !!campaign && (
    campaign.gameMode === 'custom' ? !!campaign.char1 : true
  );

  return (
    <div
      ref={containerRef}
      className="page-overlay min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden select-none"
      data-testid="landing-page"
    >
      {/* ── Ember particles ── */}
      {EMBERS.map(e => (
        <div
          key={e.id}
          className={`absolute rounded-full pointer-events-none${e.isSpark ? ' spark' : ''}`}
          style={{
            left:   e.left,
            bottom: e.bottom,
            width:  e.size,
            height: e.size,
            background: e.isSpark ? 'hsl(46 100% 78%)' : e.color,
            opacity: 0,
            boxShadow: e.isSpark
              ? `0 0 ${parseInt(e.size) * 3}px hsl(46 100% 72%), 0 0 ${parseInt(e.size) * 6}px hsl(18 90% 55% / 0.5)`
              : `0 0 ${parseInt(e.size) * 2}px ${e.color}`,
            animation: `emberFloat ${e.dur} ease-in ${e.delay} infinite`,
            '--drift':  e.drift,
            '--drift2': e.drift2,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Strong vignette ── */}
      <div className="landing-vignette absolute inset-0 pointer-events-none" />

      {/* ── Top ornate line ── */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(42 88% 56% / 0.08) 15%, hsl(42 88% 56% / 0.55) 40%, hsl(18 90% 52% / 0.8) 50%, hsl(42 88% 56% / 0.55) 60%, hsl(42 88% 56% / 0.08) 85%, transparent 100%)' }}
      />
      <div className="absolute top-px left-0 right-0 h-px pointer-events-none opacity-30"
        style={{ background: 'linear-gradient(90deg, transparent 5%, hsl(42 88% 56% / 0.3) 30%, hsl(42 88% 56% / 0.6) 50%, hsl(42 88% 56% / 0.3) 70%, transparent 95%)' }}
      />

      {/* ── Bottom ornate line ── */}
      <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(18 90% 52% / 0.5), hsl(42 88% 56% / 0.7), hsl(18 90% 52% / 0.5), transparent)' }}
      />

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto">

        {/* Logo — large, dramatic */}
        <div className="mb-8 torch-flicker">
          <ChroniclerLogo
            className="w-24 h-24 mx-auto"
            style={{
              color: 'hsl(42 88% 64%)',
              filter: [
                'drop-shadow(0 0 18px hsl(42 88% 56% / 0.85))',
                'drop-shadow(0 0 38px hsl(18 90% 52% / 0.45))',
                'drop-shadow(0 0 70px hsl(18 90% 52% / 0.18))',
              ].join(' '),
            }}
          />
        </div>

        {/* ── Title ── */}
        <h1
          className="font-display font-bold tracking-[0.18em] mb-2 leading-none"
          style={{
            fontSize: 'clamp(3rem, 9.5vw, 6.5rem)',
            color: 'hsl(44 88% 76%)',
            textShadow: [
              '0 0 22px hsl(42 88% 56% / 0.9)',
              '0 0 50px hsl(42 88% 56% / 0.5)',
              '0 0 100px hsl(18 90% 52% / 0.22)',
              '0 2px 0 hsl(36 55% 28% / 0.8)',
              '0 3px 6px hsl(246 28% 3% / 0.9)',
              '0 6px 20px hsl(246 28% 3% / 0.6)',
              '2px 2px 0 hsl(36 40% 22% / 0.5)',
            ].join(', '),
          }}
        >
          THE CHRONICLER
        </h1>

        {/* Subtitle */}
        <p
          className="font-display tracking-[0.38em] mb-8 uppercase"
          style={{
            fontSize: 'clamp(0.58rem, 1.8vw, 0.82rem)',
            color: 'hsl(18 80% 60%)',
            textShadow: '0 0 14px hsl(18 90% 52% / 0.5)',
          }}
        >
          AI Dungeon Master · D&amp;D 5e
        </p>

        {/* ── Ornate divider ── */}
        <div className="ornate-divider w-full max-w-sm mb-8">
          <Flame className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--gold))' }} />
        </div>

        {/* Tagline */}
        <p
          className="font-body italic mb-10 leading-loose"
          style={{
            fontSize: 'clamp(1rem, 2.6vw, 1.22rem)',
            color: 'hsl(38 28% 70%)',
            maxWidth: '32ch',
            textShadow: '0 1px 3px hsl(246 28% 3% / 0.7)',
          }}
        >
          Cast the dice. Speak your fate.<br />
          Let the ancient chronicle be written.
        </p>

        {/* ── CTA Buttons ── */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">

          {/* PRIMARY — Begin Adventure (fire button) */}
          <button
            onClick={() => navigate('/create')}
            className="fire-button inline-flex items-center gap-3 px-10 py-4 rounded-md font-display text-base tracking-[0.15em]"
            data-testid="button-new-adventure"
          >
            <Sword className="w-5 h-5 flex-shrink-0" />
            BEGIN ADVENTURE
          </button>

          {/* SECONDARY — Continue Journey (ornate gold) */}
          {hasSave && (
            <button
              onClick={() => navigate('/game')}
              className="ornate-button inline-flex items-center gap-3 px-8 py-4 rounded-md font-display text-base tracking-[0.14em]"
              data-testid="button-continue"
            >
              <BookOpen className="w-5 h-5 flex-shrink-0" />
              CONTINUE JOURNEY
            </button>
          )}
        </div>

        {/* ── Feature pills ── */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { icon: '🎲', text: 'Physical dice · digital GM' },
            { icon: '🗣️', text: 'Voice narration' },
            { icon: '⚔️', text: 'Full D&D 5e rules' },
            { icon: '✨', text: 'AI-driven story' },
          ].map(({ icon, text }) => (
            <span
              key={text}
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-body"
              style={{
                background: 'hsl(248 24% 9% / 0.85)',
                border: '1px solid hsl(var(--gold-dark) / 0.35)',
                color: 'hsl(38 22% 62%)',
                boxShadow: 'inset 0 1px 0 hsl(42 30% 15% / 0.4)',
              }}
            >
              <span>{icon}</span>
              <span>{text}</span>
            </span>
          ))}
        </div>

        {/* Watch demo */}
        <button
          onClick={() => navigate('/demo')}
          className="font-display tracking-[0.22em] text-xs transition-all hover:opacity-100 opacity-70"
          style={{ color: 'hsl(42 70% 52%)', letterSpacing: '0.22em', textShadow: '0 0 10px hsl(42 88% 52% / 0.3)' }}
          data-testid="button-watch-demo"
        >
          <Scroll className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />
          WITNESS THE CHRONICLE
        </button>
      </div>

      {/* ── Bottom caption ── */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
