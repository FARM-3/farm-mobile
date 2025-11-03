const http = require('http');

const HOST = '142.93.94.236';
const PORT = 8000;
const PATHS = ['/', '/api/', '/api/schema/', '/api/aggregation/Farmer/', '/api/aggregation/Farmer', '/api/aggregation/FarmerHarvest/', '/api/aggregation/FarmerHarvest'];

function probe(path) {
  return new Promise((resolve, reject) => {
    const options = { hostname: HOST, port: PORT, path, method: 'GET', headers: { Accept: 'application/json' } };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => resolve({ path, status: res.statusCode, body }));
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}

(async () => {
  for (const p of PATHS) {
    try {
      const r = await probe(p);
      console.log(`${p} => ${r.status}`);
      console.log(r.body.slice(0, 1000));
      console.log('\n---\n');
    } catch (e) {
      console.error(`${p} => ERROR:`, e.message || e);
    }
  }
})();
