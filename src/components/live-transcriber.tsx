"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import {
  Check,
  CircleStop,
  Languages,
  LoaderCircle,
  Mic,
  Radio,
  RotateCcw,
  Save,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { appConfig, type LanguageCode } from "@/config/app";
import { formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "idle" | "connecting" | "recording" | "stopped" | "saving";

const statusCopy: Record<Status, { badge: string; title: string; description: string }> = {
  idle: {
    badge: "Ready",
    title: "Ready when you are",
    description: "Choose a language and start speaking.",
  },
  connecting: {
    badge: "Connecting",
    title: "Starting secure session",
    description: "Connecting your microphone to Gemini Live…",
  },
  recording: {
    badge: "Listening",
    title: "Listening now",
    description: "Speak naturally. Tap stop when you are finished.",
  },
  stopped: {
    badge: "Review",
    title: "Recording complete",
    description: "Review the transcript, then save or discard it.",
  },
  saving: {
    badge: "Saving",
    title: "Saving your session",
    description: "Adding the transcript and audio to your history…",
  },
};

export function LiveTranscriber({ onSaved }: { onSaved: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [language, setLanguage] = useState<LanguageCode>("auto");
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(0);

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const isRecording = status === "recording";
  const isBusy = status === "connecting" || status === "saving";
  const isReviewing = status === "stopped" || status === "saving";
  const hasTranscript = Boolean(finalText || interim);
  const currentStatus = statusCopy[status];

  useEffect(
    () => () => {
      cleanup();
    },
    [],
  );

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);

    processorRef.current?.disconnect();
    void contextRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    sessionRef.current?.close();

    timerRef.current = null;
    processorRef.current = null;
    contextRef.current = null;
    streamRef.current = null;
    sessionRef.current = null;
  }

  async function start() {
    setStatus("connecting");
    setFinalText("");
    setInterim("");
    setSeconds(0);
    finalRef.current = "";
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const tokenResponse = await fetch("/api/gemini/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language }),
      });
      const tokenBody = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenBody.error || "Could not start transcription");
      }

      const ai = new GoogleGenAI({
        apiKey: tokenBody.token,
        httpOptions: { apiVersion: "v1beta" },
      });

      const session = await ai.live.connect({
        model: tokenBody.model,
        config: {
          responseModalities: [Modality.TEXT],
          inputAudioTranscription: {
            languageCodes: tokenBody.config.inputAudioTranscription.languageCodes,
          },
        },
        callbacks: {
          onmessage: handleLiveMessage,
          onerror: () => toast.error("Live transcription connection failed"),
          onclose: () => {},
        },
      });
      sessionRef.current = session;

      startAudioRecording(stream);
      startPcmStream(stream, session);
      startTimer();
      setStatus("recording");
    } catch (error) {
      cleanup();
      setStatus("idle");
      toast.error(error instanceof Error ? error.message : "Microphone access failed");
    }
  }

  function handleLiveMessage(message: LiveServerMessage) {
    const content = message.serverContent;

    if (content?.interimInputTranscription?.text) {
      setInterim(content.interimInputTranscription.text);
    }

    if (content?.inputTranscription?.text) {
      const separator = finalRef.current ? " " : "";
      const nextText = `${finalRef.current}${separator}${content.inputTranscription.text}`.trim();

      finalRef.current = nextText;
      setFinalText(nextText);
      setInterim("");
    }
  }

  function startAudioRecording(stream: MediaStream) {
    const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? { mimeType: "audio/webm;codecs=opus" }
      : undefined;
    const recorder = new MediaRecorder(stream, options);

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
  }

  function startPcmStream(stream: MediaStream, session: Session) {
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const silentOutput = context.createGain();

    contextRef.current = context;
    processorRef.current = processor;
    silentOutput.gain.value = 0;

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const pcm = resampleToPcm16(input, context.sampleRate, appConfig.audio.sampleRate);

      if (!pcm.length || !sessionRef.current) return;

      session.sendRealtimeInput({
        audio: {
          data: toBase64(pcm.buffer),
          mimeType: `audio/pcm;rate=${appConfig.audio.sampleRate}`,
        },
      });
    };

    source.connect(processor);
    processor.connect(silentOutput);
    silentOutput.connect(context.destination);
  }

  function startTimer() {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setSeconds(elapsed);

      if (elapsed >= appConfig.audio.maxDurationSeconds) void stop();
    }, 1000);
  }

  async function stop() {
    if (!sessionRef.current) return;

    const duration = Math.max(1, Math.floor((Date.now() - startRef.current) / 1000));
    setSeconds(duration);

    if (timerRef.current) clearInterval(timerRef.current);
    sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });

    if (recorderRef.current?.state === "recording") {
      await new Promise<void>((resolve) => {
        if (!recorderRef.current) return resolve();
        recorderRef.current.addEventListener("stop", () => resolve(), { once: true });
        recorderRef.current.stop();
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 700));
    cleanup();
    setStatus("stopped");
  }

  async function save() {
    if (!finalRef.current.trim()) {
      toast.error("No transcript to save");
      return;
    }

    setStatus("saving");

    try {
      const form = new FormData();
      form.set("text", finalRef.current.trim());
      form.set("language", language);
      form.set("durationSeconds", String(seconds));

      if (chunksRef.current.length) {
        const audioBlob = new Blob(chunksRef.current, {
          type: recorderRef.current?.mimeType || "audio/webm",
        });
        form.set("audio", audioBlob, "recording.webm");
      }

      const response = await fetch("/api/transcripts", { method: "POST", body: form });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error || "Could not save transcript");

      toast.success("Transcript saved to history");
      onSaved();
      reset();
    } catch (error) {
      setStatus("stopped");
      toast.error(error instanceof Error ? error.message : "Could not save transcript");
    }
  }

  function reset() {
    setStatus("idle");
    setFinalText("");
    setInterim("");
    setSeconds(0);
    finalRef.current = "";
    chunksRef.current = [];
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="size-4 text-primary" />
              New transcription
            </CardTitle>
            <CardDescription>Capture speech live in four Indian languages.</CardDescription>
          </div>
          <Badge
            className={
              isRecording
                ? "animate-pulse border-primary/40 bg-primary/15"
                : "border-border bg-muted text-muted-foreground"
            }
          >
            {isRecording && <span className="mr-1.5 size-1.5 rounded-full bg-primary" />}
            {currentStatus.badge}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-7">
        <div className="mb-7 grid grid-cols-3 gap-2" aria-label="Transcription steps">
          <Step
            number="1"
            label="Choose language"
            active={status === "idle"}
            complete={isReviewing}
          />
          <Step
            number="2"
            label="Speak"
            active={status === "connecting" || status === "recording"}
            complete={isReviewing}
          />
          <Step number="3" label="Review & save" active={isReviewing} complete={false} />
        </div>

        <div className="rounded-2xl border border-border/80 bg-muted/35 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Languages className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Spoken language</p>
                <p className="text-xs text-muted-foreground">
                  Auto detect works with code-switching.
                </p>
              </div>
            </div>
            <select
              aria-label="Spoken language"
              value={language}
              disabled={isRecording || isBusy}
              onChange={(event) => setLanguage(event.target.value as LanguageCode)}
              className="h-11 min-w-48 rounded-xl border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {appConfig.languages.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label} · {option.native}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col items-center py-8 text-center">
          <button
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            disabled={isBusy || isReviewing}
            onClick={isRecording ? () => void stop() : () => void start()}
            className={`relative grid size-28 place-items-center rounded-full border transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
              isRecording
                ? "recording-ring border-primary bg-primary text-primary-foreground shadow-[0_0_60px_rgba(82,230,184,.25)]"
                : "border-primary/25 bg-primary/10 text-primary shadow-[0_0_35px_rgba(82,230,184,.08)] hover:scale-[1.03] hover:border-primary/50 hover:bg-primary/15"
            }`}
          >
            {status === "connecting" ? (
              <LoaderCircle className="size-9 animate-spin" />
            ) : isRecording ? (
              <CircleStop className="size-9" />
            ) : (
              <Mic className="size-9" />
            )}
          </button>

          <p className="mt-6 text-base font-semibold">{currentStatus.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{currentStatus.description}</p>
          <div className="mt-3 rounded-full border border-border bg-background/70 px-3 py-1 font-mono text-xs tabular-nums text-muted-foreground">
            {formatDuration(seconds)}
          </div>
        </div>

        {isReviewing && (
          <div className="mb-3 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[.05] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-primary" />
              <span>Review your transcript before saving.</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} disabled={isBusy}>
                <RotateCcw className="size-3.5" />
                Discard
              </Button>
              <Button size="sm" onClick={() => void save()} disabled={isBusy || !finalText.trim()}>
                {status === "saving" ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save to history
              </Button>
            </div>
          </div>
        )}

        <div className="min-h-52 rounded-2xl border border-border bg-black/20 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">
                Transcript
              </span>
              {isRecording && <span className="size-1.5 animate-pulse rounded-full bg-danger" />}
            </div>
            {hasTranscript && (
              <span className="text-xs text-muted-foreground">
                {(finalText + interim).trim().split(/\s+/).length} words
              </span>
            )}
          </div>

          {hasTranscript ? (
            <p className="whitespace-pre-wrap text-lg leading-8 text-foreground/95">
              {finalText}
              {finalText && interim ? " " : ""}
              <span className="text-muted-foreground">{interim}</span>
              {isRecording && (
                <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-primary align-middle" />
              )}
            </p>
          ) : (
            <div className="grid min-h-32 place-items-center text-center">
              <div>
                <Volume2 className="mx-auto size-6 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium text-foreground/75">
                  No speech captured yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your words will appear here while you speak.
                </p>
              </div>
            </div>
          )}
        </div>

        {!isReviewing && (
          <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0 text-primary" />
            Your Gemini key stays on the server. Browser sessions use a temporary token.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Step({
  number,
  label,
  active,
  complete,
}: {
  number: string;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
        active
          ? "border-primary/35 bg-primary/[.08] text-foreground"
          : "border-border/70 bg-background/30 text-muted-foreground"
      }`}
    >
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
          active || complete
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {complete ? <Check className="size-3.5" /> : number}
      </span>
      <span className="truncate text-xs font-medium">{label}</span>
    </div>
  );
}

function resampleToPcm16(input: Float32Array, inputRate: number, outputRate: number) {
  if (outputRate >= inputRate) return floatTo16(input);

  const ratio = inputRate / outputRate;
  const length = Math.round(input.length / ratio);
  const output = new Float32Array(length);

  for (let index = 0; index < length; index++) {
    const start = Math.round(index * ratio);
    const end = Math.min(input.length, Math.round((index + 1) * ratio));
    let sum = 0;

    for (let cursor = start; cursor < end; cursor++) sum += input[cursor];
    output[index] = sum / Math.max(1, end - start);
  }

  return floatTo16(output);
}

function floatTo16(input: Float32Array) {
  const output = new Int16Array(input.length);

  for (let index = 0; index < input.length; index++) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

function toBase64(buffer: ArrayBufferLike) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}
