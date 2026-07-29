import { query } from "./_generated/server";
import { requireCurrentOrganizationOperator } from "./lib/auth";
import { bookingView } from "./lib/bookings";
import {
  DAY_MS,
  addLocalDays,
  localDateStringAt,
  parseLocalDate,
  zonedDateTimeToUtc,
} from "./lib/time";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const { organization } = await requireCurrentOrganizationOperator(ctx);
    const now = Date.now();
    const localToday = parseLocalDate(
      localDateStringAt(now, organization.timezone),
    );
    const localTomorrow = addLocalDays(localToday, 1);
    const todayStart = zonedDateTimeToUtc(
      { ...localToday, hour: 0, minute: 0 },
      organization.timezone,
    );
    const tomorrowStart = zonedDateTimeToUtc(
      { ...localTomorrow, hour: 0, minute: 0 },
      organization.timezone,
    );
    if (todayStart === null || tomorrowStart === null) {
      throw new Error("The organization timezone could not resolve today's calendar bounds.");
    }

    const [todayBookings, upcoming, contacts, conversations, offerings, teamMembers] =
      await Promise.all([
        ctx.db
          .query("bookings")
          .withIndex("by_org_start", (q) =>
            q
              .eq("organizationId", organization._id)
              .gte("startAt", todayStart)
              .lt("startAt", tomorrowStart),
          )
          .take(1_001),
        ctx.db
          .query("bookings")
          .withIndex("by_org_start", (q) =>
            q
              .eq("organizationId", organization._id)
              .gte("startAt", now)
              .lt("startAt", now + 7 * DAY_MS),
          )
          .take(101),
        ctx.db
          .query("contacts")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", organization._id),
          )
          .take(5_001),
        ctx.db
          .query("conversations")
          .withIndex("by_org_started", (q) =>
            q
              .eq("organizationId", organization._id)
              .gte("startedAt", now - 30 * DAY_MS),
          )
          .order("desc")
          .take(101),
        ctx.db
          .query("offerings")
          .withIndex("by_org_active", (q) =>
            q.eq("organizationId", organization._id).eq("active", true),
          )
          .take(501),
        ctx.db
          .query("teamMembers")
          .withIndex("by_org_active", (q) =>
            q.eq("organizationId", organization._id).eq("active", true),
          )
          .take(501),
      ]);
    return {
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
        timezone: organization.timezone,
        currency: organization.currency,
        locale: organization.locale,
        terminology: organization.terminology,
      },
      stats: {
        bookingsToday: todayBookings.slice(0, 1_000).filter(
          (booking) => booking.status !== "canceled",
        ).length,
        bookingsTodayIsCapped: todayBookings.length > 1_000,
        completedToday: todayBookings.slice(0, 1_000).filter(
          (booking) => booking.status === "completed",
        ).length,
        upcomingSevenDays: upcoming.slice(0, 100).filter(
          (booking) => booking.status === "confirmed" || booking.status === "pending",
        ).length,
        upcomingSevenDaysIsCapped: upcoming.length > 100,
        totalContacts: Math.min(contacts.length, 5_000),
        totalContactsIsCapped: contacts.length > 5_000,
        conversationsThirtyDays: Math.min(conversations.length, 100),
        conversationsThirtyDaysIsCapped: conversations.length > 100,
        activeOfferings: Math.min(offerings.length, 500),
        activeOfferingsIsCapped: offerings.length > 500,
        activeTeamMembers: Math.min(teamMembers.length, 500),
        activeTeamMembersIsCapped: teamMembers.length > 500,
      },
      upcomingBookings: upcoming
        .filter(
          (booking) => booking.status === "confirmed" || booking.status === "pending",
        )
        .slice(0, 20)
        .map((booking) => ({
          ...bookingView(booking),
          source: booking.source,
          notes: booking.notes,
        })),
      recentConversations: conversations.slice(0, 10).map((conversation) => ({
        _id: conversation._id,
        externalConversationId: conversation.externalConversationId,
        channel: conversation.channel,
        status: conversation.status,
        caller: conversation.caller,
        summary: conversation.summary,
        durationSeconds: conversation.durationSeconds,
        outcome: conversation.outcome,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt,
      })),
    };
  },
});
