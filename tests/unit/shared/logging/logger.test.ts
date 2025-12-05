import { describe, expect, it } from 'bun:test';

import { logger, createModuleLogger } from '@/shared/logging/logger';

describe('logger', () => {
  describe('logger instance', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined();
    });

    it('should have standard log methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have child method', () => {
      expect(typeof logger.child).toBe('function');
    });
  });

  describe('createModuleLogger', () => {
    it('should create a child logger with module name', () => {
      const moduleLogger = createModuleLogger('TestModule');

      expect(moduleLogger).toBeDefined();
      expect(typeof moduleLogger.info).toBe('function');
      expect(typeof moduleLogger.error).toBe('function');
    });

    it('should create different loggers for different modules', () => {
      const logger1 = createModuleLogger('Module1');
      const logger2 = createModuleLogger('Module2');

      expect(logger1).not.toBe(logger2);
    });

    it('should have bindings with module name', () => {
      const moduleLogger = createModuleLogger('UserModule');
      const bindings = moduleLogger.bindings();

      expect(bindings.module).toBe('UserModule');
    });

    it('should inherit log level from parent', () => {
      const moduleLogger = createModuleLogger('TestModule');

      expect(moduleLogger.level).toBe(logger.level);
    });
  });
});
