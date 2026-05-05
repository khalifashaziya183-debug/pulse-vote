import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export function CreatePollDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  const setOpt = (i: number, v: string) => setOptions(options.map((o, idx) => idx === i ? v : o));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) {
      toast.error("Need a question and at least 2 options");
      return;
    }
    setBusy(true);
    try {
      const { data: poll, error } = await supabase
        .from("polls")
        .insert({ question: question.trim(), creator_id: userId })
        .select().single();
      if (error) throw error;
      const { error: optErr } = await supabase
        .from("poll_options")
        .insert(cleaned.map((option_text, position) => ({ poll_id: poll.id, option_text, position })));
      if (optErr) throw optErr;
      toast.success("Poll launched");
      setOpen(false);
      setQuestion(""); setOptions(["", ""]);
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2">
          <Plus className="w-4 h-4" /> New Poll
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create a poll</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What's your favorite..." />
          </div>
          <div className="space-y-2">
            <Label>Options</Label>
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                {options.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setOptions(options.filter((_, idx) => idx !== i))}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 8 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setOptions([...options, ""])} className="gap-1">
                <Plus className="w-3 h-3" /> Add option
              </Button>
            )}
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            {busy ? "Launching..." : "Launch poll"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
