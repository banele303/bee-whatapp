"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { Clock3, Layers3, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardApi,
  getOfferingColor,
  getOfferingDuration,
  getOfferingPrice,
  type Offering,
} from "@/components/dashboard/data";
import {
  ActivePill,
  EmptyState,
  formatMoney,
  LoadingPanel,
  ScreenHeader,
  SubmitButton,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

function OfferingDialog({ offering }: { offering?: Offering }) {
  const { organization, terminology } = useWorkspace();
  const createOffering = useMutation(dashboardApi.catalog.createOffering);
  const updateOffering = useMutation(dashboardApi.catalog.updateOffering);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState(offering?.category ?? "General");
  const [active, setActive] = useState(offering?.active ?? true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const price = String(form.get("price") ?? "").trim();
    const duration = String(form.get("duration") ?? "").trim();
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      category,
      durationMinutes: duration ? Number(duration) : 30,
      priceMinor: price ? Math.round(Number(price) * 100) : 0,
      active,
      bookableOnline: offering?.bookableOnline ?? true,
    };

    setPending(true);
    try {
      if (offering) {
        await updateOffering({ offeringId: offering._id, ...payload });
      } else {
        await createOffering(payload);
      }
      toast.success(
        `${terminology.offering} ${offering ? "updated" : "created"}`,
      );
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Could not save ${terminology.offering.toLowerCase()}`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {offering ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${offering.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button className="bg-primary text-primary-foreground hover:bg-primary/85">
            <Plus /> New {terminology.offering}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl tracking-tight">
            {offering ? "Edit" : "Create"} {terminology.offering.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Keep this flexible: a {terminology.offering.toLowerCase()} can be an
            appointment, support session, consultation, class, or any unit your
            organization delivers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`name-${offering?._id ?? "new"}`}>Name</Label>
              <Input
                id={`name-${offering?._id ?? "new"}`}
                name="name"
                defaultValue={offering?.name}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`description-${offering?._id ?? "new"}`}>
                Description
              </Label>
              <Textarea
                id={`description-${offering?._id ?? "new"}`}
                name="description"
                defaultValue={offering?.description}
                rows={3}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`category-${offering?._id ?? "new"}`}>Category</Label>
              <Input
                id={`category-${offering?._id ?? "new"}`}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="General, Support, Consultations…"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`duration-${offering?._id ?? "new"}`}>
                Duration (minutes)
              </Label>
              <Input
                id={`duration-${offering?._id ?? "new"}`}
                name="duration"
                type="number"
                min={5}
                step={5}
                defaultValue={offering ? getOfferingDuration(offering) || "" : 30}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`price-${offering?._id ?? "new"}`}>
                Price ({organization?.currency ?? "USD"})
              </Label>
              <Input
                id={`price-${offering?._id ?? "new"}`}
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  offering && getOfferingPrice(offering) !== undefined
                    ? getOfferingPrice(offering)! / 100
                    : ""
                }
                placeholder="Optional"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-muted/35 p-3 sm:col-span-2">
              <div>
                <Label htmlFor={`active-${offering?._id ?? "new"}`}>Available</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Show this in booking flows and agent suggestions.
                </p>
              </div>
              <Switch
                id={`active-${offering?._id ?? "new"}`}
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>
              {offering ? "Save changes" : `Create ${terminology.offering.toLowerCase()}`}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OfferingsScreen() {
  const { organization, terminology } = useWorkspace();
  const offerings = useQuery(
    dashboardApi.catalog.listOfferings,
    organization ? { includeInactive: true } : "skip",
  );

  return (
    <>
      <ScreenHeader
        eyebrow="What you deliver"
        title={terminology.offeringPlural}
        description={`Define the bookable or requestable work your organization provides. ${terminology.offeringPlural} can carry time, price, or simply act as a service category.`}
        action={<OfferingDialog />}
      />

      {!offerings ? (
        <LoadingPanel rows={5} />
      ) : offerings.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offerings.map((offering, index) => (
            <Card key={offering._id} className="bg-white">
              <CardContent className="flex h-full flex-col pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-10 place-items-center rounded-lg border border-black/10 text-white shadow-sm"
                      style={{ backgroundColor: getOfferingColor(offering) }}
                    >
                      <span className="font-mono text-xs font-semibold">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </span>
                    <div>
                      <h2 className="font-heading text-lg font-semibold tracking-tight">
                        {offering.name}
                      </h2>
                      <p className="mt-0.5 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        {offering.category}
                      </p>
                    </div>
                  </div>
                  <OfferingDialog offering={offering} />
                </div>

                <p className="mt-5 line-clamp-3 min-h-15 text-xs leading-5 text-muted-foreground">
                  {offering.description}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-black/8 pt-4">
                  <ActivePill active={offering.active} />
                  {getOfferingDuration(offering) > 0 && (
                    <Badge variant="outline" className="gap-1 bg-white font-mono text-[10px]">
                      <Clock3 className="size-3" /> {getOfferingDuration(offering)}m
                    </Badge>
                  )}
                  <Badge variant="outline" className="ml-auto bg-white font-mono text-[10px]">
                    {formatMoney(
                      getOfferingPrice(offering),
                      offering.currency || organization?.currency,
                      organization?.locale,
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Layers3}
          title={`Create your first ${terminology.offering.toLowerCase()}`}
          description={`Use ${terminology.offeringPlural.toLowerCase()} for anything people can book or request—from a service appointment to a technical support session.`}
          action={<OfferingDialog />}
        />
      )}
    </>
  );
}
