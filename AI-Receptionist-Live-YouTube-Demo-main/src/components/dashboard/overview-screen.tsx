"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  AudioLines,
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  MessageSquareText,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  dashboardApi,
  normalizeBooking,
  type Booking,
} from "@/components/dashboard/data";
import { FeatureEntitlementCard } from "@/components/dashboard/feature-gates";
import {
  EmptyState,
  formatTime,
  LoadingPanel,
  ScreenHeader,
  StatusBadge,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

function BookingRow({ booking }: { booking: Booking }) {
  const { organization } = useWorkspace();
  return (
    <div className="grid grid-cols-[3.5rem_1fr_auto] items-start gap-3 py-3.5 sm:grid-cols-[4.5rem_1fr_auto]">
      <p className="font-mono text-xs font-semibold tracking-tight">
        {formatTime(booking.startAt, organization?.timezone)}
      </p>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{booking.contactName}</p>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {booking.offeringName}
          {booking.teamMemberName ? ` · ${booking.teamMemberName}` : ""}
        </p>
      </div>
      <Badge variant="outline" className="hidden bg-white font-mono text-[10px] sm:flex">
        {booking.source}
      </Badge>
    </div>
  );
}

export function OverviewScreen() {
  const { organization, terminology, orgSlug } = useWorkspace();
  const [referenceTime] = useState(() => Date.now());
  const overview = useQuery(
    dashboardApi.dashboard.overview,
    organization ? {} : "skip",
  );

  if (!overview) {
    return (
      <>
        <ScreenHeader
          eyebrow="Live operations"
          title="Your day, at a glance."
          description={`${terminology.bookingPlural}, conversations, and channel health update here as your organization works.`}
        />
        <LoadingPanel rows={6} />
      </>
    );
  }

  const upcomingBookings = overview.upcomingBookings.map(normalizeBooking);
  const localDateKey = (value: number) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: overview.organization.timezone,
    }).format(value);
  const todayKey = localDateKey(referenceTime);
  const today = upcomingBookings.filter(
    (booking) => localDateKey(booking.startAt) === todayKey,
  );

  const metrics = [
    {
      label: `${terminology.bookingPlural} today`,
      value: overview.stats.bookingsToday,
      note: "Scheduled for today",
      icon: CalendarClock,
    },
    {
      label: "Coming up",
      value: overview.stats.upcomingSevenDays,
      note: `Future ${terminology.bookingPlural.toLowerCase()}`,
      icon: CalendarPlus,
    },
    {
      label: terminology.customerPlural,
      value: overview.stats.totalContacts,
      note: "Known relationships",
      icon: UsersRound,
    },
    {
      label: "Conversations",
      value: overview.stats.conversationsThirtyDays,
      note: "Across every channel",
      icon: MessageSquareText,
    },
  ];

  return (
    <>
      <ScreenHeader
        eyebrow="Live operations"
        title={`Good day, ${overview.organization.name}.`}
        description={`A live read on ${terminology.bookingPlural.toLowerCase()}, ${terminology.customerPlural.toLowerCase()}, and every conversation your team is handling.`}
        action={
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/85">
            <Link href={`/app/${orgSlug}/bookings`}>
              <CalendarPlus className="size-4" /> New {terminology.booking}
            </Link>
          </Button>
        }
      />

      <section className="grid gap-px overflow-hidden rounded-xl border border-black/10 bg-black/10 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                  0{index + 1}
                </span>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-7 font-heading text-4xl font-semibold tracking-[-0.05em] tabular-nums">
                {metric.value}
              </p>
              <p className="mt-2 text-xs font-semibold">{metric.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {metric.note}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.65fr)]">
        <Card className="bg-white">
          <CardHeader className="border-b border-black/8 pb-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Today
              </p>
              <CardTitle className="mt-1 font-heading text-xl tracking-tight">
                The live run sheet
              </CardTitle>
            </div>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/app/${orgSlug}/bookings`}>
                  Full schedule <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {today.length ? (
              <div className="divide-y divide-black/8">
                {today.slice(0, 7).map((booking) => (
                  <BookingRow key={booking._id} booking={booking} />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon={CalendarClock}
                title={`No ${terminology.bookingPlural.toLowerCase()} today`}
                description={`A clear run sheet for now. New ${terminology.bookingPlural.toLowerCase()} will appear here instantly.`}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-3">
            <FeatureEntitlementCard feature="web_agent" compact />
            <FeatureEntitlementCard feature="browser_voice" compact />
          </div>

          <Card className="bg-[#20201e] text-white ring-black/15">
            <CardHeader className="border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">
                  Recent signal
                </p>
                <CardTitle className="mt-1 font-heading text-xl tracking-tight text-white">
                  Conversations
                </CardTitle>
              </div>
              <CardAction>
                <AudioLines className="size-4 text-primary" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {overview.recentConversations.length ? (
                <div>
                  {overview.recentConversations.slice(0, 3).map((conversation, index) => (
                    <div key={conversation._id}>
                      {index > 0 && <Separator className="my-3 bg-white/10" />}
                      <div className="flex items-start gap-3">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-white">
                            {conversation.caller ?? "New contact"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/50">
                            {conversation.summary ?? "Conversation captured and ready to review."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-xs leading-5 text-white/45">
                  Conversation summaries will collect here once your agent starts
                  helping people.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
