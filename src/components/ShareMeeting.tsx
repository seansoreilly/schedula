import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Share2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareMeetingProps {
  meetingId: string;
  meetingTitle?: string;
}

const ShareMeeting = ({
  meetingId,
  meetingTitle = "meeting",
}: ShareMeetingProps) => {
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
    // Check if Web Share API is supported (especially important for iOS)
    if (navigator.share && navigator.canShare) {
      const shareData = {
        title: `Join my ${meetingTitle}`,
        text: `Share your availability for this meeting`,
        url: meetingUrl,
      };

      // Check if the data can be shared (iOS requirement)
      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (error) {
          // User cancelled or share failed, fall back to copy
          console.log("Share cancelled or failed:", error);
        }
      }
    } else if (navigator.share) {
      // Fallback for browsers that have share but not canShare
      try {
        await navigator.share({
          title: `Join my ${meetingTitle}`,
          text: `Share your availability for this meeting`,
          url: meetingUrl,
        });
        return;
      } catch (error) {
        console.log("Share cancelled or failed:", error);
      }
    }

    // Fallback to copy
    handleCopyUrl();
  };

  return (
    <Card className="shadow-sm border border-slate-200 bg-white">
      <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold">
          <Share2 className="h-5 w-5" />
          Share This Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
          Share this link with team members so they can add their availability:
        </p>

        <div className="flex gap-2">
          <Input
            value={meetingUrl}
            readOnly
            className="font-mono text-sm border-slate-300 focus:border-slate-500"
          />
          <Button
            onClick={handleCopyUrl}
            variant="outline"
            size="icon"
            className="shrink-0 border-slate-300 hover:bg-slate-100"
            title="Copy link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          {/* iOS-optimized Share Button */}
          <Button
            onClick={handleShare}
            size="icon"
            className="shrink-0 bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition-colors duration-200"
            title="Share meeting"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShareMeeting;
