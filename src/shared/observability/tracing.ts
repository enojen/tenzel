import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { config } from '../../config';
import { logger } from '../logging';

let sdk: NodeSDK | null = null;

export function initTracing(): void {
  if (!config.observability.otelEnabled) {
    logger.debug('OpenTelemetry tracing is disabled');
    return;
  }

  const traceExporter = new OTLPTraceExporter({
    url: `${config.observability.otelEndpoint}/v1/traces`,
  });

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'muhasebat',
      [ATTR_SERVICE_VERSION]: '1.0.0',
    }),
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  logger.info('OpenTelemetry tracing initialized');
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    logger.info('OpenTelemetry tracing shut down');
  }
}
