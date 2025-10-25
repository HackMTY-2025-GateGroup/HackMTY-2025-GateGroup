import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RoleGuard from "./components/RoleGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import CRMAlerts from "./views/CRMAlerts/CRMAlerts";
import PhotoManagement from "./views/PhotoManagement/PhotoManagement";
import Chatbot from "./views/Chatbot/Chatbot";
import UserAdmin from "./views/UserAdmin/UserAdmin";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import NotFound from "./pages/NotFound";
import Profile from "./views/Profile/Profile";

const queryClient = new QueryClient();

const AppLayout = ({ children }) => (
  <div className="min-h-screen bg-background pt-16">
    <Navbar />
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 pl-20">{children}</main>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/profile"
              element={
                <RoleGuard allowedRoles={['flight_attendant', 'inventory_manager', 'admin']}>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </RoleGuard>
              }
            />

            <Route
              path="/"
              element={
                <RoleGuard allowedRoles={['flight_attendant', 'inventory_manager', 'admin']}>
                  <AppLayout>
                    <Index />
                  </AppLayout>
                </RoleGuard>
              }
            />
            
            <Route
              path="/alerts"
              element={
                <RoleGuard allowedRoles={['inventory_manager', 'admin']}>
                  <AppLayout>
                    <CRMAlerts />
                  </AppLayout>
                </RoleGuard>
              }
            />
            
            <Route
              path="/photos"
              element={
                <RoleGuard allowedRoles={['flight_attendant', 'inventory_manager', 'admin']}>
                  <AppLayout>
                    <PhotoManagement />
                  </AppLayout>
                </RoleGuard>
              }
            />
            
            <Route
              path="/chatbot"
              element={
                <RoleGuard allowedRoles={['flight_attendant', 'inventory_manager', 'admin']}>
                  <AppLayout>
                    <Chatbot />
                  </AppLayout>
                </RoleGuard>
              }
            />
            
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AppLayout>
                    <UserAdmin />
                  </AppLayout>
                </RoleGuard>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
