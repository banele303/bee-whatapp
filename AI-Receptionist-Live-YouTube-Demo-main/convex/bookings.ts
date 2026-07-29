import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireCurrentOrganizationOperator } from "./lib/auth";
import {
  bookingView,
  chooseAvailableTeamMember,
  confirmationCode,
  findOrCreateContact,
  normalizeCustomer,
  requireOfferingForOrganization,
} from "./lib/bookings";
import { DAY_MS, MINUTE_MS } from "./lib/time";
import { boundedInteger, optionalTrimmed, requiredTrimmed } from "./lib/validation";

const bookingStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("canceled"),
  v.literal("no_show"),
);

export const listForCurrentOrg = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    status: v.optional(bookingStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const now = Date.now();
    const from = args.from ?? now - 30 * DAY_MS;
    const to = args.to ?? now + 180 * DAY_MS;
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
      throw new Error("from and to must define a valid UTC millisecond range.");
    }
    if (to - from > 2 * 366 * DAY_MS) {
      throw new Error("Booking list windows cannot exceed two years.");
    }
    const limit = boundedInteger(args.limit ?? 100, "limit", 1, 200);
    const rows = args.status
      ? await ctx.db
          .query("bookings")
          .withIndex("by_org_status_start", (q) =>
            q
              .eq("organizationId", organization._id)
              .eq("status", args.status!)
              .gte("startAt", from)
              .lt("startAt", to),
          )
          .take(limit)
      : await ctx.db
          .query("bookings")
          .withIndex("by_org_start", (q) =>
            q
              .eq("organizationId", organization._id)
              .gte("startAt", from)
              .lt("startAt", to),
          )
          .take(limit);
    return rows.map((booking) => ({
      ...bookingView(booking),
      contactId: booking.contactId,
      offeringId: booking.offeringId,
      teamMemberId: booking.teamMemberId,
      source: booking.source,
      notes: booking.notes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }));
  },
});

export const createForCurrentOrg = mutation({
  args: {
    offeringId: v.id("offerings"),
    teamMemberId: v.optional(v.id("teamMembers")),
    startAt: v.number(),
    customer: v.object({
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    }),
    notes: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { auth, organization } = await requireCurrentOrganizationOperator(ctx);
    const offering = await requireOfferingForOrganization(
      ctx,
      organization._id,
      args.offeringId,
    );
    if (!offering.active) throw new Error("This offering is inactive.");
    if (
      !Number.isInteger(args.startAt) ||
      args.startAt % MINUTE_MS !== 0 ||
      args.startAt <= Date.now()
    ) {
      throw new Error("startAt must be a future UTC epoch timestamp aligned to a minute.");
    }
    const customer = normalizeCustomer(args.customer);
    const notes = optionalTrimmed(args.notes, "notes", 2_000);
    const idempotencyKey = args.idempotencyKey
      ? requiredTrimmed(args.idempotencyKey, "idempotencyKey", 128)
      : undefined;
    if (idempotencyKey && idempotencyKey.length < 8) {
      throw new Error("idempotencyKey must be at least 8 characters.");
    }
    const fingerprint = JSON.stringify({
      source: "dashboard",
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
    if (idempotencyKey) {
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
    }

    const selection = await chooseAvailableTeamMember(
      ctx,
      organization,
      offering,
      args.startAt,
      args.teamMemberId,
    );
    const contact = await findOrCreateContact(ctx, organization._id, customer);
    const now = Date.now();
    const bookingId = await ctx.db.insert("bookings", {
      organizationId: organization._id,
      contactId: contact._id,
      offeringId: offering._id,
      teamMemberId: selection.member._id,
      startAt: args.startAt,
      endAt: selection.endAt,
      reservedStartAt: selection.reservedStartAt,
      reservedEndAt: selection.reservedEndAt,
      status: "confirmed",
      source: "dashboard",
      notes,
      confirmationCode: confirmationCode(args.startAt, fingerprint),
      idempotencyKey,
      idempotencyFingerprint: idempotencyKey ? fingerprint : undefined,
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
      createdByUserId: auth.userId,
      createdAt: now,
      updatedAt: now,
    });
    const booking = (await ctx.db.get(bookingId)) as Doc<"bookings">;
    return { ...bookingView(booking), replayed: false };
  },
});

export const updateStatus = mutation({
  args: { bookingId: v.id("bookings"), status: bookingStatus },
  handler: async (ctx, args) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.organizationId !== organization._id) {
      throw new Error("Booking not found in this organization.");
    }
    const allowed: Record<Doc<"bookings">["status"], Doc<"bookings">["status"][]> = {
      pending: ["confirmed", "canceled"],
      confirmed: ["completed", "canceled", "no_show"],
      completed: [],
      canceled: [],
      no_show: [],
    };
    if (booking.status !== args.status && !allowed[booking.status].includes(args.status)) {
      throw new Error(`Cannot move a booking from ${booking.status} to ${args.status}.`);
    }
    if (booking.status !== args.status) {
      await ctx.db.patch(booking._id, { status: args.status, updatedAt: Date.now() });
    }
    return bookingView((await ctx.db.get(booking._id))!);
  },
});
