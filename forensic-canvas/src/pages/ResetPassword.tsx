import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { resetPassword } from "@/lib/api";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onReset = async () => {
    if (busy) return;
    setMessage("");
    setError("");
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setMessage("Reset instructions sent. Check your email.");
    } catch (err: any) {
      setError(err?.message || "Reset request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-blueprint opacity-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg text-foreground tracking-tight">AI CRIMINAL SKETCH GENERATOR</span>
        </div>

        <motion.div
          className="surface-card rounded-lg p-6 space-y-6 border border-border"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div>
            <h1 className="text-lg font-medium text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Submit your email to receive reset instructions.</p>
          </div>

          <div className="space-y-1.5">
            <label className="label-uppercase">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-forensic"
              placeholder="operator@agency.gov" />
          </div>

          <motion.button
            onClick={onReset}
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded font-medium text-sm transition-forensic"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {busy ? "Sending..." : "Send Reset Instructions"}
          </motion.button>

          {message ? <p className="text-xs text-emerald-500">{message}</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground justify-center transition-forensic">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
