import { CalendarX2, Home } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PublicSiteSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#f3f0e8] text-[#20211d]"
      aria-busy="true"
      aria-label="Loading public page"
    >
      <div className="mx-auto w-full max-w-7xl px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-black/10 pb-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full bg-black/10" />
            <Skeleton className="h-5 w-32 bg-black/10" />
          </div>
          <Skeleton className="h-10 w-28 rounded-full bg-black/10" />
        </header>

        <section className="grid min-h-[68vh] items-center gap-12 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
          <div className="space-y-7">
            <Skeleton className="h-4 w-36 bg-black/10" />
            <div className="space-y-3">
              <Skeleton className="h-16 w-full max-w-xl bg-black/10" />
              <Skeleton className="h-16 w-4/5 max-w-lg bg-black/10" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-full max-w-lg bg-black/10" />
              <Skeleton className="h-5 w-3/4 max-w-md bg-black/10" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-12 w-32 rounded-full bg-black/10" />
              <Skeleton className="h-12 w-28 rounded-full bg-black/10" />
            </div>
          </div>
          <Skeleton className="aspect-[4/5] w-full rounded-[2rem] bg-black/10" />
        </section>

        <div className="grid gap-4 border-t border-black/10 py-12 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="bg-white/55 ring-black/5">
              <CardContent className="space-y-3 pt-2">
                <Skeleton className="h-4 w-20 bg-black/10" />
                <Skeleton className="h-7 w-3/4 bg-black/10" />
                <Skeleton className="h-4 w-full bg-black/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

export function PublicSiteUnavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f0e8] px-5 py-16 text-[#20211d]">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full border border-black/10 bg-white shadow-sm">
          <CalendarX2 className="size-7" aria-hidden="true" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-black/50">
          Page unavailable
        </p>
        <h1 className="font-serif text-4xl tracking-[-0.04em]">
          This public page isn&apos;t live
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-black/60">
          The link may have changed, or the business may be updating its page.
          Check the address or ask the business for its latest public link.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-8 h-11 rounded-full px-5">
          <Link href="/">
            <Home data-icon="inline-start" />
            Return home
          </Link>
        </Button>
      </div>
    </main>
  );
}
