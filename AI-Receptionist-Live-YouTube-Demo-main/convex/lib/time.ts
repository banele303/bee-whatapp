export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

type LocalDate = { year: number; month: number; day: number };
type LocalDateTime = LocalDate & { hour: number; minute: number };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let cached = formatterCache.get(timeZone);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, cached);
  }
  return cached;
}

export function assertIanaTimezone(timeZone: string): void {
  try {
    formatter(timeZone).format(0);
  } catch {
    throw new Error(`Invalid IANA timezone: "${timeZone}".`);
  }
}

export function parseLocalDate(value: string): LocalDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) throw new Error("date must use YYYY-MM-DD format.");
  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const roundTrip = new Date(
    Date.UTC(date.year, date.month - 1, date.day),
  );
  if (
    date.month < 1 ||
    date.month > 12 ||
    date.day < 1 ||
    roundTrip.getUTCFullYear() !== date.year ||
    roundTrip.getUTCMonth() !== date.month - 1 ||
    roundTrip.getUTCDate() !== date.day
  ) {
    throw new Error(`Invalid calendar date: "${value}".`);
  }
  return date;
}

function partsAt(utcMs: number, timeZone: string): LocalDateTime & { second: number } {
  const parts = formatter(timeZone).formatToParts(new Date(utcMs));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

/** Convert an IANA-zone wall clock to a UTC instant using Intl timezone data. */
export function zonedDateTimeToUtc(
  value: LocalDateTime,
  timeZone: string,
): number | null {
  assertIanaTimezone(timeZone);
  const wallClockAsUtc = Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
  );
  let candidate = wallClockAsUtc;

  // Offset iteration uses the runtime's IANA data and works across fractional
  // offsets and DST. Nonexistent DST wall times fail the final round-trip.
  for (let index = 0; index < 4; index += 1) {
    const parts = partsAt(candidate, timeZone);
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const next = candidate + (wallClockAsUtc - representedAsUtc);
    if (next === candidate) break;
    candidate = next;
  }

  const roundTrip = partsAt(candidate, timeZone);
  return roundTrip.year === value.year &&
    roundTrip.month === value.month &&
    roundTrip.day === value.day &&
    roundTrip.hour === value.hour &&
    roundTrip.minute === value.minute
    ? candidate
    : null;
}

export function localPartsAt(
  utcMs: number,
  timeZone: string,
): LocalDateTime {
  return partsAt(utcMs, timeZone);
}

export function dayOfWeek(date: LocalDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

export function addLocalDays(date: LocalDate, days: number): LocalDate {
  const result = new Date(
    Date.UTC(date.year, date.month - 1, date.day + days),
  );
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

export function localDateTimeFromMinute(
  date: LocalDate,
  minuteOfDay: number,
): LocalDateTime {
  if (minuteOfDay === 1_440) {
    return { ...addLocalDays(date, 1), hour: 0, minute: 0 };
  }
  return {
    ...date,
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
  };
}

export function localDateStringAt(utcMs: number, timeZone: string): string {
  const parts = localPartsAt(utcMs, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
