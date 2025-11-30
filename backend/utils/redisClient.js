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

