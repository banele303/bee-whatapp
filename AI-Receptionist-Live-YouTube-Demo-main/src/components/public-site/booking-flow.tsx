"use client";

import { useMemo, useRef, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  RefreshCcw,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  AvailabilitySlot,
  BookingConfirmation,
  PublicOffering,
  PublicTeamMember,
  PublicTerminology,
} from "@/components/public-site/types";

type BookingStep =
  | "offering"
  | "team"
  | "date"
  | "slot"
  | "details"
  | "confirmation";

type ContactDetails = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const INITIAL_CONTACT: ContactDetails = {
  name: "",
  email: "",
  phone: "",
  notes: "",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatPrice(
  priceMinor: number,
  currency: string,
  locale: string,
) {
  try {
    const fractionDigits = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
    }).format(priceMinor / 10 ** fractionDigits);
  } catch {
    return `${currency} ${(priceMinor / 100).toFixed(2)}`;
  }
}

function formatDateTime(timestamp: number, locale: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timezone,
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function formatTime(timestamp: number, locale: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

function formatCalendarDate(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return date.toLocaleDateString(undefined, options);
  }
}

function todayInTimezone(timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(new Date());
    const value = (type: "year" | "month" | "day") =>
      Number(parts.find((part) => part.type === type)?.value);
    return new Date(value("year"), value("month") - 1, value("day"));
  } catch {
    return startOfDay(new Date());
  }
}

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function bookingErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "That time could not be booked. Please choose another time.";
  }
  const convexMessage = error.message.match(/Uncaught Error:\s*([^\n]+)/)?.[1];
  return (
    convexMessage ||
    (error.message.length <= 220
      ? error.message
      : "That time could not be booked. Please choose another time.")
  );
}

