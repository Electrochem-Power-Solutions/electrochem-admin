'use client';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
type FeedbackState = {
  isCorrect?: boolean;
  note: string;
  saved?: boolean;
  saving?: boolean;
};

type ChatTurn = {
  id: string;
  question: string;
  isHumanNeeded: boolean;
  aiReply: string;
  topScore?: number;
  hybridConfidence?: number;
  reason?: string;
  
  triageFeedback: FeedbackState;
  replyFeedback: FeedbackState;
};

export default function SimpleRagTestPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setLoading(true);

    const history = turns.flatMap((t) => [
      { role: 'user', content: t.question },
      { role: 'assistant', content: t.aiReply },
    ]);

    try {
      const res = await fetch('/api/rag-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, history }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          question,
          isHumanNeeded: data.isHumanNeeded,
          aiReply: data.reply,
          topScore: data.topScore,
            hybridConfidence: data.hybridConfidence,
            reason: data.reason,
          triageFeedback: { note: '' },
          replyFeedback: { note: '' },
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message.Try again.');
    } finally {
      setLoading(false);
    }
  }

  function selectRating(
    turnId: string,
    target: 'isHumanNeeded' | 'aiReply',
    isCorrect: boolean
  ) {
    const fbKey = target === 'isHumanNeeded' ? 'triageFeedback' : 'replyFeedback';
    setTurns((prev) =>
      prev.map((t) =>
        t.id === turnId
          ? { ...t, [fbKey]: { ...t[fbKey], isCorrect, saved: false } }
          : t
      )
    );
  }

  async function submitFeedback(
    turnId: string,
    target: 'isHumanNeeded' | 'aiReply'
  ) {
    const turn = turns.find((t) => t.id === turnId);
    if (!turn) return;

    const fbKey = target === 'isHumanNeeded' ? 'triageFeedback' : 'replyFeedback';
    const feedback = turn[fbKey];
    if (feedback.isCorrect === undefined || feedback.saving) return;

    setTurns((prev) =>
      prev.map((t) =>
        t.id === turnId ? { ...t, [fbKey]: { ...t[fbKey], saving: true } } : t
      )
    );

    try {
      await fetch('/api/rag-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: turn.question,
          target,
          modelOutput: target === 'isHumanNeeded' ? turn.isHumanNeeded : turn.aiReply,
          topScore: turn.topScore,
          hybridConfidence: turn.hybridConfidence,
          reason: turn.reason,
          isCorrect: feedback.isCorrect,
          adminNote: feedback.note,
        }),
      });

      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? { ...t, [fbKey]: { ...t[fbKey], saving: false, saved: true } }
            : t
        )
      );
      toast.success('Feedback saved successfully.');
    } catch {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId ? { ...t, [fbKey]: { ...t[fbKey], saving: false } } : t
        )
      );
    }
  }

  function updateNote(turnId: string, target: 'isHumanNeeded' | 'aiReply', note: string) {
    const fbKey = target === 'isHumanNeeded' ? 'triageFeedback' : 'replyFeedback';
    setTurns((prev) =>
      prev.map((t) =>
        t.id === turnId ? { ...t, [fbKey]: { ...t[fbKey], note, saved: false } } : t
      )
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center sm:p-4">
      <div className="flex flex-col w-full max-w-xl h-screen sm:h-[88vh] bg-blue-100 sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-lg overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-blue-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              AI
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Electrochem Support Bot</h1>
              <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online • QA Test Mode
              </p>
            </div>
          </div>

          {turns.length > 0 && (
            <button
              onClick={() => setTurns([])}
              className="text-s text-red-500 hover:text-red-800 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              Clear
            </button>
          )}
        </header>

        
        <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5 bg-slate-50/50">
          {turns.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <p className="text-sm font-medium text-slate-600">
                Ask any customer question to start testing
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Each message returns Is Human Needed and AI Reply with feedback controls.
              </p>
            </div>
          )}

          {turns.map((turn) => (
            <div key={turn.id} className="space-y-2.5">
              
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-xs max-w-[78%] shadow-2xs leading-relaxed">
                  {turn.question}
                </div>
              </div>

              {/* Bot Reply 1: Is Human Needed */}
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/90 rounded-2xl rounded-bl-xs px-4 py-3 max-w-[85%] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-400">
                      1. Is Human Needed
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        turn.isHumanNeeded
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {turn.isHumanNeeded ? 'YES' : 'NO'}
                    </span>
                  </div>

                  {/* Triage Feedback */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    <input
                      type="text"
                      value={turn.triageFeedback.note}
                      onChange={(e) => updateNote(turn.id, 'isHumanNeeded', e.target.value)}
                      placeholder="Feedback note..."
                      className="flex-1 min-w-35 text-xs text-black px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => selectRating(turn.id, 'isHumanNeeded', true)}
                      disabled={turn.triageFeedback.saving}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        turn.triageFeedback.isCorrect === true
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Correct
                    </button>
                    <button
                      type="button"
                      onClick={() => selectRating(turn.id, 'isHumanNeeded', false)}
                      disabled={turn.triageFeedback.saving}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        turn.triageFeedback.isCorrect === false
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Wrong
                    </button>
                    <button
                      type="button"
                      onClick={() => submitFeedback(turn.id, 'isHumanNeeded')}
                      disabled={turn.triageFeedback.isCorrect === undefined || turn.triageFeedback.saving}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      {turn.triageFeedback.saving ? 'Saving...' : turn.triageFeedback.saved ? 'Saved ✓' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bot Reply 2: AI Reply */}
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/90 rounded-2xl rounded-bl-xs px-4 py-3 max-w-[85%] shadow-2xs space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-400 block">
                    2. AI Reply
                  </span>

                  <p className="text-sm text-black whitespace-pre-line leading-relaxed">
                    {turn.aiReply}
                  </p>

                  {/* Reply Feedback */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    <input
                      type="text"
                      value={turn.replyFeedback.note}
                      onChange={(e) => updateNote(turn.id, 'aiReply', e.target.value)}
                      placeholder="Correction or note..."
                      className="flex-1 min-w-35 text-xs text-black px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => selectRating(turn.id, 'aiReply', true)}
                      disabled={turn.replyFeedback.saving}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        turn.replyFeedback.isCorrect === true
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Good
                    </button>
                    <button
                      type="button"
                      onClick={() => selectRating(turn.id, 'aiReply', false)}
                      disabled={turn.replyFeedback.saving}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        turn.replyFeedback.isCorrect === false
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Needs Fix
                    </button>
                    <button
                      type="button"
                      onClick={() => submitFeedback(turn.id, 'aiReply')}
                      disabled={turn.replyFeedback.isCorrect === undefined || turn.replyFeedback.saving}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      {turn.replyFeedback.saving ? 'Saving...' : turn.replyFeedback.saved ? 'Saved ✓' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        {/* Bottom Chat Input */}
        <form onSubmit={handleSend} className="p-3 bg-blue-200 border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Electrochem AI..."
            className="flex-1 text-sm text-black px-4 py-2.5 bg-slate-100 rounded-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 border border-transparent focus:border-blue-400 transition"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-full transition cursor-pointer disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}