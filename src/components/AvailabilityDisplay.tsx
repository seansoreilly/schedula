
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";

interface Availability {
  id: string;
  participant_name: string;
  available_date: string;
  start_time: string;
  end_time: string;
}

interface AvailabilityDisplayProps {
  availability: Availability[];
}

const AvailabilityDisplay = ({ availability }: AvailabilityDisplayProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get avatar icon for each unique participant
  const getAvatarIcon = (participantName: string) => {
    const avatars = ['😸', '🐶', '🐰', '🦊', '🐼', '🐨', '🐸', '🐵', '🦁', '🐯', '🐷', '🐮'];
    const uniqueParticipants = [...new Set(availability.map(a => a.participant_name))];
    const index = uniqueParticipants.indexOf(participantName);
    return avatars[index % avatars.length];
  };

  // Group availability by date
  const groupedAvailability = availability.reduce((acc, item) => {
    const date = item.available_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, Availability[]>);

  const sortedDates = Object.keys(groupedAvailability).sort();

  if (availability.length === 0) {
    return (
      <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="text-3xl">👥</div>
            <div>
              <Users className="h-5 w-5 inline mr-2" />
              Availability
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-8 text-gray-500">
            <div className="text-8xl mb-4">😺</div>
            <p className="text-lg font-semibold">No availability added yet.</p>
            <p className="text-sm">Be the first to share your availability!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="text-3xl">📅</div>
          <div>
            <Users className="h-5 w-5 inline mr-2" />
            Availability ({availability.length} entries)
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date} className="border-l-4 border-green-500 pl-4 bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-green-700">
                <Calendar className="h-4 w-4" />
                {formatDate(date)}
              </h3>
              <div className="space-y-3">
                {groupedAvailability[date]
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getAvatarIcon(item.participant_name)}</div>
                        <Badge variant="secondary" className="font-medium bg-green-200 text-green-800 border border-green-300">
                          {item.participant_name}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-600 bg-white px-2 py-1 rounded border">
                          <Clock className="h-3 w-3" />
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailabilityDisplay;
