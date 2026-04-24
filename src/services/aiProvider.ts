
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
  const endpoint = options.provider === "gemini" ? "/api/chat" : "/api/openai";
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: options.provider === "gemini" 
        ? messages
        : (options.systemInstruction 
            ? [{ role: "system", content: options.systemInstruction }, ...messages]
            : messages),
      systemInstruction: options.systemInstruction,
      tools: options.tools,
      customModelId: options.customModelId
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  
  return {
    text: data.text || data.choices[0].message.content,
    toolCalls: data.toolCalls || data.choices[0].message.tool_calls
  };
}

export async function getSpeech(text: string): Promise<string | undefined> {
  try {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    return data.audioData;
  } catch (error) {
    console.error("TTS Error:", error);
    return undefined;
  }
}

export async function transcribeAudio(audioData: string, mimeType: string): Promise<string> {
  try {
    const response = await fetch("/api/stt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioData, mimeType }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text;
  } catch (error) {
    console.error("STT Error:", error);
    throw error;
  }
}
