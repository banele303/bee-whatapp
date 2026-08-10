import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Operator profile — details Jarvis should know about each user.
  profiles: defineTable({
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    location: v.optional(v.string()),
    timezone: v.optional(v.string()),
    communicationStyle: v.optional(v.string()), // concise | balanced | detailed
    signOff: v.optional(v.string()),
    notes: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Live conversation transcript. Streaming messages are patched in place.
  messages: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    status: v.union(v.literal("streaming"), v.literal("final"), v.literal("interrupted")),
    // Realtime API item id, used to patch streaming deltas into the right row
    itemId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_item", ["userId", "itemId"]),

  // What Jarvis knows about each user.
  memoryFacts: defineTable({
    userId: v.id("users"),
    category: v.union(
      v.literal("preference"),
      v.literal("project"),
      v.literal("fact"),
      v.literal("context"),
      v.literal("service")
    ),
    key: v.string(),
    value: v.string(),
    source: v.string(),
    updatedAt: v.number(),
  }).index("by_user_key", ["userId", "key"]),

  // Real-time activity stream shown in the right panel.
  timelineEvents: defineTable({
    userId: v.id("users"),
    kind: v.string(),
    label: v.string(),
    detail: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId", "createdAt"]),

  // External service connections (Composio-backed), per user.
  connections: defineTable({
    userId: v.id("users"),
    toolkit: v.string(), // gmail | googlecalendar | notion
    name: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("pending_auth"),
      v.literal("connected"),
      v.literal("error")
    ),
    connectedAccountId: v.optional(v.string()),
    composioEntityId: v.optional(v.string()), // Composio userId / entity ID for tool execution
    authUrl: v.optional(v.string()),
    accountLabel: v.optional(v.string()),
    lastSync: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_user_toolkit", ["userId", "toolkit"]),

  // Dashboard cards, one row per user per card key.
  dashboard: defineTable({
    userId: v.id("users"),
    key: v.string(), // emails | calendar | notes
    data: v.any(),
    updatedAt: v.number(),
  }).index("by_user_key", ["userId", "key"]),

  // Native to-do items, fully voice-managed.
  todos: defineTable({
    userId: v.id("users"),
    title: v.string(),
    priority: v.union(v.literal("high"), v.literal("normal"), v.literal("low")),
    status: v.union(v.literal("pending"), v.literal("done")),
    dueAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user_status", ["userId", "status"]),

  // Per-user: what Jarvis is doing right now.
  objective: defineTable({
    userId: v.id("users"),
    text: v.string(),
    state: v.union(v.literal("idle"), v.literal("working"), v.literal("waiting_auth")),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Per-user: orb state mirrored across that user's tabs.
  voiceState: defineTable({
    userId: v.id("users"),
    orbState: v.string(),
    sessionActive: v.boolean(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // ── CAR DEALERSHIP TABLES ────────────────────────────────────────────

  // Vehicle inventory stock list.
  inventory: defineTable({
    userId: v.id("users"),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    variant: v.optional(v.string()),
    colour: v.optional(v.string()),
    mileage: v.optional(v.number()),
    vin: v.optional(v.string()),
    regNumber: v.optional(v.string()),
    price: v.number(),                     // asking price in ZAR
    financePrice: v.optional(v.number()),  // finance price
    status: v.union(
      v.literal("available"),
      v.literal("reserved"),
      v.literal("sold"),
      v.literal("in_service")
    ),
    fuelType: v.optional(v.string()),      // Petrol | Diesel | Electric | Hybrid
    transmission: v.optional(v.string()),  // Manual | Automatic
    bodyType: v.optional(v.string()),      // Sedan | SUV | Bakkie | Hatchback
    description: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  // Finance applications (NCA-compliant for South Africa).
  financeApplications: defineTable({
    userId: v.id("users"),
    // Vehicle
    vehicleOfInterest: v.optional(v.string()),
    vehiclePrice: v.optional(v.number()),
    depositAmount: v.optional(v.number()),
    tradeInValue: v.optional(v.number()),
    loanTerm: v.optional(v.number()),      // months: 12-72
    balloonPercent: v.optional(v.number()),
    // Personal
    firstName: v.string(),
    lastName: v.string(),
    idNumber: v.string(),                  // SA ID
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.string(),
    maritalStatus: v.optional(v.string()),
    dependants: v.optional(v.number()),
    // Address
    streetAddress: v.optional(v.string()),
    suburb: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    // Employment
    employmentStatus: v.optional(v.string()), // Employed | Self-employed | Pensioner | Unemployed
    employer: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    employmentYears: v.optional(v.number()),
    grossMonthlyIncome: v.optional(v.number()),
    netMonthlyIncome: v.optional(v.number()),
    // Expenses (NCA affordability)
    monthlyRent: v.optional(v.number()),
    monthlyGroceries: v.optional(v.number()),
    monthlyTransport: v.optional(v.number()),
    monthlyInsurance: v.optional(v.number()),
    monthlyDebt: v.optional(v.number()),   // existing debt repayments
    otherExpenses: v.optional(v.number()),
    // Status
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("cancelled")
    ),
    assignedTo: v.optional(v.string()),
    notes: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    decidedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  // Test drive bookings.
  testDrives: defineTable({
    userId: v.id("users"),
    vehicleId: v.optional(v.string()),     // inventory doc id
    vehicleLabel: v.string(),              // e.g. "2023 Toyota Hilux"
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    scheduledAt: v.number(),               // unix timestamp
    salesperson: v.optional(v.string()),
    status: v.union(
      v.literal("booked"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("no_show"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
    feedbackRating: v.optional(v.number()),
    feedbackNote: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  // Trade-in valuations.
  tradeIns: defineTable({
    userId: v.id("users"),
    customerName: v.string(),
    customerPhone: v.string(),
    // Vehicle being traded
    make: v.string(),
    model: v.string(),
    year: v.number(),
    mileage: v.number(),
    colour: v.optional(v.string()),
    regNumber: v.optional(v.string()),
    condition: v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("poor")
    ),
    serviceHistory: v.optional(v.boolean()),
    accidentHistory: v.optional(v.boolean()),
    customerAskingPrice: v.optional(v.number()),
    estimatedValue: v.optional(v.number()),  // auto estimate
    offeredValue: v.optional(v.number()),    // dealer confirmed offer
    status: v.union(
      v.literal("pending"),
      v.literal("valued"),
      v.literal("offered"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  // Documents collected from customers (ID, payslips, bank statements).
  dealerDocuments: defineTable({
    userId: v.id("users"),
    customerId: v.optional(v.string()),
    customerName: v.string(),
    customerPhone: v.string(),
    docType: v.union(
      v.literal("id_document"),
      v.literal("payslip"),
      v.literal("bank_statement"),
      v.literal("proof_of_residence"),
      v.literal("other")
    ),
    fileName: v.optional(v.string()),
    storageId: v.optional(v.string()),
    url: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_customer", ["userId", "customerId"]),

  // Automation communication sequences.
  automationRules: defineTable({
    userId: v.id("users"),
    name: v.string(),
    trigger: v.string(),  // e.g. "new_lead" | "finance_submitted" | "test_drive_booked"
    active: v.boolean(),
    steps: v.array(v.object({
      delayHours: v.number(),
      channel: v.string(),  // whatsapp | email
      message: v.string(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Dealer analytics snapshots (daily rollups).
  dealerStats: defineTable({
    userId: v.id("users"),
    date: v.string(),       // YYYY-MM-DD
    newLeads: v.number(),
    testDrives: v.number(),
    financeApplications: v.number(),
    dealsClosedCount: v.number(),
    dealsClosedValue: v.number(),
    tradeIns: v.number(),
    createdAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),
});

