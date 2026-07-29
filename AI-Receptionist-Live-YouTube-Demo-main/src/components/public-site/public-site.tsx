import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AgentLauncher } from "@/components/public-site/agent-launcher";
import { BookingFlow } from "@/components/public-site/booking-flow";
import { ElevenLabsEmbed } from "@/components/public-site/elevenlabs-embed";
import type { PublishedSite, PublicOffering } from "@/components/public-site/types";

type TenantStyle = CSSProperties &
  Record<
    | "--background"
    | "--foreground"
    | "--card"
    | "--card-foreground"
    | "--popover"
    | "--popover-foreground"
    | "--primary"
    | "--primary-foreground"
    | "--secondary"
    | "--secondary-foreground"
    | "--muted"
    | "--muted-foreground"
    | "--accent"
    | "--accent-foreground"
    | "--border"
    | "--input"
    | "--ring"
    | "--radius"
    | "--font-sans"
    | "--font-heading",
    string
  >;

function safeHttpUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function contrastColor(color: string) {
  const hex = color.trim().replace(/^#/, "");
  if (!/^[\da-f]{6}$/i.test(hex)) return "#ffffff";
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 150 ? "#151713" : "#ffffff";
}

function fontFamilies(font: PublishedSite["site"]["config"]["theme"]["font"]) {
  if (font === "editorial") {
    return {
      body: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
      heading: '"Bodoni 72", Didot, "Times New Roman", serif',
    };
  }
  if (font === "friendly") {
    return {
      body: 'ui-rounded, "Avenir Next", Avenir, "Segoe UI", sans-serif',
      heading: 'ui-rounded, "Avenir Next", Avenir, "Segoe UI", sans-serif',
    };
  }
  return {
    body: '"Avenir Next", Avenir, "Helvetica Neue", sans-serif',
    heading: '"Avenir Next", Avenir, "Helvetica Neue", sans-serif',
  };
}

function tenantStyle(
  theme: PublishedSite["site"]["config"]["theme"],
): TenantStyle {
  const fonts = fontFamilies(theme.font);
  const primaryForeground = contrastColor(theme.accentColor);
  const radius =
    theme.radius === "sharp"
      ? "0.3rem"
      : theme.radius === "rounded"
        ? "1.15rem"
        : "0.7rem";

  return {
    "--background": theme.backgroundColor,
    "--foreground": theme.foregroundColor,
    "--card": `color-mix(in srgb, ${theme.backgroundColor} 94%, ${theme.foregroundColor} 6%)`,
    "--card-foreground": theme.foregroundColor,
    "--popover": theme.backgroundColor,
    "--popover-foreground": theme.foregroundColor,
    "--primary": theme.accentColor,
    "--primary-foreground": primaryForeground,
    "--secondary": `color-mix(in srgb, ${theme.backgroundColor} 88%, ${theme.mutedColor} 12%)`,
    "--secondary-foreground": theme.foregroundColor,
    "--muted": `color-mix(in srgb, ${theme.backgroundColor} 84%, ${theme.mutedColor} 16%)`,
    "--muted-foreground": theme.mutedColor,
    "--accent": theme.accentColor,
    "--accent-foreground": primaryForeground,
    "--border": `color-mix(in srgb, ${theme.foregroundColor} 14%, transparent)`,
    "--input": `color-mix(in srgb, ${theme.foregroundColor} 18%, transparent)`,
    "--ring": theme.accentColor,
    "--radius": radius,
    "--font-sans": fonts.heading,
    "--font-heading": fonts.heading,
    backgroundColor: theme.backgroundColor,
    color: theme.foregroundColor,
    colorScheme:
      contrastColor(theme.backgroundColor) === "#ffffff" ? "dark" : "light",
    fontFamily: fonts.body,
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatPrice(offering: PublicOffering, locale: string, currency: string) {
  try {
    const offeringCurrency = offering.currency || currency;
    const fractionDigits = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: offeringCurrency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: offeringCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
    }).format(offering.priceMinor / 10 ** fractionDigits);
  } catch {
    return `${offering.currency || currency} ${(offering.priceMinor / 100).toFixed(2)}`;
  }
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-heading text-3xl leading-[1.05] tracking-[-0.045em] text-balance sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function SectionShell({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 border-t border-border px-5 py-20 sm:px-8 lg:px-12 lg:py-28", className)}>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
  );
}

export function PublicSite({
  siteSlug,
  publishedSite,
  textAgentEnabled,
  voiceAgentEnabled,
}: {
  siteSlug: string;
  publishedSite: PublishedSite;
  textAgentEnabled: boolean;
  voiceAgentEnabled: boolean;
}) {
  const { organization, site, offerings, teamMembers, knowledgeItems } =
    publishedSite;
  const { config } = site;
  const { terminology } = organization;
  const heroImageUrl = safeHttpUrl(config.heroImageUrl);
  const logoUrl = safeHttpUrl(config.logoUrl);
  const isCompact = config.template === "compact";
  const isGallery = config.template === "gallery";
  const bookingIsVisible =
    config.booking.enabled && config.sections.includes("booking");
  const textAgentIsVisible =
    textAgentEnabled && config.agent.showWebChat;
  const voiceAgentIsVisible =
    voiceAgentEnabled && config.agent.showVoiceChat;
  const elevenLabsWidgetIsVisible =
    voiceAgentEnabled && config.agent.showElevenLabsWidget;
  const agentIsVisible = textAgentIsVisible || voiceAgentIsVisible;
  const sectionSet = new Set(config.sections);

  const heroVisualStyle: CSSProperties = heroImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, transparent 48%, color-mix(in srgb, var(--foreground) 38%, transparent)), url(${JSON.stringify(heroImageUrl)})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : {
        backgroundImage:
          "radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--primary) 50%, transparent), transparent 30%), radial-gradient(circle at 80% 74%, color-mix(in srgb, var(--foreground) 16%, transparent), transparent 38%), linear-gradient(145deg, var(--muted), color-mix(in srgb, var(--background) 80%, var(--primary) 20%))",
      };

  function offeringsSection() {
    if (!sectionSet.has("offerings")) return null;
    return (
      <SectionShell id="offerings">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow={terminology.offeringPlural}
            title="Choose what works for you"
            description={`Explore what ${config.businessName} offers, then pick a time that fits your day.`}
          />
          {bookingIsVisible ? (
            <Button asChild variant="outline" size="lg" className="h-11 shrink-0 self-start rounded-full px-5 sm:self-auto">
              <a href="#book">
                Book now
                <ArrowRight data-icon="inline-end" />
              </a>
            </Button>
          ) : null}
        </div>

        {offerings.length ? (
          <div
            className={cn(
              "mt-12 grid gap-px overflow-hidden rounded-[calc(var(--radius)*1.55)] border bg-border",
              isGallery ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2",
            )}
          >
            {offerings.map((offering, index) => (
              <article
                key={offering._id}
                className="group relative flex min-h-56 flex-col bg-background p-6 transition-colors hover:bg-card sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[0.68rem] tracking-[0.14em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {offering.category ? (
                    <Badge variant="secondary">{offering.category}</Badge>
                  ) : null}
                </div>
                <div className="mt-auto pt-10">
                  <h3 className="font-heading text-xl tracking-[-0.025em] sm:text-2xl">
                    {offering.name}
                  </h3>
                  {offering.description ? (
                    <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                      {offering.description}
                    </p>
                  ) : null}
                  <div className="mt-6 flex items-center justify-between gap-4 border-t pt-4 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock3 className="size-4" aria-hidden="true" />
                      {offering.durationMinutes} min
                    </span>
                    <span className="font-semibold">
                      {formatPrice(offering, organization.locale, organization.currency)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Card className="mt-10 bg-card/60">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              New {terminology.offeringPlural.toLowerCase()} will be published here soon.
            </CardContent>
          </Card>
        )}
      </SectionShell>
    );
  }

  function teamSection() {
    if (!sectionSet.has("team") || !teamMembers.length) return null;
    return (
      <SectionShell id="team" className="bg-muted/35">
        <SectionHeading
          eyebrow={terminology.teamMemberPlural}
          title="Meet the people behind the experience"
          description={`Get to know the ${terminology.teamMemberPlural.toLowerCase()} who make ${config.businessName} what it is.`}
        />
        <div className={cn("mt-12 grid gap-4", teamMembers.length === 2 ? "md:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
          {teamMembers.map((member) => (
            <Card key={member._id} className="group bg-background/75 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader className="flex-row items-center gap-4">
                <Avatar className="size-16 ring-1 ring-border">
                  <AvatarImage src={member.imageUrl} alt="" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">{member.name}</CardTitle>
                  <CardDescription className="mt-1">{member.title}</CardDescription>
                </div>
              </CardHeader>
              {member.bio ? (
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{member.bio}</p>
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      </SectionShell>
    );
  }

  function aboutSection() {
    if (!sectionSet.has("about") || !config.about) return null;
    return (
      <SectionShell id="about">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="About" title={`The story of ${config.businessName}`} />
          <div className="lg:border-s lg:ps-12">
            <p className="whitespace-pre-line font-heading text-2xl leading-[1.45] tracking-[-0.025em] text-balance sm:text-3xl">
              {config.about}
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4 border-t pt-6 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Based in</p>
                <p className="mt-2 font-medium">{config.contact.address || "Serving our community"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Local time</p>
                <p className="mt-2 font-medium">{organization.timezone.replaceAll("_", " ")}</p>
              </div>
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  function faqSection() {
    if (!sectionSet.has("faq") || !knowledgeItems.length) return null;
    return (
      <SectionShell id="faq" className="bg-muted/35">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow="Good to know"
            title="Answers before you book"
            description={`A few helpful details from ${config.businessName}.`}
          />
          <Accordion type="single" collapsible className="border-t">
            {knowledgeItems.map((item) => (
              <AccordionItem key={item._id} value={item._id}>
                <AccordionTrigger className="text-left font-heading text-base hover:no-underline">
                  <span className="pe-4">{item.title}</span>
                </AccordionTrigger>
                <AccordionContent className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {item.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </SectionShell>
    );
  }

  function contactSection() {
    if (!sectionSet.has("contact")) return null;
    const mapUrl = safeHttpUrl(config.contact.mapUrl);
    return (
      <SectionShell id="contact">
        <div className="overflow-hidden rounded-[calc(var(--radius)*1.8)] bg-foreground text-background">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-background/55">Contact</p>
              <h2 className="mt-4 max-w-xl font-heading text-4xl leading-[1.04] tracking-[-0.045em] sm:text-5xl">
                Let&apos;s find the right next step
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-6 text-background/65">
                Book online, ask the concierge, or reach out directly. {config.businessName} will be happy to help.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {bookingIsVisible ? (
                  <Button asChild size="lg" className="h-11 rounded-full bg-background px-5 text-foreground hover:bg-background/85">
                    <a href="#book">
                      <CalendarCheck2 data-icon="inline-start" />
                      Book now
                    </a>
                  </Button>
                ) : null}
                {config.contact.email ? (
                  <Button asChild variant="outline" size="lg" className="h-11 rounded-full border-background/20 bg-transparent px-5 text-background hover:bg-background/10 hover:text-background">
                    <a href={`mailto:${config.contact.email}`}>
                      <Mail data-icon="inline-start" />
                      Email us
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="border-t border-background/15 bg-background/5 p-7 sm:p-10 lg:border-s lg:border-t-0 lg:p-12">
              <dl className="space-y-7 text-sm">
                {config.contact.address ? (
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-background/50" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-background/45">Address</dt>
                      <dd className="mt-1.5 leading-6">{config.contact.address}</dd>
                      {mapUrl ? (
                        <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs underline underline-offset-4">
                          View map <ArrowUpRight className="size-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {config.contact.phone ? (
                  <div className="flex gap-3">
                    <Phone className="mt-0.5 size-4 shrink-0 text-background/50" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-background/45">Phone</dt>
                      <dd className="mt-1.5">
                        <a href={`tel:${config.contact.phone}`} className="underline-offset-4 hover:underline">
                          {config.contact.phone}
                        </a>
                      </dd>
                    </div>
                  </div>
                ) : null}
                {config.contact.email ? (
                  <div className="flex gap-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-background/50" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs text-background/45">Email</dt>
                      <dd className="mt-1.5 truncate">
                        <a href={`mailto:${config.contact.email}`} className="underline-offset-4 hover:underline">
                          {config.contact.email}
                        </a>
                      </dd>
                    </div>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  function bookingSection() {
    if (!bookingIsVisible) return null;
    return (
      <SectionShell id="book" className="bg-muted/35">
        <SectionHeading
          eyebrow={`Online ${terminology.bookingSingular.toLowerCase()}`}
          title="Choose a time, your way"
          description={`A few simple steps and your time with ${config.businessName} is reserved.`}
          align="center"
        />
        <div className="mt-12">
          <BookingFlow
            siteSlug={siteSlug}
            businessName={config.businessName}
            offerings={offerings}
            teamMembers={teamMembers}
            terminology={terminology}
            locale={organization.locale}
            currency={organization.currency}
            timezone={organization.timezone}
            maximumAdvanceDays={config.booking.maximumAdvanceDays}
          />
        </div>
      </SectionShell>
    );
  }

  const sections: Record<PublishedSite["site"]["config"]["sections"][number], () => ReactNode> = {
    offerings: offeringsSection,
    team: teamSection,
    about: aboutSection,
    faq: faqSection,
    contact: contactSection,
    booking: bookingSection,
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground" style={tenantStyle(config.theme)}>
      {config.announcement ? (
        <div className="bg-primary px-5 py-2.5 text-center text-xs font-medium tracking-wide text-primary-foreground">
          {config.announcement}
        </div>
      ) : null}

      <header className="relative z-20 border-b border-border bg-background/90 px-5 backdrop-blur-xl sm:px-8 lg:px-12">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-5">
          <a href="#top" className="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/35">
            {logoUrl ? (
              <span
                role="img"
                aria-label={`${config.businessName} logo`}
                className="size-10 shrink-0 rounded-full border bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${JSON.stringify(logoUrl)})` }}
              />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-heading text-sm font-semibold text-primary-foreground">
                {initials(config.businessName)}
              </span>
            )}
            <span className="truncate font-heading text-lg font-semibold tracking-[-0.02em]">
              {config.businessName}
            </span>
          </a>

          <nav className="hidden items-center gap-6 text-xs font-medium lg:flex" aria-label="Main navigation">
            {sectionSet.has("offerings") ? <a href="#offerings" className="text-muted-foreground transition hover:text-foreground">{terminology.offeringPlural}</a> : null}
            {sectionSet.has("team") && teamMembers.length ? <a href="#team" className="text-muted-foreground transition hover:text-foreground">{terminology.teamMemberPlural}</a> : null}
            {sectionSet.has("about") ? <a href="#about" className="text-muted-foreground transition hover:text-foreground">About</a> : null}
            {sectionSet.has("faq") && knowledgeItems.length ? <a href="#faq" className="text-muted-foreground transition hover:text-foreground">FAQ</a> : null}
            {sectionSet.has("contact") ? <a href="#contact" className="text-muted-foreground transition hover:text-foreground">Contact</a> : null}
            {agentIsVisible ? <a href="#assistant" className="text-muted-foreground transition hover:text-foreground">AI concierge</a> : null}
          </nav>

          {bookingIsVisible ? (
            <Button asChild size="lg" className="h-10 shrink-0 rounded-full px-4">
              <a href="#book">
                Book now
                <ArrowRight data-icon="inline-end" />
              </a>
            </Button>
          ) : config.contact.email ? (
            <Button asChild variant="outline" size="lg" className="h-10 shrink-0 rounded-full px-4">
              <a href={`mailto:${config.contact.email}`}>Get in touch</a>
            </Button>
          ) : null}
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden px-5 sm:px-8 lg:px-12">
          <div className="pointer-events-none absolute -start-40 top-10 size-96 rounded-full bg-primary/10 blur-3xl" />
          <div
            className={cn(
              "relative mx-auto grid w-full max-w-7xl items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:py-24",
              isCompact && "lg:grid-cols-[1.3fr_0.7fr] lg:py-16",
            )}
          >
            <div className="relative z-10 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="rounded-full bg-background/55 px-3 py-1 text-[0.68rem] uppercase tracking-[0.15em] backdrop-blur">
                  <Sparkles className="size-3" />
                  Now accepting {terminology.bookingPlural.toLowerCase()} online
                </Badge>
                <span className="text-xs text-muted-foreground">{organization.timezone.replaceAll("_", " ")}</span>
              </div>
              <h1 className={cn("mt-7 max-w-4xl font-heading text-5xl leading-[0.96] tracking-[-0.06em] text-balance sm:text-6xl lg:text-7xl", isCompact && "lg:text-6xl")}>
                {config.headline}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {config.subheadline}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {bookingIsVisible ? (
                  <Button asChild size="lg" className="h-12 rounded-full px-6">
                    <a href="#book">
                      <CalendarCheck2 data-icon="inline-start" />
                      Find a time
                    </a>
                  </Button>
                ) : null}
                {sectionSet.has("offerings") ? (
                  <Button asChild variant="outline" size="lg" className="h-12 rounded-full bg-background/40 px-6 backdrop-blur">
                    <a href="#offerings">Explore {terminology.offeringPlural.toLowerCase()}</a>
                  </Button>
                ) : null}
                {agentIsVisible ? (
                  <Button asChild variant="outline" size="lg" className="h-12 rounded-full bg-background/40 px-6 backdrop-blur">
                    <a href="#assistant">
                      <MessageCircle data-icon="inline-start" />
                      Ask our AI
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-border pt-6 text-xs text-muted-foreground">
                {offerings.length ? <span>{offerings.length} {offerings.length === 1 ? terminology.offeringSingular : terminology.offeringPlural}</span> : null}
                {teamMembers.length ? <span>{teamMembers.length} {teamMembers.length === 1 ? terminology.teamMemberSingular : terminology.teamMemberPlural}</span> : null}
                {bookingIsVisible ? <span className="flex items-center gap-1.5"><CalendarCheck2 className="size-3.5" /> Instant confirmation</span> : null}
              </div>
            </div>

            {agentIsVisible ? (
              <AgentLauncher
                siteSlug={siteSlug}
                businessName={config.businessName}
                welcomeMessage={config.agent.welcomeMessage}
                textEnabled={textAgentIsVisible}
                voiceEnabled={voiceAgentIsVisible}
                offerings={offerings}
                teamMembers={teamMembers}
                timezone={organization.timezone}
                locale={organization.locale}
              />
            ) : (
              <div
                className={cn(
                  "relative isolate min-h-[30rem] overflow-hidden rounded-[calc(var(--radius)*2.2)] border shadow-[0_35px_100px_-45px_color-mix(in_srgb,var(--foreground)_45%,transparent)] sm:min-h-[36rem]",
                  isCompact && "min-h-[22rem] sm:min-h-[26rem]",
                )}
                style={heroVisualStyle}
                aria-label={heroImageUrl ? `${config.businessName} feature image` : undefined}
                role={heroImageUrl ? "img" : undefined}
              >
                <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 rounded-[calc(var(--radius)*1.25)] border border-white/15 bg-black/35 p-4 text-white backdrop-blur-md sm:inset-x-6 sm:bottom-6">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.18em] text-white/60">Welcome to</p>
                    <p className="mt-1 font-heading text-lg">{config.businessName}</p>
                  </div>
                  {bookingIsVisible ? (
                    <a href="#book" className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-black transition hover:scale-105" aria-label="Book now">
                      <ArrowRight className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </section>

        {config.sections.map((section) => (
          <div key={section}>{sections[section]()}</div>
        ))}
      </main>

      <footer className="border-t border-border px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-7 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials(config.businessName)}
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">{config.businessName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Secure online {terminology.bookingPlural.toLowerCase()}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {config.socialLinks.map((link) => {
              const href = safeHttpUrl(link.url);
              return href ? (
                <a key={`${link.label}-${href}`} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition hover:text-foreground">
                  {link.label} <ArrowUpRight className="size-3" />
                </a>
              ) : null;
            })}
            <span>© {new Date().getFullYear()} {config.businessName}</span>
          </div>
        </div>
      </footer>

      {elevenLabsWidgetIsVisible ? (
        <ElevenLabsEmbed
          siteSlug={siteSlug}
          businessName={config.businessName}
          primaryColor={config.theme.accentColor}
          secondaryColor={config.theme.foregroundColor}
          offerings={offerings}
          teamMembers={teamMembers}
          timezone={organization.timezone}
          locale={organization.locale}
        />
      ) : null}
    </div>
  );
}
