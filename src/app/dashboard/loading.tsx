import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <Skeleton className="mb-8 h-10 w-96 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[1.65fr_.85fr]">
        <Skeleton className="h-[600px]" />
        <Skeleton className="h-[520px]" />
      </div>
    </main>
  );
}
