import { createApp } from './app';
import { closeDatabase, initDatabase } from './shared/infrastructure';
import { logger } from './shared/logging';
import { initTracing, shutdownTracing } from './shared/observability';

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  process.exit(1);
});

async function bootstrap() {
  initTracing();
  await initDatabase();

  const port = Number(process.env.PORT ?? 3000);
  const app = createApp().listen(port);

  logger.info(`Server is running on http://localhost:${port}`);
  logger.info(`OpenAPI UI:      http://localhost:${port}/openapi`);
  logger.info(`OpenAPI JSON:    http://localhost:${port}/openapi/json`);
  logger.info(`Health endpoint: http://localhost:${port}/health`);

  async function shutdown(signal: string) {
    logger.info({ signal }, 'Shutdown signal received');

    const forceTimeout = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);

    try {
      app.stop();
      await closeDatabase();
      await shutdownTracing();
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
    }

    clearTimeout(forceTimeout);
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.fatal({ error }, 'Failed to start application');
  process.exit(1);
});
