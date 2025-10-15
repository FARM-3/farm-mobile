const https = require('https');

function probe(method, path) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'api-3181.onrender.com', path: `/api${path}`, method };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}

(async () => {
  try {
  console.log('GET /aggregation/farmer-harvest/');
  const g = await probe('GET', '/aggregation/farmer-harvest/');
    console.log('Status:', g.status);
    console.log('Content-Type:', g.headers['content-type']);
    console.log('Body (truncated):', g.body.slice(0,2000));

  console.log('\nOPTIONS /aggregation/farmer-harvest/');
  const o = await probe('OPTIONS', '/aggregation/farmer-harvest/');
    console.log('Status:', o.status);
    console.log('Headers:', JSON.stringify(o.headers, null, 2));
    console.log('Body (truncated):', o.body.slice(0,2000));
  } catch (e) {
    console.error('Probe error:', e.message || e);
  }
})();
