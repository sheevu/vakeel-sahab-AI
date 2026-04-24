import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  User, 
  Scale, 
  Settings, 
  Menu, 
  Mic, 
  Plus, 
  FileText, 
  Search, 
  Info,
  ShieldCheck,
  ChevronDown,
  Gavel,
  Volume2,
  Pause,
  Square,
  Play,
  Loader2,
  Database,
  Cpu,
  RefreshCw,
  Download,
  X,
  MicOff,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Orb from "./Orb";
import Sidebar from "./Sidebar";
import { getAICompletion, Message, Provider, getSpeech, transcribeAudio } from "../services/aiProvider";
import { cn } from "../lib/utils";
import { useAudioRecorder } from "../lib/useAudioRecorder";
import { useIsMobile } from "../lib/useIsMobile";

const SettingsOverlay = lazy(() => import("./SettingsOverlay"));

const SYSTEM_PROMPT = `Purpose and Goals:
Act as a legendary Senior Advocate of the Supreme Court of India, providing high-level legal strategy and documentation support.
Assist the user in navigating complex matrimonial and criminal litigation, specifically focusing on false and malicious cases.
Ensure the user's constitutional rights are protected through expert guidance on immediate relief measures and evidence management.

Behaviors and Rules:
Communication Style and Greeting:
Start every response with 'Namastey, I am Vakeel Sahab GPT. How can I help you Today?'.
Keep responses conversational and avoid overly long or lengthy explanations.
Maintain proficiency in both English and Hindi (Hinglish), adapting to the user's language preference.

Legal Strategy and Relief:
Prioritize immediate relief: provide steps for anticipatory bail, stay on arrest, and FIR quashing.
Offer guidance on drafting robust legal documents including replies, affidavits, and writ petitions.
Cross-reference the Bharatiya Nyaya Sanhita (BNS) 2023 with old IPC sections to ensure accurate criminal defense advice.

Evidence and Counter-Litigation:
Guide the user in documenting harassment and collecting evidence of innocence.
Advise on potential counter-litigation strategies such as defamation or mental cruelty charges where applicable.
You are equipped with multi-modal capabilities: you can analyze images of evidence, transcribing documents, and interpret legal paperwork uploaded by the user to provide more precise strategy.

Research and Verification:
For every legal or procedural query, perform a web search to verify the latest laws, Supreme Court judgments, and government notifications.
Always cite authoritative source links (official court or government websites) to allow for independent verification.

Dispute Resolution:
Suggest mediation and negotiation as alternatives to litigation when it serves the user's best interest to resolve the matter early.

Overall Tone:
Empathy combined with courtroom authority.
Professional, proactive, and focused on maintaining the user's dignity.
Practical and solution-oriented.

1. 🔷 AGENT PERSONA
You are “Vakeel GPT”, an elite AI legal strategist modeled as a Senior Advocate of the Supreme Court of India with 40+ years of simulated courtroom experience.
Expertise across: Criminal Law (BNS 2023 / IPC 1860 / BNSS 2023), Civil & Commercial Law, Family Law, Constitutional Law, Corporate & Financial Law.

2. 🌐 OUTPUT LANGUAGE RULE
YOU MUST RESPOND UNMISTAKABLY IN: Hinglish (default). Switch ONLY if user explicitly asks. Tone: Clear, sharp, professional, slightly assertive.

3. ⚖️ LEGAL RESPONSE FRAMEWORK (MANDATORY STRUCTURE)
Every answer MUST follow this internal structure:
1. Situation Analysis: Logical breakdown of facts.
2. Legal Position: Relevant law / sections / principles.
3. Risk Assessment: Dangers (arrest, liability, penalty etc.).
4. Immediate Action: Next 24–72 hour steps.
5. Strategic Advice: Long-term positioning.

4. 🛠️ TOOL RULES
- get_client_profile(name, location, case_type, case_stage)
- search_law(act, section, keyword)
- draft_legal_document(document_type, facts)
- case_strategy_builder(facts, case_type)

5. 🚀 STARTING MESSAGE
“Namastey, I am Vakeel Sahab GPT. How can I help you Today?”
`;

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Namastey, I am Vakeel Sahab GPT. How can I help you Today?"
};

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
  isPinned?: boolean;
  tag?: { label: string, color: string };
}

