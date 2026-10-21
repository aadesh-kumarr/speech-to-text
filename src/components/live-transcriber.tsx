"use client";
import { useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import {
  CircleStop,
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
export function LiveTranscriber({ onSaved }: { onSaved: () => void }) {
  const [status, setStatus] = useState<Status>("idle"),
    [language, setLanguage] = useState<LanguageCode>("auto"),
    [finalText, setFinalText] = useState(""),
    [interim, setInterim] = useState(""),
    [seconds, setSeconds] = useState(0);
  const sessionRef = useRef<Session | null>(null),
    streamRef = useRef<MediaStream | null>(null),
    contextRef = useRef<AudioContext | null>(null),
    processorRef = useRef<ScriptProcessorNode | null>(null),
    recorderRef = useRef<MediaRecorder | null>(null),
    chunksRef = useRef<Blob[]>([]),
    finalRef = useRef(""),
    timerRef = useRef<ReturnType<typeof setInterval> | null>(null),
    startRef = useRef(0);
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
    streamRef.current?.getTracks().forEach((t) => t.stop());
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
    finalRef.current = "";
    setInterim("");
    setSeconds(0);
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
      if (!tokenResponse.ok) throw new Error(tokenBody.error || "Could not start transcription");
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
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.interimInputTranscription?.text)
              setInterim(content.interimInputTranscription.text);
            if (content?.inputTranscription?.text) {
              const next =
                `${finalRef.current}${finalRef.current ? " " : ""}${content.inputTranscription.text}`.trim();
              finalRef.current = next;
              setFinalText(next);
              setInterim("");
            }
          },
          onerror: () => toast.error("Live transcription connection failed"),
          onclose: () => {},
        },
      });
      sessionRef.current = session;
      const recorder = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? { mimeType: "audio/webm;codecs=opus" }
          : undefined,
      );
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      const context = new AudioContext();
      contextRef.current = context;
      const source = context.createMediaStreamSource(stream),
        processor = context.createScriptProcessor(4096, 1, 1),
        silent = context.createGain();
      silent.gain.value = 0;
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0),
          pcm = resampleToPcm16(input, context.sampleRate, appConfig.audio.sampleRate);
        if (pcm.length && sessionRef.current)
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: toBase64(pcm.buffer),
              mimeType: `audio/pcm;rate=${appConfig.audio.sampleRate}`,
            },
          });
      };
      source.connect(processor);
      processor.connect(silent);
      silent.connect(context.destination);
      startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const value = Math.floor((Date.now() - startRef.current) / 1000);
        setSeconds(value);
        if (value >= appConfig.audio.maxDurationSeconds) void stop();
      }, 1000);
      setStatus("recording");
    } catch (error) {
      cleanup();
      setStatus("idle");
      toast.error(error instanceof Error ? error.message : "Microphone access failed");
    }
  }
  async function stop() {
    if (!sessionRef.current) return;
    const duration = Math.max(1, Math.floor((Date.now() - startRef.current) / 1000));
    setSeconds(duration);
    if (timerRef.current) clearInterval(timerRef.current);
    sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
    if (recorderRef.current?.state === "recording")
      await new Promise<void>((resolve) => {
        if (!recorderRef.current) return resolve();
        recorderRef.current.addEventListener("stop", () => resolve(), {
          once: true,
        });
        recorderRef.current.stop();
      });
    await new Promise((resolve) => setTimeout(resolve, 700));
    cleanup();
    setStatus("stopped");
  }
  async function save() {
    if (!finalRef.current.trim()) return toast.error("No transcript to save");
    setStatus("saving");
    try {
      const form = new FormData();
      form.set("text", finalRef.current.trim());
      form.set("language", language);
      form.set("durationSeconds", String(seconds));
      if (chunksRef.current.length)
        form.set(
          "audio",
          new Blob(chunksRef.current, {
            type: recorderRef.current?.mimeType || "audio/webm",
          }),
          "recording.webm",
        );
      const res = await fetch("/api/transcripts", {
          method: "POST",
          body: form,
        }),
        body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save transcript");
      toast.success("Transcript saved");
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
    finalRef.current = "";
    setInterim("");
    setSeconds(0);
    chunksRef.current = [];
  }
  const active = status === "recording",
    busy = status === "connecting" || status === "saving";
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="size-4 text-primary" />
              Live transcription
            </CardTitle>
            <CardDescription>Speak naturally. Code-switching is supported.</CardDescription>
          </div>
          <Badge
            className={active ? "animate-pulse" : "border-border bg-muted text-muted-foreground"}
          >
            {active ? "Listening" : "Ready"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-7">
        <div className="flex flex-col items-center">
          <label className="mb-7 w-full max-w-xs text-xs font-medium text-muted-foreground">
            Spoken language
            <select
              value={language}
              disabled={active || busy}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
            >
              {appConfig.languages.map((x) => (
                <option key={x.code} value={x.code}>
                  {x.label} · {x.native}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label={active ? "Stop recording" : "Start recording"}
            disabled={busy || status === "stopped"}
            onClick={active ? () => void stop() : () => void start()}
            className={`relative grid size-28 place-items-center rounded-full border transition ${active ? "recording-ring border-primary bg-primary text-primary-foreground shadow-[0_0_60px_rgba(82,230,184,.25)]" : "border-border bg-muted text-primary hover:scale-[1.03] hover:border-primary/40"}`}
          >
            {status === "connecting" ? (
              <LoaderCircle className="size-9 animate-spin" />
            ) : active ? (
              <CircleStop className="size-9" />
            ) : (
              <Mic className="size-9" />
            )}
          </button>
          <div className="mt-5 font-mono text-sm tabular-nums text-muted-foreground">
            {formatDuration(seconds)}
          </div>
        </div>
        {status === "stopped" || status === "saving" ? (
          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={reset} disabled={busy}>
              <RotateCcw className="size-4" />
              Discard
            </Button>
            <Button onClick={() => void save()} disabled={busy || !finalText.trim()}>
              {status === "saving" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save transcript
            </Button>
          </div>
        ) : null}
        <div className="mt-4 min-h-52 rounded-2xl border border-border bg-black/20 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">
              Transcript
            </span>
            {(finalText || interim) && (
              <span className="text-xs text-muted-foreground">
                {(finalText + interim).trim().split(/\s+/).length} words
              </span>
            )}
          </div>
          {finalText || interim ? (
            <p className="whitespace-pre-wrap text-lg leading-8 text-foreground/95">
              {finalText}
              {finalText && interim ? " " : ""}
              <span className="text-muted-foreground">{interim}</span>
              {active && (
                <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-primary align-middle" />
              )}
            </p>
          ) : (
            <div className="grid min-h-32 place-items-center text-center">
              <div>
                <Volume2 className="mx-auto size-6 text-muted-foreground/60" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Your words will appear here in real time.
                </p>
              </div>
            </div>
          )}
        </div>
        {status !== "stopped" && status !== "saving" && (
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Session token is temporary; your API key stays on the server.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function resampleToPcm16(input: Float32Array, inputRate: number, outputRate: number) {
  if (outputRate >= inputRate) return floatTo16(input);
  const ratio = inputRate / outputRate,
    length = Math.round(input.length / ratio),
    out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const start = Math.round(i * ratio),
      end = Math.min(input.length, Math.round((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return floatTo16(out);
}
function floatTo16(input: Float32Array) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}
function toBase64(buffer: ArrayBufferLike) {
  const bytes = new Uint8Array(buffer),
    size = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += size)
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + size, bytes.length)));
  return btoa(binary);
}
