import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { availabilityQueries } from "@/integrations/api/queries";
import { useToast } from "@/hooks/use-toast";
import { classifyError, track } from "@/lib/analytics";
import {
  createTimeOptions,
  getAvailabilityDefaults,
  toLocalDateInputValue,
} from "@/lib/availability";
import { Plus, User, Calendar, Clock } from "lucide-react";

const timeOptions = createTimeOptions();

interface AddAvailabilityProps {
  meetingId: string;
  onAvailabilityAdded: () => void;
}

/** Length of an HH:MM time range in minutes. */
const minutesBetween = (start: string, end: string): number => {
  const toMinutes = (t: string): number => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return toMinutes(end) - toMinutes(start);
};

const AddAvailability = ({
  meetingId,
  onAvailabilityAdded,
}: AddAvailabilityProps) => {
  const [initialDefaults] = useState(getAvailabilityDefaults);
  const [participantName, setParticipantName] = useState("");
  const [availableDate, setAvailableDate] = useState(initialDefaults.availableDate);
  const [startTime, setStartTime] = useState(initialDefaults.startTime);
  const [endTime, setEndTime] = useState(initialDefaults.endTime);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load name from localStorage on component mount
  useEffect(() => {
    const savedName = localStorage.getItem("schedulaUserName");
    if (savedName) {
      setParticipantName(savedName);
    }
  }, []);

  // Save name to localStorage whenever it changes
  useEffect(() => {
    if (participantName.trim()) {
      localStorage.setItem("schedulaUserName", participantName.trim());
    }
  }, [participantName]);

  // Auto-calculate end time when start time changes
  useEffect(() => {
    if (startTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);

      // Add 30 minutes
      const endDate = new Date(startDate.getTime() + 30 * 60000);

      const endHours = endDate.getHours().toString().padStart(2, "0");
      const endMinutes = endDate.getMinutes().toString().padStart(2, "0");
      setEndTime(`${endHours}:${endMinutes}`);
    }
  }, [startTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!participantName.trim() || !availableDate || !startTime || !endTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: "Invalid Time Range",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await availabilityQueries.create({
        meeting_id: meetingId,
        participant_name: participantName.trim(),
        available_date: availableDate,
        start_time: startTime,
        end_time: endTime,
      });

      track("availability_added", {
        duration_minutes: minutesBetween(startTime, endTime),
      });

      toast({
        title: "Availability Added Successfully",
        description: "Your availability has been recorded for this meeting.",
      });

      // Reset the range but preserve the participant name.
      const defaults = getAvailabilityDefaults();
      setAvailableDate(defaults.availableDate);
      setStartTime(defaults.startTime);
      setEndTime(defaults.endTime);

      onAvailabilityAdded();
    } catch (error) {
      console.error("Error adding availability:", error);
      track("availability_add_error", { error_type: classifyError(error) });
      toast({
        title: "Error",
        description: "Failed to add availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm border border-slate-200 bg-white">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <Label
              htmlFor="participantName"
              className="flex items-center gap-2 text-slate-700 font-semibold mb-2"
            >
              <User className="h-4 w-4" />
              Your Name
            </Label>
            <Input
              id="participantName"
              type="text"
              placeholder="Enter your name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <Label
                htmlFor="availableDate"
                className="flex items-center gap-2 text-slate-700 font-semibold mb-2"
              >
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                id="availableDate"
                type="date"
                value={availableDate}
                onChange={(e) => setAvailableDate(e.target.value)}
                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                min={toLocalDateInputValue(new Date())}
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <Label
                htmlFor="startTime"
                className="flex items-center gap-2 text-slate-700 font-semibold mb-2"
              >
                <Clock className="h-4 w-4" />
                Start Time
              </Label>
              <select
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select start time</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <Label
                htmlFor="endTime"
                className="flex items-center gap-2 text-slate-700 font-semibold mb-2"
              >
                <Clock className="h-4 w-4" />
                End Time
              </Label>
              <select
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Auto-filled (+30 min)</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-lg shadow-md transition-colors duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Adding Availability...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add My Availability
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddAvailability;
