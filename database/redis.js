const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
});

client.on('error', (err) => console.error('Redis Client Error:', err));
client.on('connect', () => console.log('Redis Client Connected'));

// Connect to Redis
(async () => {
  await client.connect();
})();

// Rate limiting helper
const checkRateLimit = async (key, limit, window) => {
  const current = await client.incr(key);
  if (current === 1) {
    await client.expire(key, window);
  }
  return current <= limit;
};

// Cache helper
const cacheGet = async (key) => {
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
};

const cacheSet = async (key, value, ttl = 300) => {
  await client.setEx(key, ttl, JSON.stringify(value));
};

module.exports = {
  client,
  checkRateLimit,
  cacheGet,
  cacheSet,
};
