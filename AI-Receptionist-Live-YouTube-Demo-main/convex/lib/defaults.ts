import type { Doc } from "../_generated/dataModel";

export const DEFAULT_TERMINOLOGY: Doc<"organizations">["terminology"] = {
  offeringSingular: "Service",
  offeringPlural: "Services",
  teamMemberSingular: "Team member",
  teamMemberPlural: "Team",
  customerSingular: "Client",
  customerPlural: "Clients",
  bookingSingular: "Booking",
  bookingPlural: "Bookings",
};

export function defaultSiteConfig(
  businessName: string,
): Doc<"publicSites">["draft"] {
  return {
    businessName,
    headline: `A simpler way to book with ${businessName}.`,
    subheadline:
      "Choose what you need, find a time that works, and confirm in moments.",
    about:
      "Thoughtful service, straightforward scheduling, and a team ready to help.",
    template: "editorial",
    theme: {
      accentColor: "#2446D8",
      backgroundColor: "#F5F1E8",
      foregroundColor: "#171717",
      mutedColor: "#6B675F",
      radius: "soft",
      font: "editorial",
    },
    contact: {},
    socialLinks: [],
    sections: ["offerings", "team", "about", "faq", "contact", "booking"],
    booking: {
      enabled: true,
      slotIntervalMinutes: 30,
      minimumNoticeMinutes: 60,
      maximumAdvanceDays: 90,
    },
    agent: {
      showWebChat: false,
      showVoiceChat: false,
      showElevenLabsWidget: false,
      welcomeMessage: `Hi, I'm the ${businessName} concierge. How can I help?`,
    },
  };
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "organization";
}
