import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddAvailability from "./AddAvailability";
import AvailabilityDisplay from "./AvailabilityDisplay";
import ShareMeeting from "./ShareMeeting";
import {
  Calendar,
  Edit3,
  Check,
  X,
  Users,
  Clock,
  Building2,
} from "lucide-react";
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
        title: "Meeting Title Updated",
        description: "The meeting title has been successfully updated.",
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
      <div className="max-w-6xl mx-auto">
        <Card className="shadow-lg border border-slate-200 bg-white">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-6 text-slate-600 font-medium text-lg">
              Loading your meeting space...
            </p>
            <p className="mt-2 text-slate-500 text-sm">
              Preparing coordination tools and availability data
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg border border-slate-200 bg-white">
          <CardContent className="p-12 text-center">
            <div className="text-slate-400 mb-6">
              <Calendar className="h-20 w-20 mx-auto" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-800 mb-4">
              Meeting Not Found
            </h3>
            <p className="text-slate-600 text-lg leading-relaxed max-w-md mx-auto">
              The meeting you're looking for doesn't exist or has been removed.
              Please check the URL or contact the meeting organizer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Professional Meeting Header */}
      <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden">
        <CardHeader className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />

          <div className="relative flex items-center gap-6">
            <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
              <Calendar className="h-10 w-10 text-white" />
            </div>

            <div className="flex-1">
              {isEditingTitle ? (
                <div className="flex items-center gap-3">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-3xl font-bold bg-white/10 border-white/20 text-white placeholder-white/70 focus:bg-white/20 h-auto py-3"
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
                    className="text-white hover:bg-white/10 p-2"
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10 p-2"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="group">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-3xl lg:text-4xl font-bold">
                      {meeting.title}
                    </CardTitle>
                    <Button
                      onClick={() => setIsEditingTitle(true)}
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                    >
                      <Edit3 className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-6 mt-4 text-white/90">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">
                        Organized by {meeting.creator_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        Created{" "}
                        {new Date(meeting.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>
                        {availability.length} participant
                        {availability.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
