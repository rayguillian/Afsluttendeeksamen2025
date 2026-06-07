// Pure geo + text helpers shared across offer matching, routing and UI.

const EARTH_RADIUS_KM = 6371.0088;

const toRad = (value) => (value * Math.PI) / 180;

/** Great-circle distance in km between {lat,lng} points. */
export function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  if (![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) return Infinity;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Fold Danish characters + punctuation into ascii lowercase tokens. */
export function normalizeText(value) {
  return String(value || '')
    .replaceAll('æ', 'ae')
    .replaceAll('Æ', 'Ae')
    .replaceAll('ø', 'oe')
    .replaceAll('Ø', 'Oe')
    .replaceAll('å', 'aa')
    .replaceAll('Å', 'Aa')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
