import { AudioLines } from "lucide-react";
import { appConfig } from "@/config/app";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
        <AudioLines className="size-5" />
      </div>
      {!compact && (
        <div>
          <p className="font-semibold tracking-tight">{appConfig.name}</p>
          <p className="text-[11px] text-muted-foreground">Speech, captured clearly.</p>
        </div>
      )}
    </div>
  );
}
