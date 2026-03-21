import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { CaseRecord, getCurrentCaseId, listCases, setCurrentCaseId } from "@/lib/api";

export default function CaseManagement() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeCaseId, setActiveCaseId] = useState(getCurrentCaseId());
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const rows = await listCases();
        setCases(rows);
      } catch (err: any) {
        setError(err?.message || "Failed to load cases.");
      }
    };
    run();
  }, []);

  const onSelect = (caseId: string) => {
    setActiveCaseId(caseId);
    setCurrentCaseId(caseId);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-forensic"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Briefcase className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-medium text-foreground">Case Management</h1>
          <p className="text-xs text-muted-foreground">Select an active case for generation and refinement.</p>
        </div>
      </div>

      {error ? <p className="text-xs text-destructive mb-4">{error}</p> : null}

      {cases.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-sm text-muted-foreground">
          No cases found. Create one from <Link to="/create-case" className="text-primary underline">Create Case</Link>.
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c, idx) => {
            const isActive = c.case_id === activeCaseId;
            return (
              <motion.button
                key={c.case_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onSelect(c.case_id)}
                className={`w-full text-left surface-card rounded-lg p-4 border transition-forensic ${
                  isActive ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.title || c.case_id}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono-data">{c.case_id}</p>
                    <p className="text-xs text-muted-foreground mt-2">{c.description || "No description"}</p>
                  </div>
                  {isActive ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
