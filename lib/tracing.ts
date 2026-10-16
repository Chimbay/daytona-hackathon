// OpenInference spans. Without a registered provider (tests, missing Arize keys) these are no-ops.
import Anthropic from "@anthropic-ai/sdk";
import { AnthropicInstrumentation } from "@arizeai/openinference-instrumentation-anthropic";
import { ProxyTracerProvider, SpanStatusCode, trace, type Attributes, type Span } from "@opentelemetry/api";

// AnthropicBedrock reuses the SDK's Messages class, so patching it traces the Bedrock call as an LLM span.
// Guarded so dev hot reloads don't wrap it twice.
const g = globalThis as { __anthropicTraced?: boolean };
if (!g.__anthropicTraced) {
  new AnthropicInstrumentation().manuallyInstrument(Anthropic);
  g.__anthropicTraced = true;
}

const tracer = trace.getTracer("brainstorm-board");

// Runs fn inside an OpenInference span of `kind`; sets status and ends it whatever happens.
export function withSpan<T>(name: string, kind: "CHAIN" | "TOOL", input: unknown, fn: (span: Span) => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes({
      "openinference.span.kind": kind,
      "input.value": JSON.stringify(input),
      "input.mime_type": "application/json",
    });
    try {
      const out = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return out;
    } catch (e) {
      span.recordException(e as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(e) });
      throw e;
    } finally {
      span.end();
    }
  });
}

export function setOutput(span: Span, output: unknown, attrs: Attributes = {}) {
  span.setAttributes({ "output.value": JSON.stringify(output), "output.mime_type": "application/json", ...attrs });
}

// Serverless functions can freeze right after responding; call from after() to push pending spans.
export async function flushTraces() {
  const p = trace.getTracerProvider();
  const real = (p instanceof ProxyTracerProvider ? p.getDelegate() : p) as { forceFlush?: () => Promise<void> };
  await real.forceFlush?.().catch(() => {});
}
