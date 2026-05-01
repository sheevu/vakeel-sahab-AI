
interface Env {
  OPENAI_API_KEY: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body = await request.json() as any;

  const messages = body?.messages;
  const model = isNonEmptyString(body?.model) ? body.model : "gpt-4o-mini";
  const temperature = typeof body?.temperature === "number" ? body.temperature : 0.7;
  
  if (!env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText || "OpenAI API request failed." }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("OpenAI Proxy Error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch from OpenAI." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