export default function ChatInterface() {
  const isMobile = useIsMobile();
  const userEmail = "sheevum.goel@gmail.com"; // From metadata, for scoping
  
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem(`vakeel_chats_${userEmail}`);
    if (saved) return JSON.parse(saved);
    
    // Initial mock data as requested: "BNS Section 420 Query", "Drafting Notice for Rent"
    return [
      {
        id: "1",
        title: "BNS Section 420 Query",
        messages: [{ role: "assistant", content: "Namastey, I am Vakeel Sahab GPT. How can I help you Today?" }],
        updatedAt: "Today",
        isPinned: false,
        tag: { label: "Criminal", color: "bg-red-500/10 text-red-500" }
      },
      {
        id: "2",
        title: "Drafting Notice for Rent",
        messages: [{ role: "assistant", content: "Namastey, I am Vakeel Sahab GPT. How can I help you Today?" }],
        updatedAt: "Yesterday",
        isPinned: true,
        tag: { label: "Civil", color: "bg-blue-500/10 text-blue-500" }
      }
    ];
  });

  const [currentChatId, setCurrentChatId] = useState<string>(chats[0]?.id || "new");
  
  const currentChat = useMemo(() => {
    return chats.find(c => c.id === currentChatId) || {
      id: "new",
      title: "New Consultation",
      messages: [INITIAL_MESSAGE],
      updatedAt: "Just now"
    } as Chat;
  }, [chats, currentChatId]);

  const messages = currentChat.messages;

  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setChats(prev => {
      const updated = prev.map(chat => {
        if (chat.id === currentChatId) {
          const nextMessages = typeof newMessages === 'function' ? newMessages(chat.messages) : newMessages;
          return { ...chat, messages: nextMessages, updatedAt: "Just now" };
        }
        return chat;
      });
      
      // If currently in a "new" chat that isn't in the list yet
      if (currentChatId === "new" || !prev.find(c => c.id === currentChatId)) {
        const nextMessages = typeof newMessages === 'function' ? newMessages([INITIAL_MESSAGE]) : newMessages;
        const newChat: Chat = {
          id: Date.now().toString(),
          title: "New Consultation",
          messages: nextMessages,
          updatedAt: "Just now"
        };
        setCurrentChatId(newChat.id);
        return [newChat, ...prev];
      }
      
      return updated;
    });
  };

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [orbStatus, setOrbStatus] = useState<"idle" | "speaking" | "thinking">("idle");
  const [provider, setProvider] = useState<Provider>("gemini");
  const [customModelId, setCustomModelId] = useState("");
  const [clientProfile, setClientProfile] = useState<any>(() => {
    const saved = localStorage.getItem(`vakeel_profile_${userEmail}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isPlayingId, setIsPlayingId] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [customInstructions, setCustomInstructions] = useState<string[]>([
    "Strictly adhere to BNS/BNSS 2023 procedural frameworks.",
    "Focus on anticipatory relief, FIR quashing, and cross-litigation.",
    "Maintain courtroom authority; prioritize evidence mastery and strategy.",
  ]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string, type: string, data: string }[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ... (useAudioRecorder call unchanged)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, autoSend = false) => {
    const files = Array.from(e.target.files || []) as File[];
    const processedFiles: { name: string, type: string, data: string }[] = [];
    let processedCount = 0;

    if (files.length === 0) return;

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        const fileObj = {
          name: file.name,
          type: file.type,
          data: base64
        };
        processedFiles.push(fileObj);
        setUploadedFiles(prev => [...prev, fileObj]);
        
        processedCount++;
        if (processedCount === files.length && autoSend) {
          triggerAutoAnalysis(processedFiles);
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerAutoAnalysis = async (files: { name: string, type: string, data: string }[]) => {
    // Automatically send a message indicating analysis of these files
    const autoInput = "Please analyze and transcribe these uploaded documents/images for legal evidence and strategy.";
    setInput(autoInput);
    // We need to wait a tiny bit for state to update or just pass files directly to a variation of handleSend
    handleSend(autoInput, files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
  const { isRecording, audioBlob, error: recordingError, startRecording, stopRecording, clearAudio } = useAudioRecorder();

  // Cache profile and chats
  useEffect(() => {
    localStorage.setItem(`vakeel_profile_${userEmail}`, JSON.stringify(clientProfile));
  }, [clientProfile, userEmail]);

  useEffect(() => {
    localStorage.setItem(`vakeel_chats_${userEmail}`, JSON.stringify(chats));
  }, [chats, userEmail]);

  useEffect(() => {
    const handleToggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const handleCloseSidebar = () => setIsSidebarOpen(false);
    window.addEventListener('toggle-sidebar', handleToggleSidebar);
    window.addEventListener('close-sidebar', handleCloseSidebar);
    return () => {
      window.removeEventListener('toggle-sidebar', handleToggleSidebar);
      window.removeEventListener('close-sidebar', handleCloseSidebar);
    };
  }, []);

  const handleNewChat = () => {
    const newChatId = "new_" + Date.now();
    setCurrentChatId(newChatId);
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
    if (isMobile) setIsSidebarOpen(false);
  };

  const handlePinChat = (id: string) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c));
  };

  const handleDeleteChat = (id: string) => {
    setChats(prev => prev.filter(c => c.id !== id));
    if (currentChatId === id) setCurrentChatId("new");
  };

  // Prevent scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobile, isSidebarOpen]);

  // Handle transcribed audio
  useEffect(() => {
    if (audioBlob) {
      handleTranscription(audioBlob);
    }
  }, [audioBlob]);

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    setOrbStatus("thinking");
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(",")[1];
        const text = await transcribeAudio(base64data, blob.type);
        setInput(prev => (prev ? `${prev} ${text}` : text));
        clearAudio();
      };
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranscribing(false);
      setOrbStatus("idle");
    }
  };

  const handleSpeech = async (text: string, index: number) => {
    if (isPlayingId === index) {
      if (isPaused) {
        audioRef.current?.play();
        setIsPaused(false);
        setOrbStatus("speaking");
      } else {
        audioRef.current?.pause();
        setIsPaused(true);
        setOrbStatus("idle");
      }
      return;
    }

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setIsLoadingAudio(true);
    setIsPlayingId(index);
    setIsPaused(false);
    setOrbStatus("thinking");

    try {
      const audioData = await getSpeech(text);
      if (audioData && isPlayingId === index) {
        const audioUrl = `data:audio/mp3;base64,${audioData}`;
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
          setOrbStatus("speaking");
          audioRef.current.onended = () => {
            setIsPlayingId(null);
            setIsPaused(false);
            setOrbStatus("idle");
          };
        }
      }
    } catch (error) {
      console.error(error);
      setIsPlayingId(null);
      setOrbStatus("idle");
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingId(null);
    setIsPaused(false);
    setOrbStatus("idle");
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideInput?: string, overrideFiles?: { name: string, type: string, data: string }[]) => {
    const finalInput = overrideInput || input;
    const finalFiles = overrideFiles || uploadedFiles;

    if (!finalInput.trim() || isTyping) return;

    const userMessage: Message = { role: "user", content: finalInput };
    const isFirstUserMessage = messages.length === 1; // Initial message is from assistant

    if (isFirstUserMessage && (currentChatId.startsWith("new_") || currentChat.title === "New Consultation")) {
      setChats(prev => prev.map(c => {
        if (c.id === currentChatId) {
          // Truncate input for title
          const title = finalInput.length > 30 ? finalInput.substring(0, 30) + "..." : finalInput;
          return { ...c, title };
        }
        return c;
      }));
    }

    setMessages(prev => [...prev, userMessage]);
    const filesToSend = [...finalFiles];
    if (!overrideFiles) setUploadedFiles([]);
    else setUploadedFiles(prev => prev.filter(f => !finalFiles.includes(f)));

    setInput("");
    setIsTyping(true);
    setOrbStatus("thinking");

    try {
      const profileString = clientProfile ? `\n\nADVOCATE PROFILE:\nName: ${clientProfile.name || 'N/A'}\nSpecialization: ${clientProfile.specialization || 'N/A'}` : '';
      const combinedPrompt = `${SYSTEM_PROMPT}${profileString}\n\nCUSTOM USER DIRECTIVES:\n${customInstructions.join("\n")}`;
      
      const response = await getAICompletion([...messages, userMessage], {
        provider,
        customModelId,
        systemInstruction: combinedPrompt,
        attachments: filesToSend,
        tools: [
          {
            name: "get_client_profile",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                location: { type: "STRING" },
                case_type: { type: "STRING" },
                case_stage: { type: "STRING" }
              },
              required: ["location", "case_type"]
            }
          },
          {
            name: "search_law",
            parameters: {
              type: "OBJECT",
              properties: {
                act: { type: "STRING" },
                section: { type: "STRING" },
                keyword: { type: "STRING" }
              },
              required: ["act"]
            }
          },
          {
            name: "draft_legal_document",
            parameters: {
              type: "OBJECT",
              properties: {
                document_type: { type: "STRING" },
                facts: { type: "STRING" }
              },
              required: ["document_type", "facts"]
            }
          },
          {
            name: "case_strategy_builder",
            parameters: {
              type: "OBJECT",
              properties: {
                facts: { type: "STRING" },
                case_type: { type: "STRING" }
              },
              required: ["facts", "case_type"]
            }
          }
        ]
      });

      setOrbStatus("speaking");
      setMessages(prev => [...prev, { role: "assistant", content: response.text }]);
      
      // Handle tool calls visually
      if (response.toolCalls) {
        for (const tool of response.toolCalls) {
          const toolMessages: Record<string, string> = {
            get_client_profile: "Analyzing Case Profile & Jurisdiction...",
            search_law: "Fetching Relevant Legal Statutes & BNS Sections...",
            draft_legal_document: "Drafting Specialized Legal Documentation...",
            case_strategy_builder: "Synthesizing Offensive & Defensive Strategy..."
          };
          
          const statusMessage = toolMessages[tool.name] || `Executing Tactical ${tool.name} Engine...`;

          setMessages(prev => [...prev, { 
            role: "assistant", 
            content: statusMessage,
            isTool: true 
          }]);
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "assistant", content: "Lo ji, system mein thoda technical issue aa gaya. Please try again." }]);
    } finally {
      setIsTyping(false);
      setOrbStatus("idle");
    }
  };

  const handleDownloadDoc = (content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "VakeelGPT_Legal_Advice.doc";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="flex h-dvh bg-black text-white font-sans overflow-hidden">
      <audio ref={audioRef} hidden />
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
          >
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar 
        isOpen={isSidebarOpen}
        onNewChat={handleNewChat}
        onOpenSettings={() => {setShowSettings(true); if (isMobile) setIsSidebarOpen(false)}}
        onUploadClick={() => fileInputRef.current?.click()}
        onVoiceClick={isRecording ? stopRecording : startRecording}
        customInstructions={customInstructions}
        setCustomInstructions={setCustomInstructions}
        isMobile={isMobile}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onPinChat={handlePinChat}
        onDeleteChat={handleDeleteChat}
      />
      
      <div className="flex-1 flex flex-col relative overflow-hidden w-full">
        {/* High-Contrast Multi-Layer Mesh Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none bg-[#050505]">
          <motion.div 
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              x: [-50, 50, -50],
              y: [-20, 40, -20],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[10%] -left-[10%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.3)_0%,_transparent_70%)] blur-[100px]" 
          />
          <motion.div 
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [0, -45, 0],
              x: [30, -60, 30],
              y: [50, -20, 50],
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-[20%] -right-[10%] w-[90%] h-[90%] bg-[radial-gradient(circle_at_center,_rgba(220,38,38,0.25)_0%,_transparent_70%)] blur-[120px]" 
          />
          
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.03] grayscale brightness-125 pointer-events-none mix-blend-screen"
            style={{ filter: "sepia(1) saturate(10) hue-rotate(-20deg) brightness(0.6)" }}
          >
             <img 
              src="https://upload.wikimedia.org/wikipedia/commons/4/4f/Emblem_of_India.svg" 
              alt="State Emblem of India" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
             />
          </div>

          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
        </div>
        
        <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.1] pointer-events-none mix-blend-soft-light" />

        {/* Header - Sticky */}
        <header className="sticky top-0 w-full flex items-center justify-between py-3 px-4 bg-black/60 backdrop-blur-2xl border-b border-white/10 z-[45] shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-gray-300 hover:text-white border border-white/10 shadow-lg active:scale-90"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-600 drop-shadow-[0_0_8px_rgba(234,88,12,0.5)]" />
              <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase italic flex items-center leading-none">
                VAKEEL<span className="text-orange-600">GPT</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] uppercase tracking-widest text-orange-400 font-black shadow-inner">
              Supreme Court Edition
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2.5 hover:bg-white/5 rounded-2xl transition-colors text-gray-500 hover:text-white border border-transparent hover:border-white/10"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col items-center">
          
          {/* Floating AI Hub */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <AnimatePresence>
              {messages.length < 3 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
                  className="relative flex flex-col items-center justify-center w-full h-full"
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-40 scale-[1.2] md:scale-[1.5] blur-xl pointer-events-none">
                    <Orb status={orbStatus} />
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 mix-blend-screen">
                    <motion.h2 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.8] uppercase flex flex-col items-center drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                      <span className="text-white selection:bg-orange-600">LEGAL DEFENSE</span>
                      <div className="flex items-center">
                        <span className="text-white/90">WITH</span>
                        <span className="text-orange-600 block ml-4 drop-shadow-[0_0_20px_rgba(234,88,12,0.5)]">CONFIDENCE</span>
                      </div>
                    </motion.h2>
                    <p className="text-gray-400 text-xs md:text-sm mt-8 max-w-sm font-bold tracking-tight opacity-70 drop-shadow-lg">
                      Modelled as Senior Advocate of Supreme Court.<br />
                      Court-ready advice in Hinglish.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat Messages */}
          <div 
            ref={scrollRef}
            className={cn(
              "flex-1 w-full max-w-3xl overflow-y-auto px-4 py-8 space-y-6 scroll-smooth z-0 transition-all duration-500",
              messages.length < 3 ? "opacity-0 invisible" : "opacity-100 visible"
            )}
          >
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 w-full",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                  (msg as any).isTool && "justify-center"
                )}
              >
                {(msg as any).isTool ? (
                  <div className="flex flex-col items-center gap-2 py-4 px-10 bg-orange-600/5 border border-orange-500/20 rounded-[2rem] backdrop-blur-3xl shadow-[0_0_50px_rgba(234,88,12,0.1)]">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
                      <span className="text-[10px] uppercase font-black tracking-[0.2em] text-orange-500/80 italic">Legal Engine Processing...</span>
                    </div>
                    <div className="text-xs font-bold text-gray-400">{msg.content}</div>
                  </div>
                ) : (
                  <>
                    <div className={cn(
                      "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center",
                      msg.role === "user" ? "bg-orange-600" : "bg-white/5 border border-white/5"
                    )}>
                      {msg.role === "user" ? <User className="w-5 h-5" /> : <Gavel className="w-4 h-4 text-orange-400" />}
                    </div>
                    <div className={cn(
                      "max-w-[85%] rounded-3xl p-5 text-sm leading-relaxed whitespace-pre-wrap shadow-2xl relative group",
                      msg.role === "user" 
                        ? "bg-orange-600/90 text-white rounded-tr-none" 
                        : "bg-black/60 backdrop-blur-3xl border border-white/10 rounded-tl-none text-gray-100"
                    )}>
                      {msg.content}
                      {msg.role === "assistant" && (
                        <div className={cn(
                          "absolute flex flex-col gap-2 transition-all",
                          isMobile 
                            ? "-bottom-12 right-0 flex-row opacity-100 pb-2" 
                            : "-right-12 bottom-0 opacity-0 group-hover:opacity-100"
                        )}>
                          <button 
                            onClick={() => handleSpeech(msg.content, i)}
                            className={cn(
                              "p-2 rounded-xl bg-black/40 border border-white/10 hover:bg-white/10 transition-all",
                              isPlayingId === i && "text-orange-500 scale-110"
                            )}
                            title="Speak Advice"
                          >
                            <Volume2 className={cn("w-4 h-4", isPlayingId === i && "animate-pulse")} />
                          </button>

                          {isPlayingId === i && (
                            <button 
                              onClick={() => {
                                if (isPaused) {
                                  audioRef.current?.play();
                                  setIsPaused(false);
                                  setOrbStatus("speaking");
                                } else {
                                  audioRef.current?.pause();
                                  setIsPaused(true);
                                  setOrbStatus("idle");
                                }
                              }}
                              className="p-2 rounded-xl bg-black/40 border border-white/10 hover:bg-white/10 transition-all text-orange-400"
                              title={isPaused ? "Resume" : "Pause"}
                            >
                              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            </button>
                          )}

                          <button 
                            onClick={() => handleDownloadDoc(msg.content)}
                            className="p-2 rounded-xl bg-black/40 border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-orange-500"
                            title="Download as .doc"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
            {isTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.1)]">
                  <Gavel className="w-4 h-4 text-orange-400 animate-pulse" />
                </div>
                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-1.5 shadow-xl">
                  <motion.span 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" 
                  />
                  <motion.span 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                    className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" 
                  />
                  <motion.span 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                    className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" 
                  />
                  <span className="ml-2 text-[10px] uppercase tracking-widest font-black text-orange-500/60 italic">Vakeel thinking...</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Action Suggestion Grid */}
          <AnimatePresence>
            {messages.length >= 3 && messages.length < 8 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-3 w-full max-w-3xl px-4 mb-4 z-10"
              >
                <QuickAction icon={ShieldCheck} label="Case Strategy" sub="Tactical Plan" onClick={() => setInput("Mujhe ek case strategy chahiye.")} />
                <QuickAction icon={Search} label="Search Act" sub="BNS Sections" onClick={() => setInput("Muje Section 420 ke baare mein bataiye.")} />
                <QuickAction icon={FileText} label="Draft Doc" sub="Notices" onClick={() => setInput("Muje ek Legal Notice draft karni hai.")} />
                <QuickAction icon={Info} label="BNS Rules" sub="Laws 2023" onClick={() => setInput("Bharatiya Nyaya Sanhita ke naye rules kya hain?")} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Bar Section */}
          <div className="w-full max-w-3xl p-4 md:pb-8 z-10">
            {/* File Previews & Transcribing State */}
            <AnimatePresence>
              {(uploadedFiles.length > 0 || isTranscribing) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-col gap-2 mb-3 bg-black/60 backdrop-blur-3xl p-3 rounded-2xl border border-white/10 shadow-2xl"
                >
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                        {file.type.startsWith("image/") ? (
                          <div className="w-5 h-5 rounded overflow-hidden bg-black shrink-0">
                            <img src={`data:${file.type};base64,${file.data}`} alt="preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <FileText className="w-3 h-3 text-orange-400" />
                        )}
                        <span className="text-[10px] font-bold text-gray-300 truncate max-w-[100px]">{file.name}</span>
                        {!isTranscribing && (
                          <button onClick={() => removeFile(idx)} className="text-gray-500 hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {(isTranscribing || (isTyping && messages[messages.length-1]?.role === 'user')) && uploadedFiles.length > 0 && (
                    <div className="flex items-center gap-2 px-1 border-t border-white/5 pt-2 mt-1">
                      <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-orange-500/80 italic">
                        Processing Evidence...
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative flex items-center gap-2">
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={(e) => handleFileSelect(e, false)} 
                 className="hidden" 
                 multiple
                 accept="image/*,application/pdf,text/plain"
               />
               
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white border border-white/5 shadow-xl flex"
                 title="Add Evidence"
               >
                 <Plus className="w-5 h-5" />
               </button>

               <div className="hidden sm:flex gap-2">
                <button 
                  onClick={() => {
                    const el = fileInputRef.current;
                    if (el) {
                      const newHandler = (e: any) => {
                        handleFileSelect(e, true);
                        el.removeEventListener('change', newHandler);
                      };
                      el.addEventListener('change', newHandler);
                      el.click();
                    }
                  }}
                  className="px-4 py-2 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 rounded-full transition-all text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap shadow-lg active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Upload & Analyze
                </button>
               </div>

               <div className="flex-1 relative group">
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask Vakeel Sahab..."
                    className="w-full bg-white/5 border border-white/5 backdrop-blur-3xl rounded-[2rem] px-6 md:px-8 py-4 md:py-5 pr-14 md:pr-16 text-base md:text-sm focus:outline-none focus:bg-white/10 transition-all text-gray-200 placeholder:text-gray-600 shadow-2xl"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2 md:right-3 top-1.5 md:top-2.5 p-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-2xl transition-all shadow-xl"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
               </div>

               <button 
                 onClick={isRecording ? stopRecording : startRecording}
                 className={cn(
                   "p-4 md:p-5 border rounded-full transition-all active:scale-95 shadow-2xl",
                   isRecording 
                    ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse" 
                    : "bg-white/5 border-white/5 text-gray-500 hover:text-orange-500"
                 )}
               >
                  {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
               </button>
            </div>
            {isTranscribing && (
              <div className="flex justify-center mt-2">
                <span className="text-[10px] text-orange-500/60 uppercase font-black tracking-widest animate-pulse italic">Transcribing Counsel...</span>
              </div>
            )}
            {recordingError && (
              <div className="flex justify-center mt-2">
                <span className="text-[10px] text-red-500 uppercase font-black tracking-widest italic flex items-center gap-2">
                  <MicOff className="w-3 h-3" />
                  Recording Error: {recordingError} (Check microphone permissions)
                </span>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Settings Overlay - Lazy Loaded */}
      <AnimatePresence>
        {showSettings && (
          <Suspense fallback={null}>
            <SettingsOverlay 
              onClose={() => setShowSettings(false)}
              provider={provider}
              setProvider={setProvider}
              clientProfile={clientProfile}
              setClientProfile={setClientProfile}
              customModelId={customModelId}
              setCustomModelId={setCustomModelId}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickAction({ icon: Icon, label, sub, onClick }: { icon: any, label: string, sub: string, onClick: () => void }) {
  return (
    <button 
       onClick={onClick}
       className="flex flex-col items-start gap-1 p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/[0.08] hover:border-white/10 transition-all text-left shadow-2xl"
    >
      <div className="p-3 bg-orange-500/10 rounded-2xl mb-1">
        <Icon className="w-5 h-5 text-orange-500" />
      </div>
      <div className="text-sm font-black text-gray-100 leading-tight uppercase tracking-tighter">{label}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{sub}</div>
    </button>
  );
}
