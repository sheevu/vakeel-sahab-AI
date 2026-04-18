import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  User, 
  LogOut, 
  FileText, 
  Shield, 
  Gavel,
  ChevronLeft,
  ChevronRight,
  Database
} from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  customInstructions: string[];
  setCustomInstructions: (instructions: string[]) => void;
}

export default function Sidebar({ 
  isOpen, 
  onToggle, 
  onNewChat, 
  onOpenSettings,
  customInstructions,
  setCustomInstructions
}: SidebarProps) {
  
  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...customInstructions];
    newInstructions[index] = value;
    setCustomInstructions(newInstructions);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 320 : 0, opacity: isOpen ? 1 : 0 }}
      className={cn(
        "h-full bg-[#0A0A0A]/80 backdrop-blur-2xl border-r border-white/5 flex flex-col relative z-30 transition-all duration-300 ease-in-out overflow-hidden shadow-2xl",
        !isOpen && "border-none"
      )}
    >
      {/* Sidebar Content */}
      <div className="flex flex-col h-full w-[320px] shrink-0">
        {/* New Chat Button */}
        <div className="p-4">
          <button 
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 py-4 bg-orange-600 hover:bg-orange-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-600/10 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New Counsel
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar space-y-8 py-4">
          {/* Previous Chats (Placeholder) */}
          <div className="space-y-3">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              Recent Consultations
            </label>
            <div className="space-y-1">
              <div className="p-3 bg-white/5 rounded-xl text-xs text-gray-400 border border-white/5 cursor-pointer hover:bg-white/10 transition-all font-medium">BNS Section 420 Query</div>
              <div className="p-3 bg-white/5 rounded-xl text-xs text-gray-400 border border-white/5 cursor-pointer hover:bg-white/10 transition-all font-medium">Drafting Notice for Rent</div>
            </div>
          </div>

          {/* Custom Instructions Section */}
          <div className="space-y-4">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-2">
              <Database className="w-3 h-3" />
              Agent Directives
            </label>
            {customInstructions.map((instruction, idx) => (
              <div key={idx} className="space-y-2">
                <textarea
                  value={instruction}
                  onChange={(e) => handleInstructionChange(idx, e.target.value)}
                  placeholder={`Instruction Set ${idx + 1}...`}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-[11px] text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/50 min-h-[80px] transition-all placeholder:text-gray-700"
                />
              </div>
            ))}
            <p className="text-[9px] text-gray-600 italic px-2">
              Instructions define the AI's tactical legal standard.
            </p>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 mt-auto border-t border-white/5 space-y-2">
          <button 
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-xs text-gray-400 hover:text-white group"
          >
            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
            <span>Advocate Settings</span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-xs text-gray-400 hover:text-white">
            <User className="w-4 h-4" />
            <span>Profile Console</span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 rounded-xl transition-all text-xs text-red-500/60 hover:text-red-500 font-bold">
            <LogOut className="w-4 h-4" />
            <span>Terminate Session</span>
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
