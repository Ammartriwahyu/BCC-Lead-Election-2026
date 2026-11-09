type ClassValue = string | false | null | undefined;

/** Joins class names, skipping falsy values. Callers keep classes non-conflicting. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
