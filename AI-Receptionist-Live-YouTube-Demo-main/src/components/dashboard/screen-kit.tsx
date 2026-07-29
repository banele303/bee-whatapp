import type { ReactNode } from "react";
import {
  CalendarX2,
  CircleDashed,
  Inbox,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ScreenHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-heading text-3xl leading-none font-semibold tracking-[-0.035em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function LoadingPanel({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="bg-white">
      <CardContent className="space-y-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" />
          Syncing live workspace
        </div>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn("h-12 w-full", index === rows - 1 && "w-4/5")}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-black/15 bg-[#f7f5ef] px-5 text-center",
        compact ? "min-h-44 rounded-lg py-7" : "min-h-72 rounded-xl py-12",
      )}
    >
      <span className="grid size-10 place-items-center rounded-full border border-black/10 bg-white text-muted-foreground shadow-sm">
        <Icon className="size-4" />
      </span>
      <p className="mt-4 font-heading text-lg font-semibold tracking-tight">
        {title}
      </p>
      <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  booked: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  completed: "border-sky-200 bg-sky-50 text-sky-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  canceled: "border-rose-200 bg-rose-50 text-rose-700",
  no_show: "border-zinc-200 bg-zinc-100 text-zinc-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  draft: "border-amber-200 bg-amber-50 text-amber-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase",
        statusStyles[status] ?? "border-black/10 bg-white text-foreground",
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export function ActivePill({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-black/10 bg-muted text-muted-foreground",
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {active ? "Active" : "Paused"}
    </Badge>
  );
}

export function formatMoney(
  minor: number | undefined,
  currency = "USD",
  locale = "en-US",
) {
  if (minor === undefined) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export function formatDateTime(value: number, timezone?: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(value);
}

export function formatTime(value: number, timezone?: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(value);
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

export const EMPTY_ICONS = {
  calendar: CalendarX2,
  waiting: CircleDashed,
};
