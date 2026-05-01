
interface Env {
  GEMINI_API_KEY: string;
  GEMINI_API_KEY_1: string;
  Gemini_API_Key1: string;
  OPENAI_API_KEY: string;
}

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatAttachment = {
  name: string;
  type: string;
  data: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeMessageRole(role: unknown): "user" | "model" {
  return role === "user" ? "user" : "model";
}

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parsed: ChatMessage[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;

    if (!isNonEmptyString(content)) return null;
    if (role !== "user" && role !== "assistant" && role !== "system") return null;
    parsed.push({ role, content });
  }

  return parsed;
}

function parseAttachments(value: unknown): ChatAttachment[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return [];

  const parsed: ChatAttachment[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const name = (item as { name?: unknown }).name;
    const type = (item as { type?: unknown }).type;
    const data = (item as { data?: unknown }).data;
    if (!isNonEmptyString(name) || !isNonEmptyString(type) || !isNonEmptyString(data)) continue;
    parsed.push({ name, type, data });
  }

  return parsed;
}

async function callGeminiModel({
  apiKey,
  messages,
  systemInstruction,
  tools,
  customModelId,
  attachments,
}: {
  apiKey: string;
  messages: ChatMessage[];
  systemInstruction?: string;
  tools?: any[];
  customModelId?: string;
  attachments: ChatAttachment[];
}) {
  const history = messages.slice(0, -1).map((m) => ({
    role: normalizeMessageRole(m.role),
    parts: [{ text: m.content }]
  }));
  const lastMessageText = messages[messages.length - 1].content;
  const lastMessageParts: Array<any> = [{ text: lastMessageText }];

  if (attachments.length > 0) {
    attachments.forEach((file) => {
      lastMessageParts.push({
        inlineData: {
          data: file.data,
          mimeType: file.type,
        },
      });
    });
  }

  const model = customModelId || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [...history, { role: "user", parts: lastMessageParts }],
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    generationConfig: {
      temperature: 0.5,
      topP: 0.65,
    },
    tools: [
      ...(tools ? [{ functionDeclarations: tools }] : []),
      { googleSearch: {} },
    ],
    toolConfig: tools ? { functionCallingConfig: { mode: "AUTO" } } : undefined,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Gemini API request failed.");
  }

  const data = await response.json() as any;
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  
  let text = "";
  let toolCalls: any[] = [];

  for (const part of parts) {
    if (part.text) text += part.text;
    if (part.functionCall) toolCalls.push(part.functionCall);
  }

  return {
    text,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

async function callOpenAIModel({
  apiKey,
  messages,
  customModelId,
  systemInstruction,
}: {
  apiKey: string;
  messages: ChatMessage[];
  customModelId?: string;
  systemInstruction?: string;
}) {
  const openAIMessages = systemInstruction
    ? [{ role: "system", content: systemInstruction }, ...messages]
    : messages;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: customModelId || "gpt-4o-mini",
      messages: openAIMessages,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "OpenAI API request failed.");
  }

  const data = await response.json() as any;
  return { text: data?.choices?.[0]?.message?.content || "" };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body = await request.json() as any;

  const messages = parseMessages(body?.messages);
  if (!messages) {
    return new Response(JSON.stringify({ error: "Invalid payload. 'messages' must be a non-empty array." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const systemInstruction = isNonEmptyString(body?.systemInstruction) ? body.systemInstruction : undefined;
  const tools = Array.isArray(body?.tools) ? body.tools : undefined;
  const customModelId = isNonEmptyString(body?.customModelId) ? body.customModelId : undefined;
  const attachments = parseAttachments(body?.attachments);
  const requiresGemini = attachments.length > 0 || !!tools?.length;

  const geminiKeys = [
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_1,
    env.Gemini_API_Key1,
  ].filter(Boolean) as string[];
  const openAIKey = env.OPENAI_API_KEY;

  const routeSlots = [
    ...geminiKeys.map((key) => ({ provider: "gemini" as const, geminiKey: key })),
    ...(openAIKey && !requiresGemini ? [{ provider: "openai" as const }] : []),
  ];

  if (routeSlots.length === 0) {
    return new Response(JSON.stringify({ error: "No AI provider key configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Basic randomization
  const startIndex = Math.floor(Math.random() * routeSlots.length);
  const providerChain = [];
  for (let i = 0; i < routeSlots.length; i++) {
    providerChain.push(routeSlots[(startIndex + i) % routeSlots.length]);
  }

  let lastError = "No provider could process the request.";
  for (const candidate of providerChain) {
    try {
      if (candidate.provider === "openai") {
        const response = await callOpenAIModel({ apiKey: openAIKey, messages, customModelId, systemInstruction });
        return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } });
      }
      if (candidate.geminiKey) {
        const response = await callGeminiModel({
          apiKey: candidate.geminiKey,
          messages,
          systemInstruction,
          tools,
          customModelId,
          attachments,
        });
        return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } });
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`Provider attempt failed (${candidate.provider})`, error);
    }
  }

  return new Response(JSON.stringify({ error: `All configured providers failed. Last error: ${lastError}` }), {
    status: 502,
    headers: { "Content-Type": "application/json" }
  });
};
