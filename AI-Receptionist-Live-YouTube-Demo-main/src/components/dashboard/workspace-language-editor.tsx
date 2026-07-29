"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import {
  Briefcase,
  Check,
  Headphones,
  HeartPulse,
  LoaderCircle,
  RotateCcw,
  Save,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  dashboardApi,
  type BackendTerminology,
  type Organization,
} from "@/components/dashboard/data";

type TerminologyKey = keyof BackendTerminology;

type TerminologyPreset = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  terminology: BackendTerminology;
};

const terminologyPresets: TerminologyPreset[] = [
  {
    id: "general",
    label: "General service",
    description: "Flexible language for most teams",
    icon: SlidersHorizontal,
    terminology: {
      offeringSingular: "Service",
      offeringPlural: "Services",
      teamMemberSingular: "Team member",
      teamMemberPlural: "Team members",
      customerSingular: "Customer",
      customerPlural: "Customers",
      bookingSingular: "Booking",
      bookingPlural: "Bookings",
    },
  },
  {
    id: "barber",
    label: "Barber shop",
    description: "Services, barbers, and clients",
    icon: Scissors,
    terminology: {
      offeringSingular: "Service",
      offeringPlural: "Services",
      teamMemberSingular: "Barber",
      teamMemberPlural: "Barbers",
      customerSingular: "Client",
      customerPlural: "Clients",
      bookingSingular: "Booking",
      bookingPlural: "Bookings",
    },
  },
  {
    id: "salon",
    label: "Salon & spa",
    description: "Treatments, stylists, and appointments",
    icon: Sparkles,
    terminology: {
      offeringSingular: "Treatment",
      offeringPlural: "Treatments",
      teamMemberSingular: "Stylist",
      teamMemberPlural: "Stylists",
      customerSingular: "Client",
      customerPlural: "Clients",
      bookingSingular: "Appointment",
      bookingPlural: "Appointments",
    },
  },
  {
    id: "clinic",
    label: "Clinic",
    description: "Treatments, practitioners, and patients",
    icon: HeartPulse,
    terminology: {
      offeringSingular: "Treatment",
      offeringPlural: "Treatments",
      teamMemberSingular: "Practitioner",
      teamMemberPlural: "Practitioners",
      customerSingular: "Patient",
      customerPlural: "Patients",
      bookingSingular: "Appointment",
      bookingPlural: "Appointments",
    },
  },
  {
    id: "consulting",
    label: "Consultancy",
    description: "Services, consultants, and sessions",
    icon: Briefcase,
    terminology: {
      offeringSingular: "Service",
      offeringPlural: "Services",
      teamMemberSingular: "Consultant",
      teamMemberPlural: "Consultants",
      customerSingular: "Client",
      customerPlural: "Clients",
      bookingSingular: "Session",
      bookingPlural: "Sessions",
    },
  },
  {
    id: "support",
    label: "Tech support",
    description: "Support services, agents, and sessions",
    icon: Headphones,
    terminology: {
      offeringSingular: "Support service",
      offeringPlural: "Support services",
      teamMemberSingular: "Support agent",
      teamMemberPlural: "Support agents",
      customerSingular: "Customer",
      customerPlural: "Customers",
      bookingSingular: "Support session",
      bookingPlural: "Support sessions",
    },
  },
];

const fieldGroups: Array<{
  label: string;
  description: string;
  singularKey: TerminologyKey;
  pluralKey: TerminologyKey;
}> = [
  {
    label: "Work",
    description: "What the organization delivers",
    singularKey: "offeringSingular",
    pluralKey: "offeringPlural",
  },
  {
    label: "People",
    description: "Who delivers the work",
    singularKey: "teamMemberSingular",
    pluralKey: "teamMemberPlural",
  },
  {
    label: "Customers",
    description: "Who the organization serves",
    singularKey: "customerSingular",
    pluralKey: "customerPlural",
  },
  {
    label: "Schedule",
    description: "What a reserved time is called",
    singularKey: "bookingSingular",
    pluralKey: "bookingPlural",
  },
];

function normalizedTerminology(
  terminology: BackendTerminology,
): BackendTerminology {
  return Object.fromEntries(
    Object.entries(terminology).map(([key, value]) => [key, value.trim()]),
  ) as BackendTerminology;
}

function terminologyMatches(
  first: BackendTerminology,
  second: BackendTerminology,
) {
  return (Object.keys(first) as TerminologyKey[]).every(
    (key) => first[key] === second[key],
  );
}

