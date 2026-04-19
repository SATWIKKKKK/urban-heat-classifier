'use server';

export async function geocodeCity(
  cityName: string,
  state?: string | null,
  country?: string | null,
) {
  // Build a precise query: city + state + country for best Nominatim accuracy
  const parts = [cityName];
  if (state) parts.push(state);
  parts.push(country ?? 'India');
  const query = parts.join(', ');

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
    {
      headers: { 'User-Agent': 'HeatPlan/1.0 (urban-heat-mitigator)' },
      next: { revalidate: 86400 },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data[0]) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name as string | undefined,
  };
}