function StepOption({
  selected,
  onClick,
  children,
  className,
  ariaLabel,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-[calc(var(--radius)*1.25)] border bg-background p-4 text-left transition duration-200 outline-none hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/35",
        selected &&
          "border-primary bg-primary/[0.055] shadow-sm ring-1 ring-primary/20",
        className,
      )}
    >
      {selected ? (
        <span className="absolute end-3 top-3 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" aria-hidden="true" />
        </span>
      ) : null}
      {children}
    </button>
  );
}

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </p>
      <h3 className="font-heading text-2xl leading-tight tracking-[-0.035em] sm:text-3xl">
        {title}
      </h3>
      <p className="max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function BookingFlow({
  siteSlug,
  businessName,
  offerings,
  teamMembers,
  terminology,
  locale,
  currency,
  timezone,
  maximumAdvanceDays,
}: {
  siteSlug: string;
  businessName: string;
  offerings: PublicOffering[];
  teamMembers: PublicTeamMember[];
  terminology: PublicTerminology;
  locale: string;
  currency: string;
  timezone: string;
  maximumAdvanceDays: number;
}) {
  const [step, setStep] = useState<BookingStep>("offering");
  const [offeringId, setOfferingId] = useState<PublicOffering["_id"] | null>(
    null,
  );
  const [teamMemberId, setTeamMemberId] = useState<
    PublicTeamMember["_id"] | null
  >(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [contact, setContact] = useState<ContactDetails>(INITIAL_CONTACT);
  const [confirmation, setConfirmation] =
    useState<BookingConfirmation | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const bookingToday = useMemo(() => todayInTimezone(timezone), [timezone]);

  const createBooking = useMutation(api.publicBooking.create);
  const selectedOffering = offerings.find((item) => item._id === offeringId);
  const eligibleTeamMembers = useMemo(
    () =>
      offeringId
        ? teamMembers.filter((member) =>
            member.offeringIds.some((id) => id === offeringId),
          )
        : teamMembers,
    [offeringId, teamMembers],
  );
  const selectedTeamMember = teamMembers.find(
    (member) => member._id === teamMemberId,
  );
  const dateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const availability = useQuery(
    api.publicBooking.getAvailability,
    offeringId && dateKey
      ? {
          siteSlug,
          offeringId,
          date: dateKey,
          ...(teamMemberId ? { teamMemberId } : {}),
        }
      : "skip",
  );

  const availableSlots = useMemo(() => {
    if (!availability) return [];
    if (teamMemberId) return availability.slots;
    return availability.slots.filter(
      (slot, index, slots) =>
        slots.findIndex((candidate) => candidate.startAt === slot.startAt) ===
        index,
    );
  }, [availability, teamMemberId]);

  const steps = useMemo(
    () =>
      [
        { key: "offering" as const, label: terminology.offeringSingular },
        ...(eligibleTeamMembers.length
          ? [{ key: "team" as const, label: terminology.teamMemberSingular }]
          : []),
        { key: "date" as const, label: "Date" },
        { key: "slot" as const, label: "Time" },
        { key: "details" as const, label: "Details" },
        { key: "confirmation" as const, label: "Confirmed" },
      ],
    [eligibleTeamMembers.length, terminology],
  );

  const currentStepIndex = Math.max(
    0,
    steps.findIndex((item) => item.key === step),
  );
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  function resetDownstream(from: BookingStep) {
    const position = ["offering", "team", "date", "slot", "details"].indexOf(
      from,
    );
    if (position <= 0) setTeamMemberId(null);
    if (position <= 1) setSelectedDate(undefined);
    if (position <= 2) setSelectedSlot(null);
    if (position <= 3) setSubmitError(null);
  }

  function selectOffering(nextOfferingId: PublicOffering["_id"]) {
    if (nextOfferingId !== offeringId) idempotencyKeyRef.current = null;
    setOfferingId(nextOfferingId);
    resetDownstream("offering");
  }

  function selectDate(date: Date | undefined) {
    if (date?.getTime() !== selectedDate?.getTime()) {
      idempotencyKeyRef.current = null;
    }
    setSelectedDate(date);
    setSelectedSlot(null);
    setSubmitError(null);
  }

  function updateContact(field: keyof ContactDetails, value: string) {
    idempotencyKeyRef.current = null;
    setContact((current) => ({ ...current, [field]: value }));
  }

  function goBack() {
    if (currentStepIndex <= 0) return;
    setSubmitError(null);
    setStep(steps[currentStepIndex - 1].key);
  }

  function startAgain() {
    setStep("offering");
    setOfferingId(null);
    setTeamMemberId(null);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setContact(INITIAL_CONTACT);
    setConfirmation(null);
    setSubmitError(null);
    idempotencyKeyRef.current = null;
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offeringId || !selectedSlot) return;

    const name = contact.name.trim();
    const email = contact.email.trim();
    const phone = contact.phone.trim();
    if (!name) {
      setSubmitError("Please add your name.");
      return;
    }
    if (!email && !phone) {
      setSubmitError("Please add an email address or phone number.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    idempotencyKeyRef.current ??= makeIdempotencyKey();

    try {
      const result = await createBooking({
        siteSlug,
        offeringId,
        ...(teamMemberId ? { teamMemberId } : {}),
        startAt: selectedSlot.startAt,
        customer: {
          name,
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
        },
        ...(contact.notes.trim() ? { notes: contact.notes.trim() } : {}),
        idempotencyKey: idempotencyKeyRef.current,
      });
      setConfirmation(result);
      setStep("confirmation");
    } catch (error) {
      setSubmitError(bookingErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (offerings.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl bg-card/75">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted">
            <CalendarDays className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-heading text-xl">
              Online {terminology.bookingPlural.toLowerCase()} are coming soon
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {businessName} has not published any {terminology.offeringPlural.toLowerCase()} yet.
              Please use the contact details on this page for help.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-6xl overflow-visible bg-card/80 py-0 shadow-[0_24px_80px_-44px_color-mix(in_srgb,var(--foreground)_35%,transparent)] backdrop-blur-sm">
      <div className="grid min-h-[37rem] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-b bg-muted/45 p-5 lg:border-e lg:border-b-0 lg:p-6">
          <div className="lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-4 lg:block">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Book with
                </p>
                <p className="mt-1 font-heading text-lg leading-tight">{businessName}</p>
              </div>
              <Badge variant="outline" className="bg-background/60">
                {currentStepIndex + 1} / {steps.length}
              </Badge>
            </div>
            <Progress
              value={progress}
              className="mt-4 lg:hidden"
              aria-label={`${terminology.bookingSingular} progress: step ${currentStepIndex + 1} of ${steps.length}`}
            />

            <ol
              className="mt-7 hidden space-y-1 lg:block"
              aria-label={`${terminology.bookingSingular} steps`}
            >
              {steps.map((item, index) => {
                const isActive = item.key === step;
                const isComplete = index < currentStepIndex;
                const canNavigate = isComplete && step !== "confirmation";
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      disabled={!canNavigate}
                      onClick={() => canNavigate && setStep(item.key)}
                      aria-current={isActive ? "step" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition",
                        isActive && "bg-background font-medium shadow-sm",
                        !isActive && "text-muted-foreground",
                        canNavigate && "hover:bg-background/60 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border text-[0.68rem]",
                          isActive && "border-primary bg-primary text-primary-foreground",
                          isComplete && "border-primary/25 bg-primary/10 text-primary",
                        )}
                      >
                        {isComplete ? <Check className="size-3" /> : index + 1}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {selectedOffering && step !== "confirmation" ? (
              <div className="mt-7 hidden space-y-3 rounded-xl border bg-background/60 p-3.5 text-xs lg:block">
                <p className="font-medium">Your selection</p>
                <div className="space-y-2 text-muted-foreground">
                  <p className="flex items-start justify-between gap-3">
                    <span>{selectedOffering.name}</span>
                    <span className="shrink-0 text-foreground">
                      {formatPrice(
                        selectedOffering.priceMinor,
                        selectedOffering.currency || currency,
                        locale,
                      )}
                    </span>
                  </p>
                  {selectedOffering.durationMinutes ? (
                    <p>{selectedOffering.durationMinutes} min</p>
                  ) : null}
                  {selectedTeamMember ? <p>With {selectedTeamMember.name}</p> : null}
                  {selectedDate ? (
                    <p>
                      {formatCalendarDate(selectedDate, locale, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  ) : null}
                  {selectedSlot ? (
                    <p className="font-medium text-foreground">
                      {formatTime(selectedSlot.startAt, locale, timezone)}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <CardContent className="flex min-w-0 flex-col p-5 sm:p-8 lg:p-10">
          <div className="flex-1">
            {step === "offering" ? (
              <div className="space-y-7">
                <StepHeading
                  eyebrow={`Choose a ${terminology.offeringSingular.toLowerCase()}`}
                  title={`What can ${businessName} help you with?`}
                  description={`Select one ${terminology.offeringSingular.toLowerCase()} to see the right people and available times.`}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {offerings.map((offering) => (
                    <StepOption
                      key={offering._id}
                      selected={offering._id === offeringId}
                      onClick={() => selectOffering(offering._id)}
                      ariaLabel={`Select ${offering.name}`}
                    >
                      <div className="pe-8">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-heading text-base font-medium">
                            {offering.name}
                          </p>
                          {offering.category ? (
                            <Badge variant="secondary" className="text-[0.65rem]">
                              {offering.category}
                            </Badge>
                          ) : null}
                        </div>
                        {offering.description ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                            {offering.description}
                          </p>
                        ) : null}
                        <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock3 className="size-3.5" aria-hidden="true" />
                            {offering.durationMinutes} min
                          </span>
                          <span className="font-semibold">
                            {formatPrice(
                              offering.priceMinor,
                              offering.currency || currency,
                              locale,
                            )}
                          </span>
                        </div>
                      </div>
                    </StepOption>
                  ))}
                </div>
              </div>
            ) : null}

            {step === "team" ? (
              <div className="space-y-7">
                <StepHeading
                  eyebrow={`Choose a ${terminology.teamMemberSingular.toLowerCase()}`}
                  title="Is there someone you prefer?"
                  description="Pick a specific person, or choose no preference to see the widest range of times."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <StepOption
                    selected={teamMemberId === null}
                    onClick={() => {
                      if (teamMemberId !== null) idempotencyKeyRef.current = null;
                      setTeamMemberId(null);
                      setSelectedDate(undefined);
                      setSelectedSlot(null);
                    }}
                    ariaLabel="Select no preference"
                  >
                    <div className="flex min-h-16 items-center gap-3 pe-8">
                      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-muted">
                        <UsersRound className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-heading text-base font-medium">No preference</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          First available {terminology.teamMemberSingular.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  </StepOption>
                  {eligibleTeamMembers.map((member) => (
                    <StepOption
                      key={member._id}
                      selected={member._id === teamMemberId}
                      onClick={() => {
                        if (teamMemberId !== member._id) {
                          idempotencyKeyRef.current = null;
                        }
                        setTeamMemberId(member._id);
                        setSelectedDate(undefined);
                        setSelectedSlot(null);
                      }}
                      ariaLabel={`Select ${member.name}`}
                    >
                      <div className="flex min-h-16 items-center gap-3 pe-8">
                        <Avatar className="size-11">
                          <AvatarImage src={member.imageUrl} alt="" />
                          <AvatarFallback>{initials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-heading text-base font-medium">
                            {member.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {member.title}
                          </p>
                        </div>
                      </div>
                    </StepOption>
                  ))}
                </div>
              </div>
            ) : null}

            {step === "date" ? (
              <div className="space-y-7">
                <StepHeading
                  eyebrow="Choose a date"
                  title="What date works best?"
                  description={`Dates and availability are shown in ${timezone.replaceAll("_", " ")}.`}
                />
                <div className="overflow-x-auto rounded-[calc(var(--radius)*1.25)] border bg-background p-2 sm:w-fit">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={selectDate}
                    defaultMonth={selectedDate}
                    disabled={{
                      before: bookingToday,
                      after: addDays(
                        bookingToday,
                        Math.max(1, maximumAdvanceDays),
                      ),
                    }}
                    className="mx-auto bg-transparent [--cell-size:--spacing(9)] sm:[--cell-size:--spacing(10)]"
                  />
                </div>
              </div>
            ) : null}

            {step === "slot" ? (
              <div className="space-y-7">
                <StepHeading
                  eyebrow="Choose a time"
                  title={
                    selectedDate
                      ? formatCalendarDate(selectedDate, locale, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })
                      : "Available times"
                  }
                  description={`Times are shown in ${timezone.replaceAll("_", " ")}. Availability can change until your ${terminology.bookingSingular.toLowerCase()} is confirmed.`}
                />

                {availability === undefined ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Loading available times">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 rounded-lg" />
                    ))}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <Alert>
                    <CalendarDays />
                    <AlertTitle>No times are open on this date</AlertTitle>
                    <AlertDescription>
                      Try another date or choose no preference for the widest availability.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.startAt === slot.startAt;
                      return (
                        <Button
                          key={`${slot.startAt}-${slot.teamMemberId}`}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="lg"
                          aria-pressed={isSelected}
                          onClick={() => {
                            if (
                              selectedSlot?.startAt !== slot.startAt ||
                              selectedSlot?.teamMemberId !== slot.teamMemberId
                            ) {
                              idempotencyKeyRef.current = null;
                            }
                            setSelectedSlot(slot);
                          }}
                          className="h-auto min-h-12 flex-col gap-0.5 py-2"
                        >
                          <span>{formatTime(slot.startAt, locale, availability.timezone)}</span>
                          <span
                            className={cn(
                              "max-w-full truncate text-[0.66rem] font-normal opacity-65",
                              isSelected && "text-primary-foreground",
                            )}
                          >
                            {teamMemberId ? slot.teamMemberName : "Available"}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {step === "details" ? (
              <form id="public-booking-form" onSubmit={submitBooking} className="space-y-7">
                <StepHeading
                  eyebrow="Your details"
                  title="Almost there"
                  description={`Tell ${businessName} who the ${terminology.bookingSingular.toLowerCase()} is for. Add at least one way to reach you.`}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="booking-name">Name</Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="booking-name"
                        autoComplete="name"
                        required
                        value={contact.name}
                        onChange={(event) => updateContact("name", event.target.value)}
                        className="h-11 ps-9"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="booking-email">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="booking-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={contact.email}
                        onChange={(event) => updateContact("email", event.target.value)}
                        className="h-11 ps-9"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="booking-phone">Phone</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="booking-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={contact.phone}
                        onChange={(event) => updateContact("phone", event.target.value)}
                        className="h-11 ps-9"
                        placeholder="Your phone number"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="booking-notes">
                      Notes <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="booking-notes"
                      value={contact.notes}
                      onChange={(event) => updateContact("notes", event.target.value)}
                      placeholder={`Anything the ${terminology.teamMemberPlural.toLowerCase()} should know beforehand?`}
                      className="min-h-24 resize-y"
                      maxLength={1000}
                    />
                  </div>
                </div>

                {submitError ? (
                  <Alert variant="destructive" aria-live="polite">
                    <RefreshCcw />
                    <AlertTitle>We couldn&apos;t confirm that time</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                ) : null}
              </form>
            ) : null}

            {step === "confirmation" && confirmation ? (
              <div className="mx-auto max-w-xl py-4 text-center sm:py-8">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/15">
                  <CheckCircle2 className="size-8" aria-hidden="true" />
                </div>
                <p className="mt-6 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {terminology.bookingSingular} confirmed
                </p>
                <h3 className="mt-2 font-heading text-3xl tracking-[-0.04em] sm:text-4xl">
                  You&apos;re all set, {confirmation.customer.name}
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  {confirmation.offering.name} is booked with {confirmation.teamMember.name} at {businessName}.
                </p>

                <div className="mt-8 rounded-[calc(var(--radius)*1.35)] border bg-background p-5 text-left">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Confirmation</p>
                      <p className="mt-1 font-mono text-sm font-semibold tracking-[0.12em]">
                        {confirmation.confirmationCode}
                      </p>
                    </div>
                    <Badge className="capitalize">{confirmation.status}</Badge>
                  </div>
                  <Separator className="my-5" />
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {terminology.offeringSingular}
                      </dt>
                      <dd className="mt-1 font-medium">{confirmation.offering.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">When</dt>
                      <dd className="mt-1 font-medium">
                        {formatDateTime(confirmation.startAt, locale, timezone)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {terminology.teamMemberSingular}
                      </dt>
                      <dd className="mt-1 font-medium">{confirmation.teamMember.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Total</dt>
                      <dd className="mt-1 font-medium">
                        {formatPrice(
                          confirmation.offering.priceMinor,
                          confirmation.offering.currency,
                          locale,
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <Button type="button" variant="outline" size="lg" onClick={startAgain} className="mt-6 h-11">
                  <Sparkles data-icon="inline-start" />
                  Make another {terminology.bookingSingular.toLowerCase()}
                </Button>
              </div>
            ) : null}
          </div>

          {step !== "confirmation" ? (
            <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={goBack}
                disabled={currentStepIndex === 0}
                className="h-11"
              >
                <ArrowLeft data-icon="inline-start" />
                Back
              </Button>

              {step === "offering" ? (
                <Button
                  type="button"
                  size="lg"
                  disabled={!offeringId}
                  onClick={() =>
                    setStep(eligibleTeamMembers.length ? "team" : "date")
                  }
                  className="h-11 px-4"
                >
                  Continue
                  <ArrowRight data-icon="inline-end" />
                </Button>
              ) : null}
              {step === "team" ? (
                <Button type="button" size="lg" onClick={() => setStep("date")} className="h-11 px-4">
                  Choose a date
                  <ArrowRight data-icon="inline-end" />
                </Button>
              ) : null}
              {step === "date" ? (
                <Button
                  type="button"
                  size="lg"
                  disabled={!selectedDate}
                  onClick={() => setStep("slot")}
                  className="h-11 px-4"
                >
                  See available times
                  <ArrowRight data-icon="inline-end" />
                </Button>
              ) : null}
              {step === "slot" ? (
                availability && availableSlots.length === 0 ? (
                  <Button type="button" size="lg" onClick={() => setStep("date")} className="h-11 px-4">
                    Try another date
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    disabled={!selectedSlot}
                    onClick={() => setStep("details")}
                    className="h-11 px-4"
                  >
                    Add your details
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                )
              ) : null}
              {step === "details" ? (
                <Button
                  type="submit"
                  form="public-booking-form"
                  size="lg"
                  disabled={isSubmitting}
                  className="h-11 px-4"
                >
                  {isSubmitting ? "Confirming…" : `Confirm ${terminology.bookingSingular.toLowerCase()}`}
                  {!isSubmitting ? <Check data-icon="inline-end" /> : null}
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </div>
    </Card>
  );
}
