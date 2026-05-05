import { useEffect, useRef, useState, useLayoutEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
export type RenderContentFn = (text: string, onParchment: boolean) => React.ReactNode;

export interface ScrollMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

// ── Parchment gradient — darker charred edges, warm aged centre ────────────────
const PARCHMENT_BG = `
  linear-gradient(
    180deg,
    #8b5a2b 0%,
    #b8824a 4%,
    #c4956a 9%,
    #d4a96a 16%,
    #e8c98a 28%,
    #f4e4c1 42%,
    #f0dba8 55%,
    #e8d090 68%,
    #d4a96a 80%,
    #c4956a 88%,
    #b8824a 93%,
    #8b5a2b 100%
  )
`;

// ── Burned clip-path: top edge charred, bottom in flame silhouette ─────────────
// Top corners burned deep (left 30px, right 20px); midpoints vary 10–25px
// Sides have irregular notches; bottom flames 40–60px variation
const SCROLL_CLIP = `polygon(
  30px 0%,
  8% 12px, 16% 10px, 24% 18px, 32% 8px, 40% 15px, 48% 11px,
  56% 20px, 64% 9px,  72% 16px, 80% 12px, 88% 18px,
  calc(100% - 20px) 0%,
  calc(100% - 4px) 8%,
  calc(100% - 6px) 20%,
  calc(100% - 3px) 30%,
  calc(100% - 18px) 35%, calc(100% - 3px) 38%,
  calc(100% - 5px) 50%,
  calc(100% - 4px) 58%,
  calc(100% - 20px) 60%, calc(100% - 4px) 63%,
  calc(100% - 6px) 75%,
  calc(100% - 3px) 85%,
  calc(100% - 5px) 90%,
  calc(100% - 3px) 94%,
  calc(100% - 8px) 96%,
  calc(100% - 20px) 97%,
  calc(100% - 38px) 98.5%,
  calc(100% - 55px) 97.5%,
  calc(100% - 62px) 100%,
  calc(100% - 72px) 96%,
  calc(100% - 85px) 98%,
  calc(100% - 95px) 94%,
  calc(100% - 108px) 99%,
  calc(100% - 118px) 95%,
  calc(100% - 130px) 100%,
  calc(100% - 145px) 96%,
  calc(100% - 158px) 99%,
  calc(100% - 172px) 93%,
  calc(100% - 188px) 97%,
  calc(100% - 200px) 100%,
  calc(100% - 215px) 94%,
  calc(100% - 228px) 98%,
  calc(100% - 244px) 96%,
  calc(100% - 255px) 100%,
  calc(100% - 268px) 95%,
  calc(100% - 280px) 99%,
  55px 98%,
  42px 100%,
  28px 96%,
  14px 99%,
  5px 94%,
  3px 85%,
  6px 75%,
  3px 63%,
  18px 60%, 3px 58%,
  5px 50%,
  3px 38%,
  18px 35%, 4px 30%,
  6px 20%,
  4px 8%
)`;

// ── Ember spot component ───────────────────────────────────────────────────────
interface EmberProps {
  top: string;
  left: string;
  size: number;
  delay: number;
  color: string;
}

function EmberSpot({ top, left, size, delay, color }: EmberProps) {
  return (
    <div
      className="ember-spot"
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        animationDelay: `${delay}s`,
        pointerEvents: 'none',
      }}
    />
  );
}

