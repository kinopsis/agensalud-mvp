// Simple test for the availability endpoint
const https = require('https');
const http = require('http');

const testUrl = 'http://localhost:3000/api/appointments/availability?organizationId=927cecbe-d9e5-43a4-b9d0-25f942ededc4&startDate=2025-05-25&endDate=2025-05-31';

console.log('Testing endpoint:', testUrl);

const req = http.get(testUrl, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS! Endpoint is working');
    } else {
      console.log('❌ FAILED! Status:', res.statusCode);
    }
  });
});

req.on('error', (err) => {
  console.log('❌ ERROR:', err.message);
});

req.setTimeout(5000, () => {
  console.log('❌ TIMEOUT: Server not responding');
  req.destroy();
});
