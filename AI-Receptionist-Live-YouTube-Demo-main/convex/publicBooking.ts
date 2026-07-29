import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  bookingView,
  chooseAvailableTeamMember,
  confirmationCode,
  dateIsWithinBookingWindow,
  eligibleTeamMembers,
  findOrCreateContact,
  normalizeCustomer,
  requireOfferingForOrganization,
} from "./lib/bookings";
import {
  DAY_MS,
  MINUTE_MS,
  addLocalDays,
  dayOfWeek,
  localDateTimeFromMinute,
  localPartsAt,
  parseLocalDate,
  zonedDateTimeToUtc,
} from "./lib/time";
import {
  normalizedPhone,
  optionalTrimmed,
  requiredTrimmed,
} from "./lib/validation";

const TEN_MINUTES_MS = 10 * MINUTE_MS;
const HOUR_MS = 60 * MINUTE_MS;
const SITE_BURST_LIMIT = 40;
const SITE_DAILY_LIMIT = 1_000;
const CONTACT_HOURLY_LIMIT = 3;
const CONTACT_DAILY_LIMIT = 8;
const MANAGEMENT_SITE_BURST_LIMIT = 120;
const MANAGEMENT_CONTACT_HOURLY_LIMIT = 20;
const RATE_LIMIT_CLEANUP_BATCH = 32;

function hashContactIdentifier(value: string): string {
  // Store a stable fingerprint, not raw customer contact data, in the rate
  // limit table. Two independent 32-bit accumulators make accidental
  // collisions much less likely than the short confirmation-code hash.
  let first = 2_166_136_261;
  let second = 2_654_435_761;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 16_777_619);
    second ^= code + index;
    second = Math.imul(second, 2_246_822_519);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

async function incrementPublicBookingWindow(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  publicSiteId: Id<"publicSites">,
  scopeKey: string,
  windowMs: number,
  limit: number,
  now: number,
) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const row = await ctx.db
    .query("publicBookingRateLimits")
    .withIndex("by_org_site_scope_window", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("publicSiteId", publicSiteId)
        .eq("scopeKey", scopeKey)
        .eq("windowStart", windowStart),
    )
    .unique();

  if (row && row.count >= limit) {
    throw new Error("Too many booking requests. Please wait and try again later.");
  }
  if (row) {
    await ctx.db.patch(row._id, { count: row.count + 1 });
  } else {
    await ctx.db.insert("publicBookingRateLimits", {
      organizationId,
      publicSiteId,
      scopeKey,
      windowStart,
      count: 1,
      // Retain one additional window so boundary retries remain auditable,
      // then delete incrementally on later successful booking attempts.
      expiresAt: windowStart + 2 * windowMs,
    });
  }
}

async function applyPublicBookingRateLimits(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  publicSiteId: Id<"publicSites">,
  customer: ReturnType<typeof normalizeCustomer>,
  now: number,
) {
  // Cleanup is deliberately capped and tenant/site scoped. Every query below
  // uses an index; this path never scans or collects an unbounded table.
  const expired = await ctx.db
    .query("publicBookingRateLimits")
    .withIndex("by_org_site_expires", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("publicSiteId", publicSiteId)
        .lt("expiresAt", now),
    )
    .take(RATE_LIMIT_CLEANUP_BATCH);
  for (const row of expired) await ctx.db.delete(row._id);

  await incrementPublicBookingWindow(
    ctx,
    organizationId,
    publicSiteId,
    "site:10m",
    TEN_MINUTES_MS,
    SITE_BURST_LIMIT,
    now,
  );
  await incrementPublicBookingWindow(
    ctx,
    organizationId,
    publicSiteId,
    "site:day",
    DAY_MS,
    SITE_DAILY_LIMIT,
    now,
  );

  // Apply the contact limits independently to every supplied identifier. This
  // prevents changing a phone number from bypassing an email limit (or vice
  // versa) when both were provided. normalizeCustomer guarantees at least one.
  const contactScopes = [
    customer.emailNormalized
      ? `email:${hashContactIdentifier(
          `${organizationId}:email:${customer.emailNormalized}`,
        )}`
      : undefined,
    customer.phoneNormalized
      ? `phone:${hashContactIdentifier(
          `${organizationId}:phone:${customer.phoneNormalized}`,
        )}`
      : undefined,
  ].filter((scope): scope is string => scope !== undefined);

  for (const contactScope of contactScopes) {
    await incrementPublicBookingWindow(
      ctx,
      organizationId,
      publicSiteId,
      `contact:hour:${contactScope}`,
      HOUR_MS,
      CONTACT_HOURLY_LIMIT,
      now,
    );
    await incrementPublicBookingWindow(
      ctx,
      organizationId,
      publicSiteId,
      `contact:day:${contactScope}`,
      DAY_MS,
      CONTACT_DAILY_LIMIT,
      now,
    );
  }
}

