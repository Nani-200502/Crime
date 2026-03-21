import { Navigate, Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { isAuthenticated } from "@/lib/api";

export default function AppLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