const EMBER_SPOTS: EmberProps[] = [
  { top: '3%',  left: '12%',  size: 5, delay: 0.0, color: 'radial-gradient(circle, rgba(255,180,0,0.9) 0%, rgba(255,80,0,0.5) 60%, transparent 100%)' },
  { top: '1%',  left: '68%',  size: 7, delay: 0.7, color: 'radial-gradient(circle, rgba(255,140,0,0.95) 0%, rgba(255,60,0,0.45) 60%, transparent 100%)' },
  { top: '5%',  left: '42%',  size: 4, delay: 1.3, color: 'radial-gradient(circle, rgba(255,200,50,0.9) 0%, rgba(255,100,0,0.4) 60%, transparent 100%)' },
  { top: '2%',  left: '85%',  size: 6, delay: 0.4, color: 'radial-gradient(circle, rgba(255,160,0,0.85) 0%, rgba(200,50,0,0.4) 60%, transparent 100%)' },
  { top: '94%', left: '22%',  size: 8, delay: 1.1, color: 'radial-gradient(circle, rgba(255,120,0,1.0) 0%, rgba(255,50,0,0.6) 55%, transparent 100%)' },
  { top: '96%', left: '55%',  size: 5, delay: 0.2, color: 'radial-gradient(circle, rgba(255,180,30,0.95) 0%, rgba(255,80,0,0.5) 60%, transparent 100%)' },
  { top: '93%', left: '78%',  size: 7, delay: 1.6, color: 'radial-gradient(circle, rgba(255,140,0,0.9) 0%, rgba(200,40,0,0.5) 60%, transparent 100%)' },
  { top: '97%', left: '8%',   size: 6, delay: 0.9, color: 'radial-gradient(circle, rgba(255,100,0,1.0) 0%, rgba(180,30,0,0.55) 55%, transparent 100%)' },
];

// ── Single Burned Parchment Scroll ────────────────────────────────────────────
interface ParchmentScrollProps {
  content: string;
  isActive: boolean;
  isPrevious: boolean;
  isStreaming?: boolean;
  renderContent: RenderContentFn;
}

