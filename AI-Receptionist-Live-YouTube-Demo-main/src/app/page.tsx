import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Headphones,
  MessageSquareText,
  Mic,
  MoveUpRight,
  Sparkles,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const moments = [
  {
    time: "09:41",
    icon: Mic,
    label: "Browser audio",
    detail: "New customer · 3m 18s",
    tone: "bg-blue-600 text-white",
  },
  {
    time: "09:44",
    icon: CalendarDays,
    label: "Request confirmed",
    detail: "Tuesday, 14:30 · Maya",
    tone: "bg-[#dff5e8] text-[#17623a]",
  },
  {
    time: "09:47",
    icon: MessageSquareText,
    label: "Web conversation",
    detail: "Pricing question resolved",
    tone: "bg-[#f8e9c8] text-[#6b4710]",
  },
];

const plans = [
  {
    name: "Core",
    price: "$0",
    copy: "The operational home for a new organization.",
    features: ["Bookings and availability", "Offerings and team", "Custom public page"],
  },
  {
    name: "Engage",
    price: "$49",
    copy: "Give every visitor an AI concierge on the web.",
    features: ["Everything in Core", "ElevenLabs web agent", "Conversation history"],
    featured: true,
  },
  {
    name: "Voice",
    price: "$149",
    copy: "Let clients speak with your AI front desk from any browser.",
    features: ["Everything in Engage", "Live browser audio", "Advanced analytics"],
  },
];

