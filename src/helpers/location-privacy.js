/**
 * Approximate garden locations for signed-out visitors.
 *
 * Signed-out visitors see a circle 300 yards across instead of a pin. The
 * circle's center is moved about 20 ft off the true spot so its middle isn't
 * the address. The direction comes from a hash of the garden's id, so it
 * stays the same on every load: a new random offset each time would let
 * someone average a few reloads back to the real point.
 *
 * This only hides the spot in the UI. The API still returns exact
 * coordinates, so locking them down for real has to happen in Strapi.
 */

const YARD_M = 0.9144;
const FOOT_M = 0.3048;

export const APPROX_AREA_RADIUS_M = 150 * YARD_M; // 300 yd diameter
const CENTER_OFFSET_M = 20 * FOOT_M;
const EARTH_RADIUS_M = 6371000;

function hashToUnit(seed) {
  const str = String(seed ?? '');
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** The point the approximate circle is drawn around: about 20 ft off the true center. */
export function approximateCenter(latitude, longitude, seed) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const bearing = hashToUnit(seed) * 2 * Math.PI;
  const dLat = (CENTER_OFFSET_M * Math.cos(bearing)) / EARTH_RADIUS_M;
  const dLng = (CENTER_OFFSET_M * Math.sin(bearing)) / (EARTH_RADIUS_M * Math.cos(lat * Math.PI / 180));

  return {
    latitude: lat + dLat * 180 / Math.PI,
    longitude: lng + dLng * 180 / Math.PI
  };
}
