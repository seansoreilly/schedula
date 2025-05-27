
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
          <Calendar className="h-8 w-8 text-blue-600 mr-2" />
          <h1 className="text-3xl font-bold text-gray-900">Schedula</h1>
        </div>
        <p className="text-gray-600">Find the perfect time for everyone</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-center">Create New Meeting</CardTitle>
        </CardHeader>
        <CardContent>
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
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Meeting"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMeeting;
