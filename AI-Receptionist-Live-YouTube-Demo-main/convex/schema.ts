import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const terminology = v.object({
  offeringSingular: v.string(),
  offeringPlural: v.string(),
  teamMemberSingular: v.string(),
  teamMemberPlural: v.string(),
  customerSingular: v.string(),
  customerPlural: v.string(),
  bookingSingular: v.string(),
  bookingPlural: v.string(),
});

const siteConfig = v.object({
  businessName: v.string(),
  headline: v.string(),
  subheadline: v.string(),
  about: v.string(),
  announcement: v.optional(v.string()),
  logoUrl: v.optional(v.string()),
  heroImageUrl: v.optional(v.string()),
  template: v.union(
    v.literal("editorial"),
    v.literal("gallery"),
    v.literal("compact"),
  ),
  theme: v.object({
    accentColor: v.string(),
    backgroundColor: v.string(),
    foregroundColor: v.string(),
    mutedColor: v.string(),
    radius: v.union(
      v.literal("sharp"),
      v.literal("soft"),
      v.literal("rounded"),
    ),
    font: v.union(
      v.literal("modern"),
      v.literal("editorial"),
      v.literal("friendly"),
    ),
  }),
  contact: v.object({
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    mapUrl: v.optional(v.string()),
  }),
  socialLinks: v.array(v.object({ label: v.string(), url: v.string() })),
  sections: v.array(
    v.union(
      v.literal("offerings"),
      v.literal("team"),
      v.literal("about"),
      v.literal("faq"),
      v.literal("contact"),
      v.literal("booking"),
    ),
  ),
  booking: v.object({
    enabled: v.boolean(),
    slotIntervalMinutes: v.number(),
    minimumNoticeMinutes: v.number(),
    maximumAdvanceDays: v.number(),
  }),
  agent: v.object({
    showWebChat: v.boolean(),
    showVoiceChat: v.boolean(),
    showElevenLabsWidget: v.boolean(),
    welcomeMessage: v.string(),
  }),
});

