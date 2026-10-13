import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { cafeTimezone } from "../shared/reservation.ts";
import type { ReservationRequest } from "../shared/reservation.ts";
import type { ReservationStore, StoredReservation } from "./reservations.ts";

interface DatabaseRow {
	reference: string;
	payload_hash: string;
	intent_created_at: string;
	created_at: string;
	guest_count: number;
	requested_date: string;
	requested_time: string;
	status: "pending";
}
function stored(row: DatabaseRow): StoredReservation {
	return {
		payloadHash: row.payload_hash, intentCreatedAt: row.intent_created_at, createdAt: row.created_at,
		summary: { reference: row.reference, guests: row.guest_count, date: row.requested_date,
			time: row.requested_time.slice(0, 5), status: row.status, timezone: cafeTimezone },
	};
}
export function createReservationStore(connectionString: string): ReservationStore {
	let connection: ReturnType<typeof neon> | undefined;
	function sql() {
		if (!connectionString) throw new Error("Database not configured");
		return connection ??= neon(connectionString);
	}
	async function find(key: string) {
		const rows = await sql()`SELECT reference, payload_hash, intent_created_at::text, created_at::text,
			guest_count, requested_date::text, requested_time::text, status
			FROM reservation_requests WHERE idempotency_key = ${key}::uuid` as DatabaseRow[];
		return rows[0] ? stored(rows[0]) : null;
	}
	async function insert(request: ReservationRequest, hash: string) {
		const rows = await sql()`INSERT INTO reservation_requests
			(reference, idempotency_key, intent_created_at, payload_hash, name, email,
			 guest_count, requested_date, requested_time, requested_at)
			VALUES (${randomUUID()}::uuid, ${request.idempotencyKey}::uuid, ${request.intentCreatedAt}::timestamptz,
			 ${hash}, ${request.name}, ${request.email}, ${request.guests}, ${request.date}::date,
			 ${request.time}::time, (${request.date}::date + ${request.time}::time) AT TIME ZONE 'Europe/Oslo')
			ON CONFLICT (idempotency_key) DO NOTHING
			RETURNING reference, payload_hash, intent_created_at::text, created_at::text,
			guest_count, requested_date::text, requested_time::text, status` as DatabaseRow[];
		if (rows[0]) return stored(rows[0]);
		// A separate query sees the winner after a concurrent unique-key insert commits.
		const existing = await find(request.idempotencyKey);
		if (!existing) throw new Error("Save could not be verified");
		return existing;
	}
	return { find, insert };
}
export async function deleteExpiredRequests(connectionString: string) {
	if (!connectionString) throw new Error("Database not configured");
	const sql = neon(connectionString);
	const rows = await sql`WITH deleted AS (
		DELETE FROM reservation_requests WHERE created_at < now() - interval '30 days' RETURNING reference
	) SELECT count(*)::integer AS deleted FROM deleted` as { deleted: number }[];
	return rows[0].deleted;
}
