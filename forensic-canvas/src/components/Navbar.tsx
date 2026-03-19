import { Link, useLocation } from "react-router-dom";
import { Shield, LogOut } from "lucide-react";
import { clearSession, currentUserEmail } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { appRoutes } from "@/lib/routes";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;
  const email = currentUserEmail();

  const logout = () => {
    clearSession();
    navigate(appRoutes.login);
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-6 justify-between">
      <div className="flex items-center gap-8">
        <Link to={appRoutes.dashboard} className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground tracking-tight">FORENSIC SYNTHESIS ENGINE</span>
          <span className="font-mono-data text-[10px] text-muted-foreground ml-1">v4.2</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to={appRoutes.dashboard}
            className={`px-3 py-1.5 rounded text-sm transition-forensic ${
              isActive(appRoutes.dashboard)
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dashboard
          </Link>
        </nav>
      </div>
      <button
        type="button"
        onClick={logout}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-forensic"
      >
        <LogOut className="h-4 w-4" />
        {email ? `Logout (${email})` : "Logout"}
      </button>
    </header>
  );
}
