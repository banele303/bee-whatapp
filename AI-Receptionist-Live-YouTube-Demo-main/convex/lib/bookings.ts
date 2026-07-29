import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  DAY_MS,
  MINUTE_MS,
  dayOfWeek,
  localDateStringAt,
  localDateTimeFromMinute,
  localPartsAt,
  parseLocalDate,
  zonedDateTimeToUtc,
} from "./time";
import {
  normalizedEmail,
  normalizedPhone,
  optionalTrimmed,
  requiredTrimmed,
} from "./validation";

type ReadCtx = QueryCtx | MutationCtx;

export const MAX_OFFERING_DURATION_MINUTES = 1_440;
export const MAX_BUFFER_MINUTES = 720;
const MAX_RESERVATION_MS = 2 * DAY_MS;
const MAX_OVERLAP_CANDIDATES = 1_000;

export type CustomerInput = {
  name: string;
  email?: string;
  phone?: string;
};

type ContactIdentityPolicy = "update_existing" | "preserve_existing";

export async function requireOfferingForOrganization(
  ctx: ReadCtx,
  organizationId: Id<"organizations">,
  offeringId: Id<"offerings">,
): Promise<Doc<"offerings">> {
  const offering = await ctx.db.get(offeringId);
  if (!offering || offering.organizationId !== organizationId) {
    throw new Error("Offering not found in this organization.");
  }
  return offering;
}

export async function requireTeamMemberForOrganization(
  ctx: ReadCtx,
  organizationId: Id<"organizations">,
  teamMemberId: Id<"teamMembers">,
): Promise<Doc<"teamMembers">> {
  const member = await ctx.db.get(teamMemberId);
  if (!member || member.organizationId !== organizationId) {
    throw new Error("Team member not found in this organization.");
  }
  return member;
}

export function memberCanProvideOffering(
  member: Doc<"teamMembers">,
  offeringId: Id<"offerings">,
): boolean {
  return member.offeringIds.some((id) => id === offeringId);
}

