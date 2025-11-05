const http = require('http');

const HOST = '142.93.94.236';
const PORT = 8000;
const PATH = '/api/aggregation/farmer-harvest/';

const payload = {
  id: 'PATEST' + Date.now().toString().slice(-6),
  name: 'Smoke Valid Farmer',
  weight_on_delivery: 10,
  weight_after_floating: 9,
  date_of_delivery: new Date().toISOString().slice(0,10),
  grade: 'A',
  cherry_color: 'Red',
  stage: 'fresh_cherry',
  amount_paid: '1000',
  paid_by: 'Tester',
  recorder_id: 'smoke-test',
  timestamp: Date.now()
};

const data = JSON.stringify(payload);
const options = {
  hostname: HOST,
  port: PORT,
  path: PATH,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(data);
req.end();
