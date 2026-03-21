import { Search, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";

interface SketchPlaceholderProps {
  onClick?: () => void;
  label?: string;
  sublabel?: string;
  compact?: boolean;
}

export default function SketchPlaceholder({
  onClick,
  label = "Generated Portrait Preview",
  sublabel = "AI-generated sketch will appear here",
  compact = false,
}: SketchPlaceholderProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.01, boxShadow: "0 0 30px hsl(217 91% 60% / 0.15)" }}
      whileTap={{ scale: 0.99 }}
      className={`group relative bg-card border border-border rounded-lg flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-forensic ${
        compact ? "aspect-square p-4" : "w-full max-w-lg aspect-[3/4] p-8"
      }`}
    >
      {/* Scan line animation */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        initial={{ top: "0%" }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      {/* Corner markers */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-primary/30 rounded-tl" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-primary/30 rounded-tr" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-primary/30 rounded-bl" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-primary/30 rounded-br" />

      {/* Expand icon on hover */}
      <motion.div
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all z-10"
        initial={false}
      >
        <div className="p-1.5 bg-primary/20 rounded border border-primary/30">
          <Maximize2 className="h-3 w-3 text-primary" />
        </div>
      </motion.div>

      <div className="text-center space-y-3 z-10">
        <motion.div
          className="w-16 h-16 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center mx-auto text-muted-foreground"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Search className="h-7 w-7" />
        </motion.div>
        {!compact && (
          <>
            <p className="font-mono-data text-xs text-muted-foreground uppercase">{label}</p>
            <p className="text-[11px] text-muted-foreground">{sublabel}</p>
            <p className="text-[10px] text-primary/60 font-mono-data">CLICK TO EXPAND</p>
          </>
        )}
      </div>
    </motion.div>
  );
}
