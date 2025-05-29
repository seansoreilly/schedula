import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";
        import { useState, useEffect } from "react";

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

interface CommonAvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  participants: string[];
}

const AvailabilityDisplay = ({ availability }: AvailabilityDisplayProps) => {
  const [processedCommonSlots, setProcessedCommonSlots] = useState<
    CommonAvailabilitySlot[]
  >([]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper function to convert HH:MM string to minutes since midnight
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to convert minutes since midnight to HH:MM string
  const minutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

  // Helper function to check if two arrays of participant names are identical
  const areParticipantArraysEqual = (
    arr1: string[],
    arr2: string[]
  ): boolean => {
    if (arr1.length !== arr2.length) return false;
    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();
    return sortedArr1.every((value, index) => value === sortedArr2[index]);
  };

  // Get avatar icon for each unique participant
  const getAvatarIcon = (participantName: string) => {
    const avatars = [
      "😸",
      "🐶",
      "🐰",
      "🦊",
      "🐼",
      "🐨",
      "🐸",
      "🐵",
      "🦁",
      "🐯",
      "🐷",
      "🐮",
    ];
    const uniqueParticipants = [
      ...new Set(availability.map((a) => a.participant_name)),
    ];
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

  // List of emojis for participants
  const emojiList = [
    "🐶",
    "🐱",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
    "🐷",
    "🐸",
    "🐒",
    "🐔",
    "🐧",
    "🐦",
  ];
  const defaultEmoji = "🐾"; // Using a paw print as a default for pets

  // Function to get a consistent emoji for a participant name
  const getEmojiForName = (name: string): string => {
    if (!name) return defaultEmoji;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % emojiList.length;
    return emojiList[index];
  };

  useEffect(() => {
    if (availability.length < 2) {
      setProcessedCommonSlots([]);
      return;
    }

    const newCommonSlots: CommonAvailabilitySlot[] = [];

    // Group availability by date first
    const availabilityByDate = availability.reduce((acc, item) => {
      const date = item.available_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(item);
      return acc;
    }, {} as Record<string, Availability[]>);

    Object.keys(availabilityByDate).forEach((date) => {
      const dailyAvailability = availabilityByDate[date];
      if (dailyAvailability.length < 2) return;

      const timePoints = new Set<number>();
      dailyAvailability.forEach((slot) => {
        timePoints.add(timeToMinutes(slot.start_time));
        timePoints.add(timeToMinutes(slot.end_time));
      });

      const sortedTimePoints = Array.from(timePoints).sort((a, b) => a - b);
      const elementarySlots: CommonAvailabilitySlot[] = [];

      for (let i = 0; i < sortedTimePoints.length - 1; i++) {
        const intervalStart = sortedTimePoints[i];
        const intervalEnd = sortedTimePoints[i + 1];

        if (intervalStart === intervalEnd) continue;

        const participantsInInterval: string[] = [];
        dailyAvailability.forEach((slot) => {
          const slotStart = timeToMinutes(slot.start_time);
          const slotEnd = timeToMinutes(slot.end_time);
          if (slotStart <= intervalStart && slotEnd >= intervalEnd) {
            participantsInInterval.push(slot.participant_name);
          }
        });

        if (participantsInInterval.length >= 2) {
          elementarySlots.push({
            date: date,
            startTime: minutesToTime(intervalStart),
            endTime: minutesToTime(intervalEnd),
            participants: [...new Set(participantsInInterval)].sort(),
          });
        }
      }

      if (elementarySlots.length > 0) {
        let currentMergedSlot = { ...elementarySlots[0] };
        for (let i = 1; i < elementarySlots.length; i++) {
          const nextSlot = elementarySlots[i];
          if (
            nextSlot.startTime === currentMergedSlot.endTime &&
            areParticipantArraysEqual(
              nextSlot.participants,
              currentMergedSlot.participants
            )
          ) {
            currentMergedSlot.endTime = nextSlot.endTime;
          } else {
            newCommonSlots.push(currentMergedSlot);
            currentMergedSlot = { ...nextSlot };
          }
        }
        newCommonSlots.push(currentMergedSlot);
      }
    });
    // Sort common slots by date and then by start time
    newCommonSlots.sort((a, b) => {
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
    setProcessedCommonSlots(newCommonSlots);
  }, [availability]);

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
            <div
              key={date}
              className="border-l-4 border-green-500 pl-4 bg-white p-4 rounded-lg shadow-sm"
            >
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
                        <div className="text-2xl">
                          {getEmojiForName(item.participant_name)}
                        </div>
                        <Badge
                          variant="secondary"
                          className="font-medium bg-green-200 text-green-800 border border-green-300"
                        >
                          {item.participant_name}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-600 bg-white px-2 py-1 rounded border">
                          <Clock className="h-3 w-3" />
                          {formatTime(item.start_time)} -{" "}
                          {formatTime(item.end_time)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Display Common Availability Slots */}
        {processedCommonSlots.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-700 flex items-center gap-2">
              <Users className="h-6 w-6" /> Common Availability Slots
            </h2>
            <div className="space-y-6">
              {processedCommonSlots.map((commonSlot, index) => (
                <div
                  key={`common-${index}-${commonSlot.date}`}
                  className="border-l-4 border-blue-500 pl-4 bg-white p-4 rounded-lg shadow-sm"
                >
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-blue-700">
                    <Calendar className="h-4 w-4" />
                    {formatDate(commonSlot.date)}
                  </h3>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-100 to-sky-100 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 flex-wrap">
                      {" "}
                      {/* Added flex-wrap */}
                      <div className="flex -space-x-2 overflow-hidden">
                        {commonSlot.participants.map((name, idx) => (
                          <span
                            key={`${name}-${idx}-emoji-common`}
                            className="text-2xl inline-block ring-2 ring-white rounded-full"
                            title={name}
                          >
                            {getEmojiForName(name)}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {commonSlot.participants.map((name) => (
                          <Badge
                            key={`${commonSlot.date}-${commonSlot.startTime}-${name}-common-badge`}
                            variant="secondary"
                            className="font-medium bg-blue-200 text-blue-800 border border-blue-300"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 bg-white px-2 py-1 rounded border">
                        <Clock className="h-3 w-3" />
                        {formatTime(commonSlot.startTime)} -{" "}
                        {formatTime(commonSlot.endTime)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailabilityDisplay;
