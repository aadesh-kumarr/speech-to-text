import * as React from "react";
import { cn } from "@/lib/utils";
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pb-3", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-semibold tracking-tight", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}
