export function generateTrackingId() {
  return `tid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

