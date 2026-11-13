/** Eases 0 to 1 with a gentle start and end. */
export function smoothstep(value: number): number {
  const t = Math.min(Math.max(value, 0), 1);
  return t * t * (3 - 2 * t);
}

export function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/** Half the width of a scene change, in scenes. */
export const TRANSITION_HALF = 0.3;

/**
 * Where the film is, from its position in scenes (0 to `count`): the scene
 * shown, how far through it the visitor is, and how closed the blinds are
 * (0 open, 1 closed). The scene changes at whole numbers, where the blinds
 * are fully closed.
 */
export function filmState(position: number, count: number) {
  const s = Math.min(Math.max(position, 0), count);
  const active = Math.min(Math.floor(s), count - 1);
  const local = clamp01(s - active);
  let closure = 0;
  for (let boundary = 1; boundary < count; boundary += 1) {
    const distance = Math.abs(s - boundary);
    if (distance < TRANSITION_HALF) {
      closure = Math.max(closure, 1 - distance / TRANSITION_HALF);
    }
  }
  return { active, local, closure };
}

/**
 * How far one blind strip has closed. `index` of `total` strips; the centre
 * strips close first, so the close spreads outward like a wave.
 */
export function blindScale(closure: number, index: number, total: number) {
  const fromCentre = Math.abs((index + 0.5) / total - 0.5) * 2;
  return smoothstep(closure * 1.4 - fromCentre * 0.4);
}
