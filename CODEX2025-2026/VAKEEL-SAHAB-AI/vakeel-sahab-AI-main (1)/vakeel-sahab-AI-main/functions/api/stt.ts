
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
  const audioData = body?.audioData;
  const mimeType = body?.mimeType;

  if (!isNonEmptyString(audioData)) {
    return new Response(JSON.stringify({ error: "Invalid payload. 'audioData' is required." }), {
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
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText || "STT API request failed." }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("STT Error:", error);
    return new Response(JSON.stringify({ error: "Failed to transcribe audio." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
