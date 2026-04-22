const https = require('https');

const TOKEN = 'vca_1YV5m69qvTlFSXWtqxy0hgyUXZfHGquNaALsJd1tFzhh8hVJmT2J7TGx';
const PROJECT_ID = 'prj_aaXKZeX7Q40dcyl8aqH2uCXN63LS';
const TEAM_ID = 'team_4G8QCwdhGTD1edxTAFiHzuFf';

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.vercel.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: responseData }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Delete old NEXTAUTH_URL entries
  const listRes = await makeRequest('GET', `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`);
  const list = JSON.parse(listRes.body);
  const existing = (list.envs || []).filter(e => e.key === 'NEXTAUTH_URL');
  for (const e of existing) {
    await makeRequest('DELETE', `/v9/projects/${PROJECT_ID}/env/${e.id}?teamId=${TEAM_ID}`);
    console.log('Deleted old NEXTAUTH_URL for target:', e.target);
  }

  // Add production URL
  const r1 = await makeRequest('POST', `/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, {
    key: 'NEXTAUTH_URL',
    value: 'https://urban-heat-mitigator.vercel.app',
    type: 'plain',
    target: ['production'],
  });
  const r1data = JSON.parse(r1.body);
  console.log('Set production NEXTAUTH_URL:', r1data.key || JSON.stringify(r1data).slice(0, 100));

  // Add dev URL
  const r2 = await makeRequest('POST', `/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, {
    key: 'NEXTAUTH_URL',
    value: 'http://localhost:3000',
    type: 'plain',
    target: ['development'],
  });
  const r2data = JSON.parse(r2.body);
  console.log('Set dev NEXTAUTH_URL:', r2data.key || JSON.stringify(r2data).slice(0, 100));
}

main().catch(console.error);
