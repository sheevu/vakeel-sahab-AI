
interface Env {
  vakeel_db: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const d1 = env.vakeel_db;

  if (!d1) {
    return new Response(JSON.stringify({ error: "Database not bound." }), { status: 500 });
  }

  try {
    const body = await request.json() as any;
    const { type, data } = body;

    if (type === "act") {
      const { act_name, section_number, title, content } = data;
      await d1.prepare(`
        INSERT INTO acts (act_name, section_number, title, content) 
        VALUES (?, ?, ?, ?)
      `).bind(act_name, section_number, title, content).run();
      
      // Update FTS index
      await d1.prepare(`
        INSERT INTO legal_search_index (act_name, section_number, content) 
        VALUES (?, ?, ?)
      `).bind(act_name, section_number, content).run();
    }

    if (type === "judgment") {
      const { case_name, citation, ratio_decidendi, summary } = data;
      await d1.prepare(`
        INSERT INTO judgments (case_name, citation, ratio_decidendi, summary) 
        VALUES (?, ?, ?, ?)
      `).bind(case_name, citation, ratio_decidendi, summary).run();

      // Update FTS index
      await d1.prepare(`
        INSERT INTO legal_search_index (case_name, ratio_decidendi) 
        VALUES (?, ?)
      `).bind(case_name, ratio_decidendi).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
};
