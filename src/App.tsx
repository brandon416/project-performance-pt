import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { SheetInbox } from "./components/SheetInbox";
import { AIChat } from "./components/AIChat";
import { AIExerciseCreator } from "./components/AIExerciseCreator";
import { TrueCoachDashboard } from "./components/TrueCoachDashboard";
import { AutomationDashboard } from "./components/AutomationDashboard";
import {
  Activity,
  Bot,
  FileSpreadsheet,
  Dumbbell,
  Zap,
  LogOut,
  LogIn,
  Link,
} from "lucide-react";

type Tab = "inbox" | "chat" | "creator" | "truecoach" | "automation";

export default function App() {
  const { user, loading, googleTokens, signIn, signOut, connectGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("inbox");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Activity className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Project Performance PT</h1>
          <p className="text-muted-foreground">Clinical Command Center</p>
        </div>
        <button
          onClick={signIn}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "inbox", label: "Sheet Inbox", icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: "chat", label: "AI Chat", icon: <Bot className="w-4 h-4" /> },
    { id: "creator", label: "Exercise Creator", icon: <Dumbbell className="w-4 h-4" /> },
    { id: "truecoach", label: "TrueCoach", icon: <Activity className="w-4 h-4" /> },
    { id: "automation", label: "Automation", icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">Project Performance PT</h1>
        </div>
        <div className="flex items-center gap-3">
          {!googleTokens && (
            <button
              onClick={connectGoogle}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground hover:opacity-80 transition"
            >
              <Link className="w-4 h-4" />
              Connect Google
            </button>
          )}
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <button
            onClick={signOut}
            className="p-2 rounded-md hover:bg-secondary transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Nav Tabs */}
      <nav className="border-b border-border px-6 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {activeTab === "inbox" && <SheetInbox />}
        {activeTab === "chat" && <AIChat />}
        {activeTab === "creator" && <AIExerciseCreator />}
        {activeTab === "truecoach" && <TrueCoachDashboard />}
        {activeTab === "automation" && <AutomationDashboard />}
      </main>
    </div>
  );
}
