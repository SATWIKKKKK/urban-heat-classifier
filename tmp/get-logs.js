const https = require('https');
const token = 'vca_1YV5m69qvTlFSXWtqxy0hgyUXZfHGquNaALsJd1tFzhh8hVJmT2J7TGx';
const teamId = 'team_4G8QCwdhGTD1edxTAFiHzuFf';
const projectId = 'prj_aaXKZeX7Q40dcyl8aqH2uCXN63LS';

function get(path) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'api.vercel.com',
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.end();
  });
}

async function main() {
  // List latest deployments
  const r = await get(`/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=3`);
  const data = JSON.parse(r.body);
  const deployments = data.deployments || [];
  console.log('Latest deployments:');
  deployments.forEach(d => console.log(d.uid, d.state, d.url, d.createdAt));
  
  if (deployments.length > 0) {
    const latest = deployments[0];
    console.log('\nFetching build output for:', latest.uid);
    const logs = await get(`/v2/deployments/${latest.uid}/events?direction=forward&teamId=${teamId}`);
    console.log('Logs status:', logs.status);
    // Parse NDJSON
    const lines = logs.body.trim().split('\n');
    // Print first 3 raw lines to understand format
    console.log('Sample raw lines:');
    lines.slice(0, 5).forEach(l => console.log(l));
    // Try all common fields
    lines.forEach(line => {
      try {
        const e = JSON.parse(line);
        const text = e.text || e.message || e.payload?.text || e.payload?.message || '';
        if (text) process.stdout.write(text + '\n');
      } catch {}
    });
  }
}

main().catch(console.error);
