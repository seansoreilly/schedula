import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, User, Calendar, Clock } from "lucide-react";

interface AddAvailabilityProps {
  meetingId: string;
  onAvailabilityAdded: () => void;
}

const AddAvailability = ({ meetingId, onAvailabilityAdded }: AddAvailabilityProps) => {
  const [participantName, setParticipantName] = useState("");
  const [availableDate, setAvailableDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load name from localStorage on component mount
  useEffect(() => {
    const savedName = localStorage.getItem('schedulaUserName');
    if (savedName) {
      setParticipantName(savedName);
    }
  }, []);

  // Save name to localStorage whenever it changes
  useEffect(() => {
    if (participantName.trim()) {
      localStorage.setItem('schedulaUserName', participantName.trim());
    }
  }, [participantName]);

  // Auto-calculate end time when start time changes
  useEffect(() => {
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      
      // Add 30 minutes
      const endDate = new Date(startDate.getTime() + 30 * 60000);
      
      const endHours = endDate.getHours().toString().padStart(2, '0');
      const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
      setEndTime(`${endHours}:${endMinutes}`);
    }
  }, [startTime]);

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    return times;
  };

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
      const { error } = await supabase
        .from("availability")
        .insert({
          meeting_id: meetingId,
          participant_name: participantName.trim(),
          available_date: availableDate,
          start_time: startTime,
          end_time: endTime,
        });

      if (error) throw error;

      toast({
        title: "🎉 Availability Added!",
        description: "Your availability has been added successfully.",
      });

      // Reset form but keep name
      setAvailableDate(new Date().toISOString().split('T')[0]);
      setStartTime("");
      setEndTime("");
      
      onAvailabilityAdded();
    } catch (error) {
      console.error("Error adding availability:", error);
      toast({
        title: "Error",
        description: "Failed to add availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const timeOptions = generateTimeOptions();

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="text-3xl">🐱</div>
          <div>
            <Plus className="h-5 w-5 inline mr-2" />
            Add Your Availability
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-4 rounded-lg border-2 border-purple-100">
            <Label htmlFor="participantName" className="flex items-center gap-2 text-purple-700 font-semibold mb-2">
              <User className="h-4 w-4" />
              Your Name
            </Label>
            <Input
              id="participantName"
              type="text"
              placeholder="Enter your name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="border-purple-200 focus:border-purple-400 focus:ring-purple-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border-2 border-blue-100">
              <Label htmlFor="availableDate" className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                id="availableDate"
                type="date"
                value={availableDate}
                onChange={(e) => setAvailableDate(e.target.value)}
                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-green-100">
              <Label htmlFor="startTime" className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                <Clock className="h-4 w-4" />
                Start Time
              </Label>
              <select
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border-2 border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
              >
                <option value="">Select start time</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-orange-100">
              <Label htmlFor="endTime" className="flex items-center gap-2 text-orange-700 font-semibold mb-2">
                <Clock className="h-4 w-4" />
                End Time
              </Label>
              <select
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border-2 border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
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
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Adding...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
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
