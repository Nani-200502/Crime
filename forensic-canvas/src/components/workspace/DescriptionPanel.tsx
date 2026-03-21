import { Mic, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { CaseRecord } from "@/lib/api";

type DescriptionPanelProps = {
  cases: CaseRecord[];
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  onGenerate: () => void;
  generating: boolean;
};

export default function DescriptionPanel({
  cases,
  selectedCaseId,
  onSelectCase,
  description,
  onDescriptionChange,
  model,
  onModelChange,
  onGenerate,
  generating,
}: DescriptionPanelProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="label-uppercase">Active Case</label>
        <select
          value={selectedCaseId}
          onChange={(e) => onSelectCase(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground transition-forensic focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        >
          <option value="">Select a case...</option>
          {cases.map((c) => (
            <option key={c.case_id} value={c.case_id}>
              {c.title || c.case_id}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="label-uppercase">Suspect Description</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-forensic resize-none"
          placeholder="Describe the suspect's facial features, hair, build, and any distinguishing marks..."
          rows={5}
        />
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-forensic group"
        >
          <Mic className="h-4 w-4 group-hover:text-primary transition-colors" />
          Click to Speak
        </motion.button>
        <p className="text-[11px] text-muted-foreground text-center">Or type description above.</p>
      </div>

      {/* AI Model Selector */}
      <div className="space-y-2">
        <label className="label-uppercase">AI Model</label>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground transition-forensic focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        >
          <option value="stabilityai/stable-diffusion-xl-base-1.0">stabilityai/stable-diffusion-xl-base-1.0</option>
          <option value="runwayml/stable-diffusion-v1-5">runwayml/stable-diffusion-v1-5</option>
        </select>
      </div>

      {/* Output Mode */}
      <div className="space-y-2">
        <label className="label-uppercase">Output Mode</label>
        <div className="flex items-center gap-3 bg-secondary border border-border rounded-lg px-3 py-2.5">
          <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
            <motion.div
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <span className="text-sm text-foreground">Pencil Sketch</span>
        </div>
      </div>

      {/* Generate Button */}
      <motion.button
        onClick={onGenerate}
        disabled={generating || !selectedCaseId || !description.trim()}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg font-medium text-sm transition-forensic flex items-center justify-center gap-2 group"
      >
        <Wand2 className="h-4 w-4 transition-transform group-hover:rotate-12" />
        {generating ? "Generating..." : "Generate Portrait"}
      </motion.button>
    </div>
  );
}
