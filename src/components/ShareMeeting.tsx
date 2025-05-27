
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
        title: "Link Copied!",
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share This Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 text-sm">
          Share this link with others so they can add their availability:
        </p>
        
        <div className="flex gap-2">
          <Input
            value={meetingUrl}
            readOnly
            className="font-mono text-sm"
          />
          <Button
            onClick={handleCopyUrl}
            variant="outline"
            size="icon"
            className="shrink-0"
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
          className="w-full"
          variant="default"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Meeting
        </Button>
      </CardContent>
    </Card>
  );
};

export default ShareMeeting;
