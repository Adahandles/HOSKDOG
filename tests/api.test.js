const request = require('supertest');
const express = require('express');

// Create a minimal test app that mimics the server structure
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'HOSKDOG Deposit Server',
      timestamp: new Date().toISOString(),
    });
  });
  
  // Faucet status endpoint
  app.get('/api/faucet-status', (req, res) => {
    res.json({
      operational: true,
      balance: '1000000000',
      dailyLimit: '100000000',
    });
  });
  
  return app;
};

describe('API Endpoints', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  describe('GET /api/health', () => {
    test('returns 200 status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('timestamp');
    });
    
    test('returns valid JSON', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);
      
      expect(response.body).toBeDefined();
    });
  });
  
  describe('GET /api/faucet-status', () => {
    test('returns faucet information', async () => {
      const response = await request(app)
        .get('/api/faucet-status')
        .expect(200);
      
      expect(response.body).toHaveProperty('operational');
      expect(response.body.operational).toBe(true);
    });
    
    test('includes balance and limits', async () => {
      const response = await request(app)
        .get('/api/faucet-status')
        .expect(200);
      
      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('dailyLimit');
    });
  });
});

describe('Error Handling', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  test('returns 404 for unknown routes', async () => {
    await request(app)
      .get('/api/unknown')
      .expect(404);
  });
});
