export const cafeTimezone = "Europe/Oslo";
export const openingHours = {
	weekdays: { open: 10 * 60, close: 19 * 60 },
	weekends: { open: 12 * 60, close: 18 * 60 },
};
export const guestCounts = Array.from({ length: 8 }, (_, index) => String(index + 1));

export interface ReservationValues {
	name: string;
	email: string;
	guests: string;
	date: string;
	time: string;
}
export type ReservationErrors = Partial<Record<keyof ReservationValues, string>>;
export interface SubmissionIntent {
	idempotencyKey: string;
	intentCreatedAt: string;
}
export interface ReservationRequest extends SubmissionIntent {
	name: string;
	email: string;
	guests: number;
	date: string;
	time: string;
	website?: string;
}
export interface SavedReservation {
	reference: string;
	status: "pending";
	date: string;
	time: string;
	guests: number;
	timezone: typeof cafeTimezone;
}

const formatter = new Intl.DateTimeFormat("en-GB", {
	timeZone: cafeTimezone, year: "numeric", month: "2-digit", day: "2-digit",
	hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
export function osloClock(now: Date) {
	const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
	return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}:${parts.second}` };
}
// Calendar-only UTC value, not the cafe's arrival instant.
export function parseDate(value: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const [year, month, day] = value.split("-").map(Number);
	if (year < 1) return null;
	const date = new Date(0);
	date.setUTCFullYear(year, month - 1, day);
	date.setUTCHours(0, 0, 0, 0);
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}
export function localDate(now: Date) { return osloClock(now).date; }
export function latestDate(now: Date) {
	const date = parseDate(localDate(now))!;
	date.setUTCDate(date.getUTCDate() + 90);
	return date.toISOString().slice(0, 10);
}
export function formatTime(minutes: number) {
	const hour = Math.floor(minutes / 60);
	return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}
export function formatDate(value: string) {
	return parseDate(value)?.toLocaleDateString(undefined, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }) ?? value;
}
export function timeSlots(value: string, now: Date) {
	const date = parseDate(value);
	const clock = osloClock(now);
	if (!date || value < clock.date) return [];
	const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
	const hours = weekend ? openingHours.weekends : openingHours.weekdays;
	return Array.from({ length: (hours.close - hours.open) / 30 }, (_, index) => {
		const minutes = hours.open + index * 30;
		const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
		return { value: time, label: formatTime(minutes), disabled: value === clock.date && `${time}:00` <= clock.time };
	});
}
export function normalizeValues(values: ReservationValues): ReservationValues {
	return { name: values.name.trim(), email: values.email.trim(), guests: values.guests, date: values.date, time: values.time };
}
function hasControlCharacters(value: string) {
	return Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}
export function validateReservation(raw: ReservationValues, now: Date): ReservationErrors {
	const values = normalizeValues(raw);
	const errors: ReservationErrors = {};
	if (!values.name || values.name.length > 100 || hasControlCharacters(values.name)) errors.name = "Enter a name of 1–100 characters.";
	if (values.email.length > 254 || hasControlCharacters(values.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Enter a valid email address.";
	if (!guestCounts.includes(values.guests)) errors.guests = "Choose between 1 and 8 guests.";
	if (!values.date) errors.date = "Choose a date.";
	else if (!parseDate(values.date)) errors.date = "Enter a valid calendar date.";
	else if (values.date < localDate(now)) errors.date = "Choose today or a future date in Oslo.";
	else if (values.date > latestDate(now)) errors.date = "Choose a date within the next 90 days.";
	if (!values.time) errors.time = "Choose a time.";
	else if (!errors.date) {
		const slot = timeSlots(values.date, now).find((item) => item.value === values.time);
		if (!slot) errors.time = "Choose a time within the displayed opening hours.";
		else if (slot.disabled) errors.time = "That time has passed in Oslo. Choose a later time or another date.";
	}
	return errors;
}