export function WorkspaceLanguageEditor({
  organization,
}: {
  organization: Organization;
}) {
  const updateCurrent = useMutation(dashboardApi.organizations.updateCurrent);
  const [draft, setDraft] = useState<BackendTerminology>(() => ({
    ...organization.terminology,
  }));
  const [baseline, setBaseline] = useState<BackendTerminology>(() => ({
    ...organization.terminology,
  }));
  const [saving, setSaving] = useState(false);
  const canEdit =
    organization.role === "admin" || organization.role === "owner";
  const normalizedDraft = useMemo(
    () => normalizedTerminology(draft),
    [draft],
  );
  const isComplete = Object.values(normalizedDraft).every(Boolean);
  const isDirty = !terminologyMatches(
    normalizedDraft,
    baseline,
  );
  const hasNewerServerLanguage = !terminologyMatches(
    organization.terminology,
    baseline,
  );
  const activePreset = terminologyPresets.find((preset) =>
    terminologyMatches(normalizedDraft, preset.terminology),
  );

  function updateField(key: TerminologyKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(preset: TerminologyPreset) {
    setDraft({ ...preset.terminology });
  }

  function discardChanges() {
    setDraft({ ...organization.terminology });
    setBaseline({ ...organization.terminology });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      toast.error("An organization admin must update workspace language.");
      return;
    }
    if (!isComplete) {
      toast.error("Complete every singular and plural label before saving.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCurrent({ terminology: normalizedDraft });
      setDraft({ ...updated.terminology });
      setBaseline({ ...updated.terminology });
      toast.success("Workspace language updated");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update workspace language",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="bg-white">
      <CardHeader className="border-b border-black/8 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-xl tracking-tight">
              Workspace language
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl text-xs leading-5">
              Choose a business preset or write your own labels. Changes flow
              through navigation, forms, schedules, the public page, and new
              agent sessions for this organization only.
            </CardDescription>
          </div>
          <Badge variant={canEdit ? "outline" : "secondary"}>
            {canEdit ? "Organization-specific" : "Admin only"}
          </Badge>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} aria-busy={saving}>
        <CardContent className="space-y-6">
          <section aria-labelledby="language-presets-heading">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3
                  id="language-presets-heading"
                  className="text-xs font-semibold tracking-[0.12em] uppercase"
                >
                  Start with a preset
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Presets fill the labels below; nothing changes until you save.
                </p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">
                {activePreset?.label ?? "Custom language"}
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              {terminologyPresets.map((preset) => {
                const Icon = preset.icon;
                const selected = activePreset?.id === preset.id;
                return (
                  <Button
                    key={preset.id}
                    type="button"
                    variant={selected ? "secondary" : "outline"}
                    className="h-auto min-h-16 justify-start gap-3 p-3 text-left whitespace-normal"
                    aria-pressed={selected}
                    disabled={!canEdit || saving}
                    onClick={() => applyPreset(preset)}
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {preset.label}
                        {selected && <Check className="size-3.5 text-primary" />}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-4 font-normal text-muted-foreground">
                        {preset.description}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </section>

          <Separator />

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_minmax(17rem,0.6fr)]">
            <div className="grid gap-3 sm:grid-cols-2">
              {fieldGroups.map((group, index) => (
                <fieldset
                  key={group.label}
                  className="rounded-xl border border-black/8 bg-[#faf9f6] p-4"
                  disabled={!canEdit || saving}
                >
                  <legend className="sr-only">{group.label} labels</legend>
                  <div className="mb-3 flex items-start gap-2.5">
                    <span className="font-mono text-[10px] font-semibold text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{group.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {group.description}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`terminology-${group.singularKey}`}>
                        Singular
                      </Label>
                      <Input
                        id={`terminology-${group.singularKey}`}
                        value={draft[group.singularKey]}
                        onChange={(event) =>
                          updateField(group.singularKey, event.target.value)
                        }
                        maxLength={40}
                        required
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`terminology-${group.pluralKey}`}>
                        Plural
                      </Label>
                      <Input
                        id={`terminology-${group.pluralKey}`}
                        value={draft[group.pluralKey]}
                        onChange={(event) =>
                          updateField(group.pluralKey, event.target.value)
                        }
                        maxLength={40}
                        required
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>

            <aside className="flex min-h-64 flex-col rounded-xl bg-[#20201e] p-5 text-white ring-1 ring-black/15">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.16em] text-white/40 uppercase">
                    Live preview
                  </p>
                  <p className="mt-1 font-heading text-xl tracking-tight">
                    In your workspace
                  </p>
                </div>
                <span className="grid size-8 place-items-center rounded-full bg-primary text-white">
                  <Sparkles className="size-3.5" />
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/10">
                {[
                  ["Work", normalizedDraft.offeringPlural],
                  ["People", normalizedDraft.teamMemberPlural],
                  ["Customers", normalizedDraft.customerPlural],
                  ["Schedule", normalizedDraft.bookingPlural],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#20201e] p-3">
                    <p className="text-[9px] font-semibold tracking-[0.12em] text-white/35 uppercase">
                      {label}
                    </p>
                    <p className="mt-1 truncate text-xs font-medium text-white">
                      {value || "—"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6">
                <p className="text-[11px] leading-5 text-white/45">
                  Example actions
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] text-white/80">
                    New {normalizedDraft.offeringSingular || "—"}
                  </span>
                  <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] text-white/80">
                    Add {normalizedDraft.teamMemberSingular || "—"}
                  </span>
                  <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] text-white/80">
                    Create {normalizedDraft.bookingSingular || "—"}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </CardContent>

        <CardFooter className="flex-wrap justify-between gap-3">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {!canEdit
              ? "Ask an organization admin to change these labels."
              : hasNewerServerLanguage
                ? "Another admin changed these labels. Load their version, or save yours to replace it."
                : !isComplete
                  ? "Every label needs both a singular and plural form."
                  : isDirty
                    ? "You have unsaved language changes."
                    : "Workspace language is up to date."}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={
                !canEdit || (!isDirty && !hasNewerServerLanguage) || saving
              }
              onClick={discardChanges}
            >
              <RotateCcw />
              {hasNewerServerLanguage ? "Load latest" : "Discard"}
            </Button>
            <Button
              type="submit"
              disabled={!canEdit || !isComplete || !isDirty || saving}
            >
              {saving ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Save />
              )}
              {saving
                ? "Saving…"
                : hasNewerServerLanguage
                  ? "Replace & save"
                  : "Save language"}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
