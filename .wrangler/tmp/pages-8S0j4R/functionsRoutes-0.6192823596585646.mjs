import { onRequestPost as __api_tools_search_law_ts_onRequestPost } from "D:\\CODEX2025-2026\\VAKEEL-SAHAB-AI\\vakeel-sahab-AI-main (1)\\vakeel-sahab-AI-main\\functions\\api\\tools\\search-law.ts"
import { onRequestPost as __api_chat_ts_onRequestPost } from "D:\\CODEX2025-2026\\VAKEEL-SAHAB-AI\\vakeel-sahab-AI-main (1)\\vakeel-sahab-AI-main\\functions\\api\\chat.ts"
import { onRequestPost as __api_openai_ts_onRequestPost } from "D:\\CODEX2025-2026\\VAKEEL-SAHAB-AI\\vakeel-sahab-AI-main (1)\\vakeel-sahab-AI-main\\functions\\api\\openai.ts"
import { onRequestPost as __api_speech_ts_onRequestPost } from "D:\\CODEX2025-2026\\VAKEEL-SAHAB-AI\\vakeel-sahab-AI-main (1)\\vakeel-sahab-AI-main\\functions\\api\\speech.ts"
import { onRequestPost as __api_stt_ts_onRequestPost } from "D:\\CODEX2025-2026\\VAKEEL-SAHAB-AI\\vakeel-sahab-AI-main (1)\\vakeel-sahab-AI-main\\functions\\api\\stt.ts"

export const routes = [
    {
      routePath: "/api/tools/search-law",
      mountPath: "/api/tools",
      method: "POST",
      middlewares: [],
      modules: [__api_tools_search_law_ts_onRequestPost],
    },
  {
      routePath: "/api/chat",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_chat_ts_onRequestPost],
    },
  {
      routePath: "/api/openai",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_openai_ts_onRequestPost],
    },
  {
      routePath: "/api/speech",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_speech_ts_onRequestPost],
    },
  {
      routePath: "/api/stt",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_stt_ts_onRequestPost],
    },
  ]