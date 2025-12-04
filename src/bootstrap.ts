import { createApp } from './app';
import { logger } from './shared/logging';
import { initTracing, shutdownTracing } from './shared/observability';

initTracing();

const port = Number(process.env.PORT ?? 3000);
const app = createApp().listen(port);

logger.info(`Server is running on http://localhost:${port}`);
logger.info(`OpenAPI UI:      http://localhost:${port}/openapi`);
logger.info(`OpenAPI JSON:    http://localhost:${port}/openapi/json`);
logger.info(`Health endpoint: http://localhost:${port}/health`);

async function shutdown() {
  app.stop();
  await shutdownTracing();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
