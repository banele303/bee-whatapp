"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  AudioLines,
  ArrowUpRight,
  Bot,
  Check,
  Eye,
  Globe2,
  ImageIcon,
  LoaderCircle,
  MessageCircle,
  Mic,
  Save,
  Send,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardApi,
  getMemberColor,
  getOfferingColor,
  getOfferingPrice,
  type CurrentSiteDraft,
  type Offering,
  type SiteConfig,
  type TeamMember,
} from "@/components/dashboard/data";
import { useFeatureEntitlements } from "@/components/dashboard/feature-gates";
import {
  formatMoney,
  LoadingPanel,
  ScreenHeader,
  StatusBadge,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { cn } from "@/lib/utils";

const accentPalettes = [
  "#2446D8",
  "#0F766E",
  "#2563EB",
  "#9333EA",
  "#DB2777",
  "#1F2937",
];

const backgroundPalettes = [
  { name: "Warm paper", value: "#F5F1E8" },
  { name: "Soft ivory", value: "#FFFDF7" },
  { name: "Cloud blue", value: "#EEF4F8" },
  { name: "Sage mist", value: "#EEF3EC" },
  { name: "Blush linen", value: "#F7EFEF" },
  { name: "Lavender paper", value: "#F3F0F8" },
] as const;

function toggleSection(
  sections: SiteConfig["sections"],
  section: SiteConfig["sections"][number],
  enabled: boolean,
) {
  if (enabled && !sections.includes(section)) return [...sections, section];
  if (!enabled) return sections.filter((value) => value !== section);
  return sections;
}

function SitePreview({
  siteSlug,
  config,
  offerings,
  members,
}: {
  siteSlug: string;
  config: SiteConfig;
  offerings: Offering[];
  members: TeamMember[];
}) {
  const { organization, terminology } = useWorkspace();
  const showTeam = config.sections.includes("team");
  const isGallery = config.template === "gallery";
  const isCompact = config.template === "compact";
  const surfaceRadius =
    config.theme.radius === "sharp"
      ? "4px"
      : config.theme.radius === "rounded"
        ? "24px"
        : "11px";
  const controlRadius =
    config.theme.radius === "sharp"
      ? "3px"
      : config.theme.radius === "rounded"
        ? "999px"
        : "8px";
  const avatarRadius =
    config.theme.radius === "sharp"
      ? "4px"
      : config.theme.radius === "rounded"
        ? "999px"
        : "10px";
  const previewOfferings = offerings.slice(0, isGallery || isCompact ? 3 : 2);
  const previewBackground = `color-mix(in srgb, ${config.theme.backgroundColor} 86%, white 14%)`;
  const previewOfferingColor = (offering?: Offering) =>
    offering ? getOfferingColor(offering) : config.theme.accentColor;
  const previewCta = config.booking.enabled ? (
    <Button
      className="pointer-events-none text-white"
      style={{
        backgroundColor: config.theme.accentColor,
        borderRadius: controlRadius,
      }}
    >
      See availability <ArrowUpRight />
    </Button>
  ) : null;
  const announcement = config.announcement ? (
    <Badge
      variant="outline"
      className="bg-white/80 text-[8px] tracking-[0.15em] uppercase"
      style={{ borderRadius: controlRadius }}
    >
      {config.announcement}
    </Badge>
  ) : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_18px_55px_rgba(41,34,23,0.10)]">
      <div className="flex items-center gap-1.5 border-b border-black/10 bg-[#eceae4] px-3 py-2.5">
        <span className="size-2 rounded-full bg-rose-400" />
        <span className="size-2 rounded-full bg-amber-400" />
        <span className="size-2 rounded-full bg-emerald-400" />
        <div className="mx-auto rounded-md bg-white/80 px-8 py-1 font-mono text-[8px] text-muted-foreground">
          /p/{siteSlug}
        </div>
        <span className="font-mono text-[7px] tracking-[0.12em] text-muted-foreground uppercase">
          {config.template}
        </span>
      </div>

      <div
        className="min-h-[620px]"
        style={{
          backgroundColor: config.theme.backgroundColor,
          color: config.theme.foregroundColor,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-between border-b border-black/8",
            isCompact ? "px-4 py-3" : "px-5 py-4",
          )}
        >
          <p className="font-heading text-sm font-semibold tracking-tight">
            {config.businessName || organization?.name}
          </p>
          <Button
            size="xs"
            className="pointer-events-none text-white"
            style={{
              backgroundColor: config.theme.accentColor,
              borderRadius: controlRadius,
            }}
          >
            Book now
          </Button>
        </div>

        {isGallery ? (
          <div className="grid gap-5 px-5 py-7 sm:grid-cols-[0.9fr_1.1fr] sm:items-stretch">
            <div className="flex flex-col items-start justify-center py-2 text-left">
              {announcement}
              <h2 className="mt-4 max-w-sm font-heading text-3xl leading-[0.96] font-semibold tracking-[-0.045em]">
                {config.headline}
              </h2>
              <p
                className="mt-3 max-w-sm text-[10px] leading-4"
                style={{ color: config.theme.mutedColor }}
              >
                {config.subheadline}
              </p>
              <div className="mt-5">{previewCta}</div>
            </div>
            <div
              className="grid min-h-52 grid-cols-[1.18fr_0.82fr] gap-2 border border-black/8 p-2"
              style={{
                borderRadius: surfaceRadius,
                backgroundColor: previewBackground,
              }}
            >
              <div
                className="relative flex items-end overflow-hidden p-3"
                style={{
                  borderRadius: surfaceRadius,
                  background: `linear-gradient(150deg, ${config.theme.accentColor}, color-mix(in srgb, ${config.theme.accentColor} 22%, ${config.theme.backgroundColor}))`,
                }}
              >
                <span className="font-heading text-sm font-semibold text-white">
                  {previewOfferings[0]?.name || config.businessName}
                </span>
              </div>
              <div className="grid gap-2">
                {[1, 2].map((index) => (
                  <div
                    key={index}
                    className="flex items-end border border-black/8 p-2"
                    style={{
                      borderRadius: surfaceRadius,
                      backgroundColor: `color-mix(in srgb, ${previewOfferingColor(previewOfferings[index] ?? previewOfferings[0])} 24%, ${config.theme.backgroundColor})`,
                    }}
                  >
                    <span className="line-clamp-2 text-[8px] font-semibold">
                      {previewOfferings[index]?.name ||
                        `${terminology.offering} ${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : isCompact ? (
          <div className="px-5 py-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl text-left">
                {announcement}
                <h2 className="mt-3 font-heading text-3xl leading-[0.96] font-semibold tracking-[-0.045em]">
                  {config.headline}
                </h2>
                <p
                  className="mt-3 max-w-lg text-[10px] leading-4"
                  style={{ color: config.theme.mutedColor }}
                >
                  {config.subheadline}
                </p>
              </div>
              <div className="shrink-0">{previewCta}</div>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-12 pb-10 text-center">
            {announcement ? <div className="mb-4">{announcement}</div> : null}
            <h2 className="mx-auto max-w-lg font-heading text-4xl leading-[0.98] font-semibold tracking-[-0.045em]">
              {config.headline}
            </h2>
            <p
              className="mx-auto mt-4 max-w-md text-[11px] leading-5"
              style={{ color: config.theme.mutedColor }}
            >
              {config.subheadline}
            </p>
            <div className="mt-6">{previewCta}</div>
          </div>
        )}

        <div
          className={cn(
            "border-t border-black/8 px-5",
            isCompact ? "py-5" : "py-7",
          )}
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[8px] font-semibold tracking-[0.16em] uppercase opacity-45">
                Explore
              </p>
              <h3 className="mt-1 font-heading text-xl font-semibold tracking-tight">
                {terminology.offeringPlural}
              </h3>
            </div>
            <span className="text-[9px] opacity-45">View all</span>
          </div>
          <div
            className={cn(
              "mt-4 gap-2",
              isCompact
                ? "grid"
                : isGallery
                  ? "grid sm:grid-cols-3"
                  : "grid sm:grid-cols-2",
            )}
          >
            {previewOfferings.map((offering) =>
              isCompact ? (
                <div
                  key={offering._id}
                  className="flex items-center gap-3 border border-black/8 px-3 py-2.5"
                  style={{
                    borderRadius: surfaceRadius,
                    backgroundColor: previewBackground,
                  }}
                >
                  <span
                    className="block size-2.5 shrink-0"
                    style={{
                      backgroundColor: getOfferingColor(offering),
                      borderRadius: avatarRadius,
                    }}
                  />
                  <p className="min-w-0 flex-1 truncate text-[10px] font-semibold">
                    {offering.name}
                  </p>
                  <p className="font-mono text-[8px] opacity-50">
                    {formatMoney(
                      getOfferingPrice(offering),
                      offering.currency || organization?.currency,
                      organization?.locale,
                    )}
                  </p>
                </div>
              ) : (
                <div
                  key={offering._id}
                  className="border border-black/8 p-3"
                  style={{
                    borderRadius: surfaceRadius,
                    backgroundColor: previewBackground,
                  }}
                >
                  {isGallery ? (
                    <div
                      className="h-12 border border-black/5"
                      style={{
                        borderRadius: surfaceRadius,
                        backgroundColor: `color-mix(in srgb, ${getOfferingColor(offering)} 28%, ${config.theme.backgroundColor})`,
                      }}
                    />
                  ) : (
                    <span
                      className="block size-2"
                      style={{
                        backgroundColor: getOfferingColor(offering),
                        borderRadius: avatarRadius,
                      }}
                    />
                  )}
                  <p
                    className={cn(
                      "line-clamp-1 text-[10px] font-semibold",
                      isGallery ? "mt-3" : "mt-5",
                    )}
                  >
                    {offering.name}
                  </p>
                  <p className="mt-1 font-mono text-[8px] opacity-50">
                    {formatMoney(
                      getOfferingPrice(offering),
                      offering.currency || organization?.currency,
                      organization?.locale,
                    )}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>

        {showTeam && members.length > 0 && (
          <div className="border-t border-black/8 px-5 py-7">
            <div className="flex items-center gap-2">
              <UsersRound className="size-3.5" />
              <p className="font-heading text-lg font-semibold tracking-tight">
                Meet the {terminology.teamMemberPlural.toLowerCase()}
              </p>
            </div>
            <div className="mt-4 flex -space-x-2">
              {members.slice(0, 5).map((member) => (
                <span
                  key={member._id}
                  className="grid size-9 place-items-center border-2 border-white text-[8px] font-semibold text-white"
                  style={{
                    backgroundColor: getMemberColor(member),
                    borderRadius: avatarRadius,
                  }}
                >
                  {member.name.slice(0, 2).toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {(config.agent.showWebChat || config.agent.showVoiceChat) && (
          <div
            className="mx-5 mb-5 bg-[#20201e] p-3 text-white"
            style={{ borderRadius: surfaceRadius }}
          >
            <div className="flex items-start gap-3">
              <span
                className="grid size-8 shrink-0 place-items-center"
                style={{
                  backgroundColor: config.theme.accentColor,
                  borderRadius: avatarRadius,
                }}
              >
                <Bot className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold">AI concierge</p>
                <p className="mt-0.5 line-clamp-2 text-[8px] leading-3 text-white/50">
                  {config.agent.welcomeMessage}
                </p>
              </div>
            </div>
            <div
              className={`mt-3 grid gap-1.5 ${
                config.agent.showWebChat && config.agent.showVoiceChat
                  ? "grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {config.agent.showWebChat ? (
                <span
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[8px] font-semibold"
                  style={{
                    backgroundColor: config.theme.accentColor,
                    borderRadius: controlRadius,
                  }}
                >
                  <MessageCircle className="size-2.5" /> Chat with AI
                </span>
              ) : null}
              {config.agent.showVoiceChat ? (
                <span
                  className="inline-flex items-center justify-center gap-1 border border-white/15 px-2 py-1.5 text-[8px] font-semibold"
                  style={{ borderRadius: controlRadius }}
                >
                  <Mic className="size-2.5" /> Speak with AI
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {config.agent.showElevenLabsWidget ? (
        <div className="pointer-events-none absolute right-3 bottom-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 text-[8px] font-semibold text-foreground shadow-lg">
          <AudioLines className="size-3 text-primary" />
          Official ElevenLabs embed
        </div>
      ) : null}
    </div>
  );
}

function SiteEditor({
  initial,
  offerings,
  members,
}: {
  initial: CurrentSiteDraft;
  offerings: Offering[];
  members: TeamMember[];
}) {
  const { terminology } = useWorkspace();
  const entitlements = useFeatureEntitlements();
  const updateDraft = useMutation(dashboardApi.publicSite.updateDraft);
  const publish = useMutation(dashboardApi.publicSite.publish);
  const [siteSlug, setSiteSlug] = useState(initial.site.siteSlug);
  const [config, setConfig] = useState(initial.site.draft);
  const [publishedAt, setPublishedAt] = useState(initial.site.publishedAt);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function update<Key extends keyof SiteConfig>(
    key: Key,
    value: SiteConfig[Key],
  ) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function saveDraft() {
    await updateDraft({ config, siteSlug });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveDraft();
      toast.success("Public site draft saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save draft");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await saveDraft();
      const published = await publish({});
      setPublishedAt(published.publishedAt);
      toast.success("Public site published");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish site");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.78fr)_minmax(26rem,1.22fr)]">
      <form onSubmit={handleSave}>
        <Card className="bg-white xl:sticky xl:top-20">
          <CardHeader className="border-b border-black/8 pb-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-primary" />
              <CardTitle className="font-heading text-xl tracking-tight">
                Site settings
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="siteSlug">Public URL</Label>
              <div className="flex items-center rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <span className="pl-2.5 font-mono text-[11px] text-muted-foreground">
                  /p/
                </span>
                <Input
                  id="siteSlug"
                  value={siteSlug}
                  onChange={(event) =>
                    setSiteSlug(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  className="border-0 pl-0 shadow-none focus-visible:ring-0"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Template</Label>
                <Select
                  value={config.template}
                  onValueChange={(value) =>
                    update("template", value as SiteConfig["template"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editorial">Editorial</SelectItem>
                    <SelectItem value="gallery">Gallery</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Corner style</Label>
                <Select
                  value={config.theme.radius}
                  onValueChange={(radius) =>
                    update("theme", {
                      ...config.theme,
                      radius: radius as SiteConfig["theme"]["radius"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sharp">Sharp</SelectItem>
                    <SelectItem value="soft">Soft</SelectItem>
                    <SelectItem value="rounded">Rounded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Accent color</Label>
              <div className="flex flex-wrap gap-2">
                {accentPalettes.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      update("theme", { ...config.theme, accentColor: color })
                    }
                    className="grid size-8 place-items-center rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ backgroundColor: color }}
                    aria-label={`Use color ${color}`}
                    aria-pressed={
                      config.theme.accentColor.toLowerCase() ===
                      color.toLowerCase()
                    }
                  >
                    {config.theme.accentColor.toLowerCase() ===
                      color.toLowerCase() && (
                      <Check className="size-3.5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm leading-none font-medium">
                Background color
              </legend>
              <div className="flex flex-wrap gap-2">
                {backgroundPalettes.map(({ name, value }) => {
                  const selected =
                    config.theme.backgroundColor.toLowerCase() ===
                    value.toLowerCase();

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        update("theme", {
                          ...config.theme,
                          backgroundColor: value,
                        })
                      }
                      className={cn(
                        "grid size-9 place-items-center rounded-full border border-black/15 shadow-sm outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected && "ring-2 ring-foreground ring-offset-2",
                      )}
                      style={{ backgroundColor: value }}
                      aria-label={`Use ${name} background (${value})`}
                      aria-pressed={selected}
                      title={`${name} · ${value}`}
                    >
                      {selected ? (
                        <span className="grid size-4 place-items-center rounded-full bg-foreground text-background shadow-sm">
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="businessName">Public business name</Label>
              <Input
                id="businessName"
                value={config.businessName}
                onChange={(event) => update("businessName", event.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="announcement">Announcement</Label>
              <Input
                id="announcement"
                value={config.announcement ?? ""}
                onChange={(event) =>
                  update("announcement", event.target.value || undefined)
                }
                maxLength={240}
                placeholder="Optional status or promotion"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={config.headline}
                onChange={(event) => update("headline", event.target.value)}
                maxLength={180}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subheadline">Subheadline</Label>
              <Textarea
                id="subheadline"
                value={config.subheadline}
                onChange={(event) => update("subheadline", event.target.value)}
                rows={3}
                maxLength={400}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="about">About</Label>
              <Textarea
                id="about"
                value={config.about}
                onChange={(event) => update("about", event.target.value)}
                rows={4}
                maxLength={4000}
                required
              />
            </div>

            <div className="grid gap-4 border-t border-black/8 pt-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">Public email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={config.contact.email ?? ""}
                  onChange={(event) =>
                    update("contact", {
                      ...config.contact,
                      email: event.target.value || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactPhone">Public phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={config.contact.phone ?? ""}
                  onChange={(event) =>
                    update("contact", {
                      ...config.contact,
                      phone: event.target.value || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="contactAddress">Address or service area</Label>
                <Input
                  id="contactAddress"
                  value={config.contact.address ?? ""}
                  onChange={(event) =>
                    update("contact", {
                      ...config.contact,
                      address: event.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-black/8 pt-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="bookingEnabled">
                    Online {terminology.bookingPlural.toLowerCase()}
                  </Label>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Let visitors choose a live slot.
                  </p>
                </div>
                <Switch
                  id="bookingEnabled"
                  checked={config.booking.enabled}
                  onCheckedChange={(enabled) =>
                    update("booking", { ...config.booking, enabled })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="showTeam">
                  Show {terminology.teamMemberPlural.toLowerCase()}
                </Label>
                <Switch
                  id="showTeam"
                  checked={config.sections.includes("team")}
                  onCheckedChange={(enabled) =>
                    update(
                      "sections",
                      toggleSection(config.sections, "team", enabled),
                    )
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="showWebAgent">Show AI text chat</Label>
                  {!entitlements.isLoaded ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Checking organization plan…
                    </p>
                  ) : !entitlements.webAgent ? (
                    <p className="mt-0.5 text-[10px] text-primary">
                      Requires a plan upgrade
                    </p>
                  ) : null}
                </div>
                <Switch
                  id="showWebAgent"
                  checked={config.agent.showWebChat}
                  onCheckedChange={(showWebChat) =>
                    update("agent", { ...config.agent, showWebChat })
                  }
                  disabled={
                    !entitlements.isLoaded ||
                    (!entitlements.webAgent && !config.agent.showWebChat)
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="showVoiceAgent">Show browser audio</Label>
                  {!entitlements.isLoaded ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Checking organization plan…
                    </p>
                  ) : !entitlements.browserVoice ? (
                    <p className="mt-0.5 text-[10px] text-primary">
                      Requires the Voice plan
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Uses the visitor’s microphone in the browser.
                    </p>
                  )}
                </div>
                <Switch
                  id="showVoiceAgent"
                  checked={config.agent.showVoiceChat}
                  onCheckedChange={(showVoiceChat) =>
                    update("agent", { ...config.agent, showVoiceChat })
                  }
                  disabled={
                    !entitlements.isLoaded ||
                    (!entitlements.browserVoice && !config.agent.showVoiceChat)
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="showElevenLabsWidget">
                    Also show ElevenLabs embed
                  </Label>
                  {!entitlements.isLoaded ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Checking organization plan…
                    </p>
                  ) : !entitlements.browserVoice ? (
                    <p className="mt-0.5 text-[10px] text-primary">
                      Requires the Voice plan
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Adds ElevenLabs’ official floating text and audio widget
                      alongside the custom agent experience.
                    </p>
                  )}
                </div>
                <Switch
                  id="showElevenLabsWidget"
                  checked={Boolean(config.agent.showElevenLabsWidget)}
                  onCheckedChange={(showElevenLabsWidget) =>
                    update("agent", {
                      ...config.agent,
                      showElevenLabsWidget,
                    })
                  }
                  disabled={
                    !entitlements.isLoaded ||
                    (!entitlements.browserVoice &&
                      !config.agent.showElevenLabsWidget)
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="welcomeMessage">Agent welcome message</Label>
              <Textarea
                id="welcomeMessage"
                value={config.agent.welcomeMessage}
                onChange={(event) =>
                  update("agent", {
                    ...config.agent,
                    welcomeMessage: event.target.value,
                  })
                }
                rows={2}
                maxLength={500}
                required
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-black/8 pt-4 sm:flex-row">
              <Button
                type="submit"
                variant="outline"
                className="flex-1"
                disabled={saving}
              >
                {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
                Save draft
              </Button>
              <Button
                type="button"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/85"
                onClick={() => void handlePublish()}
                disabled={publishing}
              >
                {publishing ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Send />
                )}
                Publish
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Live preview</span>
            <StatusBadge status={publishedAt ? "published" : "draft"} />
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/p/${siteSlug}`} target="_blank">
              Open page <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <SitePreview
          siteSlug={siteSlug}
          config={config}
          offerings={offerings}
          members={members}
        />
      </div>
    </div>
  );
}

export function PublicSiteScreen() {
  const { organization, terminology } = useWorkspace();
  const current = useQuery(
    dashboardApi.publicSite.getCurrentDraft,
    organization ? {} : "skip",
  );
  const offerings = useQuery(
    dashboardApi.catalog.listOfferings,
    organization ? {} : "skip",
  );
  const members = useQuery(
    dashboardApi.team.listMembers,
    organization ? {} : "skip",
  );

  return (
    <>
      <ScreenHeader
        eyebrow="Public experience"
        title="Public Site"
        description={`Shape a branded ${terminology.booking.toLowerCase()} page for this organization. Its ${terminology.offeringPlural.toLowerCase()}, ${terminology.teamMemberPlural.toLowerCase()}, availability, and optional agent channels stay live from the same workspace.`}
        action={
          current ? (
            <Button asChild variant="outline" className="bg-white">
              <Link href={`/p/${current.site.siteSlug}`} target="_blank">
                <Globe2 /> Open public page
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!current || !offerings || !members ? (
        <LoadingPanel rows={7} />
      ) : (
        <SiteEditor
          key={`${current.site._id}-${current.site.updatedAt}`}
          initial={current}
          offerings={offerings.filter(
            (offering) => offering.active && offering.bookableOnline,
          )}
          members={members.filter(
            (member) => member.active && member.acceptingBookings,
          )}
        />
      )}
    </>
  );
}
