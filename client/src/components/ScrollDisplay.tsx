import { useEffect, useRef, useState, useLayoutEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
export type RenderContentFn = (text: string, onParchment: boolean) => React.ReactNode;

export interface ScrollMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

// ── Parchment constants ────────────────────────────────────────────────────────
const PARCHMENT_BG = `
  radial-gradient(ellipse at 30% 20%, rgba(255,248,220,0.4) 0%, transparent 60%),
  radial-gradient(ellipse at 70% 80%, rgba(210,180,140,0.3) 0%, transparent 50%),
  linear-gradient(
    180deg,
    #d4a96a 0%,
    #e8c98a 8%,
    #f4e4c1 15%,
    #f0dba8 40%,
    #ecdba0 60%,
    #e8d090 85%,
    #d4a96a 100%
  )
`;

const PARCHMENT_SHADOW = `
  inset 8px 0 20px rgba(100,60,10,0.3),
  inset -8px 0 20px rgba(100,60,10,0.3),
  inset 0 15px 30px rgba(80,40,5,0.4),
  inset 0 -15px 30px rgba(80,40,5,0.4)
`;

// Torn edges — 21 points per side at 5% y-intervals, x varies 3–8 px
const TORN_CLIP = `polygon(
  7px 0%,  4px 5%,  6px 10%, 3px 15%, 8px 20%, 5px 25%, 7px 30%, 3px 35%,
  6px 40%, 4px 45%, 8px 50%, 5px 55%, 7px 60%, 3px 65%, 6px 70%, 4px 75%,
  8px 80%, 5px 85%, 7px 90%, 3px 95%, 6px 100%,
  calc(100% - 6px) 100%, calc(100% - 3px) 95%, calc(100% - 7px) 90%,
  calc(100% - 5px) 85%, calc(100% - 8px) 80%, calc(100% - 4px) 75%,
  calc(100% - 6px) 70%, calc(100% - 3px) 65%, calc(100% - 7px) 60%,
  calc(100% - 5px) 55%, calc(100% - 8px) 50%, calc(100% - 4px) 45%,
  calc(100% - 6px) 40%, calc(100% - 3px) 35%, calc(100% - 7px) 30%,
  calc(100% - 5px) 25%, calc(100% - 8px) 20%, calc(100% - 3px) 15%,
  calc(100% - 6px) 10%, calc(100% - 4px) 5%,  calc(100% - 7px) 0%
)`;

// ── Wooden Roller ──────────────────────────────────────────────────────────────
function WoodenRoller({ position }: { position: 'top' | 'bottom' }) {
  const dropShadow = position === 'top'
    ? '0 8px 20px rgba(0,0,0,0.8), 0 3px 6px rgba(0,0,0,0.5)'
    : '0 -6px 20px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.4)';

  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        height: 40,
        marginLeft: -15,
        marginRight: -15,
        zIndex: 2,
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 5,
        overflow: 'hidden',
      }}
    >
      {/* Left end cap — darker ellipse for depth */}
      <div
        style={{
          flexShrink: 0,
          width: 22,
          background: 'radial-gradient(ellipse at 62% 50%, #6b3010 0%, #3a1508 45%, #180700 100%)',
          borderRadius: '5px 0 0 5px',
        }}
      />

      {/* Main cylinder — linear gradient mimics 3-D barrel */}
      <div
        style={{
          flex: 1,
          background: `linear-gradient(
            180deg,
            #0e0400 0%,
            #2c1505 7%,
            #5a2a0e 20%,
            #8B4513 36%,
            #b8682a 45%,
            #cd853f 50%,
            #b8682a 55%,
            #8B4513 64%,
            #5a2a0e 80%,
            #2c1505 93%,
            #0e0400 100%
          )`,
          boxShadow: dropShadow,
        }}
      />

      {/* Right end cap */}
      <div
        style={{
          flexShrink: 0,
          width: 22,
          background: 'radial-gradient(ellipse at 38% 50%, #6b3010 0%, #3a1508 45%, #180700 100%)',
          borderRadius: '0 5px 5px 0',
        }}
      />
    </div>
  );
}

// ── Single Parchment Scroll ────────────────────────────────────────────────────
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
  // Active + not streaming: start at 0 for unroll animation. Otherwise: auto.
  const [displayHeight, setDisplayHeight] = useState<number | 'auto'>(
    isActive && !isStreaming ? 0 : 'auto'
  );
  const [textVisible, setTextVisible] = useState(!isActive || isStreaming);
  const didAnimate = useRef(false);

  // One-shot unroll — only for finished (non-streaming) messages arriving for the first time
  useLayoutEffect(() => {
    if (!isActive || isStreaming || didAnimate.current || !innerRef.current) return;
    didAnimate.current = true;

    const fullH = innerRef.current.scrollHeight;
    setDisplayHeight(0);
    setTextVisible(false);

    // Small delay so the browser registers height=0 before the transition target
    const t1 = setTimeout(() => {
      setDisplayHeight(fullH);
      const t2 = setTimeout(() => setTextVisible(true), 820);
      return () => clearTimeout(t2);
    }, 40);

    return () => clearTimeout(t1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When this scroll is de-activated (new message arrived), release to natural height
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
      }}
    >
      <WoodenRoller position="top" />

      {/* Animated height wrapper — reveals parchment top-to-bottom like unrolling */}
      <div
        style={{
          height: displayHeight,
          overflow: 'hidden',
          transition:
            !isStreaming && isActive && typeof displayHeight === 'number' && displayHeight > 0
              ? 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
        }}
      >
        {/* Parchment surface */}
        <div
          ref={innerRef}
          style={{
            background: PARCHMENT_BG,
            boxShadow: PARCHMENT_SHADOW,
            clipPath: TORN_CLIP,
          }}
        >
          {/* Scroll text zone */}
          <div
            style={{
              padding: '30px 50px',
              fontFamily: "'Cinzel', 'Times New Roman', serif",
              fontStyle: 'italic',
              color: '#2c1810',
              fontSize: '1rem',
              lineHeight: 1.9,
              letterSpacing: '0.04em',
              textShadow: '0 1px 2px rgba(255,255,255,0.3)',
              opacity: textVisible ? 1 : 0,
              transition: 'opacity 0.35s ease',
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

      <WoodenRoller position="bottom" />
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
  // IDs present on mount should not trigger the unroll animation
  const preloadedIds = useRef(new Set<number>());
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      messages.forEach(m => preloadedIds.current.add(m.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Find last assistant message index
  let lastDmIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') { lastDmIdx = i; break; }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '12px 0 24px' }}>
      {messages.map((msg, idx) => {
        if (msg.role === 'user') {
          return <PlayerTablet key={msg.id} content={msg.content} />;
        }

        // Only animate: positive ID (real server msg), not preloaded, and is the latest DM
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

      {/* Streaming scroll — grows as chunks arrive */}
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
