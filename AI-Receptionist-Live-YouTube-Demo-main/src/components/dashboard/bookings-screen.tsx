"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarDays,
  CalendarPlus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  dashboardApi,
  normalizeBooking,
  type Booking,
  type BookingStatus,
} from "@/components/dashboard/data";
import {
  EmptyState,
  formatDateTime,
  formatMoney,
  LoadingPanel,
  ScreenHeader,
  StatusBadge,
  SubmitButton,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

const statuses: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "canceled",
  "no_show",
];

function CreateBookingDialog() {
  const { terminology } = useWorkspace();
  const offerings = useQuery(dashboardApi.catalog.listOfferings, {});
  const members = useQuery(dashboardApi.team.listMembers, {});
  const createBooking = useMutation(
    dashboardApi.bookings.createForCurrentOrg,
  );
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [offeringId, setOfferingId] = useState("");
  const [memberId, setMemberId] = useState("unassigned");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startValue = String(form.get("startAt") ?? "");
    if (!offeringId || !startValue) return;

    setPending(true);
    try {
      await createBooking({
        offeringId,
        teamMemberId: memberId === "unassigned" ? undefined : memberId,
        startAt: new Date(startValue).getTime(),
        customer: {
          name: String(form.get("contactName") ?? "").trim(),
          email: String(form.get("contactEmail") ?? "").trim() || undefined,
          phone: String(form.get("contactPhone") ?? "").trim() || undefined,
        },
        notes: String(form.get("notes") ?? "").trim() || undefined,
      });
      toast.success(`${terminology.booking} created`);
      setOpen(false);
      setOfferingId("");
      setMemberId("unassigned");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Could not create ${terminology.booking.toLowerCase()}`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/85">
          <CalendarPlus /> New {terminology.booking}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl tracking-tight">
            Create {terminology.booking.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Add it directly to the live schedule. The selected time uses your
            local browser timezone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="contactName">{terminology.customer} name</Label>
              <Input id="contactName" name="contactName" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Phone</Label>
              <Input id="contactPhone" name="contactPhone" type="tel" />
            </div>
            <div className="space-y-1.5">
              <Label>{terminology.offering}</Label>
              <Select value={offeringId} onValueChange={setOfferingId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Choose ${terminology.offering.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {(offerings ?? [])
                    .filter((offering) => offering.active)
                    .map((offering) => (
                      <SelectItem key={offering._id} value={offering._id}>
                        {offering.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{terminology.teamMember}</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(members ?? [])
                    .filter(
                      (member) =>
                        member.active &&
                        member.acceptingBookings &&
                        member.offeringIds.includes(offeringId),
                    )
                    .map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="startAt">Start date and time</Label>
              <Input id="startAt" name="startAt" type="datetime-local" required />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Internal note</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Access details, preferences, context…"
              />
            </div>
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>
              Create {terminology.booking.toLowerCase()}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BookingStatusSelect({ booking }: { booking: Booking }) {
  const updateStatus = useMutation(dashboardApi.bookings.updateStatus);
  const [pending, setPending] = useState(false);

  async function handleChange(status: BookingStatus) {
    setPending(true);
    try {
      await updateStatus({ bookingId: booking._id, status });
      toast.success("Status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update status");
    } finally {
      setPending(false);
    }
  }

  return (
    <Select
      value={booking.status}
      onValueChange={(value) => void handleChange(value as BookingStatus)}
      disabled={pending}
    >
      <SelectTrigger size="sm" className="min-w-28 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {status.replaceAll("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BookingsScreen() {
  const { organization, terminology } = useWorkspace();
  const bookings = useQuery(
    dashboardApi.bookings.listForCurrentOrg,
    organization ? { limit: 200 } : "skip",
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const normalizedBookings = useMemo(
    () => (bookings ?? []).map(normalizeBooking),
    [bookings],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedBookings.filter((booking) => {
      const statusMatches =
        statusFilter === "all" || booking.status === statusFilter;
      const queryMatches =
        !normalizedQuery ||
        [
          booking.contactName,
          booking.contactEmail,
          booking.contactPhone,
          booking.offeringName,
          booking.teamMemberName,
        ].some((value) => value?.toLowerCase().includes(normalizedQuery));
      return statusMatches && queryMatches;
    });
  }, [normalizedBookings, query, statusFilter]);

  return (
    <>
      <ScreenHeader
        eyebrow="Schedule desk"
        title={terminology.bookingPlural}
        description={`Create, search, and manage every ${terminology.booking.toLowerCase()} across your public page, AI agent, and team.`}
        action={<CreateBookingDialog />}
      />

      <Card className="bg-white">
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-col gap-3 border-b border-black/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${terminology.bookingPlural.toLowerCase()}…`}
                className="pl-8"
                aria-label={`Search ${terminology.bookingPlural.toLowerCase()}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full min-w-36 sm:w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!bookings ? (
            <LoadingPanel rows={6} />
          ) : filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date & time</TableHead>
                  <TableHead>{terminology.customer}</TableHead>
                  <TableHead>{terminology.offering}</TableHead>
                  <TableHead className="hidden lg:table-cell">{terminology.teamMember}</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                  <TableHead className="hidden sm:table-cell">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell className="font-mono text-xs">
                      {formatDateTime(booking.startAt, organization?.timezone)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{booking.contactName}</p>
                      <p className="mt-0.5 max-w-40 truncate text-[11px] text-muted-foreground">
                        {booking.contactEmail ?? booking.contactPhone ?? "No contact details"}
                      </p>
                    </TableCell>
                    <TableCell>{booking.offeringName}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {booking.teamMemberName ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-mono text-[10px] tracking-wide uppercase">
                        {booking.source}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatMoney(
                        booking.priceCents,
                        booking.currency || organization?.currency,
                        organization?.locale,
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <BookingStatusSelect booking={booking} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title={
                query || statusFilter !== "all"
                  ? `No matching ${terminology.bookingPlural.toLowerCase()}`
                  : `No ${terminology.bookingPlural.toLowerCase()} yet`
              }
              description={
                query || statusFilter !== "all"
                  ? "Adjust the search or status filter to widen the schedule."
                  : `Create the first ${terminology.booking.toLowerCase()} or let your public page and agent do it for you.`
              }
              action={!query && statusFilter === "all" ? <CreateBookingDialog /> : undefined}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
