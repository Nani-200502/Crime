import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowRight, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";
import { login, setSession } from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onAuthenticate = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const out: any = await login(email.trim(), password);
      const token = (out?.access_token || out?.session_token || "").trim();
      if (!token) {
        throw new Error("Authentication succeeded but no access token was returned.");
      }
      setSession(token, out?.user || { email });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 grid-blueprint opacity-10 pointer-events-none" />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03]"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }}
        animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <motion.div
          className="flex items-center gap-2 mb-8 justify-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Shield className="h-6 w-6 text-primary" />
          </motion.div>
          <span className="font-semibold text-lg text-foreground tracking-tight">AI FORENSIC SYSTEM</span>
        </motion.div>

        <motion.div
          className="surface-card rounded-lg p-6 space-y-6 border border-border"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <div>
            <h1 className="text-lg font-medium text-foreground">Authenticate</h1>
            <p className="text-sm text-muted-foreground mt-1">Access the forensic synthesis platform.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-uppercase">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-forensic"
                placeholder="operator@agency.gov"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-forensic"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <motion.button
            onClick={onAuthenticate}
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded font-medium text-sm transition-forensic flex items-center justify-center gap-2 relative overflow-hidden group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Fingerprint className="h-4 w-4 group-hover:animate-pulse" />
            {busy ? "Authenticating..." : "Authenticate"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </motion.button>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex items-center justify-between text-xs">
            <Link to="/signup" className="text-primary hover:underline transition-forensic">Create Account</Link>
            <Link to="/reset-password" className="text-muted-foreground hover:text-foreground transition-forensic">Reset Password</Link>
          </div>
        </motion.div>

        <motion.p
          className="text-center text-[10px] font-mono-data text-muted-foreground mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          CLASSIFIED SYSTEM — AUTHORIZED PERSONNEL ONLY
        </motion.p>
      </motion.div>
    </div>
  );
}
