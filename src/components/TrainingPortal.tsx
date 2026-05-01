
import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Database, Plus, CheckCircle2, Loader2, Scale } from "lucide-react";

interface TrainingPortalProps {
  onClose: () => void;
}

export default function TrainingPortal({ onClose }: TrainingPortalProps) {
  const [type, setType] = useState<"act" | "judgment">("act");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    act_name: "",
    section_number: "",
    title: "",
    content: "",
    case_name: "",
    citation: "",
    ratio_decidendi: "",
    summary: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);

    const payload = {
      type,
      data: type === "act" ? {
        act_name: formData.act_name,
        section_number: formData.section_number,
        title: formData.title,
        content: formData.content
      } : {
        case_name: formData.case_name,
        citation: formData.citation,
        ratio_decidendi: formData.ratio_decidendi,
        summary: formData.summary
      }
    };

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSuccess(true);
        setFormData({
            act_name: "",
            section_number: "",
            title: "",
            content: "",
            case_name: "",
            citation: "",
            ratio_decidendi: "",
            summary: ""
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
    >
      <div className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(249,115,22,0.1)]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600/10 rounded-xl">
              <Database className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter uppercase italic">Vakeel <span className="text-orange-600">Training Portal</span></h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Add legal data to your local brain</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex gap-2">
            <button 
              onClick={() => setType("act")}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${type === "act" ? "bg-orange-600 text-white shadow-lg" : "bg-white/5 text-gray-500"}`}
            >
              Statutory Act (BNS/IPC)
            </button>
            <button 
              onClick={() => setType("judgment")}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${type === "judgment" ? "bg-orange-600 text-white shadow-lg" : "bg-white/5 text-gray-500"}`}
            >
              Court Judgment
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "act" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Act Name</label>
                    <input 
                      required
                      placeholder="e.g. BNS 2023"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/10 transition-all text-gray-200"
                      value={formData.act_name}
                      onChange={e => setFormData({...formData, act_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Section No.</label>
                    <input 
                      required
                      placeholder="e.g. 420"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/10 transition-all text-gray-200"
                      value={formData.section_number}
                      onChange={e => setFormData({...formData, section_number: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Section Title</label>
                    <input 
                      placeholder="e.g. Punishment for Cheating"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/10 transition-all text-gray-200"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Full Content</label>
                    <textarea 
                      required
                      rows={5}
                      placeholder="Paste the full text of the section here..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/10 transition-all text-gray-200 resize-none"
                      value={formData.content}
                      onChange={e => setFormData({...formData, content: e.target.value})}
                    />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Case Name</label>
                    <input 
                      required
                      placeholder="e.g. Kesavananda Bharati v. State of Kerala"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/10 transition-all text-gray-200"
                      value={formData.case_name}
                      onChange={e => setFormData({...formData, case_name: e.target.value})}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Citation</label>
                    <input 
                      placeholder="e.g. (1973) 4 SCC 225"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/10 transition-all text-gray-200"
                      value={formData.citation}
                      onChange={e => setFormData({...formData, citation: e.target.value})}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Ratio Decidendi</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="What was the core legal principle decided?"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/10 transition-all text-gray-200 resize-none"
                      value={formData.ratio_decidendi}
                      onChange={e => setFormData({...formData, ratio_decidendi: e.target.value})}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Case Summary</label>
                    <textarea 
                      rows={4}
                      placeholder="Brief overview of the facts and final order..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white/10 transition-all text-gray-200 resize-none"
                      value={formData.summary}
                      onChange={e => setFormData({...formData, summary: e.target.value})}
                    />
                </div>
              </>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Brain...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Feed the Vakeel
                </>
              )}
            </button>
            
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 text-green-500 font-bold text-[10px] uppercase tracking-widest"
              >
                <CheckCircle2 className="w-4 h-4" />
                Data Ingested Successfully!
              </motion.div>
            )}
          </form>
        </div>
      </div>
    </motion.div>
  );
}
