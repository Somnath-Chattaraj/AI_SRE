import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register the OpenTelemetry ESM loader hook *before* other modules are required
register("@opentelemetry/instrumentation/hook.mjs", pathToFileURL("./"));

import { NodeSDK, metrics } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";

const traceExporter = new OTLPTraceExporter({
    url: "http://127.0.0.1:4318/v1/traces",
});
const metricExporter = new OTLPMetricExporter({
    url: "http://127.0.0.1:4318/v1/metrics",
});

const sdk = new NodeSDK({
    serviceName: "buggy-payment-service",
    traceExporter,
    metricReader: new metrics.PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 1000,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log("Telemetry initialized");

// We MUST dynamically import the application logic using await import() 
// so that the telemetry SDK can patch the dependencies (like express)
const { default: express } = await import("express");
const { causeMemoryLeak, spikeCPU } = await import("./src/utils.js");
const { simulateDatabaseHang } = await import("./src/database.js");

const app = express();
const port = process.env.PORT || 3000;

// A normal, healthy endpoint
app.get("/health", (req, res) => {
    res.status(200).send({ status: "OK", uptime: process.uptime() });
});

// BUG 1: The Memory Leak (OOM Crash Simulator)
app.get("/bug/leak", causeMemoryLeak);

// BUG 2: The CPU Spike (Event Loop Blocker)
app.get("/bug/cpu", spikeCPU);

// BUG 3: The Network Latency (Database Hang Simulator)
app.get("/bug/latency", simulateDatabaseHang);

app.listen(port, () => {
    console.log(`Buggy microservice listening on port ${port}`);
});
