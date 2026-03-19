import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { ApiError, resetPassword } from "@/lib/api";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      toast.error("Email is required.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword(email.trim());
      toast.success("Reset instructions sent.");
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || "Reset failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg text-foreground tracking-tight">FORENSIC SYNTHESIS ENGINE</span>
        </div>

        <div className="surface-card rounded-lg p-6 space-y-6">
          <div>
            <h1 className="text-lg font-medium text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Submit your email to receive reset instructions.</p>
          </div>

          <div className="space-y-1.5">
            <label className="label-uppercase">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-forensic"
              placeholder="operator@agency.gov"
            />
          </div>

          <button
            onClick={submit}
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded font-medium text-sm transition-forensic"
          >
            {busy ? "Sending..." : "Send Reset Instructions"}
          </button>

          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground justify-center">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
