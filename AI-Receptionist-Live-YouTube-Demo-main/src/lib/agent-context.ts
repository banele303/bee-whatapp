type Terminology = {
  offeringSingular: string;
  offeringPlural: string;
  teamMemberSingular: string;
  teamMemberPlural: string;
  customerSingular: string;
  customerPlural: string;
  bookingSingular: string;
  bookingPlural: string;
};

type OfferingContext = {
  name: string;
  description: string;
  durationMinutes: number;
  priceMinor: number;
};

type KnowledgeContext = {
  title: string;
  content: string;
};

function clamp(value: string, maximum = 8_000): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}

function currentLocalDate(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  if (!year || !month || !day) {
    throw new Error("Could not resolve the organization's current local date.");
  }
  return `${year}-${month}-${day}`;
}

export function createAgentDynamicVariables({
  siteSlug,
  businessName,
  description,
  timezone,
  locale,
  currency,
  terminology,
  offerings,
  knowledgeItems,
  bookingInstruction,
}: {
  siteSlug: string;
  businessName: string;
  description: string;
  timezone: string;
  locale: string;
  currency: string;
  terminology: Terminology;
  offerings: OfferingContext[];
  knowledgeItems: KnowledgeContext[];
  bookingInstruction?: string;
}) {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  });
  const localDate = currentLocalDate(timezone);

  return {
    site_slug: siteSlug,
    business_name: businessName,
    business_description: clamp(description, 2_500),
    business_timezone: timezone,
    business_terminology: [
      `${terminology.offeringSingular}/${terminology.offeringPlural}`,
      `${terminology.teamMemberSingular}/${terminology.teamMemberPlural}`,
      `${terminology.customerSingular}/${terminology.customerPlural}`,
      `${terminology.bookingSingular}/${terminology.bookingPlural}`,
    ].join(", "),
    business_offerings: clamp(
      offerings
        .map(
          (offering) =>
            `${offering.name}: ${offering.description} (${offering.durationMinutes} minutes, ${formatter.format(offering.priceMinor / 100)})`,
        )
        .join("\n"),
    ),
    business_knowledge: clamp(
      knowledgeItems
        .map((item) => `${item.title}: ${item.content}`)
        .join("\n"),
    ),
    booking_instruction:
      bookingInstruction ??
      `Today is ${localDate} in ${timezone}. Resolve an unqualified weekday such as Monday to its next future occurrence after this date. Use the booking tools to check live availability, create ${terminology.bookingPlural.toLowerCase()}, and securely look up, reschedule, or cancel existing ${terminology.bookingPlural.toLowerCase()}. Once the offering and date are known, call get_availability immediately before asking which time the customer prefers. Never redirect the customer to the booking panel when a tool can complete the request. If many times are available, offer at most five useful choices and ask whether the customer prefers another part of the day. Output only customer-facing speech: never narrate private reasoning, plans, or tool names.`,
    interaction_channel: "web",
    contact_number_policy:
      "This is a React web session, including text chat or browser audio. The first reply after detecting a booking, booking lookup, reschedule, cancellation, callback, or other contact-dependent request must ask for a contact phone number before giving directions or collecting other details. Confirm the number, then continue. General information does not require a phone number.",
  };
}
