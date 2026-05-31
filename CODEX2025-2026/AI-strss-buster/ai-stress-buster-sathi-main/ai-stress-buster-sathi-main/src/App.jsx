import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Bell, Bot, Brain, Briefcase, CheckCircle2, ChevronRight, Circle, Clock3,
  Flame, Frown, GraduationCap, Heart, House, Meh, Moon, NotebookPen,
  Pause, Play, RotateCcw, Send, Smile, Sparkles, Sun, Timer, User, Users, Wind,
  Wand2
} from "lucide-react";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? "";

const ROLE_OPTIONS = [
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "professional", label: "Professional", icon: Briefcase },
  { id: "parent", label: "Parent", icon: Users },
  { id: "homemaker", label: "Homemaker", icon: House },
  { id: "other", label: "Other", icon: User },
];

const EMOTION_OPTIONS = [
  { id: "calm", label: "Calm", icon: Smile, color: "text-emerald-400", border: "border-emerald-400/50" },
  { id: "mixed", label: "Mixed", icon: Meh, color: "text-amber-400", border: "border-amber-400/50" },
  { id: "drained", label: "Drained", icon: Frown, color: "text-rose-400", border: "border-rose-400/50" },
  { id: "overloaded", label: "Overloaded", icon: Flame, color: "text-orange-500", border: "border-orange-500/50" },
];

const SUPPORT_MODES = [
  { id: "vent", title: "Dil Se Baat", subtitle: "Safe emotional release", icon: Heart, gradient: "from-rose-500 to-orange-500" },
  { id: "cbt", title: "Thought Reframe", subtitle: "Psychology reframing", icon: Brain, gradient: "from-cyan-400 to-blue-500" },
  { id: "family", title: "Family Dynamics", subtitle: "Conversation scripts", icon: Users, gradient: "from-orange-400 to-yellow-500" },
  { id: "spiritual", title: "Tradition & Focus", subtitle: "Breath & wisdom", icon: Sparkles, gradient: "from-violet-400 to-fuchsia-500" },
  { id: "action", title: "Practical Plan", subtitle: "Next 24-hour plan", icon: ChevronRight, gradient: "from-emerald-400 to-green-500" },
];

const useOmAudio = () => {
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const oscillatorsRef = useRef([]);

  const playOm = useCallback((durationSeconds) => {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    if (ctx.state === 'suspended') ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1.5);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSeconds);
    gainNodeRef.current = masterGain;

    const baseFreq = 136.1;
    
    const createOsc = (freq, type, detune) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      
      oscGain.gain.value = freq > 300 ? 0.3 : 0.6;
      
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationSeconds + 1);
      oscillatorsRef.current.push(osc);
    };

    createOsc(baseFreq, 'sine', 0);           
    createOsc(baseFreq, 'triangle', 4);       
    createOsc(baseFreq, 'sine', -4);          
    createOsc(baseFreq * 1.5, 'sine', 2);     
    createOsc(baseFreq * 2, 'sine', 0);       
    createOsc(baseFreq * 2, 'triangle', -2);  
  }, []);

  const stopOm = useCallback(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    }
    setTimeout(() => {
      oscillatorsRef.current.forEach(osc => {
        try { osc.stop(); } catch (e) { }
      });
      oscillatorsRef.current = [];
    }, 500);
  }, []);

  return { playOm, stopOm };
};

const fetchWithRetry = async (url, options, retries = 5) => {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }
};

