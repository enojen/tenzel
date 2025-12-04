import pino from 'pino';

import { config } from '../../config';

export const logger = pino({
  level: config.logging.level,
  transport: config.app.isDevelopment
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export function createModuleLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
