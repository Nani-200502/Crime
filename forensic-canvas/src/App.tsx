import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CreateCase from "./pages/CreateCase";
import Workspace from "./pages/Workspace";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";
import { appRoutes } from "./lib/routes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path={appRoutes.login} element={<Login />} />
          <Route path={appRoutes.signup} element={<Signup />} />
          <Route path={appRoutes.resetPassword} element={<ResetPassword />} />
          <Route element={<AppLayout />}>
            <Route path={appRoutes.dashboard} element={<Dashboard />} />
            <Route path={appRoutes.createCase} element={<CreateCase />} />
            <Route path={appRoutes.workspace} element={<Workspace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
