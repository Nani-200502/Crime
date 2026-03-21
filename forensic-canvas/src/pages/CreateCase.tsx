import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { createCase, setCurrentCaseId } from "@/lib/api";

export default function CreateCase() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onCreateCase = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const row = await createCase(title.trim(), description.trim());
      setCurrentCaseId(row.case_id || "");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to create case.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-10 px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-forensic group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
        </button>

        <motion.div
          className="surface-card rounded-lg p-6 space-y-6 border border-border"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary"
              whileHover={{ rotate: 5 }}
            >
              <FileText className="h-5 w-5" />
            </motion.div>
            <div>
              <h1 className="text-lg font-medium text-foreground">Create New Case</h1>
              <p className="text-xs text-muted-foreground">Initialize a new forensic sketch investigation.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-uppercase">Case Title</label>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-forensic"
                placeholder="CASE_2024_090"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-uppercase">Case Description</label>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-forensic resize-none"
                placeholder="Describe the case details, suspect information, and investigation context..."
              />
            </div>
          </div>

          <motion.button
            onClick={onCreateCase}
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded font-medium text-sm transition-forensic flex items-center justify-center gap-2 group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Rocket className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
            {busy ? "Creating Case..." : "Create Case"}
          </motion.button>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </motion.div>
      </motion.div>
    </div>
  );
}