async function applyPublicManagementRateLimits(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  publicSiteId: Id<"publicSites">,
  phoneNormalized: string,
  now: number,
) {
  const expired = await ctx.db
    .query("publicBookingRateLimits")
    .withIndex("by_org_site_expires", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("publicSiteId", publicSiteId)
        .lt("expiresAt", now),
    )
    .take(RATE_LIMIT_CLEANUP_BATCH);
  for (const row of expired) await ctx.db.delete(row._id);

  await incrementPublicBookingWindow(
    ctx,
    organizationId,
    publicSiteId,
    "manage:site:10m",
    TEN_MINUTES_MS,
    MANAGEMENT_SITE_BURST_LIMIT,
    now,
  );
  await incrementPublicBookingWindow(
    ctx,
    organizationId,
    publicSiteId,
    `manage:contact:hour:${hashContactIdentifier(
      `${organizationId}:phone:${phoneNormalized}`,
    )}`,
    HOUR_MS,
    MANAGEMENT_CONTACT_HOURLY_LIMIT,
    now,
  );
}

function publicManagementView(booking: Doc<"bookings">) {
  const view = bookingView(booking);
  return {
    status: view.status,
    startAt: view.startAt,
    endAt: view.endAt,
    startTimeISO: view.startTimeISO,
    endTimeISO: view.endTimeISO,
    confirmationCode: view.confirmationCode,
    offering: view.offering,
    teamMember: view.teamMember,
    customerName: booking.customerSnapshot.name,
  };
}

async function requirePublicBookingAccess(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  confirmationCodeRaw: string,
  phoneRaw: string,
) {
  const confirmationCodeValue = requiredTrimmed(
    confirmationCodeRaw,
    "confirmationCode",
    40,
  ).toUpperCase();
  const phone = normalizedPhone(phoneRaw);
  if (!phone) throw new Error("Provide the contact phone number for this booking.");

  const candidates = await ctx.db
    .query("bookings")
    .withIndex("by_org_confirmation", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("confirmationCode", confirmationCodeValue),
    )
    .take(11);
  if (candidates.length > 10) return null;
  const booking = candidates.find(
    (candidate) =>
      normalizedPhone(candidate.customerSnapshot.phone) === phone,
  );
  return booking ?? null;
}

async function publicContext(
  ctx: Parameters<typeof requireOfferingForOrganization>[0],
  siteSlugRaw: string,
  requireBookingEnabled = true,
) {
  const siteSlug = siteSlugRaw.trim().toLowerCase();
  const site = await ctx.db
    .query("publicSites")
    .withIndex("by_site_slug", (q) => q.eq("siteSlug", siteSlug))
    .unique();
  if (!site?.published || !site.publishedAt) throw new Error("Published site not found.");
  const organization = await ctx.db.get(site.organizationId);
  if (!organization) throw new Error("Published organization not found.");
  if (requireBookingEnabled && !site.published.booking.enabled) {
    throw new Error("Online booking is not enabled for this site.");
  }
  return { site, organization, config: site.published };
}

