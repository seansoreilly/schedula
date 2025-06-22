import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users } from "lucide-react";

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
        title: "Meeting Created!",
        description: "Your meeting has been created successfully.",
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
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Calendar className="h-10 w-10 text-blue-700 mr-3" />
          <h1 className="text-4xl font-bold text-slate-800">Schedula</h1>
        </div>
        <p className="text-slate-600 text-lg font-medium">
          Professional Meeting Coordination Platform
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Streamline scheduling and eliminate coordination complexity
        </p>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <CardTitle className="text-xl text-center font-semibold">
            Create New Meeting
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleCreateMeeting} className="space-y-4">
            <div>
              <Label htmlFor="title" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Meeting Title
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="Team standup, Coffee chat, etc."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="creatorName" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Your Name
              </Label>
              <Input
                id="creatorName"
                type="text"
                placeholder="Enter your name"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Creating Meeting..." : "Create Meeting"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMeeting;
