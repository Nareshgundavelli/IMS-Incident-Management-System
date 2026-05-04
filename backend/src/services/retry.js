const { env } = require('../config/env');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function withRetry(fn, label='operation'){ let last; for(let i=0;i<env.DB_RETRY_ATTEMPTS;i++){ try { return await fn(); } catch(e){ last=e; const wait=env.DB_RETRY_BASE_DELAY_MS*Math.pow(2,i); console.error(`[retry] ${label} failed attempt ${i+1}: ${e.message}; retrying in ${wait}ms`); await sleep(wait); } } throw last; }
module.exports = { withRetry };
