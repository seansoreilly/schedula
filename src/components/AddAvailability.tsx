import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { parseAvailabilityDraft } from "@/integrations/api/types";
import type { AvailabilityDraft } from "@/integrations/api/types";
import { useToast } from "@/hooks/use-toast";
import {
  createEndTimeOptions,
  createStartTimeOptions,
  defaultEndTime,
  getAvailabilityDefaults,
  todayDateInputValue,
} from "@/lib/availability";
import { describeDraftFailure, describeSubmitError } from "@/lib/form-feedback";
import { Plus, User, Calendar, Clock } from "lucide-react";

const startTimeOptions = createStartTimeOptions();
const endTimeOptions = createEndTimeOptions();

interface AddAvailabilityProps {
  meetingId: string;
  onSubmit: (draft: AvailabilityDraft) => Promise<void>;
}

const AddAvailability = ({ meetingId, onSubmit }: AddAvailabilityProps) => {
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
      setEndTime(defaultEndTime(startTime));
    }
  }, [startTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = parseAvailabilityDraft({
      meeting_id: meetingId,
      participant_name: participantName,
      available_date: availableDate,
      start_time: startTime,
      end_time: endTime,
    });
    if (!parsed.ok) {
      toast({ ...describeDraftFailure(parsed), variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit(parsed.value);

      toast({
        title: "Availability Added Successfully",
        description: "Your availability has been recorded for this meeting.",
      });

      // Reset the range but preserve the participant name.
      const defaults = getAvailabilityDefaults();
      setAvailableDate(defaults.availableDate);
      setStartTime(defaults.startTime);
      setEndTime(defaults.endTime);
    } catch (error) {
      console.error("Error adding availability:", error);
      toast({
        ...describeSubmitError(error, "Failed to add availability. Please try again."),
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
                min={todayDateInputValue()}
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
                {startTimeOptions.map((time) => (
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
                {endTimeOptions.map((time) => (
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
