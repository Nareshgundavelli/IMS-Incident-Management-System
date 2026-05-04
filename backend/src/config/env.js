require('dotenv').config();
const { z } = require('zod');
const envSchema = z.object({
  NODE_ENV: z.string().default('development'), BACKEND_PORT: z.coerce.number().default(8080),
  POSTGRES_HOST: z.string(), POSTGRES_PORT: z.coerce.number(), POSTGRES_USER: z.string(), POSTGRES_PASSWORD: z.string(), POSTGRES_DB: z.string(), POSTGRES_SSL: z.string().default('false'),
  MONGO_URL: z.string(), MONGO_DB: z.string(), REDIS_URL: z.string(),
  INGESTION_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(1000), INGESTION_RATE_LIMIT_MAX: z.coerce.number().default(10000),
  SIGNAL_QUEUE_MAX_SIZE: z.coerce.number().default(50000), SIGNAL_BATCH_SIZE: z.coerce.number().default(500), SIGNAL_PROCESS_INTERVAL_MS: z.coerce.number().default(250), DEBOUNCE_WINDOW_MS: z.coerce.number().default(10000),
  DB_RETRY_ATTEMPTS: z.coerce.number().default(3), DB_RETRY_BASE_DELAY_MS: z.coerce.number().default(250), METRICS_LOG_INTERVAL_MS: z.coerce.number().default(5000), CORS_ORIGIN: z.string().default('*')
});
const env = envSchema.parse(process.env);
module.exports = { env };
