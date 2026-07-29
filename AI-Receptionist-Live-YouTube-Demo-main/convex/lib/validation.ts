export function requiredTrimmed(value: string, label: string, max = 200): string {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result;
}

export function optionalTrimmed(
  value: string | undefined,
  label: string,
  max = 500,
): string | undefined {
  if (value === undefined) return undefined;
  const result = value.trim();
  if (!result) return undefined;
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result;
}

export function boundedInteger(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

export function normalizedEmail(value: string | undefined): string | undefined {
  const email = optionalTrimmed(value, "email", 320)?.toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}

export function normalizedPhone(value: string | undefined): string | undefined {
  const phone = optionalTrimmed(value, "phone", 40);
  if (!phone) return undefined;
  const normalized = phone.replace(/[^\d+]/g, "");
  if (normalized.replace(/\D/g, "").length < 7) {
    throw new Error("Enter a valid phone number.");
  }
  return normalized;
}
