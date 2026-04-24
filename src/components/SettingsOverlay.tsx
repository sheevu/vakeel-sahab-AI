import React from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface SettingsOverlayProps {
  onClose: () => void;
  provider: "gemini" | "openai";
  setProvider: (p: "gemini" | "openai") => void;
  clientProfile: any;
  setClientProfile: (p: any) => void;
  customModelId: string;
  setCustomModelId: (id: string) => void;
}

export default function SettingsOverlay({
  onClose,
  provider,
  setProvider,
  clientProfile,
  setClientProfile,
  customModelId,
  setCustomModelId
}: SettingsOverlayProps) {
  // Temporary local state for "Save only on Submit"
  const [localProfile, setLocalProfile] = React.useState(clientProfile);
  const [localProvider, setLocalProvider] = React.useState(provider);
  const [localModelId, setLocalModelId] = React.useState(customModelId);

  const handleSubmit = () => {
    setClientProfile(localProfile);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#0A0A0A] border-y md:border border-white/10 rounded-none md:rounded-[2.5rem] p-8 w-full md:max-w-sm h-full md:h-auto overflow-y-auto shadow-[0_0_100px_rgba(249,115,22,0.1)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-1 space-y-8">
          <h3 className="text-xl font-black uppercase tracking-widest italic">
            Config<span className="text-orange-600">uration</span>
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Advocate Profile Details</label>
              <input 
                type="text"
                placeholder="Advocate Name"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                onChange={(e) => setLocalProfile({...localProfile, name: e.target.value})}
                value={localProfile?.name || ""}
              />
              <input 
                type="text"
                placeholder="Specialization (e.g. Criminal Law)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                onChange={(e) => setLocalProfile({...localProfile, specialization: e.target.value})}
                value={localProfile?.specialization || ""}
              />
            </div>

            <div className="p-5 bg-orange-500/5 rounded-3xl border border-orange-500/10">
              <p className="text-[11px] text-orange-400/80 leading-relaxed font-medium">
                Your advocate profile details allow for highly specialized legal reasoning and personalized document generation.
              </p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit}
          className="w-full mt-8 py-5 bg-orange-600 hover:bg-orange-700 rounded-2xl text-xs font-black tracking-widest uppercase transition-all shadow-xl shadow-orange-600/20 active:scale-[0.98]"
        >
          Apply Changes
        </button>
      </motion.div>
    </motion.div>
  );
}
