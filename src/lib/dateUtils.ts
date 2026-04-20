import dayjs from "dayjs";
import "dayjs/locale/es";

export const DATE_FORMAT_DISPLAY = "DD-MM-YYYY";
export const DATE_FORMAT_API = "YYYY-MM-DD";

export function formatDateForDisplay(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return dayjs(dateString).format(DATE_FORMAT_DISPLAY);
}

export function parseApiDate(dateString: string | null | undefined): dayjs.Dayjs | null {
  if (!dateString) return null;
  return dayjs(dateString);
}

export function parseDisplayDate(dateString: string | null | undefined): dayjs.Dayjs | null {
  if (!dateString) return null;
  return dayjs(dateString, DATE_FORMAT_DISPLAY);
}

export function toApiDate(date: dayjs.Dayjs): string {
  return date.format(DATE_FORMAT_API);
}