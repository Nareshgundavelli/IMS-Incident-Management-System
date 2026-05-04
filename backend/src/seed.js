require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs'); const path = require('path'); const app = require('./server');
const { enqueueSignal, startWorker } = require('./services/ingestionService');
(async()=>{ startWorker(); const events=JSON.parse(fs.readFileSync(path.join(__dirname,'../../sample-data/failure-events.json'),'utf8')); for(const e of events){ enqueueSignal(e); } console.log(`Seeded ${events.length} sample signals. Keep backend running for a few seconds to drain async queue.`); setTimeout(()=>process.exit(0), 20000); })();
