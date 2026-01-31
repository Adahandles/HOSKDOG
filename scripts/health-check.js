#!/usr/bin/env node

const http = require('http');

const healthCheck = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Health check passed');
        resolve(true);
      } else {
        console.error(`❌ Health check failed with status: ${res.statusCode}`);
        reject(false);
      }
    });

    req.on('error', (error) => {
      console.error('❌ Health check error:', error.message);
      reject(false);
    });

    req.on('timeout', () => {
      console.error('❌ Health check timeout');
      req.destroy();
      reject(false);
    });

    req.end();
  });
};

healthCheck()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
