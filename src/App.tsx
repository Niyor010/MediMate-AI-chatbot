import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import HealthData from "./pages/HealthData";
import Overview from "./pages/dashboard/Overview";
import Analytics from "./pages/dashboard/Analytics";
import NewsDash from "./pages/dashboard/News";
import AlertsDash from "./pages/dashboard/Alerts";
import NotFound from "./pages/NotFound";
import SidebarLayout from "./components/SidebarLayout";
import { ChatProvider, useChat } from "./contexts/ChatContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";       // ← NEW
import ProtectedRoute from "./components/ProtectedRoute";   // ← NEW
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import OTPVerification from "./pages/Otp";
import FindDoctor from "./pages/FindDoctor";
import OralDiseaseDetector from "./pages/OralDiseaseDetector";
import SkinDiseaseDetector from "./pages/SkinDiseaseDetector";

const queryClient = new QueryClient();

function AppContent() {
  const {
    conversations,
    activeConversationId,
    isCollapsed,
    setIsCollapsed,
    addConversation,
    setActiveConversationId,
    deleteConversation,
    updateConversation,
  } = useChat();

  const handleNewChat = () => {
    const newId = (conversations.length + 1).toString();
    addConversation({ id: newId, title: "New Chat", timestamp: "Just now", messages: [] });
    setActiveConversationId(newId);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    updateConversation(id, { title: newTitle });
  };

  return (
    <SidebarLayout
      isCollapsed={isCollapsed}
      onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      onNewChat={handleNewChat}
      onOpenSettings={() => {}}
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={setActiveConversationId}
      onDeleteConversation={deleteConversation}
      onRenameConversation={handleRenameConversation}
    >
      <Index />
    </SidebarLayout>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>                        {/* ← wraps everything */}
            <ChatProvider>
              <BrowserRouter>
                <Toaster />
                <Sonner />
                <Routes>
                  {/* ── Public routes ── */}
                  <Route path="/"       element={<Welcome />} />
                  <Route path="/auth"   element={<Auth />} />
                  <Route path="/verify" element={<OTPVerification />} />

                  {/* ── Protected routes (login required) ── */}
                  <Route path="/chat" element={
                    <ProtectedRoute><AppContent /></ProtectedRoute>
                  } />
                  <Route path="/health" element={
                    <ProtectedRoute><HealthData /></ProtectedRoute>
                  } />
                  <Route path="/dashboard/overview" element={
                    <ProtectedRoute><Overview /></ProtectedRoute>
                  } />
                  <Route path="/dashboard/analytics" element={
                    <ProtectedRoute><Analytics /></ProtectedRoute>
                  } />
                  <Route path="/dashboard/news" element={
                    <ProtectedRoute><NewsDash /></ProtectedRoute>
                  } />
                  <Route path="/dashboard/alerts" element={
                    <ProtectedRoute><AlertsDash /></ProtectedRoute>
                  } />
                  <Route path="/find-doctor" element={
                    <ProtectedRoute><FindDoctor /></ProtectedRoute>
                  } />
                  <Route path="/oral-detect" element={
                    <ProtectedRoute><OralDiseaseDetector /></ProtectedRoute>
                  } />
                  <Route path="/skin-detect" element={
                    <ProtectedRoute><SkinDiseaseDetector /></ProtectedRoute>
                  } />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ChatProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;