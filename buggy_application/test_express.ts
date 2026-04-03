import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("@opentelemetry/instrumentation/hook.mjs", pathToFileURL("./"));

import { NodeSDK, metrics } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";

const sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
console.log("Telemetry initialized");
const { default: express } = await import("express");
console.log("Express imported");
