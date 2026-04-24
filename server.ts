import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper for Gemini Key Rotation
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.Gemini_API_Key1
  ].filter(Boolean) as string[];
  
  let currentGeminiIndex = 0;

  function getNextGeminiKey() {
    if (geminiKeys.length === 0) return null;
    const key = geminiKeys[currentGeminiIndex];
    currentGeminiIndex = (currentGeminiIndex + 1) % geminiKeys.length;
    return key;
  }

  // API Route for Gemini (Server-side to protect key)
  app.post("/api/chat", async (req, res) => {
    const { messages, systemInstruction, tools, customModelId, attachments } = req.body;
    
    // Choose between Gemini and OpenAI randomly to distribute load
    const canUseOpenAI = !!process.env.OPENAI_API_KEY;
    const hasComplexFeatures = (tools?.length > 0) || (attachments?.length > 0);
    const useOpenAI = canUseOpenAI && !hasComplexFeatures && Math.random() > 0.5;

    if (useOpenAI) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: customModelId || "gpt-4o",
            messages,
            temperature: 0.5,
          }),
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
            return res.json({ text: data.choices[0].message.content });
        }
      } catch (error) {
        console.error("OpenAI fallback failed, using Gemini:", error);
      }
    }

    const apiKey = getNextGeminiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "No Gemini API Key is configured on the server." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));
      
      const lastMessageText = messages[messages.length - 1].content;
      const lastMessageParts: any[] = [{ text: lastMessageText }];

      if (attachments && attachments.length > 0) {
        attachments.forEach((file: any) => {
          lastMessageParts.push({
            inlineData: {
              data: file.data,
              mimeType: file.type
            }
          });
        });
      }

      const response = await ai.models.generateContent({
        model: customModelId || "gemini-3-flash-preview",
        contents: [...history, { role: "user", parts: lastMessageParts }],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.5,
          topP: 0.65,
          tools: [
            ...(tools ? [{ functionDeclarations: tools }] : []),
            { googleSearch: {} } // Enable Search Grounding
          ],
          toolConfig: tools ? { includeServerSideToolInvocations: true } : undefined,
        }
      });

      res.json({
        text: response.text || "",
        toolCalls: response.functionCalls || undefined
      });
    } catch (error) {
      console.error("Gemini Proxy Error:", error);
      // Fallback: try next key?
      res.status(500).json({ error: "Failed to fetch from Gemini." });
    }
  });

  // API Route for OpenAI (Server-side to protect key)
  app.post("/api/openai", async (req, res) => {
    const { model, messages, temperature } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: model || "gpt-4o",
          messages,
          temperature: temperature || 0.7,
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("OpenAI Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch from OpenAI." });
    }
  });

  // API Route for TTS
  app.post("/api/speech", async (req, res) => {
    const { text } = req.body;
    
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
    const { audioData, mimeType } = req.body;
    
    const apiKey = getNextGeminiKey();
    if (!apiKey) {
      return res.status(500).json({ error: "No Gemini API Key is configured on the server." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            {
              inlineData: {
                data: audioData,
                mimeType: mimeType || "audio/webm"
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
