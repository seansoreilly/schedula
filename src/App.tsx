import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreateMeeting from "./components/CreateMeeting";
import MeetingView from "./components/MeetingView";
import NotFound from "./pages/NotFound";
import { Analytics } from "@vercel/analytics/react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Analytics />
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<CreateMeeting />} />
              <Route path="/meeting/:meetingId" element={<MeetingView />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
