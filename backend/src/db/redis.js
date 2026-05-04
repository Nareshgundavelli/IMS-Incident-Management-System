const Redis = require('ioredis');
const { env } = require('../config/env');
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
module.exports = { redis };
