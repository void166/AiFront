import type { ThumbStyle } from './types';

/** Procedural scene thumbnail — gradient bg + stroked silhouette + soft glow.
 *  When the scene has a real imageUrl, callers should render that instead.    */
export function SceneThumb({ thumb, size = 56, real }: {
  thumb: ThumbStyle;
  size?: number;
  /** Optional real image URL — when provided, renders it instead. */
  real?: string | null;
}) {
  if (real) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 10, overflow: 'hidden',
        background: '#0a0f1c',
      }}>
        <img src={real} alt=""
             style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }

  const id = `g-${thumb.subject}-${Math.round(size)}-${thumb.gradFrom.replace('#','')}`;
  return (
    <svg viewBox="0 0 56 56" width={size} height={size}
         style={{ borderRadius: 10, display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor={thumb.gradFrom}/>
          <stop offset="100%" stopColor={thumb.gradTo}/>
        </linearGradient>
        <radialGradient id={id + '-glow'} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={thumb.accent} stopOpacity="0.55"/>
          <stop offset="100%" stopColor={thumb.accent} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="56" height="56" fill={`url(#${id})`}/>
      <rect width="56" height="56" fill={`url(#${id}-glow)`}/>
      <g fill="none" stroke={thumb.accent} strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
        {renderSubject(thumb.subject)}
      </g>
    </svg>
  );
}

function renderSubject(s: ThumbStyle['subject']) {
  switch (s) {
    case 'eye':
      return (<>
        <path d="M8 28 C 16 16, 40 16, 48 28 C 40 40, 16 40, 8 28 Z"/>
        <circle cx="28" cy="28" r="6"/>
        <circle cx="28" cy="28" r="2" fill="currentColor"/>
      </>);
    case 'phone':
      return (<>
        <rect x="18" y="10" width="20" height="36" rx="4"/>
        <line x1="26" y1="42" x2="30" y2="42"/>
        <line x1="22" y1="16" x2="34" y2="16"/>
      </>);
    case 'wave':
      return (<>
        <path d="M6 32 Q 14 18, 22 32 T 38 32 T 54 32"/>
        <path d="M6 38 Q 14 26, 22 38 T 38 38 T 54 38" opacity="0.6"/>
      </>);
    case 'chart':
      return (<>
        <line x1="10" y1="44" x2="46" y2="44"/>
        <rect x="13" y="30" width="6" height="14"/>
        <rect x="25" y="22" width="6" height="22"/>
        <rect x="37" y="14" width="6" height="30"/>
      </>);
    case 'sun':
      return (<>
        <circle cx="28" cy="28" r="9"/>
        <line x1="28" y1="10" x2="28" y2="14"/>
        <line x1="28" y1="42" x2="28" y2="46"/>
        <line x1="10" y1="28" x2="14" y2="28"/>
        <line x1="42" y1="28" x2="46" y2="28"/>
        <line x1="15" y1="15" x2="18" y2="18"/>
        <line x1="38" y1="38" x2="41" y2="41"/>
        <line x1="15" y1="41" x2="18" y2="38"/>
        <line x1="38" y1="18" x2="41" y2="15"/>
      </>);
    case 'hand':
      return (<>
        <path d="M20 38 V 18 a3 3 0 0 1 6 0 v 12"/>
        <path d="M26 18 a3 3 0 0 1 6 0 v 12"/>
        <path d="M32 20 a3 3 0 0 1 6 0 v 12"/>
        <path d="M38 24 a2.5 2.5 0 0 1 5 0 v 10 a 10 10 0 0 1 -20 0 V 28"/>
      </>);
  }
}
