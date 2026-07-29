import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { DEFAULT_TERMINOLOGY, defaultSiteConfig } from "./lib/defaults";
import {
  DAY_MS,
  addLocalDays,
  dayOfWeek,
  localDateStringAt,
  parseLocalDate,
  zonedDateTimeToUtc,
} from "./lib/time";

const PAPAFAM_CLERK_ORG_ID = "org_3GXaiwV255fvgnG8UO4Axqesi1S";
const PAPAFAM_NAME = "PAPAFAM";
const PAPAFAM_SLUG = "papafam";

export default internalMutation({
  args: {},
  handler: async (ctx) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org", (q) =>
        q.eq("clerkOrgId", PAPAFAM_CLERK_ORG_ID),
      )
      .unique();
    if (!organization) {
      throw new Error(
        "PAPAFAM must be initialized from its Clerk organization before seeding.",
      );
    }
    if (
      organization.name !== PAPAFAM_NAME ||
      organization.slug !== PAPAFAM_SLUG
    ) {
      throw new Error(
        `Refusing to seed unexpected organization ${organization.name} (${organization.slug}).`,
      );
    }

    const [
      existingSite,
      existingIntegration,
      existingOffering,
      existingTeamMember,
      existingAvailability,
      existingContact,
      existingBooking,
      existingKnowledge,
      existingConversation,
    ] = await Promise.all([
      ctx.db
        .query("publicSites")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .unique(),
      ctx.db
        .query("agentIntegrations")
        .withIndex("by_org_provider", (q) =>
          q
            .eq("organizationId", organization._id)
            .eq("provider", "elevenlabs"),
        )
        .unique(),
      ctx.db
        .query("offerings")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .first(),
      ctx.db
        .query("teamMembers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .first(),
      ctx.db
        .query("availabilityRules")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .first(),
      ctx.db
        .query("contacts")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .first(),
      ctx.db
        .query("bookings")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .first(),
      ctx.db
        .query("knowledgeItems")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .first(),
      ctx.db
        .query("conversations")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .first(),
    ]);

    if (!existingSite || !existingIntegration) {
      throw new Error(
        "PAPAFAM is missing its bootstrap site or ElevenLabs integration.",
      );
    }
    if (
      existingOffering ||
      existingTeamMember ||
      existingAvailability ||
      existingContact ||
      existingBooking ||
      existingKnowledge ||
      existingConversation
    ) {
      return {
        organizationId: organization._id,
        clerkOrgId: organization.clerkOrgId,
        created: false,
        reason: "organization_not_empty",
      };
    }

    const now = Date.now();
    const organizationId = organization._id;
    const { currency, timezone } = organization;
    await ctx.db.patch(organizationId, {
      terminology: {
        ...DEFAULT_TERMINOLOGY,
        teamMemberSingular: "Barber",
        teamMemberPlural: "Barbers",
      },
      updatedAt: now,
    });

    // The seed is additive for a freshly bootstrapped Clerk org. A fully seeded
    // org returns above, so reruns never duplicate operational rows.

    const siteConfig = {
      ...defaultSiteConfig(PAPAFAM_NAME),
      headline: "Sharp work. Easy booking.",
      subheadline:
        "Modern cuts, considered service, and a slot that fits your schedule.",
      about:
        "PAPAFAM brings precise barbering and relaxed hospitality together. Every appointment starts with a proper consultation and finishes without the rush.",
      announcement: "New here? Ask our concierge which service suits you.",
      contact: {
        email: "hello@papafam.example",
        address: "Dubai, United Arab Emirates",
        mapUrl: "https://maps.google.com/?q=Dubai+United+Arab+Emirates",
      },
      agent: {
        showWebChat: true,
        showVoiceChat: true,
        showElevenLabsWidget: false,
        welcomeMessage:
          "Welcome to PAPAFAM. I can recommend a service, find a time, or answer a question.",
      },
    } as const;
    const publicSiteId: Id<"publicSites"> = existingSite._id;
    await ctx.db.patch(existingSite._id, {
      siteSlug: PAPAFAM_SLUG,
      draft: siteConfig,
      published: siteConfig,
      publishedAt: now,
      updatedAt: now,
    });

    const offerings = [
      {
        name: "Signature Cut",
        slug: "signature-cut",
        description: "A tailored scissor or clipper cut, consultation, wash, and finish.",
        category: "Hair",
        durationMinutes: 45,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 10,
        priceMinor: 4_500,
      },
      {
        name: "Skin Fade",
        slug: "skin-fade",
        description: "A precision zero-to-skin fade blended and styled to your preference.",
        category: "Hair",
        durationMinutes: 50,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 10,
        priceMinor: 5_500,
      },
      {
        name: "Beard Design",
        slug: "beard-design",
        description: "Shape, line-up, hot towel, and a considered finish.",
        category: "Grooming",
        durationMinutes: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 5,
        priceMinor: 3_000,
      },
      {
        name: "Cut & Beard",
        slug: "cut-and-beard",
        description: "Our full haircut and beard service in one unhurried appointment.",
        category: "Packages",
        durationMinutes: 75,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 15,
        priceMinor: 7_500,
      },
    ];
    const offeringIds: Id<"offerings">[] = [];
    for (const offering of offerings) {
      offeringIds.push(
        await ctx.db.insert("offerings", {
          organizationId,
          ...offering,
          currency,
          capacity: 1,
          active: true,
          bookableOnline: true,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    const memberSeeds = [
      {
        name: "Marco Silva",
        title: "Creative Director",
        bio: "Precision fades and modern scissor work, with fifteen years behind the chair.",
      },
      {
        name: "Jay Carter",
        title: "Senior Barber",
        bio: "Known for sharp detail, textured finishes, and genuinely useful style advice.",
      },
      {
        name: "Amara Reed",
        title: "Barber & Grooming Specialist",
        bio: "Clean shapes, restorative grooming, and a calm, considered appointment.",
      },
    ];
    const memberIds: Id<"teamMembers">[] = [];
    for (let index = 0; index < memberSeeds.length; index += 1) {
      memberIds.push(
        await ctx.db.insert("teamMembers", {
          organizationId,
          ...memberSeeds[index],
          offeringIds,
          active: true,
          acceptingBookings: true,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    for (const teamMemberId of memberIds) {
      for (let weekday = 1; weekday <= 6; weekday += 1) {
        await ctx.db.insert("availabilityRules", {
          organizationId,
          teamMemberId,
          timezone,
          dayOfWeek: weekday,
          startMinute: 9 * 60,
          endMinute: 19 * 60,
          active: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const contactSeeds = [
      ["Oliver Bennett", "oliver@client.example", "+971 50 000 0101"],
      ["Amelia Clarke", "amelia@client.example", "+971 50 000 0102"],
      ["Noah Pemberton", "noah@client.example", "+971 50 000 0103"],
      ["Priya Shah", "priya@client.example", "+971 50 000 0104"],
      ["Theo Braithwaite", "theo@client.example", "+971 50 000 0105"],
      ["Sofia Martins", "sofia@client.example", "+971 50 000 0106"],
    ] as const;
    const contactIds: Id<"contacts">[] = [];
    for (const [name, email, phone] of contactSeeds) {
      contactIds.push(
        await ctx.db.insert("contacts", {
          organizationId,
          name,
          email,
          emailNormalized: email,
          phone,
          phoneNormalized: phone.replace(/[^\d+]/g, ""),
          tags: ["demo"],
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    const today = parseLocalDate(localDateStringAt(now, timezone));
    const futureDates: typeof today[] = [];
    for (let offset = 1; futureDates.length < 5 && offset < 10; offset += 1) {
      const date = addLocalDays(today, offset);
      if (dayOfWeek(date) !== 0) futureDates.push(date);
    }
    let bookingCount = 0;
    for (let dayIndex = 0; dayIndex < futureDates.length; dayIndex += 1) {
      for (let memberIndex = 0; memberIndex < memberIds.length; memberIndex += 1) {
        const offeringIndex = (dayIndex + memberIndex) % offeringIds.length;
        const offering = offerings[offeringIndex];
        const startAt = zonedDateTimeToUtc(
          {
            ...futureDates[dayIndex],
            hour: 10 + memberIndex * 2,
            minute: dayIndex % 2 === 0 ? 0 : 30,
          },
          timezone,
        );
        if (startAt === null) continue;
        const endAt = startAt + offering.durationMinutes * 60_000;
        const contactIndex = bookingCount % contactIds.length;
        const member = memberSeeds[memberIndex];
        const contact = contactSeeds[contactIndex];
        await ctx.db.insert("bookings", {
          organizationId,
          publicSiteId,
          contactId: contactIds[contactIndex],
          offeringId: offeringIds[offeringIndex],
          teamMemberId: memberIds[memberIndex],
          startAt,
          endAt,
          reservedStartAt: startAt - offering.bufferBeforeMinutes * 60_000,
          reservedEndAt: endAt + offering.bufferAfterMinutes * 60_000,
          status: "confirmed",
          source: bookingCount % 3 === 0 ? "web_agent" : "public_site",
          confirmationCode: `DEMO-${String(bookingCount + 1).padStart(3, "0")}`,
          idempotencyKey: `seed-papafam-${bookingCount + 1}`,
          idempotencyFingerprint: `seed-${bookingCount + 1}`,
          offeringSnapshot: {
            name: offering.name,
            durationMinutes: offering.durationMinutes,
            priceMinor: offering.priceMinor,
            currency,
          },
          teamMemberSnapshot: { name: member.name, title: member.title },
          customerSnapshot: {
            name: contact[0],
            email: contact[1],
            phone: contact[2],
          },
          createdAt: now - DAY_MS,
          updatedAt: now - DAY_MS,
        });
        bookingCount += 1;
      }
    }

    const knowledgeItems = [
      ["What are your opening hours?", "Monday to Saturday, 9:00 to 19:00. We are closed on Sunday.", "FAQ"],
      ["Do you take walk-ins?", "Yes when capacity allows, though booking ahead is the best way to guarantee your time.", "FAQ"],
      ["Where are you?", "We are based in Dubai, United Arab Emirates. Your booking confirmation includes the latest directions.", "FAQ"],
      ["Cancellation policy", "Please give at least 24 hours' notice when you need to move or cancel an appointment.", "Policy"],
      ["Payments", "We accept major cards and digital wallets.", "FAQ"],
    ] as const;
    for (let index = 0; index < knowledgeItems.length; index += 1) {
      const [title, content, category] = knowledgeItems[index];
      await ctx.db.insert("knowledgeItems", {
        organizationId,
        title,
        content,
        category,
        published: true,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      });
    }

    const conversations = [
      {
        externalConversationId: "demo-web-001",
        channel: "web" as const,
        summary: "Recommended a Signature Cut and helped the client choose Marco.",
        durationSeconds: 184,
        outcome: "booking_created",
      },
      {
        externalConversationId: "demo-web-002",
        channel: "web" as const,
        summary: "Answered location and availability questions, then booked a Skin Fade.",
        durationSeconds: 132,
        outcome: "booking_created",
      },
      {
        externalConversationId: "demo-web-003",
        channel: "web" as const,
        summary: "Explained the cancellation policy. No booking requested.",
        durationSeconds: 67,
        outcome: "question_answered",
      },
    ];
    for (let index = 0; index < conversations.length; index += 1) {
      await ctx.db.insert("conversations", {
        organizationId,
        ...conversations[index],
        status: "completed",
        startedAt: now - (index + 1) * 3 * 60 * 60 * 1_000,
        endedAt: now - (index + 1) * 3 * 60 * 60 * 1_000 + conversations[index].durationSeconds * 1_000,
        createdAt: now - (index + 1) * 3 * 60 * 60 * 1_000,
        updatedAt: now - (index + 1) * 3 * 60 * 60 * 1_000,
      });
    }

    return {
      organizationId,
      clerkOrgId: PAPAFAM_CLERK_ORG_ID,
      siteSlug: PAPAFAM_SLUG,
      offerings: offeringIds.length,
      teamMembers: memberIds.length,
      contacts: contactIds.length,
      bookings: bookingCount,
      created: true,
    };
  },
});
