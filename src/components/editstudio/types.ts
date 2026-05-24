/* Shared EditStudio types — bridge between the existing SceneData model
   and the visual scene-card UI tokens.                                       */

import type { SceneData, SceneTransitionPreset } from '@integration/types';

export type SceneSubject = 'eye' | 'phone' | 'wave' | 'chart' | 'sun' | 'hand';

/** Visual classification label used on scene cards.
 *  Falls back to "Scene" when no semantic label is known. */
export type SceneRole =
  | 'Hook' | 'Problem' | 'Reveal' | 'Evidence' | 'Fix' | 'CTA' | 'Scene';

/** Tiny derived view-model used by SceneSidebar / Timeline. */
export interface SceneVM {
  index:        number;
  role:         SceneRole;
  title:        string;          // scene.scene
  start:        number;          // seconds
  end:          number;          // seconds
  durationSec:  number;
  score:        number | null;   // 0–100 from evaluation
  weakness:     string | null;
  hasImage:     boolean;
  hasAudio:     boolean;
  thumb:        ThumbStyle;
  transition:   SceneTransitionPreset;
  raw:          SceneData;
}

export interface ThumbStyle {
  gradFrom: string;
  gradTo:   string;
  accent:   string;
  subject:  SceneSubject;
}

/** Toast type — used by useToasts(). */
export interface Toast {
  id:    string;
  text:  string;
  sev:   'info' | 'ok' | 'warn' | 'err';
  ttl?:  number;       // auto-dismiss ms (default 3600)
}

/* ---------- Helpers ---------- */

const ROLE_PALETTES: { role: SceneRole; gradFrom: string; gradTo: string; accent: string; subject: SceneSubject }[] = [
  { role: 'Hook',     gradFrom: '#0ea5e9', gradTo: '#1e3a8a', accent: '#22d3ee', subject: 'eye'   },
  { role: 'Problem',  gradFrom: '#4338ca', gradTo: '#1e1b4b', accent: '#a78bfa', subject: 'phone' },
  { role: 'Reveal',   gradFrom: '#c2410c', gradTo: '#7c2d12', accent: '#fdba74', subject: 'wave'  },
  { role: 'Evidence', gradFrom: '#0f766e', gradTo: '#134e4a', accent: '#5eead4', subject: 'chart' },
  { role: 'Fix',      gradFrom: '#ca8a04', gradTo: '#713f12', accent: '#fde047', subject: 'sun'   },
  { role: 'CTA',      gradFrom: '#be185d', gradTo: '#831843', accent: '#f9a8d4', subject: 'hand'  },
];

/** Parse "0:03-0:08" into seconds tuple. Tolerant to malformed input. */
export function parseTimeRange(t: string | undefined): [number, number] {
  if (!t) return [0, 5];
  const [a, b] = t.split('-');
  const toSec = (s: string) => {
    const parts = (s ?? '').split(':').map(n => parseInt(n, 10) || 0);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : (parts[0] ?? 0);
  };
  return [toSec(a), toSec(b)];
}

/** Build a SceneVM from a raw SceneData + index. */
export function toVM(
  s: SceneData,
  i: number,
  transition: SceneTransitionPreset,
  evalScore?: { score: number; weakness?: string | null } | null,
): SceneVM {
  const [start, end] = parseTimeRange(s.time);
  const palette = ROLE_PALETTES[i % ROLE_PALETTES.length];
  const roleGuess = guessRole(s.scene, i);

  /* Duration source of truth:
     1. audioDuration   — what the renderer actually concatenates
     2. end-start       — from "0:00-0:05" tags (fallback if no audio yet)
     3. 5s              — last-ditch default
     This MUST match EditStudio.sceneStarts/totalDuration so the timeline,
     scrubber and "auto-select scene under cursor" agree.                  */
  const audioDur = (s as any).audioDuration as number | undefined;
  const rangeDur = end - start;
  const durationSec =
    (audioDur && audioDur > 0.05) ? audioDur :
    (rangeDur && rangeDur > 0.05) ? rangeDur :
    5;

  return {
    index:       i,
    role:        roleGuess,
    title:       s.scene ?? `Scene ${i + 1}`,
    start, end,
    durationSec: Math.max(0.1, durationSec),
    score:       evalScore ? evalScore.score : null,
    weakness:    evalScore?.weakness ?? null,
    hasImage:    Boolean(s.imageUrl),
    hasAudio:    Boolean(s.audioUrl),
    transition,
    thumb: {
      gradFrom: palette.gradFrom,
      gradTo:   palette.gradTo,
      accent:   palette.accent,
      subject:  palette.subject,
    },
    raw: s,
  };
}

function guessRole(title: string | undefined, i: number): SceneRole {
  const t = (title ?? '').toLowerCase();
  if (i === 0)                                          return 'Hook';
  if (/(why|problem|issue|wrong)/.test(t))              return 'Problem';
  if (/(reveal|truth|actually|because)/.test(t))        return 'Reveal';
  if (/(study|research|data|evidence|stat)/.test(t))    return 'Evidence';
  if (/(fix|solution|do this|tip|how to)/.test(t))      return 'Fix';
  if (/(save|follow|share|comment|cta|subscribe)/.test(t)) return 'CTA';
  return 'Scene';
}
