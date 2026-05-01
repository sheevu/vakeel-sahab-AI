var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/tools/search-law.ts
var onRequestPost = /* @__PURE__ */ __name(async (context) => {
  const { request } = context;
  const body = await request.json();
  const { act, section, keyword } = body;
  const result = {
    result: `Found relevant information for ${act} ${section || ""} ${keyword || ""}. 
    Statutory provision: Section ${section || "X"} of the ${act} addresses this legal principle.`
  };
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestPost");

// api/chat.ts
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
__name(isNonEmptyString, "isNonEmptyString");
function normalizeMessageRole(role) {
  return role === "user" ? "user" : "model";
}
__name(normalizeMessageRole, "normalizeMessageRole");
function parseMessages(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parsed = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const role = item.role;
    const content = item.content;
    if (!isNonEmptyString(content)) return null;
    if (role !== "user" && role !== "assistant" && role !== "system") return null;
    parsed.push({ role, content });
  }
  return parsed;
}
__name(parseMessages, "parseMessages");
function parseAttachments(value) {
  if (value === void 0) return [];
  if (!Array.isArray(value)) return [];
  const parsed = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const name = item.name;
    const type = item.type;
    const data = item.data;
    if (!isNonEmptyString(name) || !isNonEmptyString(type) || !isNonEmptyString(data)) continue;
    parsed.push({ name, type, data });
  }
  return parsed;
}
__name(parseAttachments, "parseAttachments");
async function callGeminiModel({
  apiKey,
  messages,
  systemInstruction,
  tools,
  customModelId,
  attachments
}) {
  const history = messages.slice(0, -1).map((m) => ({
    role: normalizeMessageRole(m.role),
    parts: [{ text: m.content }]
  }));
  const lastMessageText = messages[messages.length - 1].content;
  const lastMessageParts = [{ text: lastMessageText }];
  if (attachments.length > 0) {
    attachments.forEach((file) => {
      lastMessageParts.push({
        inlineData: {
          data: file.data,
          mimeType: file.type
        }
      });
    });
  }
  const model = customModelId || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [...history, { role: "user", parts: lastMessageParts }],
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : void 0,
    generationConfig: {
      temperature: 0.5,
      topP: 0.65
    },
    tools: [
      ...tools ? [{ functionDeclarations: tools }] : [],
      { googleSearch: {} }
    ],
    toolConfig: tools ? { functionCallingConfig: { mode: "AUTO" } } : void 0
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Gemini API request failed.");
  }
  const data = await response.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  let text = "";
  let toolCalls = [];
  for (const part of parts) {
    if (part.text) text += part.text;
    if (part.functionCall) toolCalls.push(part.functionCall);
  }
  return {
    text,
    toolCalls: toolCalls.length > 0 ? toolCalls : void 0
  };
}
__name(callGeminiModel, "callGeminiModel");
async function callOpenAIModel({
  apiKey,
  messages,
  customModelId,
  systemInstruction
}) {
  const openAIMessages = systemInstruction ? [{ role: "system", content: systemInstruction }, ...messages] : messages;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: customModelId || "gpt-4o-mini",
      messages: openAIMessages,
      temperature: 0.5
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "OpenAI API request failed.");
  }
  const data = await response.json();
  return { text: data?.choices?.[0]?.message?.content || "" };
}
__name(callOpenAIModel, "callOpenAIModel");
var LEGAL_LOGIC = `
CORE LEGAL REASONING (CoT):
1. Fact Extraction: Identify primary parties, legal disputes, and key dates.
2. Issue Identification: Isolate specific constitutional or statutory questions.
3. Ratio Decidendi: Prioritize the core legal principle over obiter dicta.
4. Application: Map identified principles strictly to the current fact pattern.

PRIORITY HIERARCHY:
1. Supreme Court Judgments (1950\u20132024): Binding precedent.
2. 373 Landmark Judgments: Foundational interpretations.
3. Statutory Acts: Specific section numbers and clauses.
`;
async function searchLegalDatabase(d1, query) {
  try {
    const results = await d1.prepare(`
        SELECT content, act_name || ' Section ' || section_number as source 
        FROM acts 
        WHERE id IN (SELECT rowid FROM legal_search_index WHERE legal_search_index MATCH ?)
        LIMIT 3
      `).bind(query).all();
    return results.results.map((r) => `SOURCE: ${r.source}
CONTENT: ${r.content}`).join("\n\n");
  } catch (e) {
    console.error("DB Search Error", e);
    return "";
  }
}
__name(searchLegalDatabase, "searchLegalDatabase");
async function checkSemanticCache(d1, query) {
  try {
    const cached = await d1.prepare("SELECT ai_response FROM semantic_cache WHERE user_query LIKE ? LIMIT 1").bind(`%${query}%`).first();
    return cached?.ai_response;
  } catch {
    return null;
  }
}
__name(checkSemanticCache, "checkSemanticCache");
var onRequestPost2 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const body = await request.json();
  const d1 = env.vakeel_db;
  const messages = parseMessages(body?.messages);
  if (!messages) {
    return new Response(JSON.stringify({ error: "Invalid payload." }), { status: 400 });
  }
  const lastQuery = messages[messages.length - 1].content;
  if (d1) {
    const cachedResponse = await checkSemanticCache(d1, lastQuery);
    if (cachedResponse) {
      return new Response(JSON.stringify({ text: cachedResponse, isCached: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  let dbContext = "";
  if (d1) {
    dbContext = await searchLegalDatabase(d1, lastQuery);
  }
  const baseSystemPrompt = `You are Vakeel Sahab GPT, an elite AI legal strategist modeled as a Senior Advocate of the Supreme Court of India.
Communication Style: Professional, authoritative, yet accessible. Use "Hinglish" where appropriate.
${LEGAL_LOGIC}

${dbContext ? `PROVEN LEGAL CONTEXT (Use this to avoid general guesses):
${dbContext}` : ""}
`;
  const systemInstruction = isNonEmptyString(body?.systemInstruction) ? `${baseSystemPrompt}

User Context: ${body.systemInstruction}` : baseSystemPrompt;
  const tools = Array.isArray(body?.tools) ? body.tools : void 0;
  const customModelId = isNonEmptyString(body?.customModelId) ? body.customModelId : void 0;
  const attachments = parseAttachments(body?.attachments);
  const requiresGemini = attachments.length > 0 || !!tools?.length;
  const geminiKeys = [
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_1,
    env.Gemini_API_Key1
  ].filter(Boolean);
  const openAIKey = env.OPENAI_API_KEY;
  const routeSlots = [
    ...geminiKeys.map((key) => ({ provider: "gemini", geminiKey: key })),
    ...openAIKey && !requiresGemini ? [{ provider: "openai" }] : []
  ];
  if (routeSlots.length === 0) {
    return new Response(JSON.stringify({ error: "No AI provider key configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const startIndex = Math.floor(Math.random() * routeSlots.length);
  const providerChain = [];
  for (let i = 0; i < routeSlots.length; i++) {
    providerChain.push(routeSlots[(startIndex + i) % routeSlots.length]);
  }
  let lastError = "No provider could process the request.";
  for (const candidate of providerChain) {
    try {
      if (candidate.provider === "openai") {
        const response = await callOpenAIModel({ apiKey: openAIKey, messages, customModelId, systemInstruction });
        return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } });
      }
      if (candidate.geminiKey) {
        const response = await callGeminiModel({
          apiKey: candidate.geminiKey,
          messages,
          systemInstruction,
          tools,
          customModelId,
          attachments
        });
        return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } });
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`Provider attempt failed (${candidate.provider})`, error);
    }
  }
  return new Response(JSON.stringify({ error: `All configured providers failed. Last error: ${lastError}` }), {
    status: 502,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestPost");

// api/ingest.ts
var onRequestPost3 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const d1 = env.vakeel_db;
  if (!d1) {
    return new Response(JSON.stringify({ error: "Database not bound." }), { status: 500 });
  }
  try {
    const body = await request.json();
    const { type, data } = body;
    if (type === "act") {
      const { act_name, section_number, title, content } = data;
      await d1.prepare(`
        INSERT INTO acts (act_name, section_number, title, content) 
        VALUES (?, ?, ?, ?)
      `).bind(act_name, section_number, title, content).run();
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
}, "onRequestPost");

// api/openai.ts
function isNonEmptyString2(value) {
  return typeof value === "string" && value.trim().length > 0;
}
__name(isNonEmptyString2, "isNonEmptyString");
var onRequestPost4 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const body = await request.json();
  const messages = body?.messages;
  const model = isNonEmptyString2(body?.model) ? body.model : "gpt-4o-mini";
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
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature
      })
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
}, "onRequestPost");

// api/speech.ts
function isNonEmptyString3(value) {
  return typeof value === "string" && value.trim().length > 0;
}
__name(isNonEmptyString3, "isNonEmptyString");
var onRequestPost5 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const body = await request.json();
  const text = body?.text;
  if (!isNonEmptyString3(text)) {
    return new Response(JSON.stringify({ error: "Invalid payload. 'text' is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const geminiKeys = [
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_1,
    env.Gemini_API_Key1
  ].filter(Boolean);
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
              prebuiltVoiceConfig: { voiceName: "Puck" }
            }
          }
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText || "TTS API request failed." }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }
    const data = await response.json();
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
}, "onRequestPost");

// api/stt.ts
function isNonEmptyString4(value) {
  return typeof value === "string" && value.trim().length > 0;
}
__name(isNonEmptyString4, "isNonEmptyString");
var onRequestPost6 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const body = await request.json();
  const audioData = body?.audioData;
  const mimeType = body?.mimeType;
  if (!isNonEmptyString4(audioData)) {
    return new Response(JSON.stringify({ error: "Invalid payload. 'audioData' is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const geminiKeys = [
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_1,
    env.Gemini_API_Key1
  ].filter(Boolean);
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
                mimeType: isNonEmptyString4(mimeType) ? mimeType : "audio/webm"
              }
            },
            { text: "Transcribe this audio accurately. Only return the transcription text." }
          ]
        }]
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText || "STT API request failed." }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }
    const data = await response.json();
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
}, "onRequestPost");

// ../.wrangler/tmp/pages-8S0j4R/functionsRoutes-0.6192823596585646.mjs
var routes = [
  {
    routePath: "/api/tools/search-law",
    mountPath: "/api/tools",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/chat",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/ingest",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/openai",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/speech",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/stt",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  }
];

// ../node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-MfH7IF/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-MfH7IF/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.4876438555451458.mjs.map
