import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";

export function DashboardHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 shadow-lg shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-5 lg:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium">Workspace</p>
            <p className="max-w-52 truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
