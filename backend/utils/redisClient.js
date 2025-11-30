/**
 * Redis client with graceful fallback to in-memory store for development.
 * - Attempts to connect to Redis at REDIS_URL.
 * - If connection fails, falls back to an in-memory Map with TTL support.
 * - Exposes async functions: get(key), set(key, value, options), del(key)
 */
const redis = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const FORCE_IN_MEMORY = process.env.USE_IN_MEMORY_SESSION === 'true';

let client = null;
let connected = false;
const memoryStore = new Map();

async function tryConnect() {
  if (FORCE_IN_MEMORY) {
    console.log('Redis disabled by USE_IN_MEMORY_SESSION=true, using in-memory session store');
    return;
  }

  try {
    client = redis.createClient({ url: REDIS_URL });
    client.on('error', (err) => {
      // log once and fall back silently; keep connected=false
      console.error('Redis Client Error', err);
    });
    await client.connect();
    connected = true;
    console.log('Redis client connected');
  } catch (err) {
    connected = false;
    client = null;
    console.warn('Could not connect to Redis, falling back to in-memory store:', err.message);
  }
}

// Start async connect but do not throw if it fails
tryConnect();

// Helper TTL cleanup for memory store
function setMemoryWithTTL(key, value, seconds) {
  memoryStore.set(key, value);
  if (seconds && seconds > 0) {
    setTimeout(() => memoryStore.delete(key), seconds * 1000);
  }
}

module.exports = {
  async get(key) {
    if (connected && client) {
      try {
        return await client.get(key);
      } catch (err) {
        console.warn('Redis GET failed, using memory fallback:', err.message);
      }
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },

  async set(key, value, options = {}) {
    if (connected && client) {
      try {
        // node-redis supports: client.set(key, value, { EX: seconds })
        if (options.EX) {
          return await client.set(key, value, { EX: options.EX });
        }
        return await client.set(key, value);
      } catch (err) {
        console.warn('Redis SET failed, using memory fallback:', err.message);
      }
    }
    // Fallback: store string value and honor EX option
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    setMemoryWithTTL(key, str, options.EX || 0);
    return 'OK';
  },

  async del(key) {
    if (connected && client) {
      try {
        return await client.del(key);
      } catch (err) {
        console.warn('Redis DEL failed, using memory fallback:', err.message);
      }
    }
    return memoryStore.delete(key) ? 1 : 0;
  },

  // Expose connection status for debugging
  isConnected() {
    return connected && !!client;
  }
};
