import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { setSession, signup } from "@/lib/api";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onRegister = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const out: any = await signup(email.trim(), password);
      const token = (out?.access_token || out?.session_token || "").trim();
      if (!token) {
        throw new Error("Signup succeeded but no access token was returned.");
      }
      setSession(token, out?.user || { email, name });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Registration failed.");
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
          <span className="font-semibold text-lg text-foreground tracking-tight">AI FORENSIC SYSTEM</span>
        </div>

        <motion.div
          className="surface-card rounded-lg p-6 space-y-6 border border-border"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div>
            <h1 className="text-lg font-medium text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Register for platform access.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-uppercase">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-forensic"
                placeholder="Officer Name" />
            </div>
            <div className="space-y-1.5">
              <label className="label-uppercase">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-forensic"
                placeholder="operator@agency.gov" />
            </div>
            <div className="space-y-1.5">
              <label className="label-uppercase">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-forensic"
                placeholder="••••••••••••" />
            </div>
          </div>

          <motion.button
            onClick={onRegister}
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded font-medium text-sm transition-forensic flex items-center justify-center gap-2 group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {busy ? "Registering..." : "Register"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </motion.button>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <p className="text-xs text-center text-muted-foreground">
            Already have access? <Link to="/" className="text-primary hover:underline">Authenticate</Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
