import { NodeSDK, metrics } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

// Configure where to send the data (The OTel Collector running in Docker)
const traceExporter = new OTLPTraceExporter({
    url: 'http://127.0.0.1:4318/v1/traces'
});
const metricExporter = new OTLPMetricExporter({
    url: 'http://127.0.0.1:4318/v1/metrics'
});

const sdk = new NodeSDK({
    serviceName: 'buggy-payment-service',
    traceExporter,
    metricReader: new metrics.PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 1000, // Export metrics every second for real-time data
    }),
    instrumentations: [getNodeAutoInstrumentations()]
});

try {
    sdk.start();
    console.log('Telemetry initialized');
} catch (error) {
    console.log('Error initializing telemetry', error);
}