export function ParchmentScroll({
  content,
  isActive,
  isPrevious,
  isStreaming = false,
  renderContent,
}: ParchmentScrollProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [displayHeight, setDisplayHeight] = useState<number | 'auto'>(
    isActive && !isStreaming ? 0 : 'auto'
  );
  const [textVisible, setTextVisible] = useState(!isActive || isStreaming);
  const didAnimate = useRef(false);

  // One-shot unroll — only for finished (non-streaming) messages arriving fresh
  useLayoutEffect(() => {
    if (!isActive || isStreaming || didAnimate.current || !innerRef.current) return;
    didAnimate.current = true;

    const fullH = innerRef.current.scrollHeight;
    setDisplayHeight(0);
    setTextVisible(false);

    const t1 = setTimeout(() => {
      setDisplayHeight(fullH);
      const t2 = setTimeout(() => setTextVisible(true), 600);
      return () => clearTimeout(t2);
    }, 40);

    return () => clearTimeout(t1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When de-activated, release to natural height
  useEffect(() => {
    if (!isActive) {
      setDisplayHeight('auto');
      setTextVisible(true);
    }
  }, [isActive]);

  return (
    <div
      style={{
        opacity: isPrevious ? 0.68 : 1,
        transform: isPrevious ? 'scale(0.985)' : 'scale(1)',
        transformOrigin: 'top center',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        position: 'relative',
        filter: isPrevious
          ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))'
          : 'drop-shadow(0 20px 40px rgba(0,0,0,0.8)) drop-shadow(0 8px 15px rgba(255,100,0,0.35)) drop-shadow(0 4px 8px rgba(255,50,0,0.25))',
      }}
    >
      {/* Ember spots — outside clip so they sit over the burned edges */}
      {!isPrevious && EMBER_SPOTS.map((e, i) => (
        <EmberSpot key={i} {...e} />
      ))}

      {/* Bottom ambient fire glow */}
      {!isPrevious && (
        <div
          className="scroll-bottom-glow"
          style={{
            position: 'absolute',
            bottom: -8,
            left: '10%',
            right: '10%',
            height: 30,
            background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,0,0.55) 0%, rgba(255,50,0,0.2) 50%, transparent 100%)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}

      {/* Animated height wrapper — reveals scroll top-to-bottom like unrolling */}
      <div
        style={{
          height: displayHeight,
          overflow: 'hidden',
          transition:
            !isStreaming && isActive && typeof displayHeight === 'number' && displayHeight > 0
              ? 'height 1s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
        }}
      >
        {/* Parchment surface */}
        <div
          ref={innerRef}
          style={{
            background: PARCHMENT_BG,
            clipPath: SCROLL_CLIP,
            position: 'relative',
          }}
        >
          {/* Charcoal burn overlay — top 18% fades to near-black */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(8,2,0,0.78) 0%, rgba(15,5,0,0.55) 6%, rgba(20,8,0,0.22) 14%, transparent 22%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Fire gradient overlay — bottom 28% fades parchment→amber→charcoal */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(0deg, rgba(5,1,0,0.88) 0%, rgba(12,4,0,0.72) 6%, rgba(30,10,0,0.50) 14%, rgba(60,20,0,0.22) 22%, transparent 32%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Scroll text zone */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '35px 55px',
              fontFamily: "'Cinzel', 'Times New Roman', serif",
              fontStyle: 'italic',
              fontWeight: 700,
              color: '#1a0a05',
              fontSize: '1.05rem',
              lineHeight: 2,
              letterSpacing: '0.06em',
              opacity: textVisible ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          >
            {renderContent(content, true)}
            {isStreaming && (
              <span
                className="inline-block animate-pulse"
                style={{
                  width: 2,
                  height: '1em',
                  background: '#c8580a',
                  marginLeft: 3,
                  verticalAlign: 'middle',
                  borderRadius: 1,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Player Tablet — dark stone plaque for player actions ──────────────────────
export function PlayerTablet({ content }: { content: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 4px' }}>
      <div style={{ maxWidth: '72%' }}>
        <div
          style={{
            background: 'rgba(20,15,35,0.92)',
            border: '1px solid rgba(200,150,42,0.42)',
            borderRadius: 8,
            padding: '10px 18px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(200,150,40,0.10)',
          }}
        >
          <p
            style={{
              fontFamily: "'Cinzel', 'Times New Roman', serif",
              color: 'hsl(40 38% 80%)',
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              margin: 0,
              fontStyle: 'normal',
            }}
          >
            {content}
          </p>
        </div>
        <p
          style={{
            fontFamily: "'Cinzel', 'Times New Roman', serif",
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            color: 'hsl(42 28% 36%)',
            textAlign: 'right',
            marginTop: 4,
            paddingRight: 2,
          }}
        >
          — THE ADVENTURER
        </p>
      </div>
    </div>
  );
}

// ── ScrollChat — full chat-area renderer ───────────────────────────────────────
interface ScrollChatProps {
  messages: ScrollMessage[];
  streamingText: string;
  isStreaming: boolean;
  renderContent: RenderContentFn;
}

export default function ScrollChat({
  messages,
  streamingText,
  isStreaming,
  renderContent,
}: ScrollChatProps) {
  const preloadedIds = useRef(new Set<number>());
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      messages.forEach(m => preloadedIds.current.add(m.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let lastDmIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') { lastDmIdx = i; break; }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36, padding: '12px 0 32px' }}>
      {messages.map((msg, idx) => {
        if (msg.role === 'user') {
          return <PlayerTablet key={msg.id} content={msg.content} />;
        }

        const isLatest = idx === lastDmIdx && !isStreaming;
        const isNew = msg.id > 0 && !preloadedIds.current.has(msg.id);
        const isActive = isLatest && isNew;
        const isPrevious = !isLatest || isStreaming;

        return (
          <ParchmentScroll
            key={msg.id}
            content={msg.content}
            isActive={isActive}
            isPrevious={isPrevious}
            isStreaming={false}
            renderContent={renderContent}
          />
        );
      })}

      {isStreaming && streamingText && (
        <ParchmentScroll
          key="streaming"
          content={streamingText}
          isActive={true}
          isPrevious={false}
          isStreaming={true}
          renderContent={renderContent}
        />
      )}
    </div>
  );
}
