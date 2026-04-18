import { motion } from "motion/react";

interface OrbProps {
  status: "idle" | "speaking" | "thinking";
}

export default function Orb({ status }: OrbProps) {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Background Glow */}
      <motion.div
        animate={{
          scale: status === "speaking" ? [1, 1.2, 1] : 1,
          opacity: status === "thinking" ? [0.4, 0.7, 0.4] : 0.5,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 bg-orange-500 rounded-full blur-3xl opacity-30"
      />
      
      {/* Outer Ring */}
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full"
      />

      {/* The Core Orb (Now a rounded square based on screenshot) */}
      <motion.div
        animate={{
          scale: status === "speaking" ? [1, 1.05, 1] : status === "thinking" ? [1, 0.95, 1] : 1,
          rotate: status === "thinking" ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-32 h-32 relative bg-gradient-to-br from-orange-400 via-red-500 to-rose-600 rounded-[2rem] shadow-[0_0_60px_rgba(244,63,94,0.4)] flex items-center justify-center overflow-hidden border border-white/20"
      >
        {/* Shine */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/10 to-white/5 pointer-events-none" />
        
        {/* Eyes (Now dots/dashes) */}
        <div className="flex gap-3">
          <motion.div 
            animate={{ scaleY: status === "speaking" ? [1, 2, 1] : 1 }}
            className="w-1.5 h-1.5 bg-white rounded-full opacity-90 shadow-[0_0_8px_white]" 
          />
          <motion.div 
            animate={{ scaleY: status === "speaking" ? [1, 2, 1] : 1 }}
            className="w-1.5 h-1.5 bg-white rounded-full opacity-90 shadow-[0_0_8px_white]" 
          />
        </div>

        {/* Shimmer overlay */}
        <motion.div
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />
      </motion.div>
    </div>
  );
}
