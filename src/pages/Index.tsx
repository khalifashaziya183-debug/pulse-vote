import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PollCard } from "@/components/PollCard";
import { CreatePollDialog } from "@/components/CreatePollDialog";
import { Button } from "@/components/ui/button";
import { LogOut, Radio } from "lucide-react";

type Poll = { id: string; question: string; creator_id: string; created_at: string };

const Index = () => {
  const { user, loading } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => { document.title = "PulseVote · Real-time polls"; }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("polls").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setPolls(data ?? []));

    const ch = supabase
      .channel("polls-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => {
        supabase.from("polls").select("*").order("created_at", { ascending: false })
          .then(({ data }) => setPolls(data ?? []));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono">loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <main className="min-h-screen">
      <header className="border-b border-border/50 backdrop-blur sticky top-0 z-10 bg-background/70">
        <div className="container max-w-4xl flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className="w-6 h-6 text-primary" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent pulse-dot" />
            </div>
            <h1 className="text-xl font-bold">Pulse<span className="text-gradient">Vote</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <CreatePollDialog userId={user.id} />
            <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()} title="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="container max-w-4xl py-10">
        <div className="mb-10">
          <p className="font-mono text-xs text-primary mb-2">// LIVE FEED</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Vote. Watch results <span className="text-gradient">pulse</span>.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl">
            Every vote streams in real time. Tap an option to switch your choice — results update instantly across every connected device.
          </p>
        </div>

        {polls.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground mb-4">No polls yet. Be the first to ask something.</p>
            <CreatePollDialog userId={user.id} />
          </div>
        ) : (
          <div className="grid gap-4">
            {polls.map(p => <PollCard key={p.id} poll={p} userId={user.id} />)}
          </div>
        )}
      </section>
    </main>
  );
};

export default Index;
