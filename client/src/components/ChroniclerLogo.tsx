interface Props {
  className?: string;
}

export default function ChroniclerLogo({ className = 'w-8 h-8' }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="The Chronicler"
      role="img"
    >
      {/* Scroll body */}
      <rect x="12" y="14" width="40" height="36" rx="3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Scroll roller top */}
      <rect x="8" y="10" width="48" height="8" rx="4" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Scroll roller bottom */}
      <rect x="8" y="46" width="48" height="8" rx="4" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Text lines on scroll */}
      <line x1="20" y1="26" x2="44" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
      <line x1="20" y1="32" x2="44" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
      <line x1="20" y1="38" x2="36" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
      
      {/* Quill pen (top right) */}
      <path
        d="M44 20 L52 10 L54 12 L46 24 Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="M44 20 L46 24 L43 22 Z"
        fill="currentColor"
        fillOpacity="0.6"
      />
      
      {/* Eye/rune in center (mystical element) */}
      <ellipse cx="32" cy="32" rx="5" ry="3" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="32" cy="32" r="1.5" fill="currentColor" fillOpacity="0.7" />
    </svg>
  );
}