export default defineSchema({
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    timezone: v.string(),
    currency: v.string(),
    locale: v.string(),
    terminology,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_org", ["clerkOrgId"])
    .index("by_slug", ["slug"]),

  publicSites: defineTable({
    organizationId: v.id("organizations"),
    siteSlug: v.string(),
    draft: siteConfig,
    published: v.optional(siteConfig),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_site_slug", ["siteSlug"]),

  offerings: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    category: v.string(),
    durationMinutes: v.number(),
    bufferBeforeMinutes: v.number(),
    bufferAfterMinutes: v.number(),
    priceMinor: v.number(),
    currency: v.string(),
    capacity: v.number(),
    active: v.boolean(),
    bookableOnline: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"])
    .index("by_org_slug", ["organizationId", "slug"]),

  teamMembers: defineTable({
    organizationId: v.id("organizations"),
    clerkUserId: v.optional(v.string()),
    name: v.string(),
    title: v.string(),
    bio: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    offeringIds: v.array(v.id("offerings")),
    active: v.boolean(),
    acceptingBookings: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_active", ["organizationId", "active"])
    .index("by_org_clerk_user", ["organizationId", "clerkUserId"]),

  availabilityRules: defineTable({
    organizationId: v.id("organizations"),
    teamMemberId: v.id("teamMembers"),
    timezone: v.string(),
    dayOfWeek: v.number(),
    startMinute: v.number(),
    endMinute: v.number(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_member", ["organizationId", "teamMemberId"])
    .index("by_org_member_day", [
      "organizationId",
      "teamMemberId",
      "dayOfWeek",
    ]),

  contacts: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    email: v.optional(v.string()),
    emailNormalized: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneNormalized: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_email", ["organizationId", "emailNormalized"])
    .index("by_org_phone", ["organizationId", "phoneNormalized"]),

  bookings: defineTable({
    organizationId: v.id("organizations"),
    publicSiteId: v.optional(v.id("publicSites")),
    contactId: v.id("contacts"),
    offeringId: v.id("offerings"),
    teamMemberId: v.id("teamMembers"),
    startAt: v.number(),
    endAt: v.number(),
    reservedStartAt: v.number(),
    reservedEndAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("canceled"),
      v.literal("no_show"),
    ),
    source: v.union(
      v.literal("dashboard"),
      v.literal("public_site"),
      v.literal("web_agent"),
    ),
    notes: v.optional(v.string()),
    confirmationCode: v.string(),
    idempotencyKey: v.optional(v.string()),
    idempotencyFingerprint: v.optional(v.string()),
    offeringSnapshot: v.object({
      name: v.string(),
      durationMinutes: v.number(),
      priceMinor: v.number(),
      currency: v.string(),
    }),
    teamMemberSnapshot: v.object({ name: v.string(), title: v.string() }),
    customerSnapshot: v.object({
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    }),
    createdByUserId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_start", ["organizationId", "startAt"])
    .index("by_org_status_start", ["organizationId", "status", "startAt"])
    .index("by_org_team_reserved_start", [
      "organizationId",
      "teamMemberId",
      "reservedStartAt",
    ])
    .index("by_org_idempotency", ["organizationId", "idempotencyKey"])
    .index("by_org_confirmation", ["organizationId", "confirmationCode"])
    .index("by_org_contact", ["organizationId", "contactId"]),

  publicBookingRateLimits: defineTable({
    organizationId: v.id("organizations"),
    publicSiteId: v.id("publicSites"),
    scopeKey: v.string(),
    windowStart: v.number(),
    count: v.number(),
    expiresAt: v.number(),
  })
    .index("by_org_site_scope_window", [
      "organizationId",
      "publicSiteId",
      "scopeKey",
      "windowStart",
    ])
    .index("by_org_site_expires", [
      "organizationId",
      "publicSiteId",
      "expiresAt",
    ]),

  conversations: defineTable({
    organizationId: v.id("organizations"),
    externalConversationId: v.string(),
    channel: v.literal("web"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    contactId: v.optional(v.id("contacts")),
    bookingId: v.optional(v.id("bookings")),
    caller: v.optional(v.string()),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    outcome: v.optional(v.string()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_started", ["organizationId", "startedAt"])
    .index("by_org_channel_started", ["organizationId", "channel", "startedAt"])
    .index("by_org_external", ["organizationId", "externalConversationId"]),

  agentIntegrations: defineTable({
    organizationId: v.id("organizations"),
    provider: v.literal("elevenlabs"),
    webAgentId: v.optional(v.string()),
    webEnabled: v.boolean(),
    knowledgeBaseId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_provider", ["organizationId", "provider"]),

  agentSessionRateLimits: defineTable({
    organizationId: v.id("organizations"),
    publicSiteId: v.id("publicSites"),
    scopeKey: v.string(),
    windowStart: v.number(),
    count: v.number(),
    expiresAt: v.number(),
  })
    .index("by_org_site_scope_window", [
      "organizationId",
      "publicSiteId",
      "scopeKey",
      "windowStart",
    ])
    .index("by_org_expires", ["organizationId", "expiresAt"]),

  knowledgeItems: defineTable({
    organizationId: v.id("organizations"),
    title: v.string(),
    content: v.string(),
    category: v.string(),
    published: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_published", ["organizationId", "published"]),

  // Legacy declarations intentionally remain during the data migration. No
  // public functions read or write these tables anymore.
  businesses: defineTable({
    name: v.string(),
    slug: v.string(),
    greeting: v.string(),
    address: v.string(),
    phone: v.string(),
    openingHours: v.string(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  services: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    durationMins: v.number(),
    priceGBP: v.number(),
    description: v.string(),
  }).index("by_business", ["businessId"]),

  staff: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    role: v.string(),
  }).index("by_business", ["businessId"]),

  customers: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_business", ["businessId"])
    .index("by_phone", ["businessId", "phone"]),

  appointments: defineTable({
    businessId: v.id("businesses"),
    customerId: v.id("customers"),
    serviceId: v.id("services"),
    staffId: v.id("staff"),
    startTime: v.number(),
    status: v.union(
      v.literal("booked"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show"),
    ),
    createdAt: v.number(),
  })
    .index("by_business_time", ["businessId", "startTime"])
    .index("by_customer", ["customerId"]),

  faqs: defineTable({
    businessId: v.id("businesses"),
    question: v.string(),
    answer: v.string(),
  }).index("by_business", ["businessId"]),
});
