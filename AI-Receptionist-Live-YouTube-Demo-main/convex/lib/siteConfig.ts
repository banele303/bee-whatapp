import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { boundedInteger, optionalTrimmed, requiredTrimmed } from "./validation";

export const siteConfigValidator = v.object({
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

function safeOptionalUrl(value: string | undefined, label: string): string | undefined {
  const url = optionalTrimmed(value, label, 2_000);
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
  } catch {
    throw new Error(`${label} must be a valid http(s) URL.`);
  }
  return url;
}

function safeColor(value: string, label: string): string {
  const color = requiredTrimmed(value, label, 30);
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error(`${label} must be a six-digit hex color.`);
  }
  return color.toUpperCase();
}

export function sanitizeSiteConfig(
  config: Doc<"publicSites">["draft"],
): Doc<"publicSites">["draft"] {
  if (config.socialLinks.length > 12) throw new Error("At most 12 social links are allowed.");
  if (config.sections.length > 12) throw new Error("At most 12 page sections are allowed.");
  return {
    businessName: requiredTrimmed(config.businessName, "businessName", 120),
    headline: requiredTrimmed(config.headline, "headline", 180),
    subheadline: requiredTrimmed(config.subheadline, "subheadline", 400),
    about: requiredTrimmed(config.about, "about", 4_000),
    announcement: optionalTrimmed(config.announcement, "announcement", 240),
    logoUrl: safeOptionalUrl(config.logoUrl, "logoUrl"),
    heroImageUrl: safeOptionalUrl(config.heroImageUrl, "heroImageUrl"),
    template: config.template,
    theme: {
      accentColor: safeColor(config.theme.accentColor, "theme.accentColor"),
      backgroundColor: safeColor(config.theme.backgroundColor, "theme.backgroundColor"),
      foregroundColor: safeColor(config.theme.foregroundColor, "theme.foregroundColor"),
      mutedColor: safeColor(config.theme.mutedColor, "theme.mutedColor"),
      radius: config.theme.radius,
      font: config.theme.font,
    },
    contact: {
      email: optionalTrimmed(config.contact.email, "contact.email", 320),
      phone: optionalTrimmed(config.contact.phone, "contact.phone", 40),
      address: optionalTrimmed(config.contact.address, "contact.address", 500),
      mapUrl: safeOptionalUrl(config.contact.mapUrl, "contact.mapUrl"),
    },
    socialLinks: config.socialLinks.map((link, index) => ({
      label: requiredTrimmed(link.label, `socialLinks[${index}].label`, 40),
      url: safeOptionalUrl(link.url, `socialLinks[${index}].url`)!,
    })),
    sections: [...new Set(config.sections)],
    booking: {
      enabled: config.booking.enabled,
      slotIntervalMinutes: boundedInteger(
        config.booking.slotIntervalMinutes,
        "booking.slotIntervalMinutes",
        5,
        240,
      ),
      minimumNoticeMinutes: boundedInteger(
        config.booking.minimumNoticeMinutes,
        "booking.minimumNoticeMinutes",
        0,
        43_200,
      ),
      maximumAdvanceDays: boundedInteger(
        config.booking.maximumAdvanceDays,
        "booking.maximumAdvanceDays",
        1,
        730,
      ),
    },
    agent: {
      showWebChat: config.agent.showWebChat,
      showVoiceChat: config.agent.showVoiceChat,
      showElevenLabsWidget: config.agent.showElevenLabsWidget,
      welcomeMessage: requiredTrimmed(
        config.agent.welcomeMessage,
        "agent.welcomeMessage",
        500,
      ),
    },
  };
}
