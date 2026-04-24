import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  User, 
  LogOut, 
  Database,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Pin,
  MoreVertical,
  Trash2,
  Edit2,
  ShieldCheck,
  Mic,
  Upload,
  FileCode,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Scale, 
  RefreshCw
} from "lucide-react";
import { cn } from "../lib/utils";

interface Chat {
  id: string;
  title: string;
  updatedAt: string;
  isPinned?: boolean;
  tag?: { label: string, color: string };
}

interface SidebarProps {
  isOpen: boolean;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onUploadClick?: () => void;
  onVoiceClick?: () => void;
  customInstructions: string[];
  setCustomInstructions: (instructions: string[]) => void;
  isMobile?: boolean;
  chats?: Chat[];
  currentChatId?: string;
  onSelectChat?: (id: string) => void;
  onPinChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
}

const SidebarNavItem = memo(({ icon: Icon, label, onClick, isCollapsed, danger, subtext }: { 
  icon: any, 
  label: string, 
  onClick?: () => void, 
  isCollapsed?: boolean,
  danger?: boolean,
  subtext?: string
}) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-xs group text-left",
      danger ? "hover:bg-red-500/10 text-red-500/60 hover:text-red-500 font-bold" : "text-gray-400 hover:text-white",
      isCollapsed && "justify-center px-0"
    )}
  >
    <Icon className={cn("w-4 h-4 shrink-0 transition-transform duration-500", !danger && "group-hover:rotate-90")} />
    {!isCollapsed && (
      <div className="flex flex-col overflow-hidden">
        <span className="truncate font-bold">{label}</span>
        {subtext && <span className="text-[10px] text-gray-600 truncate">{subtext}</span>}
      </div>
    )}
  </button>
));

