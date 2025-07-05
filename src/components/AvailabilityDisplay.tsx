import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const areParticipantArraysEqual = (
    arr1: string[],
    arr2: string[]
  ): boolean => {
    if (arr1.length !== arr2.length) return false;
    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();
    return sortedArr1.every((value, index) => value === sortedArr2[index]);
  };

  // Professional avatar color system
  const getAvatarColor = (participantName: string) => {
    const colors = [
      "bg-blue-500 text-white",
      "bg-emerald-500 text-white",
      "bg-purple-500 text-white",
      "bg-orange-500 text-white",
      "bg-pink-500 text-white",
      "bg-teal-500 text-white",
      "bg-indigo-500 text-white",
      "bg-red-500 text-white",
      "bg-yellow-500 text-black",
      "bg-green-500 text-white",
      "bg-cyan-500 text-white",
      "bg-rose-500 text-white",
    ];

    let hash = 0;
    for (let i = 0; i < participantName.length; i++) {
      hash = (hash << 5) - hash + participantName.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Get initials from participant name
  const getInitials = (name: string): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
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
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Team Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-8 text-slate-500">
            <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Calendar className="h-10 w-10 text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-700">
              No availability submitted yet
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Team members can add their availability above
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold">
          <Users className="h-5 w-5" />
          Team Availability ({availability.length} submissions)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div
              key={date}
              className="border-l-4 border-blue-500 pl-4 bg-slate-50/50 p-4 rounded-lg shadow-sm"
            >
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-slate-700">
                <Calendar className="h-4 w-4" />
                {formatDate(date)}
              </h3>
              <div className="space-y-2">
                {groupedAvailability[date]
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:shadow-sm transition-shadow"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={`text-sm font-semibold ${getAvatarColor(
                            item.participant_name
                          )}`}
                        >
                          {getInitials(item.participant_name)}
                        </AvatarFallback>
                      </Avatar>
                      <Badge
                        variant="secondary"
                        className="font-medium bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {item.participant_name}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-md ml-auto">
                        <Clock className="h-3 w-3" />
                        {formatTime(item.start_time)} -{" "}
                        {formatTime(item.end_time)}
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
            <h2 className="text-xl font-semibold mb-4 text-slate-700 flex items-center gap-2">
              <Users className="h-5 w-5" /> Overlapping Availability
            </h2>
            <div className="space-y-4">
              {processedCommonSlots.map((commonSlot, index) => (
                <div
                  key={`common-${index}-${commonSlot.date}`}
                  className="border-l-4 border-emerald-500 pl-4 bg-emerald-50/50 p-4 rounded-lg shadow-sm"
                >
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-slate-700">
                    <Calendar className="h-4 w-4" />
                    {formatDate(commonSlot.date)}
                  </h3>
                  <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-emerald-200">
                    <div className="flex -space-x-2">
                      {commonSlot.participants.map((name, idx) => (
                        <Avatar
                          key={`${name}-${idx}-avatar-common`}
                          className="h-8 w-8 ring-2 ring-white"
                        >
                          <AvatarFallback
                            className={`text-sm font-semibold ${getAvatarColor(
                              name
                            )}`}
                          >
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {commonSlot.participants.map((name) => (
                        <Badge
                          key={`${commonSlot.date}-${commonSlot.startTime}-${name}-common-badge`}
                          variant="secondary"
                          className="font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-md ml-auto">
                      <Clock className="h-3 w-3" />
                      {formatTime(commonSlot.startTime)} -{" "}
                      {formatTime(commonSlot.endTime)}
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
