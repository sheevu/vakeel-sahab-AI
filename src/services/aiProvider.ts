import { GoogleGenAI, Modality } from "@google/genai";

const GEMINI_MODEL = "gemini-3-flash-preview";
const TTS_MODEL = "gemini-3.1-flash-tts-preview";
const OPENAI_PROXY_URL = "/api/openai";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export type Provider = "gemini" | "openai";

export interface AIResponse {
  text: string;
  toolCalls?: any[];
}

export async function getAICompletion(
  messages: Message[], 
  options: { 
    provider: Provider; 
    systemInstruction?: string;
    tools?: any[];
    customModelId?: string;
  }
): Promise<AIResponse> {
  if (options.provider === "gemini") {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));
    
    const lastMessage = messages[messages.length - 1].content;

    const response = await ai.models.generateContent({
      model: options.customModelId || GEMINI_MODEL,
      contents: [...history, { role: "user", parts: [{ text: lastMessage }] }],
      config: {
        systemInstruction: options.systemInstruction,
        temperature: 0.5,
        topP: 0.65,
        tools: [
          ...(options.tools ? [{ functionDeclarations: options.tools }] : []),
          { googleSearch: {} } // Enable Search Grounding
        ],
        toolConfig: options.tools ? { includeServerSideToolInvocations: true } : undefined,
      }
    });

    return {
      text: response.text || "",
      toolCalls: response.functionCalls || undefined
    };
  } else {
    // OpenAI via Server Proxy
    const response = await fetch(OPENAI_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: options.systemInstruction 
          ? [{ role: "system", content: options.systemInstruction }, ...messages]
          : messages
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    return {
      text: data.choices[0].message.content,
      toolCalls: data.choices[0].message.tool_calls
    };
  }
}

export async function getSpeech(text: string): Promise<string | undefined> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: `Say with a professional senior advocate authority: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' }, // Professional male voice
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Error:", error);
    return undefined;
  }
}
