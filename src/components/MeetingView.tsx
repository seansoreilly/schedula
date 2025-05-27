
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddAvailability from "./AddAvailability";
import AvailabilityDisplay from "./AvailabilityDisplay";
import ShareMeeting from "./ShareMeeting";
import { Calendar } from "lucide-react";

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

      // Fetch availability data
      const { data: availabilityData, error: availabilityError } = await supabase
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

  useEffect(() => {
    fetchMeetingData();
  }, [meetingId]);

  const handleAvailabilityAdded = () => {
    fetchMeetingData(); // Refresh data when new availability is added
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading meeting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Meeting not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Meeting Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle className="text-2xl">{meeting.title}</CardTitle>
              <p className="text-gray-600 mt-1">Created by {meeting.creator_name}</p>
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