export const getAvailability = query({
  args: {
    siteSlug: v.string(),
    offeringId: v.id("offerings"),
    date: v.string(),
    teamMemberId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const { organization, config } = await publicContext(ctx, args.siteSlug);
    const offering = await requireOfferingForOrganization(
      ctx,
      organization._id,
      args.offeringId,
    );
    if (!offering.active || !offering.bookableOnline) {
      throw new Error("This offering is not available for online booking.");
    }
    const date = parseLocalDate(args.date);
    const weekday = dayOfWeek(date);
    const nextDate = addLocalDays(date, 1);
    const dayStart = zonedDateTimeToUtc(
      { ...date, hour: 0, minute: 0 },
      organization.timezone,
    );
    const dayEnd = zonedDateTimeToUtc(
      { ...nextDate, hour: 0, minute: 0 },
      organization.timezone,
    );
    if (dayStart === null || dayEnd === null) {
      throw new Error("Could not resolve that date in the organization's timezone.");
    }

    const members = await eligibleTeamMembers(
      ctx,
      organization._id,
      offering._id,
      args.teamMemberId,
    );
    if (members.length > 50) {
      throw new Error("Select a team member to narrow this availability search.");
    }

    const now = Date.now();
    const slots: Array<{
      startAt: number;
      endAt: number;
      startTimeISO: string;
      endTimeISO: string;
      teamMemberId: Id<"teamMembers">;
      teamMemberName: string;
    }> = [];
    for (const member of members) {
      const [rules, bookings] = await Promise.all([
        ctx.db
          .query("availabilityRules")
          .withIndex("by_org_member_day", (q) =>
            q
              .eq("organizationId", organization._id)
              .eq("teamMemberId", member._id)
              .eq("dayOfWeek", weekday),
          )
          .take(25),
        ctx.db
          .query("bookings")
          .withIndex("by_org_team_reserved_start", (q) =>
            q
              .eq("organizationId", organization._id)
              .eq("teamMemberId", member._id)
              .gte("reservedStartAt", dayStart - 2 * DAY_MS)
              .lt("reservedStartAt", dayEnd + DAY_MS),
          )
          .take(1_001),
      ]);
      if (bookings.length > 1_000) {
        throw new Error("Availability is too dense to calculate safely for this date.");
      }

      for (const rule of rules) {
        if (!rule.active) continue;
        const firstPossibleMinute = rule.startMinute + offering.bufferBeforeMinutes;
        const firstStartMinute =
          Math.ceil(firstPossibleMinute / config.booking.slotIntervalMinutes) *
          config.booking.slotIntervalMinutes;
        const finalStartMinute =
          rule.endMinute - offering.durationMinutes - offering.bufferAfterMinutes;

        for (
          let startMinute = firstStartMinute;
          startMinute <= finalStartMinute;
          startMinute += config.booking.slotIntervalMinutes
        ) {
          if (slots.length >= 500) break;
          const startAt = zonedDateTimeToUtc(
            localDateTimeFromMinute(date, startMinute),
            rule.timezone,
          );
          if (startAt === null) continue;
          if (
            !dateIsWithinBookingWindow(
              startAt,
              organization.timezone,
              config.booking.minimumNoticeMinutes,
              config.booking.maximumAdvanceDays,
              now,
            )
          ) {
            continue;
          }
          const endAt = startAt + offering.durationMinutes * MINUTE_MS;
          const reservedStartAt =
            startAt - offering.bufferBeforeMinutes * MINUTE_MS;
          const reservedEndAt = endAt + offering.bufferAfterMinutes * MINUTE_MS;
          const overlaps = bookings.some(
            (booking) =>
              booking.status !== "canceled" &&
              booking.reservedStartAt < reservedEndAt &&
              booking.reservedEndAt > reservedStartAt,
          );
          if (!overlaps) {
            slots.push({
              startAt,
              endAt,
              startTimeISO: new Date(startAt).toISOString(),
              endTimeISO: new Date(endAt).toISOString(),
              teamMemberId: member._id,
              teamMemberName: member.name,
            });
          }
        }
      }
    }
    slots.sort(
      (a, b) =>
        a.startAt - b.startAt || a.teamMemberName.localeCompare(b.teamMemberName),
    );
    return {
      date: args.date,
      timezone: organization.timezone,
      offering: {
        _id: offering._id,
        name: offering.name,
        durationMinutes: offering.durationMinutes,
      },
      slots,
    };
  },
});

