import { Badge } from "@/components/ui/badge";
import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth-form";
import { Languages, Sparkles, AudioWaveform } from "lucide-react";
export function AuthShell({ mode }: { mode: "login" | "register" }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden overflow-hidden border-r border-border/60 p-12 lg:flex lg:flex-col lg:justify-between">
        <Brand />
        <div className="max-w-xl">
          <Badge>Powered by Gemini Live</Badge>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-[-.04em]">
            Every voice.
            <br />
            <span className="text-primary">One clear transcript.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
            Capture Hindi, English, Tamil and Telugu as you speak. Review every session, exactly
            where you left it.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              [AudioWaveform, "Live"],
              [Languages, "4 languages"],
              [Sparkles, "AI powered"],
            ].map(([Icon, label]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-card/60 p-4">
                <Icon className="mb-5 size-5 text-primary" />
                <p className="text-sm font-medium">{String(label)}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Private account · Secure sessions · Stored in PostgreSQL
        </p>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <Card>
            <CardHeader className="p-7 pb-3">
              <CardTitle className="text-2xl">
                {mode === "login" ? "Welcome back" : "Start transcribing"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Sign in to continue to your workspace."
                  : "Create an account to save your sessions."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-7 pt-4">
              <AuthForm mode={mode} />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
