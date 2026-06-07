// Danish display formatting.

const dkk = new Intl.NumberFormat('da-DK', {
  style: 'currency',
  currency: 'DKK',
  maximumFractionDigits: 2,
});

export const formatPrice = (value) => dkk.format(Number(value || 0));

export function formatDistance(km) {
  if (!Number.isFinite(km)) return '–';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatDuration(minutes) {
  const mins = Math.round(Number(minutes || 0));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} t ${m} min` : `${h} t`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('da-DK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
