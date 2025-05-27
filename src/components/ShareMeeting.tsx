
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
        title: "🎉 Link Copied!",
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
    <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="text-3xl">📤</div>
          <div>
            <Share2 className="h-5 w-5 inline mr-2" />
            Share This Meeting
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <p className="text-gray-600 text-sm bg-white p-3 rounded-lg border border-cyan-100">
          <span className="text-2xl mr-2">💡</span>
          Share this link with others so they can add their availability:
        </p>
        
        <div className="flex gap-2">
          <Input
            value={meetingUrl}
            readOnly
            className="font-mono text-sm border-2 border-cyan-200 focus:border-cyan-400"
          />
          <Button
            onClick={handleCopyUrl}
            variant="outline"
            size="icon"
            className="shrink-0 border-2 border-cyan-200 hover:bg-cyan-100"
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
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
        >
          <Share2 className="h-4 w-4 mr-2" />
          <span className="text-xl mr-2">🚀</span>
          Share Meeting
        </Button>
      </CardContent>
    </Card>
  );
};

export default ShareMeeting;
