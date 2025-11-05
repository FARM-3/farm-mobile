const http = require('http');

const options = {
  hostname: '142.93.94.236',
  port: 8000,
  path: '/api/schema/',
  method: 'GET',
  headers: { Accept: 'application/json' }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      const paths = Object.keys(json.paths || {}).filter(p => p.startsWith('/api/aggregation'));
      console.log('Aggregation paths found:');
      paths.forEach(p => console.log(p));
    } catch (e) {
      console.error('Failed to parse schema:', e.message);
      console.log('Raw:', body.slice(0,1000));
    }
  });
});

req.on('error', (e) => { console.error('Request error:', e.message); });
req.end();
