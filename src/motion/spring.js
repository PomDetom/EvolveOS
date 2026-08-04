export function springCurve(strength) {
  const s = Math.max(0, Math.min(1, strength));
  const overshoot = +(1 + 0.56 * s).toFixed(3); // s=0 → 1（无回弹）；s=1 → 1.56（最大回弹）
  return `cubic-bezier(0.34, ${overshoot}, 0.64, 1)`;
}

export function scaledDurations(durationScale, enabled = true) {
  if (!enabled) return { fast: 0, base: 0, slow: 0 };
  return {
    fast: Math.round(120 * durationScale),
    base: Math.round(200 * durationScale),
    slow: Math.round(300 * durationScale),
  };
}
