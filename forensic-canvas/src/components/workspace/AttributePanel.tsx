import { motion } from "framer-motion";
import { Wand2 } from "lucide-react";

const attributeDefinitions = [
  { label: "Face Shape", options: ["Select...", "Oval", "Round", "Square", "Heart", "Oblong", "Diamond"] },
  { label: "Eye Color", options: ["Select...", "Brown", "Blue", "Green", "Hazel", "Gray", "Amber"] },
  { label: "Eye Shape", options: ["Select...", "Almond", "Round", "Hooded", "Monolid", "Downturned", "Upturned"] },
  { label: "Nose Type", options: ["Select...", "Straight", "Roman", "Button", "Snub", "Hawk", "Flat"] },
  { label: "Nose Size", options: ["Select...", "Small", "Medium", "Large", "Wide", "Narrow"] },
  { label: "Lips Shape", options: ["Select...", "Thin", "Full", "Wide", "Heart-shaped", "Bow-shaped"] },
  { label: "Hair Color", options: ["Select...", "Black", "Brown", "Blonde", "Red", "Gray", "White", "Bald"] },
  { label: "Hair Style", options: ["Select...", "Short", "Medium", "Long", "Curly", "Straight", "Wavy", "Braided"] },
  { label: "Facial Hair", options: ["Select...", "None", "Stubble", "Mustache", "Full Beard", "Goatee"] },
  { label: "Skin Tone", options: ["Select...", "Very Light", "Light", "Medium", "Olive", "Brown", "Dark"] },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.2 } },
};
const fadeIn = {
  hidden: { opacity: 0, x: 10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

type AttributePanelProps = {
  selectedAttributes: Record<string, string>;
  onAttributeChange: (label: string, value: string) => void;
  refinementText: string;
  onRefinementTextChange: (value: string) => void;
  strength: number;
  onStrengthChange: (value: number) => void;
  onRefine: () => void;
  refining: boolean;
  disabled?: boolean;
};

export default function AttributePanel({
  selectedAttributes,
  onAttributeChange,
  refinementText,
  onRefinementTextChange,
  strength,
  onStrengthChange,
  onRefine,
  refining,
  disabled,
}: AttributePanelProps) {
  return (
    <div className="space-y-4">
      <label className="label-uppercase">Facial Attributes</label>
      <motion.div
        className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-1"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {attributeDefinitions.map((attr) => (
          <motion.div key={attr.label} className="space-y-1" variants={fadeIn}>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {attr.label}
            </label>
            <select
              value={selectedAttributes[attr.label] || ""}
              onChange={(e) => onAttributeChange(attr.label, e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground transition-forensic hover:border-primary/30 focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            >
              {attr.options.map((opt) => (
                <option key={opt} value={opt === "Select..." ? "" : opt}>{opt}</option>
              ))}
            </select>
          </motion.div>
        ))}

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Refinement Request</label>
          <textarea
            value={refinementText}
            onChange={(e) => onRefinementTextChange(e.target.value)}
            rows={3}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground transition-forensic hover:border-primary/30 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none"
            placeholder="Add small changes only, e.g. deeper scar on left cheek"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Refinement Strength ({strength.toFixed(2)})</label>
          <input
            type="range"
            min={0.1}
            max={0.5}
            step={0.05}
            value={strength}
            onChange={(e) => onStrengthChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <motion.button
          onClick={onRefine}
          disabled={disabled || refining || !refinementText.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg font-medium text-sm transition-forensic flex items-center justify-center gap-2 group"
        >
          <Wand2 className="h-4 w-4 transition-transform group-hover:rotate-12" />
          {refining ? "Applying Refinement..." : "Apply Refinement"}
        </motion.button>
      </motion.div>
    </div>
  );
}
