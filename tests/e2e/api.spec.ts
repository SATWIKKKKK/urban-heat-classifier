import { test, expect } from '@playwright/test';

test.describe('Public API', () => {
  test('GET /api/public/austin-tx/places returns GeoJSON', async ({ request }) => {
    const res = await request.get('/api/public/austin-tx/places');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('FeatureCollection');
    expect(body.features.length).toBeGreaterThan(0);
  });

  test('GET /api/public/austin-tx/interventions returns array', async ({ request }) => {
    const res = await request.get('/api/public/austin-tx/interventions');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('GET /api/public/nonexistent/places returns empty', async ({ request }) => {
    const res = await request.get('/api/public/nonexistent/places');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('FeatureCollection');
    expect(body.features.length).toBe(0);
  });
});
