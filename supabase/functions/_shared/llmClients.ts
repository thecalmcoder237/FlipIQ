type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function fetchJson(url: string, init: RequestInit) {
  const resp = await fetch(url, init);
  const text = await resp.text();
  if (!resp.ok) throw new Error(`LLM error (${resp.status}): ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`LLM returned non-JSON: ${text.slice(0, 500)}`);
  }
}

function stripCodeFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function callOpenAIJson(params: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}): Promise<any> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY secret");
  const model = params.model || Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

  const data = await fetchJson("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: params.temperature ?? 0.2,
      messages: params.messages,
      response_format: { type: "json_object" },
    }),
  });

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenAI returned no content");
  return JSON.parse(stripCodeFences(content));
}

/**
 * Qwen via OpenAI-compatible endpoint. Defaults to DashScope compatible-mode.
 * Configure secrets:
 * - QWEN_API_KEY (required)
 * - QWEN_MODEL (optional): "qwen-plus" (default) or "qwen-max" for higher quality
 * - QWEN_BASE_URL (optional): override API base URL
 */
export async function callQwenJson(params: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}): Promise<any> {
  const apiKey = Deno.env.get("QWEN_API_KEY");
  if (!apiKey) throw new Error("Missing QWEN_API_KEY secret");

  const baseUrl =
    Deno.env.get("QWEN_BASE_URL") || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const model = params.model || Deno.env.get("QWEN_MODEL") || "qwen-plus";

  const data = await fetchJson(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: params.temperature ?? 0.3,
      messages: params.messages,
      response_format: { type: "json_object" },
    }),
  });

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Qwen returned no content");
  return JSON.parse(stripCodeFences(content));
}

