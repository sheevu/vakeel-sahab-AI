import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: process.env.BODY_LIMIT || "15mb" }));

  // Helper for Gemini Key Rotation
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.Gemini_API_Key1,
  ].filter(Boolean) as string[];
  const openAIKey = process.env.OPENAI_API_KEY;
  
  let currentGeminiIndex = 0;
  let currentRouteIndex = 0;

  function getNextGeminiKey() {
    if (geminiKeys.length === 0) return null;
    const key = geminiKeys[currentGeminiIndex];
    currentGeminiIndex = (currentGeminiIndex + 1) % geminiKeys.length;
    return key;
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
    const ai = new GoogleGenAI({ apiKey, apiVersion: "v1" });
    const history = messages.slice(0, -1).map((m) => ({
      role: normalizeMessageRole(m.role),
      parts: [{ text: m.content }]
    }));
    const lastMessageText = messages[messages.length - 1].content;
    const lastMessageParts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [{ text: lastMessageText }];

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

    const response = await ai.models.generateContent({
      model: customModelId || "gemini-1.5-flash",
      contents: [...history, { role: "user", parts: lastMessageParts }],
      config: {
        systemInstruction,
        temperature: 0.5,
        topP: 0.65,
        tools: [
          ...(tools ? [{ functionDeclarations: tools }] : []),
          { googleSearch: {} },
        ],
        toolConfig: tools ? { includeServerSideToolInvocations: true } : undefined,
      },
    });

    return {
      text: response.text || "",
      toolCalls: response.functionCalls || undefined,
    };
  }

  async function callOpenAIModel({
    messages,
    customModelId,
    systemInstruction,
  }: {
    messages: ChatMessage[];
    customModelId?: string;
    systemInstruction?: string;
  }) {
    if (!openAIKey) {
      throw new Error("OPENAI_API_KEY missing for OpenAI route.");
    }

    const openAIMessages = systemInstruction
      ? [{ role: "system", content: systemInstruction }, ...messages]
      : messages;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIKey}`,
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

    const data = await response.json();
    return { text: data?.choices?.[0]?.message?.content || "" };
  }

  // API Route for Gemini (Server-side to protect key)
  app.post("/api/chat", async (req, res) => {
    const messages = parseMessages(req.body?.messages);
    if (!messages) {
      return res.status(400).json({ error: "Invalid payload. 'messages' must be a non-empty array of role/content objects." });
    }

    const systemInstruction = isNonEmptyString(req.body?.systemInstruction) ? req.body.systemInstruction : undefined;
    const tools = Array.isArray(req.body?.tools) ? req.body.tools : undefined;
    const customModelId = isNonEmptyString(req.body?.customModelId) ? req.body.customModelId : undefined;
    const attachments = parseAttachments(req.body?.attachments);
    const requiresGemini = attachments.length > 0 || !!tools?.length;

    const providerChain: Array<{ provider: "gemini" | "openai"; geminiKey?: string }> = [];
    const routeSlots = [
      ...geminiKeys.map((key) => ({ provider: "gemini" as const, geminiKey: key })),
      ...(openAIKey && !requiresGemini ? [{ provider: "openai" as const }] : []),
    ];

    if (routeSlots.length === 0) {
      return res.status(500).json({ error: "No AI provider key is configured on the server." });
    }

    const startIndex = currentRouteIndex % routeSlots.length;
    currentRouteIndex = (currentRouteIndex + 1) % routeSlots.length;
    for (let i = 0; i < routeSlots.length; i++) {
      providerChain.push(routeSlots[(startIndex + i) % routeSlots.length]);
    }

    let lastError = "No provider could process the request.";
    for (const candidate of providerChain) {
      try {
        if (candidate.provider === "openai") {
          const response = await callOpenAIModel({ messages, customModelId, systemInstruction });
          return res.json(response);
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
          return res.json(response);
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(`Provider attempt failed (${candidate.provider})`, error);
      }
    }

    res.status(502).json({ error: `All configured providers failed. Last error: ${lastError}` });
  });

  // API Route for OpenAI (Server-side to protect key)
  app.post("/api/openai", async (req, res) => {
    const messages = parseMessages(req.body?.messages);
    if (!messages) {
      return res.status(400).json({ error: "Invalid payload. 'messages' must be a non-empty array of role/content objects." });
    }

    const model = isNonEmptyString(req.body?.model) ? req.body.model : "gpt-4o-mini";
    const temperature = typeof req.body?.temperature === "number" ? req.body.temperature : 0.7;
    
    if (!openAIKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText || "OpenAI API request failed." });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("OpenAI Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch from OpenAI." });
    }
  });

  // API Route for TTS
  app.post("/api/speech", async (req, res) => {
    const text = req.body?.text;
    if (!isNonEmptyString(text)) {
      return res.status(400).json({ error: "Invalid payload. 'text' is required." });
    }
    
    const apiKey = getNextGeminiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "No Gemini API Key is configured on the server." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Say with a professional senior advocate authority: ${text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' }, // Professional authoritative voice
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      res.json({ audioData });
    } catch (error) {
      console.error("TTS Error:", error);
      res.status(500).json({ error: "Failed to generate speech." });
    }
  });

  // API Route for STT
  app.post("/api/stt", async (req, res) => {
    const audioData = req.body?.audioData;
    const mimeType = req.body?.mimeType;

    if (!isNonEmptyString(audioData)) {
      return res.status(400).json({ error: "Invalid payload. 'audioData' is required." });
    }
    
    const apiKey = getNextGeminiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "No Gemini API Key is configured on the server." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey, apiVersion: "v1" });

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{
          parts: [
            {
              inlineData: {
                data: audioData,
                mimeType: isNonEmptyString(mimeType) ? mimeType : "audio/webm"
              }
            },
            { text: "Transcribe this audio accurately. Only return the transcription text." }
          ]
        }]
      });

      res.json({ text: response.text || "" });
    } catch (error) {
      console.error("STT Error:", error);
      res.status(500).json({ error: "Failed to transcribe audio." });
    }
  });

  // Mock Legal Tools
  app.post("/api/tools/search-law", (req, res) => {
    const { act, section, keyword } = req.body;
    // Mock database or search logic
    res.json({
      result: `Found relevant information for ${act} ${section || ""} ${keyword || ""}. 
      Statutory provision: Section ${section || "X"} of the ${act} addresses this legal principle.`,
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
