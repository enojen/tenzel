import { createApp } from './app';
import { logger } from './shared/logging';

const port = Number(process.env.PORT ?? 3000);

const app = createApp().listen(port);

logger.info(`Server is running on http://localhost:${port}`);
logger.info(`OpenAPI UI:      http://localhost:${port}/openapi`);
logger.info(`OpenAPI JSON:    http://localhost:${port}/openapi/json`);
logger.info(`Health endpoint: http://localhost:${port}/health`);

process.on('SIGINT', () => {
  app.stop();
  process.exit(0);
});
