import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  Users,
  Building2,
  CheckCircle,
  Zap,
  Shield,
  Globe,
  LogIn,
} from "lucide-react";

const CreateMeeting = () => {
  const [title, setTitle] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !creatorName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both meeting title and your name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("meetings")
        .insert({
          title: title.trim(),
          creator_name: creatorName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Meeting Created Successfully!",
        description: "Your meeting space is ready for coordination.",
      });

      navigate(`/meeting/${data.id}`);
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Column - Hero Content */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
                <span className="text-blue-700 font-medium text-sm">
                  Easy-to-use scheduling
                </span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                Streamline Your
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {" "}
                  Team Coordination
                </span>
              </h1>

              <p className="text-xl text-slate-600 leading-relaxed">
                Eliminate scheduling conflicts and reduce coordination time by
                70% with our intelligent meeting orchestration platform.
              </p>
            </div>

            {/* Feature Highlights */}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <LogIn className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-slate-700 font-medium">
                  No login required
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-slate-700 font-medium">
                  Easy Availability Matching
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-slate-700 font-medium">
                  Instant meeting creation
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Globe className="h-5 w-5 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium">
                  Cross-Platform Access
                </span>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-slate-900">70%</div>
                  <div className="text-sm text-slate-600">Time Saved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">25%</div>
                  <div className="text-sm text-slate-600">
                    Better Attendance
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">99.9%</div>
                  <div className="text-sm text-slate-600">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Meeting Creation Form */}
        <div className="space-y-6">
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            {/* <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="text-xl text-center font-semibold flex items-center justify-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Calendar className="h-6 w-6" />
                </div>
                Create meeting
              </CardTitle>
            </CardHeader> */}

            <CardContent className="p-8">
              <form onSubmit={handleCreateMeeting} className="space-y-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="title"
                    className="flex items-center gap-2 text-slate-700 font-semibold text-base"
                  >
                    <div className="bg-blue-50 p-1.5 rounded-md">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    Meeting Title
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., Q4 Strategy Review, Client Onboarding Session"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg text-lg"
                  />
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="creatorName"
                    className="flex items-center gap-2 text-slate-700 font-semibold text-base"
                  >
                    <div className="bg-green-50 p-1.5 rounded-md">
                      <Building2 className="h-4 w-4 text-green-600" />
                    </div>
                    Organizer
                  </Label>
                  <Input
                    id="creatorName"
                    type="text"
                    placeholder="Enter your full name or title"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg text-lg"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-8 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating Meeting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Create Meeting</span>
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Start Guide */}
          <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                How It Works
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">Create Meeting</p>
                    <p className="text-sm text-slate-600">
                      Set up your meeting with unique link
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">Share Link</p>
                    <p className="text-sm text-slate-600">
                      Invite participants via URL
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      Find Optimal Time
                    </p>
                    <p className="text-sm text-slate-600">
                      Availability matches are displayed
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateMeeting;
