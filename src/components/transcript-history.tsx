"use client";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  History,
  Play,
  Search,
  X,
} from "lucide-react";
import { appConfig } from "@/config/app";
import { formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export type TranscriptItem = {
  id: string;
  text: string;
  language: string;
  durationSeconds: number;
  hasAudio: boolean;
  createdAt: string;
};
type Data = {
  items: TranscriptItem[];
  page: number;
  total: number;
  totalPages: number;
};
const languageLabel = (code: string) =>
  appConfig.languages.find((x) => x.code === code)?.label || code;
export function TranscriptHistory({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<Data | null>(null),
    [page, setPage] = useState(1),
    [sort, setSort] = useState("newest"),
    [selected, setSelected] = useState<TranscriptItem | null>(null),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/transcripts?page=${page}&sort=${sort}`, {
        cache: "no-store",
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [page, sort]);
  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  return (
    <>
      <Card className="h-fit">
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              Recent sessions
            </CardTitle>
            <CardDescription>
              {data?.total || 0} saved transcript{data?.total === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <select
            aria-label="Sort transcripts"
            value={sort}
            onChange={(e) => {
              setLoading(true);
              setSort(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-border bg-muted px-2 text-xs text-foreground"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="duration">Longest first</option>
          </select>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <HistorySkeleton />
          ) : data?.items.length ? (
            data.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="group w-full rounded-xl border border-transparent p-3 text-left transition hover:border-border hover:bg-muted/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm leading-6 text-foreground/90">{item.text}</p>
                  <Play className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge>{languageLabel(item.language)}</Badge>
                  <span className="flex items-center gap-1">
                    <Clock3 className="size-3" />
                    {formatDuration(item.durationSeconds)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {new Date(item.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {item.hasAudio && <Headphones className="ml-auto size-3.5 text-primary" />}
                </div>
              </button>
            ))
          ) : (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
                  <Search className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium">No sessions yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your saved transcripts will appear here.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border/70 pt-4">
            <span className="text-xs text-muted-foreground">
              Page {data?.page || 1} of {data?.totalPages || 1}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page <= 1 || loading}
                onClick={() => {
                  setLoading(true);
                  setPage((p) => p - 1);
                }}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page >= (data?.totalPages || 1) || loading}
                onClick={() => {
                  setLoading(true);
                  setPage((p) => p + 1);
                }}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setSelected(null);
          }}
        >
          <Card className="max-h-[85vh] w-full max-w-2xl overflow-auto bg-[#0b1114]">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Transcript details</CardTitle>
                <CardDescription>
                  {new Date(selected.createdAt).toLocaleString("en-IN")}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-5 flex gap-2">
                <Badge>{languageLabel(selected.language)}</Badge>
                <Badge className="border-border bg-muted text-muted-foreground">
                  {formatDuration(selected.durationSeconds)}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap rounded-xl border border-border bg-black/20 p-4 text-sm leading-7 text-foreground/90">
                {selected.text}
              </p>
              {selected.hasAudio && (
                <audio
                  controls
                  preload="metadata"
                  className="mt-5 w-full"
                  src={`/api/transcripts/${selected.id}/audio`}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl p-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}
