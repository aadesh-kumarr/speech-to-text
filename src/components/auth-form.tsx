"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [loading, setLoading] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong");
      toast.success(mode === "login" ? "Welcome back" : "Account created");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {mode === "login" && (
        <button
          type="button"
          onClick={() => {
            setEmail("demo@vaani.app");
            setPassword("Demo@12345");
          }}
          className="w-full rounded-xl border border-primary/20 bg-primary/[.06] p-3 text-left transition hover:bg-primary/10"
        >
          <span className="block text-xs font-semibold text-primary">Use demo account</span>
          <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
            demo@vaani.app · Demo@12345
          </span>
        </button>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="pl-10"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <LockKeyhole className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            placeholder="Minimum 8 characters"
            className="pl-10"
          />
        </div>
      </div>
      <Button className="w-full" size="lg" disabled={loading}>
        {loading && <LoaderCircle className="size-4 animate-spin" />}
        {mode === "login" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? "New to Vaani? " : "Already have an account? "}
        <Link
          className="font-medium text-primary hover:underline"
          href={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
