import { createHmac, timingSafeEqual } from "node:crypto";
import { cafeTimezone, normalizeValues, validateReservation } from "../shared/reservation.ts";
import type { ReservationRequest, SavedReservation } from "../shared/reservation.ts";

export interface StoredReservation {
	payloadHash: string;
	intentCreatedAt: string;
	createdAt: string;
	summary: SavedReservation;
}
export interface ReservationStore {
	find(key: string): Promise<StoredReservation | null>;
	insert(request: ReservationRequest, hash: string): Promise<StoredReservation>;
}
export interface HttpRequest {
	method?: string;
	headers: Record<string, string | string[] | undefined>;
	body: unknown;
}
export interface ServerConfig { enabled: boolean; origin: string; hashSecret: string; }
export interface HttpResult { status: number; body: unknown; headers?: Record<string, string>; }
export const retentionMs = 30 * 24 * 60 * 60 * 1000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (status: number, message: string): HttpResult => ({ status, body: { error: { message } } });
function equalHash(a: string, b: string) {
	return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function payloadHash(request: ReservationRequest, secret: string) {
	return createHmac("sha256", secret).update(JSON.stringify({
		name: request.name, email: request.email, guests: request.guests, date: request.date,
		time: request.time, intentCreatedAt: request.intentCreatedAt,
	})).digest("hex");
}
function parseBody(body: unknown): ReservationRequest | null {
	let value: unknown = body;
	if (typeof body === "string") { try { value = JSON.parse(body); } catch { return null; } }
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const v = value as Record<string, unknown>;
	const allowed = ["idempotencyKey", "intentCreatedAt", "name", "email", "guests", "date", "time", "website"];
	if (Object.keys(v).some((key) => !allowed.includes(key))) return null;
	for (const key of ["idempotencyKey", "intentCreatedAt", "name", "email", "date", "time"]) {
		if (typeof v[key] !== "string") return null;
	}
	if (typeof v.guests !== "number" || !Number.isInteger(v.guests)) return null;
	if (v.website !== undefined && (typeof v.website !== "string" || v.website !== "")) return null;
	const request = v as unknown as ReservationRequest;
	if (!uuidPattern.test(request.idempotencyKey)) return null;
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(request.intentCreatedAt)) return null;
	const intentDate = new Date(request.intentCreatedAt);
	if (!Number.isFinite(intentDate.getTime()) || intentDate.toISOString() !== request.intentCreatedAt) return null;
	if (request.name.length > 200 || request.email.length > 300 || request.date.length !== 10 || request.time.length !== 5) return null;
	const normalized = normalizeValues({ ...request, guests: String(request.guests) });
	return { ...request, ...normalized, guests: request.guests };
}
export async function handleReservationRequest(req: HttpRequest, store: ReservationStore, config: ServerConfig, now = new Date()): Promise<HttpResult> {
	if (req.method !== "POST") return { ...fail(405, "Only POST is supported."), headers: { Allow: "POST" } };
	if (!config.enabled) return fail(503, "Reservation requests are temporarily unavailable. Your details have not been cleared.");
	if (!config.origin || req.headers.origin !== config.origin) return fail(403, "Submit this request from the portfolio website.");
	if (typeof req.headers["content-type"] !== "string" || !/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"])) return fail(415, "Send a JSON request.");
	const contentLength = req.headers["content-length"];
	if (typeof contentLength === "string" && (!/^\d+$/.test(contentLength) || Number(contentLength) > 4096)) return fail(413, "The request is too large.");
	try {
		const encoded = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
		if (!encoded) return fail(400, "Invalid request details.");
		if (Buffer.byteLength(encoded) > 4096) return fail(413, "The request is too large.");
		const request = parseBody(req.body);
		if (!request) return fail(400, "Invalid request details. Check the form and try again.");
		if (config.hashSecret.length < 32) return fail(503, "Reservation requests are temporarily unavailable.");
		const hash = payloadHash(request, config.hashSecret);
		const existing = await store.find(request.idempotencyKey);
		if (existing) {
			if (!equalHash(hash, existing.payloadHash)) return fail(409, "These details differ from the original request. Retry the original details or start a new request.");
			if (now.getTime() - new Date(existing.createdAt).getTime() >= retentionMs) return fail(409, "This request's retry window has expired. It will not be submitted again automatically.");
			return { status: 200, body: { reservation: existing.summary } };
		}
		const age = now.getTime() - new Date(request.intentCreatedAt).getTime();
		if (age < -60_000 || age > 24 * 60 * 60 * 1000) return fail(409, "This request's submission window has expired. Its previous outcome is unknown; it will not be submitted again automatically.");
		const errors = validateReservation({ ...request, guests: String(request.guests) }, now);
		if (Object.keys(errors).length) return { status: 422, body: { error: { message: "Please check the highlighted fields.", fields: errors } } };
		const saved = await store.insert(request, hash);
		if (!equalHash(hash, saved.payloadHash)) return fail(409, "This submission identifier was used with different details.");
		if (saved.summary.status !== "pending" || saved.summary.timezone !== cafeTimezone) throw new Error("Invalid database result");
		return { status: 201, body: { reservation: saved.summary } };
	} catch {
		// Do not log the payload, contacts, SQL errors, or connection strings.
		return fail(503, "We could not verify that your request was saved. Keep your details and retry; the same request will not be saved twice.");
	}
}
