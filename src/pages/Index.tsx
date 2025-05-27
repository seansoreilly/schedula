
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreateMeeting from "@/components/CreateMeeting";
import MeetingView from "@/components/MeetingView";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<CreateMeeting />} />
          <Route path="/meeting/:meetingId" element={<MeetingView />} />
        </Routes>
      </div>
    </div>
  );
};

export default Index;
