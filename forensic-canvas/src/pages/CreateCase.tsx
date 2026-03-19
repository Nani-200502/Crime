import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { ApiError, createCase } from "@/lib/api";
import { appRoutes, workspacePath } from "@/lib/routes";

export default function CreateCase() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Case title is required.");
      return;
    }

    setBusy(true);
    try {
      const row = await createCase(title.trim(), description.trim());
      toast.success("Case created.");
      navigate(workspacePath(row.case_id));
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || "Failed to create case.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-10 px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
      >
        <button
          onClick={() => navigate(appRoutes.dashboard)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-forensic"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="surface-card rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-medium text-foreground">Create New Case</h1>
              <p className="text-xs text-muted-foreground">Initialize a new forensic sketch investigation.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-uppercase">Case Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-forensic"
                placeholder="CASE_2024_090"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-uppercase">Case Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-forensic resize-none"
                placeholder="Describe the case details, suspect information, and investigation context..."
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded font-medium text-sm transition-forensic"
          >
            {busy ? "Creating..." : "Create Case"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
