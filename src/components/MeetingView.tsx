import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddAvailability from "./AddAvailability";
import AvailabilityDisplay from "./AvailabilityDisplay";
import ShareMeeting from "./ShareMeeting";
import { Calendar, Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Meeting {
  id: string;
  title: string;
  creator_name: string;
  created_at: string;
}

interface Availability {
  id: string;
  participant_name: string;
  available_date: string;
  start_time: string;
  end_time: string;
}

const MeetingView = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const { toast } = useToast();

  const fetchMeetingData = async () => {
    if (!meetingId) return;

    try {
      // Fetch meeting details
      const { data: meetingData, error: meetingError } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId)
        .single();

      if (meetingError) throw meetingError;
      setMeeting(meetingData);
      setEditedTitle(meetingData.title);

      // Fetch availability data
      const { data: availabilityData, error: availabilityError } =
        await supabase
          .from("availability")
          .select("*")
          .eq("meeting_id", meetingId)
          .order("available_date", { ascending: true })
          .order("start_time", { ascending: true });

      if (availabilityError) throw availabilityError;
      setAvailability(availabilityData || []);
    } catch (error) {
      console.error("Error fetching meeting data:", error);
      toast({
        title: "Error",
        description: "Failed to load meeting. Please check the URL.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleUpdate = async () => {
    if (!meeting || !editedTitle.trim()) return;

    try {
      const { error } = await supabase
        .from("meetings")
        .update({ title: editedTitle.trim() })
        .eq("id", meeting.id);

      if (error) throw error;

      setMeeting({ ...meeting, title: editedTitle.trim() });
      setIsEditingTitle(false);
      toast({
        title: "Title Updated Successfully",
        description: "Meeting title has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating title:", error);
      toast({
        title: "Error",
        description: "Failed to update title. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(meeting?.title || "");
    setIsEditingTitle(false);
  };

  useEffect(() => {
    fetchMeetingData();
  }, [meetingId]);

  const handleAvailabilityAdded = () => {
    fetchMeetingData(); // Refresh data when new availability is added
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 font-medium">
              Loading meeting details...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <Calendar className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Meeting Not Found
            </h3>
            <p className="text-slate-600">
              The meeting you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Meeting Header */}
      <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-2xl font-bold bg-white/20 border-white/30 text-white placeholder-white/70 focus:bg-white/30"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTitleUpdate();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <Button
                    onClick={handleTitleUpdate}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <CardTitle className="text-3xl font-bold">
                    {meeting.title}
                  </CardTitle>
                  <Button
                    onClick={() => setIsEditingTitle(true)}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-blue-100 mt-2 text-lg font-medium">
                Organized by {meeting.creator_name}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Share Meeting */}
      <ShareMeeting meetingId={meeting.id} />

      {/* Add Availability */}
      <AddAvailability
        meetingId={meeting.id}
        onAvailabilityAdded={handleAvailabilityAdded}
      />

      {/* Display Availability */}
      <AvailabilityDisplay availability={availability} />
    </div>
  );
};

export default MeetingView;
