import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const SAMPLE_ACTS = [
  {
    act_name: "Bharatiya Nyaya Sanhita (BNS)",
    section_number: "318",
    title: "Cheating",
    content: "Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person... is said to cheat.",
    keywords: JSON.stringify(["cheating", "fraud", "property", "BNS"])
  },
  {
    act_name: "Indian Penal Code (IPC)",
    section_number: "420",
    title: "Cheating and dishonestly inducing delivery of property",
    content: "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person... shall be punished with imprisonment of either description for a term which may extend to seven years.",
    keywords: JSON.stringify(["cheating", "fraud", "IPC 420"])
  },
  {
    act_name: "Code of Criminal Procedure (CrPC)",
    section_number: "482",
    title: "Saving of inherent power of High Court",
    content: "Nothing in this Code shall be deemed to limit or affect the inherent powers of the High Court to make such orders as may be necessary to give effect to any order under this Code, or to prevent abuse of the process of any Court or otherwise to secure the ends of justice.",
    keywords: JSON.stringify(["inherent powers", "FIR quashing", "High Court"])
  }
];

const SAMPLE_JUDGMENTS = [
  {
    case_name: "Kesavananda Bharati v. State of Kerala",
    citation: "(1973) 4 SCC 225",
    judgment_date: "1973-04-24",
    bench_strength: 13,
    ratio_decidendi: "The Parliament has the power to amend the Constitution, but it cannot alter its Basic Structure.",
    summary: "Landmark case defining the Basic Structure doctrine of the Indian Constitution."
  },
  {
    case_name: "Arnesh Kumar v. State of Bihar",
    citation: "(2014) 8 SCC 273",
    judgment_date: "2014-07-02",
    bench_strength: 2,
    ratio_decidendi: "Arrest should be the exception, not the rule, especially in cases with punishment less than 7 years like 498A.",
    summary: "Guidelines to prevent unnecessary arrests in matrimonial disputes."
  }
];

async function runIngestion() {
  console.log("🚀 Starting Foundational Legal Data Ingestion...");

  try {
    // 1. Ingest Acts
    for (const act of SAMPLE_ACTS) {
      console.log(`📝 Ingesting Act: ${act.act_name} Sec ${act.section_number}`);
      const sql = `INSERT INTO acts (act_name, section_number, title, content, keywords) VALUES ('${act.act_name}', '${act.section_number}', '${act.title}', '${act.content}', '${act.keywords}');`;
      execSync(`npx wrangler d1 execute vakeel-db --command="${sql.replace(/"/g, '\\"')}" --remote`);
      
      const ftsSql = `INSERT INTO legal_search_index (act_name, section_number, content) VALUES ('${act.act_name}', '${act.section_number}', '${act.content}');`;
      execSync(`npx wrangler d1 execute vakeel-db --command="${ftsSql.replace(/"/g, '\\"')}" --remote`);
    }

    // 2. Ingest Judgments
    for (const j of SAMPLE_JUDGMENTS) {
      console.log(`⚖️ Ingesting Judgment: ${j.case_name}`);
      const sql = `INSERT INTO judgments (case_name, citation, judgment_date, bench_strength, ratio_decidendi, summary) VALUES ('${j.case_name}', '${j.citation}', '${j.judgment_date}', ${j.bench_strength}, '${j.ratio_decidendi}', '${j.summary}');`;
      execSync(`npx wrangler d1 execute vakeel-db --command="${sql.replace(/"/g, '\\"')}" --remote`);

      const ftsSql = `INSERT INTO legal_search_index (case_name, ratio_decidendi) VALUES ('${j.case_name}', '${j.ratio_decidendi}');`;
      execSync(`npx wrangler d1 execute vakeel-db --command="${ftsSql.replace(/"/g, '\\"')}" --remote`);
    }

    console.log("✅ Ingestion Complete!");
  } catch (error) {
    console.error("❌ Ingestion Failed:", error.message);
  }
}

runIngestion();