const CompactChatRow = memo(({ title, date, isPinned, tag, onPin, onDelete, onRename, onClick }: {
  title: string,
  date: string,
  isPinned?: boolean,
  tag?: { label: string, color: string },
  onPin?: () => void,
  onDelete?: () => void,
  onRename?: () => void,
  onClick?: () => void
}) => (
  <div 
    onClick={onClick}
    className="group flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/5 active:scale-[0.98]"
  >
    <div className="flex flex-col gap-1 overflow-hidden">
      <div className="flex items-center gap-2">
        {isPinned && <Pin className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />}
        <span className="text-[11px] font-bold text-gray-300 truncate transition-colors group-hover:text-white leading-tight">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter shrink-0">{date}</span>
        {tag && (
          <span className={cn(
            "text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest",
            tag.color
          )}>
            {tag.label}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      <button onClick={(e) => {e.stopPropagation(); onPin?.();}} className="p-1 hover:text-orange-500 transition-colors"><Pin className="w-3.5 h-3.5" /></button>
      <button onClick={(e) => {e.stopPropagation(); onDelete?.();}} className="p-1 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  </div>
));

export default function Sidebar({ 
  isOpen, 
  onNewChat, 
  onOpenSettings,
  onUploadClick,
  onVoiceClick,
  customInstructions,
  setCustomInstructions,
  isMobile = false,
  chats = [],
  currentChatId,
  onSelectChat,
  onPinChat,
  onDeleteChat
}: SidebarProps) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isStandingOrdersExpanded, setIsStandingOrdersExpanded] = useState(false);

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...customInstructions];
    newInstructions[index] = value;
    setCustomInstructions(newInstructions);
  };

  const handleClose = () => {
    if (isMobile && isOpen) {
      const event = new CustomEvent('close-sidebar');
      window.dispatchEvent(event);
    }
  };

  const isCollapsed = !isMobile && !isOpen;
  const width = isMobile ? "100%" : (isOpen ? 288 : 80);

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter(c => c.isPinned);
  const otherChats = filteredChats.filter(c => !c.isPinned);

  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: width,
        x: isMobile && !isOpen ? "-100%" : 0
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "h-full bg-[#0A0A0A] border-r border-white/5 flex flex-col relative z-30 overflow-hidden shadow-2xl",
        isMobile && "fixed left-0 top-0 z-50 h-dvh backdrop-blur-3xl bg-black/90"
      )}
    >
      <div className={cn("flex flex-col h-full shrink-0", isMobile ? "w-full" : (isOpen ? "w-[288px]" : "w-[80px]"))}>
        {/* Header - Desktop Toggle or Mobile Brand */}
        <div className="sticky top-0 z-30 bg-[#0A0A0A] p-4 flex items-center justify-between border-b border-white/5">
          {(isOpen || isMobile) && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              <span className="text-lg font-black tracking-tighter uppercase italic">
                VAKEEL<span className="text-orange-600">GPT</span>
              </span>
            </motion.div>
          )}
          <div className="flex items-center gap-1">
            {isMobile && (
              <button 
                onClick={() => {
                  // Focus the search input below
                  document.getElementById("sidebar-search")?.focus();
                }} 
                className="p-2 hover:bg-white/5 rounded-xl"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            {isMobile ? (
              <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-xl"><X className="w-5 h-5" /></button>
            ) : (
              <button 
                onClick={() => {
                  const event = new CustomEvent('toggle-sidebar');
                  window.dispatchEvent(event);
                }}
                className="p-2 hover:bg-white/5 rounded-xl mx-auto"
              >
                {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* New Consultation CTA */}
        <div className={cn("p-4 space-y-3", isCollapsed && "px-2")}>
          <button 
            onClick={onNewChat}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-600/10 active:scale-[0.98]",
              isCollapsed && "px-0"
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>New Consultation</span>}
          </button>
          
          {/* Search Bar */}
          {!isCollapsed && (
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
              <input 
                id="sidebar-search"
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all font-medium"
              />
            </div>
          )}
        </div>

        {/* Main Dashboard Area */}
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar space-y-6 py-2">
          
          {/* Recent Consultations */}
          <div className="space-y-3">
            <div className={cn("flex items-center justify-between", isCollapsed && "justify-center")}>
              <div className="flex flex-col">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  {!isCollapsed && <span>Recent Consultations</span>}
                </label>
                {!isCollapsed && <span className="text-[8px] text-gray-700 font-bold uppercase tracking-tight ml-5">Your recent matters</span>}
              </div>
              {!isCollapsed && <button className="text-[9px] text-orange-500 font-black uppercase hover:underline">See All</button>}
            </div>
            {!isCollapsed && (
              <div className="space-y-1">
                {pinnedChats.map(chat => (
                  <CompactChatRow 
                    key={chat.id} 
                    title={chat.title} 
                    date={chat.updatedAt} 
                    isPinned 
                    tag={chat.tag}
                    onPin={() => onPinChat?.(chat.id)}
                    onDelete={() => onDeleteChat?.(chat.id)}
                    onClick={() => onSelectChat?.(chat.id)}
                  />
                ))}
                {otherChats.map(chat => (
                  <CompactChatRow 
                    key={chat.id} 
                    title={chat.title} 
                    date={chat.updatedAt} 
                    tag={chat.tag}
                    onPin={() => onPinChat?.(chat.id)}
                    onDelete={() => onDeleteChat?.(chat.id)}
                    onClick={() => onSelectChat?.(chat.id)}
                  />
                ))}
                {filteredChats.length === 0 && (
                  <div className="text-[10px] text-gray-700 text-center py-4 font-bold uppercase tracking-widest">No consultations found</div>
                )}
              </div>
            )}
          </div>

          {/* Standing Instructions */}
          {!isCollapsed && (
            <div className="space-y-2">
              <button 
                onClick={() => setIsStandingOrdersExpanded(!isStandingOrdersExpanded)}
                className="w-full flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-widest font-black"
              >
                <div className="flex items-center gap-2">
                  <Database className="w-3 h-3" />
                  <span>Standing Instructions</span>
                </div>
                {isStandingOrdersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <span className="text-[8px] text-gray-700 font-bold uppercase tracking-tight ml-5 block -mt-1">Pinned legal references</span>
              
              <AnimatePresence>
                {isStandingOrdersExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-2 mt-2"
                  >
                    {customInstructions.map((instruction, idx) => (
                      <div key={idx} className="group relative">
                        <textarea
                          value={instruction}
                          onChange={(e) => handleInstructionChange(idx, e.target.value)}
                          placeholder={`Rule ${idx + 1}...`}
                          className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-[10px] text-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500/20 min-h-[60px] resize-none transition-all placeholder:text-gray-700"
                        />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Resume Last Matter */}
          {!isCollapsed && chats.length > 0 && (
            <button 
              onClick={() => onSelectChat?.(chats[0].id)}
              className="w-full bg-orange-600/5 hover:bg-orange-600/10 border border-orange-500/10 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase text-orange-500/80 tracking-widest transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Resume Last Matter
            </button>
          )}

          {/* Advocate Trust Block */}
          {!isCollapsed && (
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center border border-white/10 shadow-lg">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white uppercase tracking-tighter leading-none">Adv. Rajesh Sharma</span>
                  <span className="text-[9px] text-gray-600 font-bold">New Delhi, India</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-green-500/5 px-2 py-1.5 rounded-lg border border-green-500/10">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span className="text-[9px] text-green-500/80 font-black uppercase tracking-widest">Compliance Active</span>
              </div>
              <p className="text-[8px] text-gray-600 leading-tight font-medium">
                Indian legal workflow adherence enabled. End-to-end encryption active.
              </p>
            </div>
          )}
        </div>

        {/* Quick Tools & Footer */}
        <div className="p-5 mt-auto border-t border-white/5 space-y-4 bg-black/40 backdrop-blur-md">
          {(!isCollapsed || isMobile) && (
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={onUploadClick}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-[2rem] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95 group border border-white/5 shadow-lg"
              >
                <div className="w-10 h-10 rounded-full bg-orange-600/10 flex items-center justify-center group-hover:bg-orange-600/20 transition-colors">
                  <Upload className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Upload</span>
              </button>
              
              <button 
                onClick={onVoiceClick}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-[2rem] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95 group border border-white/5 shadow-lg"
              >
                <div className="w-10 h-10 rounded-full bg-orange-600/10 flex items-center justify-center group-hover:bg-orange-600/20 transition-colors">
                  <Mic className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Voice</span>
              </button>

              <button 
                onClick={onOpenSettings}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-[2rem] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95 group border border-white/5 shadow-lg"
              >
                <div className="w-10 h-10 rounded-full bg-orange-600/10 flex items-center justify-center group-hover:bg-orange-600/20 transition-colors">
                  <Settings className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Settings</span>
              </button>
            </div>
          )}

          <div className="space-y-1">
            <SidebarNavItem 
              icon={LogOut} 
              label="Terminate Session" 
              danger 
              isCollapsed={isCollapsed} 
              subtext="Privacy wipe"
            />
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
