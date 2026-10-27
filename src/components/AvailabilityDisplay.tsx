import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";
import { useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Availability } from "@/integrations/api/types";
import {
  findCommonAvailabilitySlots,
  formatDateLabel,
  formatTimeLabel,
  groupAvailabilityByDate,
} from "@/lib/availability";

interface AvailabilityDisplayProps {
  availability: Availability[];
}

const AvailabilityDisplay = ({ availability }: AvailabilityDisplayProps) => {
  // Professional avatar color system
  const getAvatarColor = (participantName: string): string => {
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

  const days = useMemo(() => groupAvailabilityByDate(availability), [availability]);
  const processedCommonSlots = useMemo(
    () => findCommonAvailabilitySlots(availability),
    [availability]
  );

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
          {days.map(({ date, entries }) => (
            <div
              key={date}
              className="border-l-4 border-blue-500 pl-4 bg-slate-50/50 p-4 rounded-lg shadow-sm"
            >
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-slate-700">
                <Calendar className="h-4 w-4" />
                {formatDateLabel(date)}
              </h3>
              <div className="space-y-2">
                {entries.map((item) => (
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
                        {formatTimeLabel(item.start_time)} -{" "}
                        {formatTimeLabel(item.end_time)}
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
                    {formatDateLabel(commonSlot.date)}
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
                      {formatTimeLabel(commonSlot.startTime)} -{" "}
                      {formatTimeLabel(commonSlot.endTime)}
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
