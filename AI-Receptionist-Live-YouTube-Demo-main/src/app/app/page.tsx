import { OrganizationList } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, Building2, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AppIndexPage() {
  const { orgSlug } = await auth.protect();

  if (orgSlug) {
    redirect(`/app/${orgSlug}`);
  }

  return (
    <main className="grid min-h-svh place-items-center bg-[#f3f0e8] px-4 py-12 text-foreground">
      <section className="w-full max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-[#faf9f5] shadow-[0_24px_70px_rgba(44,36,24,0.12)]">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex min-h-72 flex-col justify-between border-b border-black/10 bg-[#1c1c1a] p-7 text-white lg:min-h-[620px] lg:border-r lg:border-b-0 lg:p-10">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </span>
              <span className="font-heading text-xl font-semibold tracking-tight">
                Switchboard
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-white/45 uppercase">
                One last step
              </p>
              <h1 className="mt-4 max-w-sm font-heading text-4xl leading-[0.98] font-semibold tracking-[-0.035em] sm:text-5xl">
                Pick the workspace you want to operate.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
                Every workspace keeps its own team, schedule, voice agent,
                bookings, billing, and client-facing page.
              </p>
            </div>

            <div className="hidden items-center gap-3 text-xs text-white/45 lg:flex">
              <Building2 className="size-4" />
              Isolated organization data
              <ArrowRight className="ml-auto size-4" />
            </div>
          </div>

          <div className="flex items-center justify-center p-5 sm:p-10">
            <div className="w-full max-w-lg">
              <p className="mb-5 text-center text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Select or create an organization
              </p>
              <OrganizationList
                hidePersonal
                afterCreateOrganizationUrl="/app/:slug"
                afterSelectOrganizationUrl="/app/:slug"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    cardBox: "w-full shadow-none",
                    card: "w-full border border-black/10 bg-white shadow-none",
                    headerTitle: "font-heading text-2xl tracking-tight",
                    headerSubtitle: "text-muted-foreground",
                    organizationListCreateOrganizationActionButton:
                      "border-primary/20 text-primary hover:bg-primary/5",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
