import type { DefaultFunctionArgs, FunctionReference } from "convex/server";

import { api } from "../../../convex/_generated/api";

type QueryRef<Args extends DefaultFunctionArgs, Result> = FunctionReference<
  "query",
  "public",
  Args,
  Result
>;
type MutationRef<Args extends DefaultFunctionArgs, Result> = FunctionReference<
  "mutation",
  "public",
  Args,
  Result
>;

export type Terminology = {
  offering: string;
  offeringPlural: string;
  teamMember: string;
  teamMemberPlural: string;
  customer: string;
  customerPlural: string;
  booking: string;
  bookingPlural: string;
};

export type BackendTerminology = {
  offeringSingular: string;
  offeringPlural: string;
  teamMemberSingular: string;
  teamMemberPlural: string;
  customerSingular: string;
  customerPlural: string;
  bookingSingular: string;
  bookingPlural: string;
};

export type Organization = {
  _id: string;
  clerkOrgId?: string;
  name: string;
  slug: string;
  timezone: string;
  locale: string;
  currency: string;
  terminology: BackendTerminology;
  role?: string;
  createdAt?: number;
  updatedAt?: number;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "canceled"
  | "no_show";

export type RawBooking = {
  bookingId: string;
  status: BookingStatus;
  startAt: number;
  endAt: number;
  startTimeISO: string;
  endTimeISO: string;
  confirmationCode: string;
  offering: {
    name: string;
    durationMinutes: number;
    priceMinor: number;
    currency: string;
  };
  teamMember: { name: string; title: string };
  customer: { name: string; email?: string; phone?: string };
  source?: "dashboard" | "public_site" | "web_agent";
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
};

export type Booking = {
  _id: string;
  startAt: number;
  endAt: number;
  status: BookingStatus;
  source: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  offeringName: string;
  teamMemberName?: string;
  priceCents?: number;
  currency: string;
  confirmationCode: string;
};

export type Offering = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceMinor: number;
  currency: string;
  capacity: number;
  active: boolean;
  bookableOnline: boolean;
  createdAt: number;
  updatedAt: number;
};

