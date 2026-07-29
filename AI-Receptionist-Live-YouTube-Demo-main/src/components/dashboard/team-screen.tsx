"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarCheck2, Mail, Pencil, UserRoundPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  getMemberColor,
  type TeamMember,
} from "@/components/dashboard/data";
import {
  ActivePill,
  EmptyState,
  LoadingPanel,
  ScreenHeader,
  SubmitButton,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MemberDialog({ member }: { member?: TeamMember }) {
  const { terminology } = useWorkspace();
  const createMember = useMutation(dashboardApi.team.createMember);
  const updateMember = useMutation(dashboardApi.team.updateMember);
  const offerings = useQuery(dashboardApi.catalog.listOfferings, {});
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(member?.active ?? true);
  const [bookable, setBookable] = useState(member?.acceptingBookings ?? true);
  const [offeringIds, setOfferingIds] = useState<string[]>(
    member?.offeringIds ?? [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bookable && offeringIds.length === 0) {
      toast.error(
        `Choose at least one ${terminology.offering.toLowerCase()} for a bookable ${terminology.teamMember.toLowerCase()}.`,
      );
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      title: String(form.get("title") ?? "").trim(),
      email: String(form.get("email") ?? "").trim() || undefined,
      bio: String(form.get("bio") ?? "").trim() || undefined,
      active,
      acceptingBookings: bookable,
      offeringIds,
    };

    setPending(true);
    try {
      if (member) {
        await updateMember({ teamMemberId: member._id, ...payload });
      } else {
        await createMember(payload);
      }
      toast.success(
        `${terminology.teamMember} ${member ? "updated" : "created"}`,
      );
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Could not save ${terminology.teamMember.toLowerCase()}`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {member ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${member.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button className="bg-primary text-primary-foreground hover:bg-primary/85">
            <UserRoundPlus /> Add {terminology.teamMember}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl tracking-tight">
            {member ? "Edit" : "Add"} {terminology.teamMember.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            People can be bookable or non-bookable. Use title and bio to explain
            their role on your public page.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`member-name-${member?._id ?? "new"}`}>Name</Label>
              <Input
                id={`member-name-${member?._id ?? "new"}`}
                name="name"
                defaultValue={member?.name}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`member-title-${member?._id ?? "new"}`}>Title or role</Label>
              <Input
                id={`member-title-${member?._id ?? "new"}`}
                name="title"
                defaultValue={member?.title}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`member-email-${member?._id ?? "new"}`}>Email</Label>
              <Input
                id={`member-email-${member?._id ?? "new"}`}
                name="email"
                type="email"
                defaultValue={member?.email}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`member-bio-${member?._id ?? "new"}`}>Short bio</Label>
              <Textarea
                id={`member-bio-${member?._id ?? "new"}`}
                name="bio"
                defaultValue={member?.bio}
                rows={3}
                placeholder="Expertise, languages, or the kinds of requests they handle."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{terminology.offeringPlural}</Label>
              <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-black/10 bg-muted/20 p-3 sm:grid-cols-2">
                {(offerings ?? []).map((offering) => (
                  <label
                    key={offering._id}
                    className="flex cursor-pointer items-center gap-2 rounded-md bg-white p-2 text-xs ring-1 ring-black/8"
                  >
                    <Checkbox
                      checked={offeringIds.includes(offering._id)}
                      onCheckedChange={(checked) =>
                        setOfferingIds((current) =>
                          checked
                            ? [...current, offering._id]
                            : current.filter((id) => id !== offering._id),
                        )
                      }
                    />
                    <span className="truncate">{offering.name}</span>
                  </label>
                ))}
                {offerings?.length === 0 && (
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Add an {terminology.offering.toLowerCase()} first, or save this
                    person as non-bookable.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-muted/35 p-3 sm:col-span-2">
              <div>
                <Label htmlFor={`member-active-${member?._id ?? "new"}`}>Active</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Keep this person visible in the workspace.
                </p>
              </div>
              <Switch
                id={`member-active-${member?._id ?? "new"}`}
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-muted/35 p-3 sm:col-span-2">
              <div>
                <Label htmlFor={`member-bookable-${member?._id ?? "new"}`}>Bookable</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Allow this person to receive scheduled work.
                </p>
              </div>
              <Switch
                id={`member-bookable-${member?._id ?? "new"}`}
                checked={bookable}
                onCheckedChange={setBookable}
              />
            </div>
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>
              {member ? "Save changes" : `Add ${terminology.teamMember.toLowerCase()}`}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TeamScreen() {
  const { organization, terminology } = useWorkspace();
  const members = useQuery(
    dashboardApi.team.listMembers,
    organization ? { includeInactive: true } : "skip",
  );

  return (
    <>
      <ScreenHeader
        eyebrow="Who does the work"
        title={terminology.teamMemberPlural}
        description={`Manage the people who deliver ${terminology.offeringPlural.toLowerCase()}, answer requests, or appear on the public page. Roles stay flexible across every type of organization.`}
        action={<MemberDialog />}
      />

      {!members ? (
        <LoadingPanel rows={5} />
      ) : members.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <Card key={member._id} className="bg-white">
              <CardContent className="flex h-full flex-col pt-0">
                <div className="flex items-start gap-3">
                  <Avatar className="size-12 rounded-lg">
                    <AvatarFallback
                      className="rounded-lg text-sm font-semibold text-white"
                      style={{ backgroundColor: getMemberColor(member) }}
                    >
                      {initials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-heading text-lg font-semibold tracking-tight">
                      {member.name}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {member.title}
                    </p>
                  </div>
                  <MemberDialog member={member} />
                </div>

                <p className="mt-5 line-clamp-3 min-h-15 text-xs leading-5 text-muted-foreground">
                  {member.bio ??
                    `No public bio yet. Add one to help ${terminology.customerPlural.toLowerCase()} choose the right person.`}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-black/8 pt-4">
                  <ActivePill active={member.active} />
                  <Badge
                    variant="outline"
                    className={member.acceptingBookings ? "bg-sky-50 text-sky-800" : "bg-muted text-muted-foreground"}
                  >
                    <CalendarCheck2 className="size-3" />
                    {member.acceptingBookings ? "Bookable" : "Not bookable"}
                  </Badge>
                  {member.email && (
                    <Button asChild variant="ghost" size="icon-xs" className="ml-auto">
                      <a href={`mailto:${member.email}`} aria-label={`Email ${member.name}`}>
                        <Mail />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UsersRound}
          title={`Add your first ${terminology.teamMember.toLowerCase()}`}
          description={`Build a flexible roster for anyone who delivers work or appears in your ${terminology.booking.toLowerCase()} flow.`}
          action={<MemberDialog />}
        />
      )}
    </>
  );
}