export const create = mutation({
  args: {
    siteSlug: v.string(),
    offeringId: v.id("offerings"),
    teamMemberId: v.optional(v.id("teamMembers")),
    startAt: v.number(),
    customer: v.object({
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    }),
    notes: v.optional(v.string()),
    idempotencyKey: v.string(),
    source: v.optional(
      v.union(v.literal("public_site"), v.literal("web_agent")),
    ),
  },
  handler: async (ctx, args) => {
    const { site, organization, config } = await publicContext(ctx, args.siteSlug);
    const offering = await requireOfferingForOrganization(
      ctx,
      organization._id,
      args.offeringId,
    );
    if (!offering.active || !offering.bookableOnline) {
      throw new Error("This offering is not available for online booking.");
    }
    const idempotencyKey = requiredTrimmed(
      args.idempotencyKey,
      "idempotencyKey",
      128,
    );
    if (idempotencyKey.length < 8) {
      throw new Error("idempotencyKey must be at least 8 characters.");
    }
    const customer = normalizeCustomer(args.customer);
    const notes = optionalTrimmed(args.notes, "notes", 2_000);
    const source = args.source ?? "public_site";
    if (source === "web_agent" && !args.teamMemberId) {
      throw new Error(
        "Web agent bookings must include the exact team member from a returned availability slot.",
      );
    }
    const fingerprint = JSON.stringify({
      siteId: site._id,
      offeringId: offering._id,
      requestedTeamMemberId: args.teamMemberId ?? null,
      startAt: args.startAt,
      customer: {
        name: customer.name,
        email: customer.emailNormalized ?? null,
        phone: customer.phoneNormalized ?? null,
      },
      notes: notes ?? null,
    });
    const replay = await ctx.db
      .query("bookings")
      .withIndex("by_org_idempotency", (q) =>
        q
          .eq("organizationId", organization._id)
          .eq("idempotencyKey", idempotencyKey),
      )
      .first();
    if (replay) {
      if (replay.idempotencyFingerprint !== fingerprint) {
        throw new Error("That idempotency key was already used for a different booking request.");
      }
      return { ...bookingView(replay), replayed: true };
    }

    if (
      !dateIsWithinBookingWindow(
        args.startAt,
        organization.timezone,
        config.booking.minimumNoticeMinutes,
        config.booking.maximumAdvanceDays,
      )
    ) {
      throw new Error("That start time is outside this site's booking window.");
    }
    const localStart = localPartsAt(args.startAt, organization.timezone);
    const minuteOfDay = localStart.hour * 60 + localStart.minute;
    if (
      args.startAt % MINUTE_MS !== 0 ||
      minuteOfDay % config.booking.slotIntervalMinutes !== 0
    ) {
      throw new Error("That start time is not aligned to this site's booking interval.");
    }

    // Convex mutations are serializable: rate limiting, selecting the member,
    // checking the half-open overlap, and inserting happen atomically. Failed
    // or unavailable requests roll back their rate-window increments.
    const now = Date.now();
    await applyPublicBookingRateLimits(
      ctx,
      organization._id,
      site._id,
      customer,
      now,
    );
    const selection = await chooseAvailableTeamMember(
      ctx,
      organization,
      offering,
      args.startAt,
      args.teamMemberId,
    );
    const contact = await findOrCreateContact(
      ctx,
      organization._id,
      customer,
      "preserve_existing",
    );
    const code = confirmationCode(args.startAt, fingerprint);
    const bookingId = await ctx.db.insert("bookings", {
      organizationId: organization._id,
      publicSiteId: site._id,
      contactId: contact._id,
      offeringId: offering._id,
      teamMemberId: selection.member._id,
      startAt: args.startAt,
      endAt: selection.endAt,
      reservedStartAt: selection.reservedStartAt,
      reservedEndAt: selection.reservedEndAt,
      status: "confirmed",
      source,
      notes,
      confirmationCode: code,
      idempotencyKey,
      idempotencyFingerprint: fingerprint,
      offeringSnapshot: {
        name: offering.name,
        durationMinutes: offering.durationMinutes,
        priceMinor: offering.priceMinor,
        currency: offering.currency,
      },
      teamMemberSnapshot: {
        name: selection.member.name,
        title: selection.member.title,
      },
      customerSnapshot: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      createdAt: now,
      updatedAt: now,
    });
    const booking = (await ctx.db.get(bookingId)) as Doc<"bookings">;
    return { ...bookingView(booking), replayed: false };
  },
});

export const lookup = mutation({
  args: {
    siteSlug: v.string(),
    confirmationCode: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const { site, organization } = await publicContext(ctx, args.siteSlug, false);
    const phone = normalizedPhone(args.phone);
    if (!phone) throw new Error("Provide the contact phone number for this booking.");
    await applyPublicManagementRateLimits(
      ctx,
      organization._id,
      site._id,
      phone,
      Date.now(),
    );
    const booking = await requirePublicBookingAccess(
      ctx,
      organization._id,
      args.confirmationCode,
      args.phone,
    );
    if (!booking) {
      return {
        success: false as const,
        error:
          "No booking matched that confirmation code and contact phone number.",
      };
    }
    return { success: true as const, booking: publicManagementView(booking) };
  },
});

