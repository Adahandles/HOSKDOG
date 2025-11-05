import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { validateConfiguration } from './utils/config-validator.js';
import eligibilityRoutes from './routes/eligibility.js';
import { rateLimiter } from './middleware/rateLimiter.js';

// Conditional slurp route import based on environment
let slurpRoutes;
if (process.env.USE_MOCK_SLURP === 'true') {
  console.log('🧪 Loading MOCK slurp implementation for testing');
  const { default: mockSlurpRoutes } = await import('./routes/slurp-mock.js');
  slurpRoutes = mockSlurpRoutes;
} else {
  console.log('🚀 Loading PRODUCTION slurp implementation with real Cardano transactions');
  const { default: lucidSlurpRoutes } = await import('./routes/slurp-lucid.js');
  slurpRoutes = lucidSlurpRoutes;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', rateLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', eligibilityRoutes);
app.use('/api', slurpRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'HOSKDOG Faucet API'
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log('🚽 HOSKDOG Faucet Server Starting...\n');
  
  // Validate configuration
  if (!validateConfiguration()) {
    console.error('\n❌ Server startup failed due to configuration errors');
    process.exit(1);
  }
  
  const mode = process.env.USE_MOCK_SLURP === 'true' ? 'MOCK' : 'PRODUCTION';
  console.log(`\n🚽 HOSKDOG Faucet Server running on port ${PORT} (${mode} mode)`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚙️  Admin dashboard: http://localhost:${PORT}/admin.html`);
  
  if (process.env.USE_MOCK_SLURP === 'true') {
    console.log(`\n🧪 Running in MOCK mode - no real transactions will be sent`);
    console.log(`   To switch to production: npm run production`);
  } else {
    console.log(`\n🚀 Running in PRODUCTION mode - real Cardano transactions enabled`);
    console.log(`   To test with mock: npm run mock`);
  }
});

export default app;