function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex h-17 max-w-[1400px] items-center px-5 sm:px-8 lg:px-12">
        <Brand />
        <nav className="ml-12 hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link className="transition-colors hover:text-foreground" href="#platform">
            Platform
          </Link>
          <Link className="transition-colors hover:text-foreground" href="#built-for">
            Built for
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/pricing">
            Pricing
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!signedIn ? (
            <>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 shadow-none">
              <Link href="/sign-up">
                Start free <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            </>
          ) : (
            <>
            <Button asChild size="sm" className="gap-1.5 shadow-none">
              <Link href="/app">
                Open workspace <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <UserButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="overflow-hidden bg-background">
      <MarketingNav signedIn={Boolean(userId)} />

      <section className="relative border-b">
        <div className="absolute inset-0 hairline-grid opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        <div className="relative mx-auto grid max-w-[1400px] gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:px-12 lg:pb-28 lg:pt-30">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-7 rounded-sm bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]">
              AI front desk · built around your business
            </Badge>
            <h1 className="font-heading text-[clamp(3.8rem,8vw,7.4rem)] font-medium leading-[0.82] tracking-[-0.065em] text-balance">
              Every request,
              <span className="mt-3 block text-primary italic">one front door.</span>
            </h1>
            <p className="mt-9 max-w-xl text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8">
              Switchboard answers questions, chats with clients, and organizes
              bookings for any service business—using your language, hours,
              people, and brand.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 gap-2 rounded-md px-6 shadow-none">
                <Link href="/sign-up">
                  Build your front desk <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 gap-2 rounded-md bg-background px-6 shadow-none">
                <Link href="/p/papafam-cuts">
                  View a client page <MoveUpRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t pt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="flex items-center gap-2"><Check className="size-3 text-primary" /> Start free</span>
              <span className="flex items-center gap-2"><Check className="size-3 text-primary" /> No card required</span>
              <span className="flex items-center gap-2"><Check className="size-3 text-primary" /> Built on Clerk + ElevenLabs</span>
            </div>
          </div>

          <div className="relative flex items-center lg:pl-8">
            <div className="w-full border border-foreground/12 bg-card shadow-[18px_22px_0_0_oklch(0.205_0.018_264.4)]">
              <div className="flex items-center border-b px-5 py-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Tuesday · Live desk</p>
                  <p className="mt-1 text-sm font-semibold">Morning activity</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_oklch(0.9_0.08_151)]" />
                  Agent online
                </span>
              </div>
              <div className="p-3 sm:p-5">
                {moments.map(({ time, icon: Icon, label, detail, tone }, index) => (
                  <div key={label} className="grid grid-cols-[42px_40px_1fr_auto] items-center gap-3 border-b px-1 py-4 last:border-0 sm:grid-cols-[48px_44px_1fr_auto]">
                    <span className="font-mono text-[10px] text-muted-foreground">{time}</span>
                    <span className={`grid size-9 place-items-center rounded-md ${tone}`}><Icon className="size-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{label}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
                    </div>
                    <span className="hidden font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground sm:inline">0{index + 1}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 border-t bg-[#171b24] text-white">
                {[["12", "requests"], ["4", "booked"], ["98%", "resolved"]].map(([value, label]) => (
                  <div key={label} className="border-r px-4 py-5 last:border-0 border-white/10">
                    <p className="font-heading text-3xl tracking-[-0.04em]">{value}</p>
                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/45">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">One system, three surfaces</p>
            <h2 className="mt-4 max-w-md font-heading text-5xl font-medium leading-[0.96] tracking-[-0.05em] sm:text-6xl">
              The front desk finally has a back office.
            </h2>
          </div>
          <div className="grid border-t md:grid-cols-3">
            {[
              { icon: CalendarDays, n: "01", title: "Operations", copy: "Bookings, availability, offerings, contacts, and the people who deliver the work." },
              { icon: Bot, n: "02", title: "Web agent", copy: "An ElevenLabs concierge that knows the organization and can help visitors take action." },
              { icon: Headphones, n: "03", title: "Browser audio", copy: "A live voice conversation in the public page, powered by the same organization context." },
            ].map(({ icon: Icon, n, title, copy }) => (
              <article key={n} className="border-b border-r px-0 py-8 pr-7 md:px-7 md:first:pl-0 md:last:border-r-0">
                <div className="flex items-center justify-between">
                  <Icon className="size-5 text-primary" />
                  <span className="font-mono text-[10px] text-muted-foreground">{n}</span>
                </div>
                <h3 className="mt-12 font-heading text-3xl font-medium tracking-[-0.035em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="built-for" className="border-y bg-[#171b24] text-white">
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-2">
          <div className="border-b border-white/10 px-5 py-20 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-28">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-300">Not a vertical template</p>
            <h2 className="mt-5 max-w-xl font-heading text-5xl font-medium leading-[0.96] tracking-[-0.05em] sm:text-6xl">
              Your business defines the nouns.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/58">
              A salon calls it a treatment. A consultant calls it a session. A
              support team calls it a case. Switchboard’s terminology, forms,
              availability, and public page adapt without changing the core.
            </p>
          </div>
          <div className="grid grid-cols-2">
            {[
              ["Barbers & salons", "Service · Stylist · Appointment"],
              ["Studios & coaches", "Session · Coach · Booking"],
              ["Clinics & practices", "Visit · Practitioner · Patient"],
              ["Tech support", "Case · Specialist · Customer"],
            ].map(([title, vocabulary], index) => (
              <div key={title} className="min-h-48 border-b border-r border-white/10 p-6 last:border-b-0 sm:p-8 even:border-r-0">
                <span className="font-mono text-[9px] text-white/30">0{index + 1}</span>
                <h3 className="mt-10 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-white/45">{vocabulary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Feature-based plans</p>
            <h2 className="mt-4 font-heading text-5xl font-medium tracking-[-0.05em] sm:text-6xl">Start useful. Add a voice.</h2>
          </div>
          <Link href="/pricing" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Compare plans <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="grid border-l border-t lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`relative flex min-h-[430px] flex-col border-b border-r p-7 sm:p-9 ${plan.featured ? "bg-primary text-primary-foreground" : "bg-card"}`}>
              {plan.featured ? <span className="absolute right-5 top-5 font-mono text-[9px] uppercase tracking-[0.15em] text-primary-foreground/65">Most popular</span> : null}
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-55">{plan.name}</p>
              <p className="mt-8 font-heading text-6xl font-medium tracking-[-0.06em]">{plan.price}<span className="ml-1 font-sans text-xs font-normal tracking-normal opacity-60">/mo</span></p>
              <p className="mt-4 max-w-xs text-sm leading-6 opacity-65">{plan.copy}</p>
              <div className="mt-9 space-y-3 border-t border-current/15 pt-6">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-sm"><Check className="size-3.5" /> {feature}</p>
                ))}
              </div>
              <Button asChild variant={plan.featured ? "secondary" : "outline"} className="mt-auto h-11 justify-between rounded-md shadow-none">
                <Link href="/sign-up">Choose {plan.name}<ArrowRight className="size-4" /></Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t bg-[#dce6ff]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-8 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-24">
          <div>
            <Sparkles className="size-6 text-primary" />
            <h2 className="mt-6 max-w-3xl font-heading text-5xl font-medium leading-[0.94] tracking-[-0.05em] sm:text-7xl">Give your team their time back.</h2>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 gap-2 rounded-md px-6 shadow-none">
            <Link href="/sign-up">Start with Core <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <Brand />
          <p className="sm:ml-auto">One intelligent front desk for every organization.</p>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
