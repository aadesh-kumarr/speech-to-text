"use client";
import * as React from "react";
import * as P from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
export function Label({ className, ...props }: React.ComponentProps<typeof P.Root>) {
  return <P.Root className={cn("text-sm font-medium", className)} {...props} />;
}
