import type { FunctionReturnType } from "convex/server";

import { api } from "../../../convex/_generated/api";

export type PublishedSite = NonNullable<
  FunctionReturnType<typeof api.publicSite.getPublishedBySlug>
>;

export type PublicOffering = PublishedSite["offerings"][number];
export type PublicTeamMember = PublishedSite["teamMembers"][number];
export type PublicTerminology = PublishedSite["organization"]["terminology"];

export type Availability = FunctionReturnType<
  typeof api.publicBooking.getAvailability
>;
export type AvailabilitySlot = Availability["slots"][number];
export type BookingConfirmation = FunctionReturnType<
  typeof api.publicBooking.create
>;
