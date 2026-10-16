// Arize AX exporter. Loaded once from instrumentation.ts (Node runtime only).
// No-op when keys are missing; export runs in the background (batched) so a slow or down
// Arize never touches the request path.
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { SEMRESATTRS_PROJECT_NAME } from "@arizeai/openinference-semantic-conventions";

const apiKey = process.env.ARIZE_API_KEY ?? process.env.arize_api;
const spaceId = process.env.ARIZE_SPACE_ID;
const project = process.env.ARIZE_PROJECT_NAME ?? "brainstorm-board";

if (apiKey && spaceId) {
  new NodeTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: project, [SEMRESATTRS_PROJECT_NAME]: project }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: process.env.ARIZE_COLLECTOR_ENDPOINT ?? "https://otlp.arize.com/v1/traces",
          headers: { "arize-space-id": spaceId, "arize-api-key": apiKey },
          timeoutMillis: 5000,
        }),
      ),
    ],
  }).register();
} else {
  console.warn("Arize tracing off: set ARIZE_API_KEY and ARIZE_SPACE_ID");
}
