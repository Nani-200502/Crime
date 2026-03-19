import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { ApiError, isAuthenticated, login, setSession } from "@/lib/api";
import { appRoutes } from "@/lib/routes";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(appRoutes.dashboard, { replace: true });
    }
  }, [navigate]);

  const submit = async () => {
    if (!email.trim() || !password) {
      toast.error("Email and password are required.");
      return;
    }

    setBusy(true);
    try {
      const data = await login(email.trim(), password);
      setSession(data.session_token || data.access_token || "", data.user || {});
      toast.success("Authenticated.");
      navigate(appRoutes.dashboard);
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || "Login failed.");
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
            {busy ? "Authenticating..." : "Authenticate"} <ArrowRight className="h-4 w-4" />
          </button>

          <div className="flex items-center justify-between text-xs">
            <Link to={appRoutes.signup} className="text-primary hover:underline">Create Account</Link>
            <Link to={appRoutes.resetPassword} className="text-muted-foreground hover:text-foreground">Reset Password</Link>
          </div>
        </div>

        <p className="text-center text-[10px] font-mono-data text-muted-foreground mt-6">
          CLASSIFIED SYSTEM — AUTHORIZED PERSONNEL ONLY
        </p>
      </motion.div>
    </div>
  );
}
