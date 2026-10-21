import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60),
    s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
