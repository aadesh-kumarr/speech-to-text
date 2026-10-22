"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Headphones,
  History,
  RefreshCw,
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
  appConfig.languages.find((language) => language.code === code)?.label || code;

export function TranscriptHistory({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<Data | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<TranscriptItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const response = await fetch(`/api/transcripts?page=${page}&sort=${sort}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not load transcript history");
        }

        const nextData = (await response.json()) as Data;

        if (!cancelled) {
          setData(nextData);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [page, sort, refreshKey, retryKey]);

  return (
    <>
      <Card className="h-fit overflow-hidden">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              Saved sessions
            </CardTitle>
            <CardDescription>
              {data?.total || 0} transcript{data?.total === 1 ? "" : "s"} in your history
            </CardDescription>
          </div>

          <select
            aria-label="Sort transcripts"
            value={sort}
            onChange={(event) => {
              setLoading(true);
              setSort(event.target.value);
              setPage(1);
            }}
            className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-xs text-foreground sm:w-auto"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="duration">Longest first</option>
          </select>
        </CardHeader>

        <CardContent className="space-y-2">
          {loading ? (
            <HistorySkeleton />
          ) : error ? (
            <HistoryError
              onRetry={() => {
                setLoading(true);
                setError(false);
                setRetryKey((currentKey) => currentKey + 1);
              }}
            />
          ) : data?.items.length ? (
            data.items.map((item) => (
              <article
                key={item.id}
                className="group rounded-xl border border-transparent p-3 transition hover:border-border hover:bg-muted/70"
              >
                <p className="line-clamp-2 text-sm leading-6 text-foreground/90">{item.text}</p>

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
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => setSelected(item)}
                  >
                    <Eye className="size-3.5" />
                    View transcript
                  </Button>
                  {item.hasAudio && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-primary hover:text-primary"
                      onClick={() => setSelected(item)}
                    >
                      <Headphones className="size-3.5" />
                      Listen
                    </Button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="grid min-h-64 place-items-center px-4 text-center">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
                  <Search className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium">No saved sessions yet</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Record your first session and save it to see it here.
                </p>
              </div>
            </div>
          )}

          {!error && (
            <div className="flex items-center justify-between border-t border-border/70 pt-4">
              <span className="text-xs text-muted-foreground">
                Page {data?.page || 1} of {data?.totalPages || 1}
              </span>
              <div className="flex gap-1">
                <Button
                  aria-label="Previous page"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((currentPage) => currentPage - 1);
                  }}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  aria-label="Next page"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page >= (data?.totalPages || 1) || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((currentPage) => currentPage + 1);
                  }}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && <TranscriptDialog item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function TranscriptDialog({ item, onClose }: { item: TranscriptItem; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transcript-dialog-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <Card className="max-h-[85vh] w-full max-w-2xl overflow-auto bg-[#0b1114]">
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle id="transcript-dialog-title">Transcript details</CardTitle>
            <CardDescription>{new Date(item.createdAt).toLocaleString("en-IN")}</CardDescription>
          </div>
          <Button aria-label="Close transcript" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex gap-2">
            <Badge>{languageLabel(item.language)}</Badge>
            <Badge className="border-border bg-muted text-muted-foreground">
              {formatDuration(item.durationSeconds)}
            </Badge>
          </div>

          <p className="whitespace-pre-wrap rounded-xl border border-border bg-black/20 p-4 text-sm leading-7 text-foreground/90">
            {item.text}
          </p>

          {item.hasAudio && (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Headphones className="size-3.5" />
                Recorded audio
              </p>
              <audio
                controls
                preload="metadata"
                className="w-full"
                src={`/api/transcripts/${item.id}/audio`}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-64 place-items-center px-4 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10">
          <RefreshCw className="size-5 text-destructive" />
        </div>
        <p className="mt-4 text-sm font-medium">History could not be loaded</p>
        <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-xl p-3">
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
