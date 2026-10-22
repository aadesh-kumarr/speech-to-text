"use client";

import { useState } from "react";
import { Languages, Mic2, Sparkles } from "lucide-react";
import { LiveTranscriber } from "@/components/live-transcriber";
import { TranscriptHistory } from "@/components/transcript-history";

export function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-9 lg:px-8 lg:py-12">
      <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end lg:mb-8">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.22em] text-primary">
            Your workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-[-.03em] sm:text-4xl">
            Your voice, transcribed live.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Choose a language, speak naturally, and review the transcript before saving it to your
            private history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            [Mic2, "Live STT"],
            [Languages, "4 languages"],
            [Sparkles, "Gemini"],
          ].map(([Icon, label]) => (
            <div
              key={String(label)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground"
            >
              <Icon className="size-3.5 text-primary" />
              {String(label)}
            </div>
          ))}
        </div>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,.85fr)]">
        <LiveTranscriber onSaved={() => setRefreshKey((x) => x + 1)} />
        <TranscriptHistory refreshKey={refreshKey} />
      </div>
    </main>
  );
}
