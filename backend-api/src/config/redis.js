const redis = require('redis');

// Create Redis client
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || '',
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.log('Too many retries on Redis connection. Connection terminated');
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

// Error handling
client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

client.on('connect', () => {
  console.log('✅ Redis client connected');
});

client.on('ready', () => {
  console.log('✅ Redis client ready');
});

client.on('end', () => {
  console.log('Redis client disconnected');
});

// Connect to Redis
async function connectRedis() {
  try {
    await client.connect();
    console.log('✅ Redis connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
}

// Rate limiting function
async function checkRateLimit(key, limit, windowMs) {
  try {
    const current = await client.incr(key);
    
    if (current === 1) {
      await client.expire(key, windowMs / 1000);
    }
    
    return current > limit;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return false;
  }
}

// Store data with expiration
async function setWithExpiry(key, value, expirySeconds) {
  try {
    await client.set(key, value, {
      EX: expirySeconds
    });
  } catch (error) {
    console.error('Redis set with expiry failed:', error);
  }
}

// Get data
async function get(key) {
  try {
    return await client.get(key);
  } catch (error) {
    console.error('Redis get failed:', error);
    return null;
  }
}

// Delete key
async function del(key) {
  try {
    await client.del(key);
  } catch (error) {
    console.error('Redis delete failed:', error);
  }
}

// Store JWT blacklist
async function addToBlacklist(token, expirySeconds) {
  try {
    await setWithExpiry(`blacklist:${token}`, '1', expirySeconds);
  } catch (error) {
    console.error('Failed to add token to blacklist:', error);
  }
}

// Check if token is blacklisted
async function isBlacklisted(token) {
  try {
    const result = await get(`blacklist:${token}`);
    return result !== null;
  } catch (error) {
    console.error('Failed to check token blacklist:', error);
    return false;
  }
}

module.exports = {
  client,
  connectRedis,
  checkRateLimit,
  setWithExpiry,
  get,
  del,
  addToBlacklist,
  isBlacklisted
};