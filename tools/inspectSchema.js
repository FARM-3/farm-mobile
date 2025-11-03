const http = require('http');

const options = { hostname: '142.93.94.236', port: 8000, path: '/api/schema/', method: 'GET', headers: { Accept: 'application/json' } };
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      const comp = json.components && json.components.schemas;
      if (!comp) return console.error('No components.schemas in schema');
      const keys = Object.keys(comp).filter(k => k.toLowerCase().includes('farmerharvest') || k.toLowerCase().includes('farmer_harvest') || k.toLowerCase().includes('farmerharv'));
      console.log('Possible FarmerHarvest schema keys:', keys);
      keys.forEach(k => {
        console.log('\nSchema:', k);
        console.log(JSON.stringify(comp[k], null, 2).slice(0,5000));
      });
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.end();
