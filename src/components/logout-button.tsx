"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
export function LogoutButton() {
  const [loading, setLoading] = useState(false),
    router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
