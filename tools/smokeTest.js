const https = require('https');

const API_HOST = 'api-3181.onrender.com';
const API_BASE = '/api';

function getFarmers() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      path: `${API_BASE}/aggregation/Farmer/`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

function postHarvest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: API_HOST,
      path: `${API_BASE}/aggregation/FarmerHarvest/`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    console.log('GET /aggregation/Farmer/');
    const farmers = await getFarmers();
    console.log('Status:', farmers.status);
    console.log('Body:', farmers.body);

    console.log('\nPOST /aggregation/FarmerHarvest/');
    const payload = {
      id: 'PA' + Date.now().toString().slice(-6),
      farmer_name: 'Smoke Test Farmer',
      weight_on_delivery: 10.5,
      weight_after_floating: 9.8,
      date_of_delivery: new Date().toISOString().slice(0,10),
      grade: 'A',
      cherry_colour: 'Red',
      stage: 'fresh_cherry',
      amount_paid: 0,
      who_paid: 'Tester',
      recorder_id: 'smoke-test',
      timestamp: Date.now(),
    };

    const post = await postHarvest(payload);
    console.log('Status:', post.status);
    console.log('Body:', post.body);
  } catch (e) {
    console.error('Error during smoke test:', e.message || e);
  }
})();