const generateGeminiResponse = async (profile, activeMode, chatHistory, userMessage, isInsight = false) => {
  if (!apiKey.trim()) {
    return {
      text: "AI Sathi is ready, but the Gemini API key is missing. Add `VITE_GEMINI_API_KEY` to your `.env` file so I can respond properly.",
      plan: {
        title: "Setup Check",
        items: [
          "Create a `.env` file in the project root",
          "Add `VITE_GEMINI_API_KEY=your_key_here`",
          "Restart the dev server",
        ],
      },
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const systemPrompt = `You are AI Sathi, an empathetic emotional anchor built for Indian users, combining modern psychology with ancient Indian wisdom (Bhagavad Gita, Vedas, Ramayana, etc.).
User Profile: Name: ${profile.name}, Role: ${profile.role}, Mood (1-10): ${profile.moodScore}, Emotion: ${profile.emotion}.
Current Support Mode: ${activeMode} (Adapt your tone: 'vent' = purely empathetic listening, 'cbt' = reframe negative thoughts, 'family' = provide scripts for boundaries, 'spiritual' = offer grounding wisdom, 'action' = focus on immediate next steps).

${isInsight ? "CRITICAL INSTRUCTION: The user has requested an 'AI Deep Insight'. Analyze the entire conversation history. Provide a profound, warm psychological summary of their root emotions and suggest a paradigm shift." : "Provide a warm, conversational, non-judgmental response to the user's latest message."}

Rules:
1. Speak conversationally and empathetically. Use a tiny bit of Hinglish naturally if it fits, but keep it mostly English.
2. NEVER be robotic. Be warm.
3. If the user mentions self-harm, immediately pivot to suggesting they seek emergency help (112 in India) and offer to stay with them.`;

  const historyText = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AI Sathi'}: ${m.text}`).join('\n');
  const userPrompt = `Chat History:\n${historyText}\n\nUser's latest message: ${userMessage}`;

  const schema = {
    type: "OBJECT",
    properties: {
      text: { type: "STRING", description: "The conversational response to the user." },
      wisdom: {
        type: "OBJECT",
        description: "A relevant piece of ancient Indian wisdom.",
        properties: {
          source: { type: "STRING", description: "e.g., Bhagavad Gita, Chanakya Neeti" },
          text: { type: "STRING", description: "The quote (can be in Sanskrit/Hindi/English)" },
          insight: { type: "STRING", description: "How this applies to the user's exact current situation." }
        }
      },
      plan: {
        type: "OBJECT",
        description: "A dynamically generated 3-step action plan based on the conversation.",
        properties: {
          title: { type: "STRING", description: "A highly specific title for the plan." },
          items: {
            type: "ARRAY",
            items: { type: "STRING", description: "A micro-actionable step." }
          }
        }
      }
    },
    required: ["text"]
  };

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  };

  try {
    const data = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error("Empty response from Gemini");
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "I'm having a little trouble connecting to my deeper thoughts right now, but I am still here with you. Take a slow, deep breath. We will get through this.",
      plan: { title: "Grounding Protocol", items: ["Drink a glass of water", "Take 5 deep breaths", "Close your eyes for 60 seconds"] }
    };
  }
};

const getMoodLabel = (score) => {
  if (score <= 3) return { text: "Low energy", color: "text-rose-400", border: "border-rose-400/50" };
  if (score <= 6) return { text: "Manageable", color: "text-amber-400", border: "border-amber-400/50" };
  if (score <= 8) return { text: "Stable", color: "text-emerald-400", border: "border-emerald-400/50" };
  return { text: "Strong & grounded", color: "text-cyan-400", border: "border-cyan-400/50" };
};

