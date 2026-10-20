// Distância "em linha reta" entre dois pontos do mapa (fórmula de Haversine), em km.
export function distanciaKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const raio = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * raio * Math.asin(Math.sqrt(h));
}
