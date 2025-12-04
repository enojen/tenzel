process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.DATABASE_URL = 'postgres://localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-chars';
process.env.LOG_LEVEL = 'debug';
process.env.OTEL_ENABLED = 'true';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://otel:4317';
process.env.DEFAULT_LOCALE = 'tr';
