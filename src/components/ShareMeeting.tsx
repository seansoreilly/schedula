import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Share2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareMeetingProps {
  meetingId: string;
}

const ShareMeeting = ({ meetingId }: ShareMeetingProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const meetingUrl = `${window.location.origin}/meeting/${meetingId}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      toast({
        title: "Link Copied Successfully",
        description: "Meeting link has been copied to your clipboard.",
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my meeting",
          text: "Share your availability for this meeting",
          url: meetingUrl,
        });
      } catch (error) {
        // User cancelled the share or it failed
        handleCopyUrl();
      }
    } else {
      handleCopyUrl();
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold">
          <div className="bg-white/20 p-2 rounded-lg">
            <Share2 className="h-6 w-6" />
          </div>
          <div>Share This Meeting</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
          Share this link with participants so they can add their availability:
        </p>

        <div className="flex gap-2">
          <Input
            value={meetingUrl}
            readOnly
            className="font-mono text-sm border-slate-300 focus:border-blue-500"
          />
          <Button
            onClick={handleCopyUrl}
            variant="outline"
            size="icon"
            className="shrink-0 border-slate-300 hover:bg-slate-100"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Button
          onClick={handleShare}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 text-lg shadow-md transition-colors duration-200"
        >
          <Share2 className="h-5 w-5 mr-2" />
          Share Meeting
        </Button>
      </CardContent>
    </Card>
  );
};

export default ShareMeeting;
