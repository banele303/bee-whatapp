"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function PublicSiteError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f1ea] px-5 py-16 text-[#1f211d]">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full border border-[#1f211d]/10 bg-white shadow-sm">
          <AlertCircle className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1f211d]/55">
            Booking page
          </p>
          <h1 className="font-serif text-3xl tracking-[-0.03em]">
            We couldn&apos;t open this page
          </h1>
          <p className="text-sm leading-6 text-[#1f211d]/65">
            The page may be temporarily unavailable. Your details have not been
            submitted.
          </p>
        </div>
        <Alert className="bg-white text-left">
          <AlertCircle />
          <AlertTitle>Nothing was booked</AlertTitle>
          <AlertDescription>
            Try loading the page again. If the problem continues, contact the
            business directly.
          </AlertDescription>
        </Alert>
        <Button type="button" size="lg" onClick={reset} className="mx-auto h-11 px-5">
          <RotateCcw data-icon="inline-start" />
          Try again
        </Button>
      </div>
    </main>
  );
}
