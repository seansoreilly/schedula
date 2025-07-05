import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import CreateMeeting from "./components/CreateMeeting";
import MeetingView from "./components/MeetingView";
import NotFound from "./pages/NotFound";
import { Analytics } from "@vercel/analytics/react";
import { Building2, Calendar, Users, Clock } from "lucide-react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Analytics />
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          {/* Professional Header */}
          <header className="bg-white shadow-sm border-b border-slate-200">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-3 group">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2.5 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      Schedula
                    </h1>
                    <p className="text-xs text-slate-500 font-medium -mt-1">
                      Easy scheduling
                    </p>
                  </div>
                </Link>

                <nav className="hidden md:flex items-center space-x-6">
                  <div className="flex items-center space-x-4 text-sm text-slate-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Smart Scheduling</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>Team Coordination</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Real-time Updates</span>
                    </div>
                  </div>
                </nav>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-6 py-12">
            <Routes>
              <Route path="/" element={<CreateMeeting />} />
              <Route path="/meeting/:meetingId" element={<MeetingView />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          {/* Professional Footer */}
          <footer className="bg-slate-800 text-white mt-16">
            <div className="container mx-auto px-6 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Building2 className="h-5 w-5" />
                    <span className="font-semibold">Schedula</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Features</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li>• Smart availability matching</li>
                    <li>• Real-time collaboration</li>
                    <li>• Mobile-responsive design</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Can use for</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li>• Team meetings & standups</li>
                    <li>• Client presentations</li>
                    <li>• Interview scheduling</li>
                    <li>• Board meetings</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-slate-700 mt-8 pt-8 text-center">
                <p className="text-sm text-slate-400">
                  Easy multi-use scheduling platform.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
