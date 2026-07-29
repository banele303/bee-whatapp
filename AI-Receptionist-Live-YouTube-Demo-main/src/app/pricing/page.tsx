import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { PricingTable } from "@clerk/nextjs";
import { ArrowLeft, Check } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

const publicPlans = [
  { name: "Core", price: "$0", description: "Bookings, operations, and a custom public page.", features: ["Bookings and availability", "Offerings and team", "Configurable public site"] },
  { name: "Engage", price: "$49", description: "Add an ElevenLabs agent to every client page.", features: ["Everything in Core", "Web text agent", "Conversation history"], featured: true },
  { name: "Voice", price: "$149", description: "Let clients speak with your agent directly in the browser.", features: ["Everything in Engage", "Live browser audio", "Advanced analytics"] },
];

export default async function PricingPage() {
  const { userId, orgId } = await auth();

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-18 max-w-[1400px] items-center px-5 sm:px-8 lg:px-12">
          <Brand />
          <Button asChild variant="ghost" size="sm" className="ml-auto gap-2">
            <Link href={userId ? "/app" : "/"}><ArrowLeft className="size-3.5" /> {userId ? "Workspace" : "Home"}</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mb-14 max-w-3xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Plans that unlock capabilities</p>
          <h1 className="mt-5 font-heading text-6xl font-medium leading-[0.92] tracking-[-0.055em] sm:text-7xl">Run the desk for free. Add AI where it matters.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">Each plan belongs to an organization, so every workspace can choose the capabilities it needs.</p>
        </div>

        {orgId ? (
          <div className="rounded-lg border bg-card p-2 sm:p-6">
            <PricingTable for="organization" highlightedPlan="engage" newSubscriptionRedirectUrl="/app" />
          </div>
        ) : (
          <>
            <div className="grid border-l border-t lg:grid-cols-3">
              {publicPlans.map((plan) => (
                <article key={plan.name} className={`flex min-h-[410px] flex-col border-b border-r p-8 ${plan.featured ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">{plan.name}</p>
                  <p className="mt-8 font-heading text-6xl tracking-[-0.06em]">{plan.price}<span className="ml-1 font-sans text-xs tracking-normal opacity-60">/mo</span></p>
                  <p className="mt-4 text-sm leading-6 opacity-65">{plan.description}</p>
                  <div className="mt-8 space-y-3 border-t border-current/15 pt-6">
                    {plan.features.map((feature) => <p key={feature} className="flex items-center gap-2 text-sm"><Check className="size-3.5" /> {feature}</p>)}
                  </div>
                  <Button asChild variant={plan.featured ? "secondary" : "outline"} className="mt-auto shadow-none"><Link href="/sign-up">Create an organization</Link></Button>
                </article>
              ))}
            </div>
            <p className="mt-5 text-center text-xs text-muted-foreground">Create your organization first, then manage its subscription securely with Clerk.</p>
          </>
        )}
      </section>
    </main>
  );
}
