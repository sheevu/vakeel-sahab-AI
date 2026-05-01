
interface Env {
  GEMINI_API_KEY: string;
  GEMINI_API_KEY_1: string;
  Gemini_API_Key1: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body = await request.json() as any;
  const text = body?.text;

  if (!isNonEmptyString(text)) {
    return new Response(JSON.stringify({ error: "Invalid payload. 'text' is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  const geminiKeys = [
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_1,
    env.Gemini_API_Key1,
  ].filter(Boolean) as string[];

  if (geminiKeys.length === 0) {
    return new Response(JSON.stringify({ error: "No Gemini API Key configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiKey = geminiKeys[Math.floor(Math.random() * geminiKeys.length)];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Say with a professional senior advocate authority: ${text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText || "TTS API request failed." }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await response.json() as any;
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return new Response(JSON.stringify({ audioData }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("TTS Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate speech." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
