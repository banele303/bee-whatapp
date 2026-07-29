"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { Clock3, Save, TimerReset, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  dashboardApi,
  getMemberColor,
  type AvailabilityRule,
  type TeamMember,
} from "@/components/dashboard/data";
import {
  EmptyState,
  LoadingPanel,
  ScreenHeader,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

const days = [
  { value: 1, long: "Monday", short: "Mon" },
  { value: 2, long: "Tuesday", short: "Tue" },
  { value: 3, long: "Wednesday", short: "Wed" },
  { value: 4, long: "Thursday", short: "Thu" },
  { value: 5, long: "Friday", short: "Fri" },
  { value: 6, long: "Saturday", short: "Sat" },
  { value: 0, long: "Sunday", short: "Sun" },
];

type DayState = {
  enabled: boolean;
  start: string;
  end: string;
};

function minutesToTime(value: number | undefined, fallback: string) {
  if (value === undefined) return fallback;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function initialSchedule(rules: AvailabilityRule[]) {
  return Object.fromEntries(
    days.map((day) => {
      const rule = rules.find((entry) => entry.dayOfWeek === day.value);
      return [
        day.value,
        {
          enabled: rule?.active ?? Boolean(rule),
          start: minutesToTime(rule?.startMinute, "09:00"),
          end: minutesToTime(rule?.endMinute, "17:00"),
        } satisfies DayState,
      ];
    }),
  ) as Record<number, DayState>;
}

function WeeklyEditor({
  member,
  rules,
}: {
  member: TeamMember;
  rules: AvailabilityRule[];
}) {
  const { organization, terminology } = useWorkspace();
  const replaceRules = useMutation(dashboardApi.availability.replaceMemberRules);
  const [schedule, setSchedule] = useState(() => initialSchedule(rules));
  const [pending, setPending] = useState(false);

  function updateDay(day: number, update: Partial<DayState>) {
    setSchedule((current) => ({
      ...current,
      [day]: { ...current[day], ...update },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await replaceRules({
        teamMemberId: member._id,
        rules: days.map((day) => ({
          dayOfWeek: day.value,
          startMinute: timeToMinutes(schedule[day.value].start),
          endMinute: timeToMinutes(schedule[day.value].end),
          active: schedule[day.value].enabled,
        })),
      });
      toast.success(`${member.name}’s availability updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update availability");
    } finally {
      setPending(false);
    }
  }

  const activeDays = Object.values(schedule).filter((day) => day.enabled).length;

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-white">
        <CardContent className="pt-0">
          <div className="mb-4 flex flex-col gap-3 border-b border-black/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: getMemberColor(member) }}
                />
                <h2 className="font-heading text-xl font-semibold tracking-tight">
                  {member.name}
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Weekly repeating hours · {organization?.timezone ?? "Organization timezone"}
              </p>
            </div>
            <Badge variant="outline" className="w-fit bg-white">
              {activeDays} active {activeDays === 1 ? "day" : "days"}
            </Badge>
          </div>

          <div className="divide-y divide-black/8">
            {days.map((day) => {
              const row = schedule[day.value];
              return (
                <div
                  key={day.value}
                  className="grid min-h-16 grid-cols-[4.25rem_1fr] items-center gap-3 py-3 sm:grid-cols-[8rem_1fr_auto]"
                >
                  <div className="flex items-center gap-2.5">
                    <Switch
                      checked={row.enabled}
                      onCheckedChange={(enabled) => updateDay(day.value, { enabled })}
                      aria-label={`${row.enabled ? "Disable" : "Enable"} ${day.long}`}
                    />
                    <Label className="text-xs font-medium sm:hidden">{day.short}</Label>
                    <Label className="hidden text-sm font-medium sm:block">{day.long}</Label>
                  </div>

                  {row.enabled ? (
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`${member._id}-${day.value}-start`}>
                        {day.long} start time
                      </label>
                      <Input
                        id={`${member._id}-${day.value}-start`}
                        type="time"
                        value={row.start}
                        onChange={(event) => updateDay(day.value, { start: event.target.value })}
                        className="h-8 min-w-0 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <label className="sr-only" htmlFor={`${member._id}-${day.value}-end`}>
                        {day.long} end time
                      </label>
                      <Input
                        id={`${member._id}-${day.value}-end`}
                        type="time"
                        value={row.end}
                        onChange={(event) => updateDay(day.value, { end: event.target.value })}
                        className="h-8 min-w-0 text-xs"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Unavailable</p>
                  )}

                  <p className="hidden text-right font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase sm:block">
                    {row.enabled ? terminology.bookingPlural : "Off"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-black/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-[11px] leading-5 text-muted-foreground">
              These hours define the recurring availability envelope. Existing{" "}
              {terminology.bookingPlural.toLowerCase()} remain reserved; future
              date exceptions can layer on top.
            </p>
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              {pending ? "Saving…" : "Save week"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export function AvailabilityScreen() {
  const { organization, terminology } = useWorkspace();
  const members = useQuery(
    dashboardApi.team.listMembers,
    organization ? {} : "skip",
  );
  const rules = useQuery(
    dashboardApi.availability.listRules,
    organization ? {} : "skip",
  );
  const bookableMembers = useMemo(
    () =>
      (members ?? []).filter(
        (member) => member.active && member.acceptingBookings,
      ),
    [members],
  );
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const effectiveMemberId =
    bookableMembers.find((member) => member._id === selectedMemberId)?._id ??
    bookableMembers[0]?._id ??
    "";
  const member = bookableMembers.find((entry) => entry._id === effectiveMemberId);
  const memberRules = (rules ?? []).filter(
    (rule) => rule.teamMemberId === effectiveMemberId,
  );

  return (
    <>
      <ScreenHeader
        eyebrow="Capacity rules"
        title="Availability"
        description={`Set the recurring hours when each ${terminology.teamMember.toLowerCase()} can receive ${terminology.bookingPlural.toLowerCase()}. The public page and AI agent use the same rules.`}
        action={
          bookableMembers.length ? (
            <Select value={effectiveMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="w-full min-w-52 bg-white">
                <UsersRound className="size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {bookableMembers.map((entry) => (
                  <SelectItem key={entry._id} value={entry._id}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      {!members || !rules ? (
        <LoadingPanel rows={7} />
      ) : member ? (
        <WeeklyEditor
          key={`${member._id}-${rules.length}`}
          member={member}
          rules={memberRules}
        />
      ) : (
        <EmptyState
          icon={TimerReset}
          title={`No bookable ${terminology.teamMemberPlural.toLowerCase()}`}
          description={`Mark at least one ${terminology.teamMember.toLowerCase()} as bookable before creating a weekly schedule.`}
        />
      )}

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-black/10 bg-white p-3 text-[11px] leading-5 text-muted-foreground">
        <Clock3 className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Times are stored against {organization?.timezone ?? "the organization timezone"},
        keeping public-page, AI-assisted, and internal {terminology.booking.toLowerCase()} flows
        consistent for distributed teams.
      </div>
    </>
  );
}