function Onboarding({ onStart }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [primaryConcern, setPrimaryConcern] = useState("");
  const [emotion, setEmotion] = useState("mixed");
  const [moodScore, setMoodScore] = useState(5);
  const [error, setError] = useState("");

  const moodMeta = getMoodLabel(moodScore);

  const handleStart = () => {
    if (!name.trim() || primaryConcern.trim().length < 10) {
      setError("Please share your name and a brief detail (10+ chars) about your concern.");
      return;
    }
    onStart({ name: name.trim(), role, primaryConcern: primaryConcern.trim(), emotion, moodScore });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-950 via-teal-950/30 to-slate-900 text-slate-100">
      <div className="max-w-2xl w-full">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-xl shadow-teal-500/20 flex items-center justify-center text-2xl">
            🧘
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-200 to-white">AI Sathi</h1>
            <p className="text-slate-400 text-sm mt-1">Calm mind, clear actions. Powered by ✨ Gemini.</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-10 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6">Let's set up your safe space</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">What should I call you?</label>
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Your name" 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">What is occupying your mind today?</label>
              <textarea 
                rows={3}
                value={primaryConcern} 
                onChange={(e) => setPrimaryConcern(e.target.value)} 
                placeholder="E.g., I'm feeling overwhelmed with career pressure..." 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-3">Which role defines your current focus?</label>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {ROLE_OPTIONS.map((item) => {
                  const Icon = item.icon;
                  const isActive = role === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setRole(item.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        isActive ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.2)]' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Icon size={16} /> {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-3">Current Emotion</label>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {EMOTION_OPTIONS.map((item) => {
                    const Icon = item.icon;
                    const isActive = emotion === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setEmotion(item.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-300 border ${
                          isActive ? `bg-white/10 ${item.border} ${item.color}` : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <Icon size={16} /> {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-3">Energy Level: {moodScore}/10</label>
                <input
                  type="range" min="1" max="10" value={moodScore}
                  onChange={(e) => setMoodScore(Number(e.target.value))}
                  className="w-full accent-teal-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <p className={`text-xs mt-2 font-medium ${moodMeta.color}`}>{moodMeta.text}</p>
              </div>
            </div>

            {error && <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{error}</div>}

            <button 
              onClick={handleStart}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-90 text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-300 active:scale-[0.98]"
            >
              Enter Support Space <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreathingCoach({ profile }) {
  const [mode, setMode] = useState("breath");
  const [pace, setPace] = useState("balanced");
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseLeft, setPhaseLeft] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  
  const { playOm, stopOm } = useOmAudio();
  const targetCycles = 6;

  const protocol = useMemo(() => {
    if (mode === "om") {
      const paces = { slow: { inhale: 5, chant: 8, silence: 4 }, balanced: { inhale: 4, chant: 7, silence: 3 }, active: { inhale: 3, chant: 6, silence: 2 } };
      const p = paces[pace];
      return {
        title: "OM Meditation",
        phases: [
          { label: "Inhale", seconds: p.inhale, color: "text-cyan-400", border: "border-cyan-400/50" },
          { label: "Chant OM", seconds: p.chant, color: "text-violet-400", border: "border-violet-400/50", action: "playOm" },
          { label: "Silence", seconds: p.silence, color: "text-amber-400", border: "border-amber-400/50" },
        ]
      };
    }
    const paces = { slow: { inhale: 5, hold: 5, exhale: 7, rest: 2 }, balanced: { inhale: 4, hold: 4, exhale: 6, rest: 2 }, active: { inhale: 3, hold: 2, exhale: 4, rest: 1 } };
    const p = paces[pace];
    return {
      title: "Breath Flow",
      phases: [
        { label: "Inhale", seconds: p.inhale, color: "text-cyan-400", border: "border-cyan-400/50" },
        { label: "Hold", seconds: p.hold, color: "text-amber-400", border: "border-amber-400/50" },
        { label: "Exhale", seconds: p.exhale, color: "text-emerald-400", border: "border-emerald-400/50" },
        { label: "Rest", seconds: p.rest, color: "text-rose-400", border: "border-rose-400/50" },
      ]
    };
  }, [mode, pace]);

  const currentPhase = protocol.phases[phaseIndex] || protocol.phases[0];

  useEffect(() => {
    setRunning(false);
    setPhaseIndex(0);
    setPhaseLeft(protocol.phases[0].seconds);
    setCycleCount(0);
    stopOm();
  }, [protocol, stopOm]);

  useEffect(() => {
    if (!running) return;

    if (currentPhase.action === "playOm" && phaseLeft === currentPhase.seconds) {
      playOm(currentPhase.seconds);
    }

    const timer = setTimeout(() => {
      if (phaseLeft > 1) {
        setPhaseLeft(prev => prev - 1);
        return;
      }
      const isLastPhase = phaseIndex >= protocol.phases.length - 1;
      
      if (!isLastPhase) {
        setPhaseIndex(prev => prev + 1);
        setPhaseLeft(protocol.phases[phaseIndex + 1].seconds);
      } else {
        if (cycleCount + 1 >= targetCycles) {
          setRunning(false);
          setPhaseIndex(0);
          setPhaseLeft(protocol.phases[0].seconds);
          setCycleCount(0);
        } else {
          setCycleCount(prev => prev + 1);
          setPhaseIndex(0);
          setPhaseLeft(protocol.phases[0].seconds);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [running, phaseLeft, phaseIndex, cycleCount, currentPhase, protocol, playOm]);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-5 relative overflow-hidden flex flex-col items-center shadow-xl">
      <div className={`absolute inset-0 opacity-10 blur-3xl transition-colors duration-1000 bg-current ${currentPhase.color}`} pointerEvents="none" />
      
      <div className="flex items-center gap-2 mb-4 text-slate-200 font-semibold w-full">
        <Wind size={18} className={currentPhase.color} />
        <span>{protocol.title}</span>
      </div>

      <div className="flex gap-2 bg-black/20 p-1 rounded-full mb-6 text-xs w-max">
        <button className={`px-4 py-1.5 rounded-full transition-all ${mode === 'breath' ? 'bg-white/20 text-white' : 'text-slate-400'}`} onClick={() => setMode("breath")}>Breath</button>
        <button className={`px-4 py-1.5 rounded-full transition-all ${mode === 'om' ? 'bg-white/20 text-white' : 'text-slate-400'}`} onClick={() => setMode("om")}>OM Chant</button>
      </div>

      <div className={`relative flex items-center justify-center w-32 h-32 md:w-40 md:h-40 rounded-full border-2 ${currentPhase.border} ${running ? 'animate-pulse' : ''} transition-all duration-1000 shadow-[0_0_30px_rgba(0,0,0,0.3)] bg-gradient-to-br from-white/5 to-transparent`}>
        <div className="text-center">
          <p className={`text-xs md:text-sm mb-1 uppercase tracking-widest font-medium ${currentPhase.color}`}>{currentPhase.label}</p>
          <strong className="text-3xl md:text-4xl font-light text-white">{running ? phaseLeft : currentPhase.seconds}</strong>
        </div>
      </div>

      <div className="mt-6 flex gap-3 w-full">
        <button 
          onClick={() => {
            if (running) {
              setRunning(false);
              stopOm();
            } else {
              setRunning(true);
            }
          }} 
          className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-sm"
        >
          {running ? <Pause size={16} /> : <Play size={16} />} 
          {running ? 'Pause' : 'Start'}
        </button>
        <button 
          onClick={() => { setRunning(false); stopOm(); setPhaseIndex(0); setPhaseLeft(protocol.phases[0].seconds); setCycleCount(0); }} 
          className="px-4 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 py-3 rounded-xl flex items-center justify-center transition-all"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}

function ActionBoard({ plan, setPlan }) {
  if (!plan) return null;
  
  const completed = plan.items ? plan.items.filter(i => i.done).length : 0;
  const progress = plan.items && plan.items.length ? Math.round((completed / plan.items.length) * 100) : 0;

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-20"><Sparkles size={40} /></div>
      <div className="flex items-center gap-2 text-slate-200 font-semibold mb-4 relative z-10">
        <NotebookPen size={18} className="text-emerald-400" />
        <span>{plan.title || "Action Plan"}</span>
      </div>

      <div className="flex items-center gap-3 mb-5 relative z-10">
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-medium text-slate-400">{progress}%</span>
      </div>

      <div className="space-y-3 relative z-10">
        {plan.items && plan.items.map((item, idx) => {
          const itemText = typeof item === 'string' ? item : item.text;
          const isDone = item.done === true;
          
          return (
            <button
              key={idx}
              onClick={() => {
                const newItems = [...plan.items];
                if (typeof newItems[idx] === 'string') {
                   newItems[idx] = { text: newItems[idx], done: true };
                } else {
                   newItems[idx].done = !newItems[idx].done;
                }
                setPlan({ ...plan, items: newItems });
              }}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ${
                isDone ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/40 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Circle size={16} className="text-slate-500" />}
              </div>
              <span className={`text-sm leading-snug transition-all ${isDone ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                {itemText}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  );
}

function ChatWorkspace({ profile, onRestart }) {
  const [activeMode, setActiveMode] = useState("vent");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const listEndRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const fetchInitial = async () => {
      const response = await generateGeminiResponse(profile, activeMode, [], `I'm here because: ${profile.primaryConcern}`);
      setMessages([{ role: "assistant", text: response.text, wisdom: response.wisdom }]);
      if (response.plan) setPlan(response.plan);
      setLoading(false);
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (customMessage = null, isInsight = false) => {
    const userMsg = (customMessage || input).trim();
    if (!userMsg || loading) return;
    
    if (!isInsight) setInput("");
    
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    const reply = await generateGeminiResponse(profile, activeMode, messages, userMsg, isInsight);
    
    setMessages(prev => [...prev, { role: "assistant", text: reply.text, wisdom: reply.wisdom }]);
    if (reply.plan && reply.plan.items && reply.plan.items.length > 0) {
      setPlan(reply.plan);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-950 via-teal-950/20 to-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Header */}
      <header className="px-4 md:px-6 py-3 md:py-4 bg-white/5 backdrop-blur-lg border-b border-white/10 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-lg shadow-lg">🧘</div>
          <div>
            <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">AI Sathi <span className="hidden md:inline-flex text-[10px] bg-teal-500/20 text-teal-200 px-2 py-0.5 rounded-full border border-teal-500/30">✨ Gemini</span></h1>
            <p className="text-xs text-slate-400">Your Emotional Anchor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium max-w-[100px] truncate">{profile.name}</span>
          <button onClick={onRestart} className="px-3 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 border border-rose-500/30 rounded-full text-xs font-medium transition-all">End</button>
        </div>
      </header>

      {/* Main Layout: Flex-col on mobile (Chat First), Grid on desktop */}
      <main className="flex-1 p-2 md:p-6 w-full max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        
        {/* Right Area (Chat) - ORDER 1 ON MOBILE, col-span-8 on Desktop */}
        <div className="w-full lg:col-span-8 order-1 lg:order-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl md:rounded-3xl flex flex-col h-[65vh] lg:h-[calc(100vh-120px)] shadow-2xl relative overflow-hidden">
          
          <div className="px-4 md:px-5 py-3 md:py-4 border-b border-white/10 bg-black/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium text-slate-200 text-sm md:text-base">
              <Heart size={18} className="text-rose-400" />
              Conversation Space
            </div>
            <button 
              onClick={() => handleSend("Please give me a deep AI insight based on our conversation so far.", true)}
              disabled={loading || messages.length < 2}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/40 hover:to-orange-500/40 border border-amber-500/30 rounded-lg text-xs font-medium text-amber-200 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Wand2 size={12} /> ✨ AI Insight
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] md:max-w-[75%] p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-br-sm shadow-md' 
                    : 'bg-slate-800/80 border border-white/10 text-slate-200 rounded-bl-sm shadow-md'
                }`}>
                  <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-line">{msg.text}</p>
                </div>
                
                {msg.wisdom && msg.wisdom.source && (
                  <div className="mt-3 max-w-[90%] md:max-w-[75%] p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-left">
                    <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider flex items-center gap-1"><Sparkles size={10}/> {msg.wisdom.source}</span>
                    <p className="text-sm font-medium text-orange-100 my-1">"{msg.wisdom.text}"</p>
                    <p className="text-xs text-orange-200/70">{msg.wisdom.insight}</p>
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex items-start">
                <div className="bg-slate-800/80 border border-white/10 p-4 rounded-2xl rounded-bl-sm flex gap-1.5 items-center h-12">
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={listEndRef} />
          </div>

          <div className="p-3 md:p-4 bg-black/20 border-t border-white/10 shrink-0">
            <div className="relative flex items-center">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type freely... AI Sathi is here to listen."
                className="w-full bg-slate-900/70 border border-white/10 rounded-xl md:rounded-2xl pl-4 pr-12 py-3 md:py-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 shadow-inner"
              />
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="absolute right-1.5 md:right-2 w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(20,184,166,0.4)] transition-all"
              >
                <Send size={16} className="ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Left Sidebar (Tools) - ORDER 2 ON MOBILE, col-span-4 on Desktop */}
        <div className="w-full lg:col-span-4 order-2 lg:order-1 flex flex-col gap-4 lg:gap-6 pb-6 lg:pb-0">
          <BreathingCoach profile={profile} />
          
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 md:mb-4 flex items-center gap-2"><Bot size={16}/> Support Modes</h3>
            {/* Horizontal Scroll on Mobile, Vertical Stack on Desktop */}
            <div className="flex flex-row overflow-x-auto lg:flex-col gap-2 pb-2 lg:pb-0 snap-x hide-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {SUPPORT_MODES.map(mode => {
                const Icon = mode.icon;
                const isActive = activeMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setActiveMode(mode.id)}
                    className={`flex-shrink-0 w-[220px] lg:w-auto snap-start flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-300 ${
                      isActive ? 'bg-white/10 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'bg-transparent border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${mode.gradient} shadow-md`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>{mode.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{mode.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <ActionBoard plan={plan} setPlan={setPlan} />
        </div>

      </main>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);

  return profile ? (
    <ChatWorkspace profile={profile} onRestart={() => setProfile(null)} />
  ) : (
    <Onboarding onStart={setProfile} />
  );
}
