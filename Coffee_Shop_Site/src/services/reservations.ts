import { cafeTimezone, normalizeValues } from "../../shared/reservation.ts";
import type { ReservationErrors, ReservationRequest, ReservationValues, SavedReservation, SubmissionIntent } from "../../shared/reservation.ts";

const storageKey = "kofee-reservation-intent";
interface StoredIntent extends SubmissionIntent { fingerprint: string; }
export class SubmissionError extends Error {
	fields?: ReservationErrors;
	constructor(message: string, fields?: ReservationErrors) {
		super(message);
		this.fields = fields;
	}
}
export async function prepareSubmission(values: ReservationValues) {
	const normalized = normalizeValues(values);
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(normalized)));
	const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
	let previous: StoredIntent | undefined;
	try {
		const text = sessionStorage.getItem(storageKey);
		if (text) previous = JSON.parse(text) as StoredIntent;
	} catch {
		throw new SubmissionError("Your browser could not access submission retry information. Please enable session storage before submitting.");
	}
	if (previous?.fingerprint === fingerprint && typeof previous.idempotencyKey === "string" && Number.isFinite(Date.parse(previous.intentCreatedAt))) {
		return { intent: previous, isRetry: true };
	}
	const intent: StoredIntent = { idempotencyKey: crypto.randomUUID(), intentCreatedAt: new Date().toISOString(), fingerprint };
	return { intent, isRetry: false };
}
export function clearSubmissionIntent() {
	try { sessionStorage.removeItem(storageKey); } catch { /* The next submission reports unavailable storage. */ }
}
export async function submitReservation(values: ReservationValues, intent: StoredIntent, website = ""): Promise<SavedReservation> {
	// Persist only retry metadata. Contact details stay in the form and the POST body.
	try { sessionStorage.setItem(storageKey, JSON.stringify(intent)); }
	catch { throw new SubmissionError("Your browser could not retain retry information. Nothing was submitted. Please enable session storage."); }
	const normalized = normalizeValues(values);
	const request: ReservationRequest = { ...normalized, guests: Number(normalized.guests),
		idempotencyKey: intent.idempotencyKey, intentCreatedAt: intent.intentCreatedAt, website };
	const controller = new AbortController();
	const timer = window.setTimeout(() => controller.abort(), 30_000);
	try {
		const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" },
			body: JSON.stringify(request), signal: controller.signal });
		let body: { error?: { message?: string; fields?: ReservationErrors }; reservation?: SavedReservation };
		try { body = await response.json(); } catch {
			throw new SubmissionError(response.status === 429 ? "Too many requests. Please wait a minute and retry with the same details." : "We could not verify the save. Keep your details and retry the same request.");
		}
		if (!response.ok) throw new SubmissionError(response.status === 429 ? "Too many requests. Please wait a minute and retry with the same details." : body.error?.message ?? "We could not verify the save. Keep your details and retry the same request.", body.error?.fields);
		const saved = body.reservation;
		if (!saved || !/^[0-9a-f-]{36}$/i.test(saved.reference) || saved.status !== "pending" || saved.timezone !== cafeTimezone || saved.date !== values.date || saved.time !== values.time || saved.guests !== Number(values.guests)) {
			throw new SubmissionError("We could not verify the save. Keep your details and retry the same request.");
		}
		return saved;
	} catch (error) {
		if (error instanceof SubmissionError) throw error;
		throw new SubmissionError("The connection ended before we could verify the save. Keep your details and retry; the same request will not be saved twice.");
	} finally { window.clearTimeout(timer); }
}
