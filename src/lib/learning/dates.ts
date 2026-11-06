/** YYYY-MM-DD for a given instant in the learner's IANA timezone. */
export function localDateString(date: Date, timeZone: string) {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    return fmt.format(date); // en-CA yields YYYY-MM-DD
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86_400_000);
}
