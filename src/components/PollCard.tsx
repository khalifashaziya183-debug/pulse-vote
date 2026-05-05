import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Option = { id: string; option_text: string; position: number };
type Vote = { id: string; option_id: string; user_id: string };
type Poll = { id: string; question: string; creator_id: string; created_at: string };

export function PollCard({ poll, userId }: { poll: Poll; userId: string }) {
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [{ data: o }, { data: v }] = await Promise.all([
        supabase.from("poll_options").select("*").eq("poll_id", poll.id).order("position"),
        supabase.from("votes").select("*").eq("poll_id", poll.id),
      ]);
      if (!active) return;
      setOptions(o ?? []);
      setVotes(v ?? []);
    };
    load();

    const ch = supabase
      .channel(`poll-${poll.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `poll_id=eq.${poll.id}` },
        () => supabase.from("votes").select("*").eq("poll_id", poll.id).then(({ data }) => setVotes(data ?? [])))
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_options", filter: `poll_id=eq.${poll.id}` },
        () => supabase.from("poll_options").select("*").eq("poll_id", poll.id).order("position").then(({ data }) => setOptions(data ?? [])))
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [poll.id]);

  const total = votes.length;
  const myVote = votes.find(v => v.user_id === userId);

  const vote = async (optionId: string) => {
    setBusy(true);
    try {
      if (myVote) {
        if (myVote.option_id === optionId) {
          await supabase.from("votes").delete().eq("id", myVote.id);
        } else {
          await supabase.from("votes").update({ option_id: optionId }).eq("id", myVote.id);
        }
      } else {
        const { error } = await supabase.from("votes").insert({ poll_id: poll.id, option_id: optionId, user_id: userId });
        if (error) throw error;
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const deletePoll = async () => {
    if (!confirm("Delete this poll?")) return;
    const { error } = await supabase.from("polls").delete().eq("id", poll.id);
    if (error) toast.error(error.message);
  };

  return (
    <article className="animate-slide-up bg-card/80 backdrop-blur border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors">
      <header className="flex items-start justify-between gap-4 mb-5">
        <h3 className="text-xl font-semibold leading-tight">{poll.question}</h3>
        {poll.creator_id === userId && (
          <Button variant="ghost" size="icon" onClick={deletePoll} className="text-muted-foreground hover:text-destructive shrink-0">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </header>

      <div className="space-y-2">
        {options.map(opt => {
          const count = votes.filter(v => v.option_id === opt.id).length;
          const pct = total ? Math.round((count / total) * 100) : 0;
          const selected = myVote?.option_id === opt.id;
          return (
            <button
              key={opt.id}
              disabled={busy}
              onClick={() => vote(opt.id)}
              className={`group relative w-full text-left rounded-xl border overflow-hidden transition-all ${
                selected ? "border-primary glow" : "border-border hover:border-primary/50"
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: selected
                    ? "linear-gradient(90deg, hsl(var(--primary) / 0.35), hsl(var(--primary) / 0.15))"
                    : "hsl(var(--secondary))",
                }}
              />
              <div className="relative flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 font-medium">
                  {selected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  {opt.option_text}
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  {count} · <span className="text-foreground font-semibold">{pct}%</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <footer className="mt-4 flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
        LIVE · {total} {total === 1 ? "vote" : "votes"}
      </footer>
    </article>
  );
}