export async function eligibleTeamMembers(
  ctx: ReadCtx,
  organizationId: Id<"organizations">,
  offeringId: Id<"offerings">,
  requestedTeamMemberId?: Id<"teamMembers">,
): Promise<Array<Doc<"teamMembers">>> {
  if (requestedTeamMemberId) {
    const member = await requireTeamMemberForOrganization(
      ctx,
      organizationId,
      requestedTeamMemberId,
    );
    if (
      !member.active ||
      !member.acceptingBookings ||
      !memberCanProvideOffering(member, offeringId)
    ) {
      throw new Error("That team member is not available for this offering.");
    }
    return [member];
  }

  const members = await ctx.db
    .query("teamMembers")
    .withIndex("by_org_active", (q) =>
      q.eq("organizationId", organizationId).eq("active", true),
    )
    .take(201);
  if (members.length > 200) {
    throw new Error("Too many team members to resolve availability safely.");
  }
  return members
    .filter(
      (member) =>
        member.acceptingBookings &&
        memberCanProvideOffering(member, offeringId),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function hasAvailabilityRuleForReservation(
  ctx: ReadCtx,
  organization: Doc<"organizations">,
  member: Doc<"teamMembers">,
  reservedStartAt: number,
  reservedEndAt: number,
): Promise<boolean> {
  const dateString = localDateStringAt(
    reservedStartAt,
    organization.timezone,
  );
  const date = parseLocalDate(dateString);
  const weekday = dayOfWeek(date);
  const rules = await ctx.db
    .query("availabilityRules")
    .withIndex("by_org_member_day", (q) =>
      q
        .eq("organizationId", organization._id)
        .eq("teamMemberId", member._id)
        .eq("dayOfWeek", weekday),
    )
    .take(25);

  for (const rule of rules) {
    if (!rule.active) continue;
    const ruleStart = zonedDateTimeToUtc(
      localDateTimeFromMinute(date, rule.startMinute),
      rule.timezone,
    );
    const ruleEnd = zonedDateTimeToUtc(
      localDateTimeFromMinute(date, rule.endMinute),
      rule.timezone,
    );
    if (
      ruleStart !== null &&
      ruleEnd !== null &&
      reservedStartAt >= ruleStart &&
      reservedEndAt <= ruleEnd
    ) {
      return true;
    }
  }
  return false;
}

export async function hasBookingOverlap(
  ctx: ReadCtx,
  organizationId: Id<"organizations">,
  teamMemberId: Id<"teamMembers">,
  reservedStartAt: number,
  reservedEndAt: number,
  excludeBookingId?: Id<"bookings">,
): Promise<boolean> {
  const candidates = await ctx.db
    .query("bookings")
    .withIndex("by_org_team_reserved_start", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("teamMemberId", teamMemberId)
        .gte("reservedStartAt", reservedStartAt - MAX_RESERVATION_MS)
        .lt("reservedStartAt", reservedEndAt),
    )
    .take(MAX_OVERLAP_CANDIDATES + 1);
  if (candidates.length > MAX_OVERLAP_CANDIDATES) {
    throw new Error("Availability is too dense to verify safely for this window.");
  }
  return candidates.some(
    (booking) =>
      booking._id !== excludeBookingId &&
      booking.status !== "canceled" &&
      booking.reservedStartAt < reservedEndAt &&
      booking.reservedEndAt > reservedStartAt,
  );
}

export async function chooseAvailableTeamMember(
  ctx: ReadCtx,
  organization: Doc<"organizations">,
  offering: Doc<"offerings">,
  startAt: number,
  requestedTeamMemberId?: Id<"teamMembers">,
  excludeBookingId?: Id<"bookings">,
): Promise<{ member: Doc<"teamMembers">; endAt: number; reservedStartAt: number; reservedEndAt: number }> {
  if (!Number.isFinite(startAt) || !Number.isInteger(startAt)) {
    throw new Error("startAt must be a UTC epoch timestamp in milliseconds.");
  }
  const endAt = startAt + offering.durationMinutes * MINUTE_MS;
  const reservedStartAt = startAt - offering.bufferBeforeMinutes * MINUTE_MS;
  const reservedEndAt = endAt + offering.bufferAfterMinutes * MINUTE_MS;
  const members = await eligibleTeamMembers(
    ctx,
    organization._id,
    offering._id,
    requestedTeamMemberId,
  );

  for (const member of members) {
    const withinAvailability = await hasAvailabilityRuleForReservation(
      ctx,
      organization,
      member,
      reservedStartAt,
      reservedEndAt,
    );
    if (!withinAvailability) continue;
    if (
      !(await hasBookingOverlap(
        ctx,
        organization._id,
        member._id,
        reservedStartAt,
        reservedEndAt,
        excludeBookingId,
      ))
    ) {
      return { member, endAt, reservedStartAt, reservedEndAt };
    }
  }
  throw new Error(
    "That time is no longer available. Refresh availability and choose another slot.",
  );
}

export function normalizeCustomer(customer: CustomerInput): CustomerInput & {
  emailNormalized?: string;
  phoneNormalized?: string;
} {
  const name = requiredTrimmed(customer.name, "customer.name", 120);
  const email = normalizedEmail(customer.email);
  const phone = optionalTrimmed(customer.phone, "customer.phone", 40);
  const phoneNormalized = normalizedPhone(phone);
  if (!email && !phoneNormalized) {
    throw new Error("Provide at least one customer email address or phone number.");
  }
  return {
    name,
    email,
    emailNormalized: email,
    phone,
    phoneNormalized,
  };
}

export async function findOrCreateContact(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  customerInput: CustomerInput,
  identityPolicy: ContactIdentityPolicy = "update_existing",
): Promise<Doc<"contacts">> {
  const customer = normalizeCustomer(customerInput);
  let existing: Doc<"contacts"> | null = null;
  if (customer.emailNormalized) {
    existing = await ctx.db
      .query("contacts")
      .withIndex("by_org_email", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("emailNormalized", customer.emailNormalized),
      )
      .first();
  }
  if (!existing && customer.phoneNormalized) {
    existing = await ctx.db
      .query("contacts")
      .withIndex("by_org_phone", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("phoneNormalized", customer.phoneNormalized),
      )
      .first();
  }

  const now = Date.now();
  if (existing) {
    // Public, unverified input may link a booking to a known contact, but it
    // must never be able to replace that contact's canonical identity. The
    // authenticated dashboard keeps the existing update behavior by default.
    if (identityPolicy === "preserve_existing") return existing;

    await ctx.db.patch(existing._id, {
      name: customer.name,
      email: customer.email ?? existing.email,
      emailNormalized: customer.emailNormalized ?? existing.emailNormalized,
      phone: customer.phone ?? existing.phone,
      phoneNormalized: customer.phoneNormalized ?? existing.phoneNormalized,
      updatedAt: now,
    });
    return (await ctx.db.get(existing._id))!;
  }

  const id = await ctx.db.insert("contacts", {
    organizationId,
    name: customer.name,
    email: customer.email,
    emailNormalized: customer.emailNormalized,
    phone: customer.phone,
    phoneNormalized: customer.phoneNormalized,
    tags: [],
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(id))!;
}

function hashString(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7);
}

export function confirmationCode(startAt: number, fingerprint: string): string {
  return `BK-${new Date(startAt).toISOString().slice(2, 10).replaceAll("-", "")}-${hashString(fingerprint).slice(-5)}`;
}

export function bookingView(booking: Doc<"bookings">) {
  return {
    bookingId: booking._id,
    status: booking.status,
    startAt: booking.startAt,
    endAt: booking.endAt,
    startTimeISO: new Date(booking.startAt).toISOString(),
    endTimeISO: new Date(booking.endAt).toISOString(),
    confirmationCode: booking.confirmationCode,
    offering: booking.offeringSnapshot,
    teamMember: booking.teamMemberSnapshot,
    customer: booking.customerSnapshot,
  };
}

export function dateIsWithinBookingWindow(
  startAt: number,
  timeZone: string,
  minimumNoticeMinutes: number,
  maximumAdvanceDays: number,
  now = Date.now(),
): boolean {
  const earliest = now + minimumNoticeMinutes * MINUTE_MS;
  const latest = now + maximumAdvanceDays * DAY_MS;
  // Also force timezone resolution here so invalid tenant configuration fails
  // closed instead of exposing slots.
  localPartsAt(startAt, timeZone);
  return startAt >= earliest && startAt <= latest;
}