export const cancel = mutation({
  args: {
    siteSlug: v.string(),
    confirmationCode: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const { site, organization } = await publicContext(ctx, args.siteSlug, false);
    const phone = normalizedPhone(args.phone);
    if (!phone) throw new Error("Provide the contact phone number for this booking.");
    await applyPublicManagementRateLimits(
      ctx,
      organization._id,
      site._id,
      phone,
      Date.now(),
    );
    const booking = await requirePublicBookingAccess(
      ctx,
      organization._id,
      args.confirmationCode,
      args.phone,
    );
    if (!booking) {
      return {
        success: false as const,
        error:
          "No booking matched that confirmation code and contact phone number.",
      };
    }
    if (booking.status === "canceled") {
      return { success: true as const, booking: publicManagementView(booking) };
    }
    if (booking.status !== "pending" && booking.status !== "confirmed") {
      throw new Error(`A ${booking.status} booking cannot be canceled online.`);
    }
    if (booking.startAt <= Date.now()) {
      throw new Error("Past bookings cannot be canceled online.");
    }
    await ctx.db.patch(booking._id, {
      status: "canceled",
      updatedAt: Date.now(),
    });
    return {
      success: true as const,
      booking: publicManagementView((await ctx.db.get(booking._id))!),
    };
  },
});

export const reschedule = mutation({
  args: {
    siteSlug: v.string(),
    confirmationCode: v.string(),
    phone: v.string(),
    offeringId: v.id("offerings"),
    startAt: v.number(),
    teamMemberId: v.optional(v.id("teamMembers")),
  },
  handler: async (ctx, args) => {
    const { site, organization, config } = await publicContext(ctx, args.siteSlug);
    const phone = normalizedPhone(args.phone);
    if (!phone) throw new Error("Provide the contact phone number for this booking.");
    await applyPublicManagementRateLimits(
      ctx,
      organization._id,
      site._id,
      phone,
      Date.now(),
    );
    const booking = await requirePublicBookingAccess(
      ctx,
      organization._id,
      args.confirmationCode,
      args.phone,
    );
    if (!booking) {
      return {
        success: false as const,
        error:
          "No booking matched that confirmation code and contact phone number.",
      };
    }
    if (booking.status !== "pending" && booking.status !== "confirmed") {
      throw new Error(`A ${booking.status} booking cannot be rescheduled online.`);
    }
    if (booking.offeringId !== args.offeringId) {
      throw new Error(
        "That availability slot belongs to a different offering. Check availability again.",
      );
    }
    const offering = await requireOfferingForOrganization(
      ctx,
      organization._id,
      booking.offeringId,
    );
    if (!offering.active || !offering.bookableOnline) {
      throw new Error("This offering can no longer be rescheduled online.");
    }
    if (
      !dateIsWithinBookingWindow(
        args.startAt,
        organization.timezone,
        config.booking.minimumNoticeMinutes,
        config.booking.maximumAdvanceDays,
      )
    ) {
      throw new Error("That start time is outside this site's booking window.");
    }
    const localStart = localPartsAt(args.startAt, organization.timezone);
    const minuteOfDay = localStart.hour * 60 + localStart.minute;
    if (
      args.startAt % MINUTE_MS !== 0 ||
      minuteOfDay % config.booking.slotIntervalMinutes !== 0
    ) {
      throw new Error("That start time is not aligned to this site's booking interval.");
    }

    const selection = await chooseAvailableTeamMember(
      ctx,
      organization,
      offering,
      args.startAt,
      args.teamMemberId ?? booking.teamMemberId,
      booking._id,
    );
    const nextConfirmationCode = confirmationCode(
      args.startAt,
      JSON.stringify({
        bookingId: booking._id,
        previousStartAt: booking.startAt,
        startAt: args.startAt,
        teamMemberId: selection.member._id,
      }),
    );
    await ctx.db.patch(booking._id, {
      teamMemberId: selection.member._id,
      startAt: args.startAt,
      endAt: selection.endAt,
      reservedStartAt: selection.reservedStartAt,
      reservedEndAt: selection.reservedEndAt,
      confirmationCode: nextConfirmationCode,
      teamMemberSnapshot: {
        name: selection.member.name,
        title: selection.member.title,
      },
      updatedAt: Date.now(),
    });
    return {
      success: true as const,
      booking: publicManagementView((await ctx.db.get(booking._id))!),
    };
  },
});
