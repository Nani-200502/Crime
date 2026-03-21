import { Link } from "react-router-dom";
import { Shield, LogOut, User } from "lucide-react";
import { clearSession, currentUserEmail } from "@/lib/api";

export default function Navbar() {
  const email = currentUserEmail() || "Operator";

  const onLogout = () => {
    clearSession();
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-6 justify-between">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground tracking-tight text-sm">
          AI CRIMINAL SKETCH GENERATOR
        </span>
        <span className="font-mono-data text-[10px] text-muted-foreground ml-1">v4.2</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{email}</span>
        </div>
        <Link
          to="/"
          onClick={onLogout}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-forensic px-3 py-1.5 rounded hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Link>
      </div>
    </header>
  );
}
