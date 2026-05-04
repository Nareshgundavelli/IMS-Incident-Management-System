const { MongoClient } = require('mongodb');
const { env } = require('../config/env');
let client, db;
async function connectMongo(){ if(db) return db; client = new MongoClient(env.MONGO_URL); await client.connect(); db = client.db(env.MONGO_DB); await db.collection('raw_signals').createIndex({ workItemId: 1, receivedAt: -1 }); await db.collection('raw_signals').createIndex({ componentId: 1, receivedAt: -1 }); return db; }
module.exports = { connectMongo };
