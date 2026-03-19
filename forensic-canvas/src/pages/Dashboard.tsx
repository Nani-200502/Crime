import { Link } from "react-router-dom";
import { Plus, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ApiError, listCases } from "@/lib/api";
import { appRoutes, workspacePath } from "@/lib/routes";

type CaseRow = {
  case_id: string;
  title?: string;
  description?: string;
  created_at?: string;
};

export default function Dashboard() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      setBusy(true);
      try {
        const data = await listCases();
        setRows(data || []);
      } catch (err) {
        const error = err as ApiError;
        toast.error(error.message || "Failed to load cases.");
      } finally {
        setBusy(false);
      }
    };
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
      >
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-medium text-foreground tracking-tight">Case Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Access and manage active forensic sketch investigations.</p>
          </div>
          <Link
            to={appRoutes.createCase}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded font-medium text-sm transition-forensic flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Case
          </Link>
        </div>

        {!busy && rows.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-lg p-16 flex flex-col items-center justify-center text-center bg-card">
            <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center text-muted-foreground mb-5">
              <FolderOpen className="h-7 w-7" />
            </div>
            <h3 className="text-base font-medium text-foreground">No active cases</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-2 mb-6">
              No cases yet - create your first criminal case to begin the synthesis process.
            </p>
            <Link
              to={appRoutes.createCase}
              className="text-primary font-medium text-sm hover:underline flex items-center gap-1"
            >
              Create your first case -&gt;
            </Link>
          </div>
        )}

        {busy && <p className="text-sm text-muted-foreground">Loading cases...</p>}

        {!busy && rows.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((item) => (
              <Link
                key={item.case_id}
                to={workspacePath(item.case_id)}
                className="surface-card rounded-lg p-5 border border-border hover:border-primary/40 transition-forensic"
              >
                <p className="label-uppercase">{item.case_id}</p>
                <h3 className="text-base font-medium text-foreground mt-1">{item.title || "Untitled Case"}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {(item.description || "No description").trim() || "No description"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
