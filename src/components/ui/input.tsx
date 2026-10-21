import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-black/20 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/70 focus:ring-2 focus:ring-primary/10",
        className,
      )}
      {...props}
    />
  );
}
