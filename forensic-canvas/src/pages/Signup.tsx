import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { ApiError, setSession, signup } from "@/lib/api";
import { appRoutes } from "@/lib/routes";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      toast.error("Email and password are required.");
      return;
    }

    setBusy(true);
    try {
      const data = await signup(email.trim(), password);
      if (((data.session_token || "") + (data.access_token || "")).trim()) {
        setSession(data.session_token || data.access_token || "", data.user || { email: email.trim() });
        toast.success("Account created and authenticated.");
        navigate(appRoutes.dashboard);
        return;
      }

      toast.success("Account created. Please login.");
      navigate(appRoutes.login);
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || "Signup failed.");
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
            <h1 className="text-lg font-medium text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Register for platform access.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-uppercase">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-forensic"
                placeholder="Officer Name"
              />
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
            <div className="space-y-1.5">
              <label className="label-uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-forensic"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded font-medium text-sm transition-forensic flex items-center justify-center gap-2"
          >
            {busy ? "Registering..." : "Register"} <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-xs text-center text-muted-foreground">
            Already have access? <Link to={appRoutes.login} className="text-primary hover:underline">Authenticate</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