export type TeamMember = {
  _id: string;
  name: string;
  title: string;
  email?: string;
  phone?: string;
  bio: string;
  imageUrl?: string;
  offeringIds: string[];
  active: boolean;
  acceptingBookings: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type AvailabilityRule = {
  _id: string;
  teamMemberId: string;
  timezone: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Conversation = {
  _id: string;
  externalConversationId: string;
  channel: "web";
  status: "active" | "completed" | "failed";
  caller?: string;
  transcript?: string;
  summary?: string;
  durationSeconds?: number;
  outcome?: string;
  startedAt: number;
  endedAt?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type AgentConfiguration = {
  provider: "elevenlabs";
  integration: {
    _id: string;
    webEnabled: boolean;
    updatedAt: number;
  } | null;
};

export type SiteConfig = {
  businessName: string;
  headline: string;
  subheadline: string;
  about: string;
  announcement?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  template: "editorial" | "gallery" | "compact";
  theme: {
    accentColor: string;
    backgroundColor: string;
    foregroundColor: string;
    mutedColor: string;
    radius: "sharp" | "soft" | "rounded";
    font: "modern" | "editorial" | "friendly";
  };
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    mapUrl?: string;
  };
  socialLinks: Array<{ label: string; url: string }>;
  sections: Array<
    "offerings" | "team" | "about" | "faq" | "contact" | "booking"
  >;
  booking: {
    enabled: boolean;
    slotIntervalMinutes: number;
    minimumNoticeMinutes: number;
    maximumAdvanceDays: number;
  };
  agent: {
    showWebChat: boolean;
    showVoiceChat: boolean;
    showElevenLabsWidget: boolean;
    welcomeMessage: string;
  };
};

export type CurrentSiteDraft = {
  site: {
    _id: string;
    siteSlug: string;
    draft: SiteConfig;
    published?: SiteConfig;
    publishedAt?: number;
    updatedAt: number;
  };
  organization: {
    name: string;
    timezone: string;
    currency: string;
    locale: string;
    terminology: BackendTerminology;
  };
};

export type Overview = {
  organization: Pick<
    Organization,
    "_id" | "name" | "slug" | "timezone" | "currency" | "locale" | "terminology"
  >;
  stats: {
    bookingsToday: number;
    bookingsTodayIsCapped: boolean;
    completedToday: number;
    upcomingSevenDays: number;
    upcomingSevenDaysIsCapped: boolean;
    totalContacts: number;
    totalContactsIsCapped: boolean;
    conversationsThirtyDays: number;
    conversationsThirtyDaysIsCapped: boolean;
    activeOfferings: number;
    activeOfferingsIsCapped: boolean;
    activeTeamMembers: number;
    activeTeamMembersIsCapped: boolean;
  };
  upcomingBookings: RawBooking[];
  recentConversations: Conversation[];
};

type CreateOfferingArgs = {
  name: string;
  description?: string;
  category?: string;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  priceMinor: number;
  capacity?: number;
  active?: boolean;
  bookableOnline?: boolean;
};

type UpdateOfferingArgs = Partial<CreateOfferingArgs> & { offeringId: string };

type CreateMemberArgs = {
  name: string;
  title?: string;
  bio?: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
  offeringIds: string[];
  active?: boolean;
  acceptingBookings?: boolean;
  sortOrder?: number;
};

type UpdateMemberArgs = Partial<CreateMemberArgs> & { teamMemberId: string };

/** One adapter keeps the authenticated UI insulated from backend contract churn. */
export const dashboardApi = api as unknown as {
  organizations: {
    current: QueryRef<Record<string, never>, Organization | null>;
    bootstrapCurrent: MutationRef<
      {
        name?: string;
        timezone?: string;
        currency?: string;
        locale?: string;
      },
      Organization
    >;
    updateCurrent: MutationRef<
      {
        name?: string;
        timezone?: string;
        currency?: string;
        locale?: string;
        terminology?: BackendTerminology;
      },
      Organization
    >;
  };
  dashboard: {
    overview: QueryRef<Record<string, never>, Overview>;
  };
  bookings: {
    listForCurrentOrg: QueryRef<
      {
        from?: number;
        to?: number;
        status?: BookingStatus;
        limit?: number;
      },
      RawBooking[]
    >;
    createForCurrentOrg: MutationRef<
      {
        offeringId: string;
        teamMemberId?: string;
        startAt: number;
        customer: { name: string; email?: string; phone?: string };
        notes?: string;
        idempotencyKey?: string;
      },
      RawBooking & { replayed: boolean }
    >;
    updateStatus: MutationRef<
      { bookingId: string; status: BookingStatus },
      RawBooking
    >;
  };
  catalog: {
    listOfferings: QueryRef<{ includeInactive?: boolean }, Offering[]>;
    createOffering: MutationRef<CreateOfferingArgs, Offering>;
    updateOffering: MutationRef<UpdateOfferingArgs, Offering>;
  };
  team: {
    listMembers: QueryRef<{ includeInactive?: boolean }, TeamMember[]>;
    createMember: MutationRef<CreateMemberArgs, TeamMember>;
    updateMember: MutationRef<UpdateMemberArgs, TeamMember>;
  };
  availability: {
    listRules: QueryRef<{ teamMemberId?: string }, AvailabilityRule[]>;
    replaceMemberRules: MutationRef<
      {
        teamMemberId: string;
        rules: Array<{
          dayOfWeek: number;
          startMinute: number;
          endMinute: number;
          active?: boolean;
        }>;
      },
      AvailabilityRule[]
    >;
  };
  publicSite: {
    getCurrentDraft: QueryRef<Record<string, never>, CurrentSiteDraft>;
    updateDraft: MutationRef<
      { config: SiteConfig; siteSlug?: string },
      { _id: string }
    >;
    publish: MutationRef<
      Record<string, never>,
      { siteSlug: string; publishedAt: number; config: SiteConfig }
    >;
  };
  conversations: {
    listRecent: QueryRef<
      { limit?: number; channel?: "web" },
      Conversation[]
    >;
  };
  agents: {
    getCurrent: QueryRef<Record<string, never>, AgentConfiguration>;
  };
};

export const defaultTerminology: Terminology = {
  offering: "Offering",
  offeringPlural: "Offerings",
  teamMember: "Team member",
  teamMemberPlural: "Team members",
  customer: "Contact",
  customerPlural: "Contacts",
  booking: "Booking",
  bookingPlural: "Bookings",
};

export function normalizeTerminology(
  terminology: BackendTerminology | undefined,
): Terminology {
  if (!terminology) return defaultTerminology;
  return {
    offering: terminology.offeringSingular,
    offeringPlural: terminology.offeringPlural,
    teamMember: terminology.teamMemberSingular,
    teamMemberPlural: terminology.teamMemberPlural,
    customer: terminology.customerSingular,
    customerPlural: terminology.customerPlural,
    booking: terminology.bookingSingular,
    bookingPlural: terminology.bookingPlural,
  };
}

export function normalizeBooking(booking: RawBooking): Booking {
  return {
    _id: booking.bookingId,
    startAt: booking.startAt,
    endAt: booking.endAt,
    status: booking.status,
    source: booking.source ?? "dashboard",
    contactName: booking.customer.name,
    contactEmail: booking.customer.email,
    contactPhone: booking.customer.phone,
    offeringName: booking.offering.name,
    teamMemberName: booking.teamMember.name,
    priceCents: booking.offering.priceMinor,
    currency: booking.offering.currency,
    confirmationCode: booking.confirmationCode,
  };
}

export function getOfferingDuration(offering: Offering) {
  return offering.durationMinutes;
}

export function getOfferingPrice(offering: Offering) {
  return offering.priceMinor;
}

const entityColors = ["#3156d9", "#0f766e", "#9333ea", "#db2777", "#52525b"];

function stableColor(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return entityColors[hash % entityColors.length];
}

export function getOfferingColor(offering: Offering) {
  return stableColor(offering.category || offering._id);
}

export function getMemberColor(member: TeamMember) {
  return stableColor(member._id);
}
