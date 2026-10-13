import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { createReservationStore, deleteExpiredRequests } from "../server/database.ts";
import { payloadHash } from "../server/reservations.ts";
import type { ReservationRequest } from "../shared/reservation.ts";

// These tests require the migration already applied to an explicitly approved
// disposable branch. They never create resources or apply a schema themselves.
const configured = Boolean(process.env.TEST_DATABASE_URL && process.env.TEST_DATABASE_OWNER_URL
	&& process.env.TEST_DATABASE_CONFIRM === "disposable-test-branch");
test("Neon integration: saves, constraints, concurrent retry, Oslo conversion, privacy and retention", { skip: !configured }, async () => {
	const url = process.env.TEST_DATABASE_URL!, ownerUrl = process.env.TEST_DATABASE_OWNER_URL!;
	if (url === process.env.DATABASE_URL || ownerUrl === process.env.DATABASE_URL) throw new Error("Refusing to test a runtime database connection.");
	const store = createReservationStore(url), owner = neon(ownerUrl), runtime = neon(url);
	const keys: string[] = [];
	const make = (date = "2026-10-25", time = "12:00"): ReservationRequest => {
		const key = randomUUID(); keys.push(key);
		return { idempotencyKey: key, intentCreatedAt: new Date().toISOString(), name: "Synthetic Test Visitor", email: "synthetic@example.com", guests: 2, date, time };
	};
	const hash = (request: ReservationRequest) => payloadHash(request, "integration-secret-".repeat(4));
	try {
		const request = make();
		const saved = await Promise.all(Array.from({ length: 8 }, () => store.insert(request, hash(request))));
		assert.equal(new Set(saved.map((row) => row.summary.reference)).size, 1);
		const counts = await owner`SELECT count(*)::integer AS count FROM reservation_requests WHERE idempotency_key = ${request.idempotencyKey}::uuid`;
		assert.equal(counts[0].count, 1);
		const rows = await owner`SELECT name, email, status, requested_at::text FROM reservation_requests WHERE idempotency_key = ${request.idempotencyKey}::uuid`;
		assert.equal(rows[0].name, "Synthetic Test Visitor"); assert.equal(rows[0].email, "synthetic@example.com"); assert.equal(rows[0].status, "pending");
		assert.equal(new Date(rows[0].requested_at).toISOString(), "2026-10-25T11:00:00.000Z");
		const spring = make("2026-03-29"); await store.insert(spring, hash(spring));
		const springRows = await owner`SELECT requested_at::text FROM reservation_requests WHERE idempotency_key = ${spring.idempotencyKey}::uuid`;
		assert.equal(new Date(springRows[0].requested_at).toISOString(), "2026-03-29T10:00:00.000Z");
		await assert.rejects(runtime`SELECT email FROM reservation_requests`);
		await assert.rejects(runtime`UPDATE reservation_requests SET status = 'pending'`);
		for (const invalid of [{ guests: 9 }, { time: "18:00" }, { time: "12:15" }, { name: "" }]) {
			const body = { ...make(), ...invalid }; await assert.rejects(store.insert(body, hash(body)));
		}
		await owner`UPDATE reservation_requests SET created_at = now() - interval '31 days' WHERE idempotency_key = ${spring.idempotencyKey}::uuid`;
		assert.ok(await deleteExpiredRequests(url) >= 1);
		assert.equal(await store.find(spring.idempotencyKey), null);
		assert.ok(await store.find(request.idempotencyKey));
	} finally {
		for (const key of keys) await owner`DELETE FROM reservation_requests WHERE idempotency_key = ${key}::uuid`;
	}
});
