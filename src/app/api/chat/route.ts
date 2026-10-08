import { OpenRouter } from "@openrouter/sdk";

export const runtime = "nodejs";

const encoder = new TextEncoder();
const maxMessageLength = 8000;
const maxConversationMessages = 32;
const model = "inclusionai/ling-3.1-flash";
const systemInstruction =
  "You are ColdMind, a thoughtful, clear, and practical AI assistant. Be honest about uncertainty and adapt to the user's needs.";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenRouterStreamChunk = {
  choices: Array<{ delta: { content?: string | null } }>;
  error?: { message: string; code: number };
  usage?: { completionTokensDetails?: { reasoningTokens?: number | null } | null };
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Add OPENROUTER_API_KEY to your local environment to start chatting." },
      { status: 503 },
    );
  }

  let messages: ChatMessage[];
  try {
    const body = await request.json();
    if (
      !Array.isArray(body.messages) ||
      body.messages.length === 0 ||
      body.messages.length > maxConversationMessages ||
      body.messages.some(
        (message: unknown) =>
          typeof message !== "object" ||
          message === null ||
          !("role" in message) ||
          !("content" in message) ||
          !["user", "assistant"].includes(String(message.role)) ||
          typeof message.content !== "string" ||
          message.content.length === 0 ||
          message.content.length > maxMessageLength,
      )
    ) {
      return Response.json({ error: "That message could not be sent." }, { status: 400 });
    }
    messages = body.messages as ChatMessage[];
  } catch {
    return Response.json({ error: "That message could not be sent." }, { status: 400 });
  }

  try {
    const openrouter = new OpenRouter({ apiKey });
    const result = await openrouter.chat.send({
      chatRequest: {
        model: process.env.OPENROUTER_MODEL || model,
        messages: [
          { role: "system", content: systemInstruction },
          ...messages,
        ],
        stream: true,
        provider: {
          only: ["novita"],
          allowFallbacks: false,
        },
      },
    });

    if (!isAsyncIterable<OpenRouterStreamChunk>(result)) {
      throw new Error("OpenRouter returned a non-streaming response.");
    }

    return new Response(streamOpenRouterResponse(result), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    const status = getProviderStatus(error);
    console.error("OpenRouter request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      status,
    });
    return Response.json(
      { error: getProviderErrorMessage(status) },
      { status: status === 402 || status === 429 || status === 503 ? status : 502 },
    );
  }
}

function streamOpenRouterResponse(
  result: AsyncIterable<OpenRouterStreamChunk>,
) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result) {
          if (chunk.error) {
            throw new Error(`OpenRouter streaming error ${chunk.error.code}: ${chunk.error.message}`);
          }

          const content = chunk.choices[0]?.delta.content;
          if (content) controller.enqueue(encoder.encode(content));

          const reasoningTokens = chunk.usage?.completionTokensDetails?.reasoningTokens;
          if (reasoningTokens !== undefined && reasoningTokens !== null) {
            console.info("OpenRouter reasoning tokens", { reasoningTokens });
          }
        }
        controller.close();
      } catch (error) {
        console.error("OpenRouter stream failed", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
        controller.error(error);
      }
    },
  });
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    Symbol.asyncIterator in value &&
    typeof value[Symbol.asyncIterator] === "function"
  );
}

function getProviderStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return undefined;
}

function getProviderErrorMessage(status: number | undefined) {
  if (status === 401 || status === 403) {
    return "OpenRouter rejected this API key. Check that it is valid and enabled.";
  }
  if (status === 402) {
    return "OpenRouter has insufficient credits for this request. Check your account.";
  }
  if (status === 429) {
    return "OpenRouter rate limit reached. Check your usage and try again.";
  }
  if (status === 404) {
    return "The configured OpenRouter model was not found or is unavailable.";
  }
  if (status !== undefined && status >= 500) {
    return "OpenRouter is temporarily unavailable. Please try again shortly.";
  }
  return "OpenRouter could not answer. Check your API key, model, and provider settings.";
}
