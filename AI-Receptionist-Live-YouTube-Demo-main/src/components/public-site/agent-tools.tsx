"use client";

import { useMemo, useState } from "react";
import { useConversationClientTool } from "@elevenlabs/react";
import { useConvex, type ConvexReactClient } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type {
  PublicOffering,
  PublicTeamMember,
} from "@/components/public-site/types";

export type AgentToolActivity = {
  kind: "booked" | "found" | "rescheduled" | "canceled";
  status: string;
  offeringName: string;
  teamMemberName: string;
  localTime: string;
  confirmationCode: string;
};

type AgentClientTool = (
  parameters: Record<string, unknown>,
) => string | Promise<string>;

export type AgentClientTools = {
  get_business_info: AgentClientTool;
  get_availability: AgentClientTool;
  book_appointment: AgentClientTool;
  lookup_appointment: AgentClientTool;
  reschedule_appointment: AgentClientTool;
  cancel_appointment: AgentClientTool;
};

export type AgentToolName = keyof AgentClientTools;

export type AgentToolEvent = {
  id: string;
  name: AgentToolName;
  status: "running" | "succeeded" | "failed";
  inputSummary: string;
  resultSummary?: string;
  startedAt: number;
  finishedAt?: number;
};

type AgentSlotSelection = {
  offeringId: PublicOffering["_id"];
  offeringName: string;
  teamMemberId: PublicTeamMember["_id"];
  teamMemberName: string;
  startAt: number;
  startTimeISO: string;
};

type ToolFactoryOptions = {
  convex: ConvexReactClient;
  siteSlug: string;
  businessName: string;
  offerings: PublicOffering[];
  teamMembers: PublicTeamMember[];
  timezone: string;
  locale: string;
  onActivity?: (activity: AgentToolActivity) => void;
  onToolEvent?: (event: AgentToolEvent) => void;
  slotRegistry?: Map<string, AgentSlotSelection>;
};

function requiredText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizedName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\d]+/gi, " ")
    .trim()
    .toLowerCase();
}

function resolveByName<T extends { name: string }>(
  items: T[],
  rawName: unknown,
  label: string,
) {
  const name = requiredText(rawName, label);
  const normalized = normalizedName(name);
  const exact = items.find((item) => normalizedName(item.name) === normalized);
  if (exact) return exact;

  const partial = items.filter((item) => {
    const candidate = normalizedName(item.name);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });
  if (partial.length === 1) return partial[0];

  const choices = items.map((item) => item.name).join(", ");
  throw new Error(
    partial.length > 1
      ? `${label} is ambiguous. Ask the customer to choose from: ${partial
          .map((item) => item.name)
          .join(", ")}.`
      : `${label} was not found. Available choices: ${choices || "none"}.`,
  );
}

function formatLocalTime(timestamp: number, locale: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timezone,
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toISOString();
  }
}

function formatPrice(
  priceMinor: number,
  currency: string,
  locale: string,
) {
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    });
    const fractionDigits =
      formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(priceMinor / 10 ** fractionDigits);
  } catch {
    return `${currency} ${(priceMinor / 100).toFixed(2)}`;
  }
}

function stableIdempotencyKey(value: string) {
  let first = 2_166_136_261;
  let second = 2_654_435_761;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 16_777_619);
    second ^= code + index;
    second = Math.imul(second, 2_246_822_519);
  }
  return `web-agent-${(first >>> 0).toString(36)}-${(
    second >>> 0
  ).toString(36)}`;
}

const MAX_AGENT_SLOT_REFERENCES = 500;

function randomReference(prefix: "slot" | "tool") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
  }
  return `${prefix}_${stableIdempotencyKey(
    `${Date.now()}-${Math.random()}`,
  ).replace("web-agent-", "")}`;
}

