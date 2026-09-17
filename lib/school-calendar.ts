export type SchoolCalendar = {
  startDate: string;
  endDate: string;
  schoolDays: number;
};

export function isSchoolCalendarService(service: { code: string; name: string }) {
  return service.code.toUpperCase() === "CALENDAR" || service.name.trim().toLowerCase() === "school calendar";
}

export function parseSchoolCalendar(value: unknown): SchoolCalendar {
  const record = value as Partial<SchoolCalendar> | null;
  const validDate = (date: unknown): date is string =>
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  if (!record || !validDate(record.startDate) || !validDate(record.endDate)) {
    throw new Error("Enter valid school year start and end dates.");
  }
  if (record.endDate <= record.startDate) throw new Error("The school year end date must be after its start date.");
  const daysInRange = (Date.parse(record.endDate) - Date.parse(record.startDate)) / 86400000 + 1;
  if (typeof record.schoolDays !== "number" || !Number.isInteger(record.schoolDays) || record.schoolDays < 1 || record.schoolDays > daysInRange) {
    throw new Error("Total school days must be a positive whole number within the school year date range.");
  }
  return { startDate: record.startDate, endDate: record.endDate, schoolDays: record.schoolDays };
}
