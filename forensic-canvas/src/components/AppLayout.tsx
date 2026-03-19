import { Outlet } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Navbar from "./Navbar";
import { isAuthenticated } from "@/lib/api";
import { appRoutes } from "@/lib/routes";

export default function AppLayout() {
  if (!isAuthenticated()) {
    return <Navigate to={appRoutes.login} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
