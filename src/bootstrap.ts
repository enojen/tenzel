import { createApp } from './app';

const port = Number(process.env.PORT ?? 3000);

const app = createApp().listen(port);

console.log(`Server is running on http://localhost:${port}`);
console.log(`OpenAPI UI:      http://localhost:${port}/openapi`);
console.log(`OpenAPI JSON:    http://localhost:${port}/openapi/json`);
console.log(`Health endpoint: http://localhost:${port}/health`);

process.on('SIGINT', () => {
  app.stop();
  process.exit(0);
});