function rememberAgentSlot(
  registry: Map<string, AgentSlotSelection>,
  selection: AgentSlotSelection,
) {
  while (registry.size >= MAX_AGENT_SLOT_REFERENCES) {
    const oldest = registry.keys().next().value as string | undefined;
    if (!oldest) break;
    registry.delete(oldest);
  }
  const slotId = randomReference("slot");
  registry.set(slotId, selection);
  return slotId;
}

function requireAgentSlot(
  registry: Map<string, AgentSlotSelection>,
  rawSlotId: unknown,
) {
  const slotId = requiredText(rawSlotId, "slot_id");
  const selection = registry.get(slotId);
  if (!selection) {
    throw new Error(
      "That slot reference is missing or stale. Check availability again and copy one exact slot_id.",
    );
  }
  return { slotId, selection };
}

function parseToolResult(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function recordText(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toolInputSummary(
  name: AgentToolName,
  parameters: Record<string, unknown>,
  slotRegistry: Map<string, AgentSlotSelection>,
  locale: string,
  timezone: string,
) {
  const slotId = optionalText(parameters.slot_id);
  const slot = slotId ? slotRegistry.get(slotId) : undefined;
  if (slot) {
    return `${slot.offeringName} · ${slot.teamMemberName} · ${formatLocalTime(
      slot.startAt,
      locale,
      timezone,
    )}`;
  }

  if (name === "get_business_info") return "Published business details";
  if (name === "lookup_appointment" || name === "cancel_appointment") {
    return "Existing booking request";
  }

  const parts = [
    optionalText(parameters.offering_name),
    optionalText(parameters.team_member_name),
    optionalText(parameters.date),
  ].filter((value): value is string => Boolean(value));
  return parts.join(" · ") || "Customer request";
}

function toolResultSummary(name: AgentToolName, value: string) {
  const result = parseToolResult(value);
  if (result?.success === false) {
    return {
      status: "failed" as const,
      summary: "The tool could not complete this request.",
    };
  }

  if (name === "get_business_info") {
    return { status: "succeeded" as const, summary: "Published details loaded" };
  }
  if (name === "get_availability") {
    const count = result?.available_time_count;
    return {
      status: "succeeded" as const,
      summary:
        typeof count === "number"
          ? `${count} available ${count === 1 ? "time" : "times"} found`
          : "Availability checked",
    };
  }

  const offering = recordText(result, "offering_name");
  const member = recordText(result, "team_member_name");
  const localTime = recordText(result, "local_time");
  const detail = [offering, member, localTime]
    .filter((entry): entry is string => Boolean(entry))
    .join(" · ");
  const action =
    name === "book_appointment"
      ? "Booking confirmed"
      : name === "lookup_appointment"
        ? "Booking found"
        : name === "reschedule_appointment"
          ? "Booking rescheduled"
          : "Booking canceled";
  return {
    status: "succeeded" as const,
    summary: detail ? `${action} · ${detail}` : action,
  };
}

function trackTool(
  name: AgentToolName,
  handler: AgentClientTool,
  onToolEvent: ToolFactoryOptions["onToolEvent"],
  slotRegistry: Map<string, AgentSlotSelection>,
  locale: string,
  timezone: string,
): AgentClientTool {
  if (!onToolEvent) return handler;

  return async (parameters) => {
    const id = randomReference("tool");
    const startedAt = Date.now();
    const inputSummary = toolInputSummary(
      name,
      parameters,
      slotRegistry,
      locale,
      timezone,
    );
    onToolEvent({ id, name, status: "running", inputSummary, startedAt });

    try {
      const result = await handler(parameters);
      const outcome = toolResultSummary(name, result);
      onToolEvent({
        id,
        name,
        status: outcome.status,
        inputSummary,
        resultSummary: outcome.summary,
        startedAt,
        finishedAt: Date.now(),
      });
      return result;
    } catch (error) {
      onToolEvent({
        id,
        name,
        status: "failed",
        inputSummary,
        resultSummary: "The tool could not complete this request.",
        startedAt,
        finishedAt: Date.now(),
      });
      throw error;
    }
  };
}

function toolError(error: unknown) {
  if (!(error instanceof Error)) {
    return JSON.stringify({
      success: false,
      error: "The request could not be completed. Ask the customer to try again.",
    });
  }
  const convexMessage = error.message.match(/Uncaught Error:\s*([^\n]+)/)?.[1];
  return JSON.stringify({
    success: false,
    error:
      convexMessage ||
      (error.message.length <= 300
        ? error.message
        : "The request could not be completed. Ask the customer to try again."),
  });
}

function activityFromBooking(
  kind: AgentToolActivity["kind"],
  booking: {
    status: string;
    startAt: number;
    confirmationCode: string;
    offering: { name: string };
    teamMember: { name: string };
  },
  locale: string,
  timezone: string,
): AgentToolActivity {
  return {
    kind,
    status: booking.status,
    offeringName: booking.offering.name,
    teamMemberName: booking.teamMember.name,
    localTime: formatLocalTime(booking.startAt, locale, timezone),
    confirmationCode: booking.confirmationCode,
  };
}

export function createAgentClientTools({
  convex,
  siteSlug,
  businessName,
  offerings,
  teamMembers,
  timezone,
  locale,
  onActivity,
  onToolEvent,
  slotRegistry: suppliedSlotRegistry,
}: ToolFactoryOptions): AgentClientTools {
  const slotRegistry = suppliedSlotRegistry ?? new Map<string, AgentSlotSelection>();
  const resolveOffering = (name: unknown) =>
    resolveByName(offerings, name, "offering_name");
  const resolveTeamMember = (name: unknown) =>
    resolveByName(teamMembers, name, "team_member_name");

  const tools: AgentClientTools = {
    get_business_info: () =>
      JSON.stringify({
        success: true,
        business_name: businessName,
        timezone,
        offerings: offerings.map((offering) => ({
          name: offering.name,
          description: offering.description,
          duration_minutes: offering.durationMinutes,
          price: formatPrice(offering.priceMinor, offering.currency, locale),
        })),
        team_members: teamMembers.map((member) => ({
          name: member.name,
          title: member.title,
          offerings: offerings
            .filter((offering) =>
              member.offeringIds.some((id) => id === offering._id),
            )
            .map((offering) => offering.name),
        })),
      }),

    get_availability: async (parameters) => {
      try {
        const offering = resolveOffering(parameters.offering_name);
        const date = requiredText(parameters.date, "date");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw new Error("date must use YYYY-MM-DD in the business timezone.");
        }
        const memberName = optionalText(parameters.team_member_name);
        const member = memberName ? resolveTeamMember(memberName) : undefined;
        const availability = await convex.query(
          api.publicBooking.getAvailability,
          {
            siteSlug,
            offeringId: offering._id,
            date,
            ...(member ? { teamMemberId: member._id } : {}),
          },
        );
        const groupedSlots = Array.from(
          availability.slots.reduce(
            (groups, slot) => {
              const current = groups.get(slot.startTimeISO) ?? {
                start_time_iso: slot.startTimeISO,
                end_time_iso: slot.endTimeISO,
                local_time: formatLocalTime(slot.startAt, locale, timezone),
                team_members: [] as AgentSlotSelection[],
              };
              current.team_members.push({
                offeringId: offering._id,
                offeringName: offering.name,
                teamMemberId: slot.teamMemberId,
                teamMemberName: slot.teamMemberName,
                startAt: slot.startAt,
                startTimeISO: slot.startTimeISO,
              });
              groups.set(slot.startTimeISO, current);
              return groups;
            },
            new Map<
              string,
              {
                start_time_iso: string;
                end_time_iso: string;
                local_time: string;
                team_members: AgentSlotSelection[];
              }
            >(),
          ).values(),
        );
        const publishedTimes = groupedSlots.slice(0, 12).map((slot) => ({
          start_time_iso: slot.start_time_iso,
          end_time_iso: slot.end_time_iso,
          local_time: slot.local_time,
          team_members: slot.team_members.map((selection) => ({
            slot_id: rememberAgentSlot(slotRegistry, selection),
            team_member_name: selection.teamMemberName,
            team_member_title: teamMembers.find(
              (candidate) => candidate._id === selection.teamMemberId,
            )?.title,
          })),
        }));
        return JSON.stringify({
          success: true,
          timezone: availability.timezone,
          offering: availability.offering,
          date: availability.date,
          available_time_count: groupedSlots.length,
          available_slot_count: availability.slots.length,
          selection_instruction:
            "Choose one team member at one time and copy that exact slot_id into the booking or reschedule tool.",
          times: publishedTimes,
          truncated: groupedSlots.length > 12,
        });
      } catch (error) {
        return toolError(error);
      }
    },

    book_appointment: async (parameters) => {
      try {
        const offering = resolveOffering(parameters.offering_name);
        const { slotId, selection } = requireAgentSlot(
          slotRegistry,
          parameters.slot_id,
        );
        if (selection.offeringId !== offering._id) {
          throw new Error(
            "That slot_id belongs to a different offering. Check availability again.",
          );
        }
        const customerName = requiredText(
          parameters.customer_name,
          "customer_name",
        );
        const phone = requiredText(parameters.phone, "phone");
        const email = optionalText(parameters.email);
        const notes = optionalText(parameters.notes);
        const booking = await convex.mutation(api.publicBooking.create, {
          siteSlug,
          offeringId: offering._id,
          teamMemberId: selection.teamMemberId,
          startAt: selection.startAt,
          customer: {
            name: customerName,
            phone,
            ...(email ? { email } : {}),
          },
          ...(notes ? { notes } : {}),
          idempotencyKey: stableIdempotencyKey(
            JSON.stringify({
              siteSlug,
              offeringId: offering._id,
              teamMemberId: selection.teamMemberId,
              startAt: selection.startAt,
              slotId,
              customerName: customerName.toLowerCase(),
              phone: phone.replace(/\D/g, ""),
              email: email?.toLowerCase() ?? null,
              notes: notes ?? null,
            }),
          ),
          source: "web_agent",
        });
        onActivity?.(
          activityFromBooking("booked", booking, locale, timezone),
        );
        return JSON.stringify({
          success: true,
          action: booking.replayed ? "booking_replayed" : "booking_created",
          status: booking.status,
          confirmation_code: booking.confirmationCode,
          offering_name: booking.offering.name,
          team_member_name: booking.teamMember.name,
          start_time_iso: booking.startTimeISO,
          local_time: formatLocalTime(booking.startAt, locale, timezone),
        });
      } catch (error) {
        return toolError(error);
      }
    },

    lookup_appointment: async (parameters) => {
      try {
        const result = await convex.mutation(api.publicBooking.lookup, {
          siteSlug,
          confirmationCode: requiredText(
            parameters.confirmation_code,
            "confirmation_code",
          ),
          phone: requiredText(parameters.phone, "phone"),
        });
        if (!result.success) return JSON.stringify(result);
        const booking = result.booking;
        onActivity?.(activityFromBooking("found", booking, locale, timezone));
        return JSON.stringify({
          success: true,
          status: booking.status,
          confirmation_code: booking.confirmationCode,
          offering_name: booking.offering.name,
          team_member_name: booking.teamMember.name,
          start_time_iso: booking.startTimeISO,
          local_time: formatLocalTime(booking.startAt, locale, timezone),
        });
      } catch (error) {
        return toolError(error);
      }
    },

    reschedule_appointment: async (parameters) => {
      try {
        const { selection } = requireAgentSlot(
          slotRegistry,
          parameters.slot_id,
        );
        const result = await convex.mutation(api.publicBooking.reschedule, {
          siteSlug,
          confirmationCode: requiredText(
            parameters.confirmation_code,
            "confirmation_code",
          ),
          phone: requiredText(parameters.phone, "phone"),
          offeringId: selection.offeringId,
          startAt: selection.startAt,
          teamMemberId: selection.teamMemberId,
        });
        if (!result.success) return JSON.stringify(result);
        const booking = result.booking;
        onActivity?.(
          activityFromBooking("rescheduled", booking, locale, timezone),
        );
        return JSON.stringify({
          success: true,
          action: "booking_rescheduled",
          status: booking.status,
          confirmation_code: booking.confirmationCode,
          offering_name: booking.offering.name,
          team_member_name: booking.teamMember.name,
          start_time_iso: booking.startTimeISO,
          local_time: formatLocalTime(booking.startAt, locale, timezone),
        });
      } catch (error) {
        return toolError(error);
      }
    },

    cancel_appointment: async (parameters) => {
      try {
        const result = await convex.mutation(api.publicBooking.cancel, {
          siteSlug,
          confirmationCode: requiredText(
            parameters.confirmation_code,
            "confirmation_code",
          ),
          phone: requiredText(parameters.phone, "phone"),
        });
        if (!result.success) return JSON.stringify(result);
        const booking = result.booking;
        onActivity?.(
          activityFromBooking("canceled", booking, locale, timezone),
        );
        return JSON.stringify({
          success: true,
          action: "booking_canceled",
          status: booking.status,
          confirmation_code: booking.confirmationCode,
          offering_name: booking.offering.name,
          team_member_name: booking.teamMember.name,
          start_time_iso: booking.startTimeISO,
          local_time: formatLocalTime(booking.startAt, locale, timezone),
        });
      } catch (error) {
        return toolError(error);
      }
    },
  };

  return {
    get_business_info: trackTool(
      "get_business_info",
      tools.get_business_info,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
    get_availability: trackTool(
      "get_availability",
      tools.get_availability,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
    book_appointment: trackTool(
      "book_appointment",
      tools.book_appointment,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
    lookup_appointment: trackTool(
      "lookup_appointment",
      tools.lookup_appointment,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
    reschedule_appointment: trackTool(
      "reschedule_appointment",
      tools.reschedule_appointment,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
    cancel_appointment: trackTool(
      "cancel_appointment",
      tools.cancel_appointment,
      onToolEvent,
      slotRegistry,
      locale,
      timezone,
    ),
  };
}

export function AgentClientToolRegistrar(
  props: Omit<ToolFactoryOptions, "convex" | "slotRegistry">,
) {
  const convex = useConvex();
  const {
    siteSlug,
    businessName,
    offerings,
    teamMembers,
    timezone,
    locale,
    onActivity,
    onToolEvent,
  } = props;
  const [slotRegistry] = useState(
    () => new Map<string, AgentSlotSelection>(),
  );
  const tools = useMemo(
    () =>
      createAgentClientTools({
        convex,
        siteSlug,
        businessName,
        offerings,
        teamMembers,
        timezone,
        locale,
        onActivity,
        onToolEvent,
        slotRegistry,
      }),
    [
      businessName,
      convex,
      locale,
      offerings,
      onActivity,
      onToolEvent,
      siteSlug,
      slotRegistry,
      teamMembers,
      timezone,
    ],
  );

  useConversationClientTool<AgentClientTools>(
    "get_business_info",
    tools.get_business_info,
  );
  useConversationClientTool<AgentClientTools>(
    "get_availability",
    tools.get_availability,
  );
  useConversationClientTool<AgentClientTools>(
    "book_appointment",
    tools.book_appointment,
  );
  useConversationClientTool<AgentClientTools>(
    "lookup_appointment",
    tools.lookup_appointment,
  );
  useConversationClientTool<AgentClientTools>(
    "reschedule_appointment",
    tools.reschedule_appointment,
  );
  useConversationClientTool<AgentClientTools>(
    "cancel_appointment",
    tools.cancel_appointment,
  );

  return null;
}
