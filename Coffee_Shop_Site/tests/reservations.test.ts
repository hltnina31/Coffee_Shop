import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { handleReservationRequest, retentionMs } from "../server/reservations.ts";
import type { HttpRequest, ReservationStore, StoredReservation } from "../server/reservations.ts";
import type { ReservationRequest } from "../shared/reservation.ts";
import { prepareSubmission, submitReservation, SubmissionError } from "../src/services/reservations.ts";

const now = new Date("2026-10-06T08:15:00Z");
const config = { enabled: true, origin: "http://localhost:3000", hashSecret: "test-secret-".repeat(4) };
function request(overrides: Partial<ReservationRequest> = {}): HttpRequest {
	return { method: "POST", headers: { origin: config.origin, "content-type": "application/json" }, body: {
		idempotencyKey: randomUUID(), intentCreatedAt: now.toISOString(), name: "Example Visitor", email: "visitor@example.com",
		guests: 2, date: "2026-10-06", time: "10:30", ...overrides,
	} };
}
function memoryStore() {
	const records = new Map<string, StoredReservation>();
	let inserts = 0;
	const store: ReservationStore = {
		async find(key) { return records.get(key) ?? null; },
		async insert(body, hash) {
			const old = records.get(body.idempotencyKey); if (old) return old;
			inserts++;
			const row: StoredReservation = { payloadHash: hash, intentCreatedAt: body.intentCreatedAt, createdAt: now.toISOString(), summary: {
				reference: randomUUID(), status: "pending", date: body.date, time: body.time, guests: body.guests, timezone: "Europe/Oslo",
			} };
			records.set(body.idempotencyKey, row); return row;
		},
	};
	return { store, records, get inserts() { return inserts; } };
}
test("successful save returns a pending summary without contact information", async () => {
	const memory = memoryStore(); const result = await handleReservationRequest(request(), memory.store, config, now);
	assert.equal(result.status, 201); assert.equal(memory.inserts, 1);
	const json = JSON.stringify(result.body); assert.match(json, /pending/); assert.doesNotMatch(json, /Example Visitor|visitor@example|payloadHash/);
});
test("concurrent identical submissions and lost response retries save one row", async () => {
	const memory = memoryStore(), req = request();
	const results = await Promise.all(Array.from({ length: 10 }, () => handleReservationRequest(req, memory.store, config, now)));
	assert.equal(memory.inserts, 1);
	assert.equal(new Set(results.map((result) => JSON.stringify(result.body))).size, 1);
	const retry = await handleReservationRequest(req, memory.store, config, new Date("2026-10-06T09:00:00Z"));
	assert.equal(retry.status, 200); assert.equal(memory.inserts, 1);
});
test("same key with changed payload conflicts; expired retry does not insert", async () => {
	const memory = memoryStore(), req = request();
	await handleReservationRequest(req, memory.store, config, now);
	assert.equal((await handleReservationRequest({ ...req, body: { ...(req.body as ReservationRequest), guests: 3 } }, memory.store, config, now)).status, 409);
	assert.equal((await handleReservationRequest(req, memory.store, config, new Date(now.getTime() + retentionMs))).status, 409);
	memory.records.clear();
	assert.equal((await handleReservationRequest(req, memory.store, config, new Date(now.getTime() + retentionMs))).status, 409);
	assert.equal(memory.inserts, 1);
});
test("invalid inputs, honeypot and spoofed types never insert", async () => {
	const memory = memoryStore();
	for (const override of [{ guests: 9 }, { date: "2026-02-30" }, { time: "19:00" }, { name: " " }, { email: "bad" }]) {
		assert.equal((await handleReservationRequest(request(override), memory.store, config, now)).status, 422);
	}
	assert.equal((await handleReservationRequest(request({ website: "bot" }), memory.store, config, now)).status, 400);
	const req = request();
	for (const body of ["{bad", [], { ...(req.body as object), guests: "2" }, { ...(req.body as object), extra: true }]) {
		assert.equal((await handleReservationRequest({ ...req, body }, memory.store, config, now)).status, 400);
	}
	assert.equal(memory.inserts, 0);
});
test("expired/future intent, server elapsed time and future horizon are rejected", async () => {
	const m = memoryStore();
	assert.equal((await handleReservationRequest(request({ intentCreatedAt: "2026-10-05T07:00:00.000Z" }), m.store, config, now)).status, 409);
	assert.equal((await handleReservationRequest(request({ intentCreatedAt: "2026-10-06T09:00:00.000Z" }), m.store, config, now)).status, 409);
	assert.equal((await handleReservationRequest(request({ time: "10:00" }), m.store, config, now)).status, 422);
	assert.equal((await handleReservationRequest(request({ date: "2027-01-05" }), m.store, config, now)).status, 422);
});
test("method, origin, body size, type and kill switch protections", async () => {
	const m = memoryStore(), req = request();
	assert.equal((await handleReservationRequest({ ...req, method: "GET" }, m.store, config, now)).status, 405);
	assert.equal((await handleReservationRequest({ ...req, headers: { ...req.headers, origin: "https://other.example" } }, m.store, config, now)).status, 403);
	assert.equal((await handleReservationRequest({ ...req, headers: { ...req.headers, "content-type": "text/plain" } }, m.store, config, now)).status, 415);
	assert.equal((await handleReservationRequest({ ...req, body: "x".repeat(4097) }, m.store, config, now)).status, 413);
	assert.equal((await handleReservationRequest(req, m.store, { ...config, enabled: false }, now)).status, 503);
});
test("failed save never reports success or leaks database error", async () => {
	const m = memoryStore(); m.store.insert = async () => { throw new Error("secret connection visitor@example.com"); };
	const result = await handleReservationRequest(request(), m.store, config, now);
	assert.equal(result.status, 503); assert.doesNotMatch(JSON.stringify(result.body), /secret|visitor@example/);
});
test("normalization permits the same retry without changing its hash", async () => {
	const m = memoryStore(), req = request({ name: " Visitor " });
	assert.equal((await handleReservationRequest(req, m.store, config, now)).status, 201);
	assert.equal((await handleReservationRequest({ ...req, body: { ...(req.body as ReservationRequest), name: "Visitor" } }, m.store, config, now)).status, 200);
});
test("client keeps retry key on failure and sends the same key after a lost response", async () => {
	const originalFetch = globalThis.fetch;
	const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
	const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
	const storage = new Map<string, string>();
	Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } });
	Object.defineProperty(globalThis, "window", { configurable: true, value: { setTimeout, clearTimeout } });
	try {
		const values = { name: "Visitor", email: "visitor@example.com", guests: "2", date: "2026-10-07", time: "10:30" };
		const first = await prepareSubmission(values);
		globalThis.fetch = async () => { throw new Error("Lost response"); };
		await assert.rejects(submitReservation(values, first.intent), SubmissionError);
		assert.doesNotMatch([...storage.values()].join(), /visitor@example|Visitor/);
		const retry = await prepareSubmission(values);
		assert.ok(retry.isRetry); assert.equal(retry.intent.idempotencyKey, first.intent.idempotencyKey);
		let resolve!: (value: Response) => void;
		globalThis.fetch = async (_url, options) => {
			assert.equal(JSON.parse(options?.body as string).idempotencyKey, first.intent.idempotencyKey);
			return new Promise<Response>((done) => { resolve = done; });
		};
		let finished = false;
		const pending = submitReservation(values, retry.intent).then((value) => { finished = true; return value; });
		await new Promise((done) => setImmediate(done)); assert.equal(finished, false);
		resolve(new Response(JSON.stringify({ reservation: { reference: randomUUID(), status: "pending", guests: 2, date: values.date, time: values.time, timezone: "Europe/Oslo" } }), { status: 200 }));
		assert.equal((await pending).status, "pending");
	} finally {
		globalThis.fetch = originalFetch;
		if (originalStorage) Object.defineProperty(globalThis, "sessionStorage", originalStorage); else Reflect.deleteProperty(globalThis, "sessionStorage");
		if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window");
	}
});

test("real form state: validation, pending, duplicate prevention, failure recovery, and saved confirmation", async () => {
	const { readFileSync } = await import("node:fs");
	const { default: ts } = await import("typescript");
	const source = readFileSync(new URL("../src/components/Reservation.tsx", import.meta.url), "utf8");
	const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX } }).outputText;
	type Tree = { type: unknown; props: Record<string, unknown> };
	const states: unknown[] = [], refs: { current: unknown }[] = [];
	let stateIndex = 0, refIndex = 0, calls = 0;
	let resolve!: (value: unknown) => void, reject!: (error: Error) => void;
	const intent = { idempotencyKey: randomUUID(), intentCreatedAt: new Date().toISOString(), fingerprint: "test" };
	const hooks = {
		useState(initial: unknown) {
			const index = stateIndex++;
			if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
			return [states[index], (value: unknown) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
		},
		useRef(initial: unknown) { const index = refIndex++; return refs[index] ??= { current: initial }; },
		useEffect() {},
	};
	class FakeSubmissionError extends Error {}
	const jsx = (type: unknown, props: Record<string, unknown>): Tree => ({ type, props });
	const requireMock = (name: string) => {
		if (name === "react") return hooks;
		if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
		if (name.includes("services/reservations")) return {
			SubmissionError: FakeSubmissionError, clearSubmissionIntent() {},
			prepareSubmission: async () => ({ intent, isRetry: false }),
			submitReservation: async () => { calls++; return new Promise((done, fail) => { resolve = done; reject = fail; }); },
		};
		if (name.includes("utils/reservation")) return {
			guestCounts: ["1", "2"], localDate: () => "2026-10-06", latestDate: () => "2027-01-04",
			parseDate: (date: string) => date ? new Date("2026-10-07T00:00:00Z") : null,
			formatDate: () => "October 7, 2026", formatTime: () => "10:30 am",
			timeSlots: () => [{ value: "10:30", label: "10:30 am", disabled: false }],
			validateReservation: (v: Record<string, string>) => Object.values(v).every(Boolean) ? {} : { name: "Enter a name." },
		};
		return { default: "mock" };
	};
	const mod = { exports: {} as { default: () => Tree } };
	new Function("require", "module", "exports", code)(requireMock, mod, mod.exports);
	const render = () => { stateIndex = 0; refIndex = 0; return mod.exports.default(); };
	function find(tree: unknown, predicate: (node: Tree) => boolean): Tree | null {
		if (!tree || typeof tree !== "object" || !("props" in tree)) return null;
		const node = tree as Tree; if (predicate(node)) return node;
		for (const child of [node.props.children].flat(Infinity)) { const result = find(child, predicate); if (result) return result; }
		return null;
	}
	const form = (tree: Tree) => find(tree, (node) => node.type === "form")!;
	const button = (tree: Tree) => find(tree, (node) => node.props.type === "submit")!;
	const submit = (tree: Tree) => (form(tree).props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault() {} });
	let tree = render(), focused = false;
	refs[0].current = { elements: { namedItem: () => ({ validity: { badInput: false }, focus: () => { focused = true; } }) } };
	await submit(tree); assert.equal(calls, 0); assert.ok(focused); assert.equal(button(render()).props.disabled, false);
	const values = { name: "Visitor", email: "visitor@example.com", guests: "2", date: "2026-10-07", time: "10:30" };
	states[0] = values; tree = render(); const pending = submit(tree);
	await new Promise((done) => setImmediate(done)); tree = render();
	assert.equal(button(tree).props.children, "Submitting…"); assert.equal(button(tree).props.disabled, true);
	assert.equal(form(tree).props["aria-busy"], true);
	const live = find(tree, (node) => node.props.role === "status")!;
	assert.ok(find(live, (node) => node.props.children === "Submitting your reservation request…"));
	await submit(tree); assert.equal(calls, 1);
	reject(new FakeSubmissionError("Retry safely.")); await pending; tree = render();
	assert.deepEqual(states[0], values); assert.equal(button(tree).props.disabled, false);
	assert.ok(find(tree, (node) => node.props.children === "Retry safely."));
	const retry = submit(tree); await new Promise((done) => setImmediate(done)); assert.ok(form(render()));
	resolve({ reference: randomUUID(), status: "pending", date: values.date, time: values.time, guests: 2, timezone: "Europe/Oslo" });
	await retry; tree = render(); assert.equal(find(tree, (node) => node.type === "form"), null);
	assert.ok(find(tree, (node) => node.props.children === "Reservation request saved — pending"));
	assert.ok(find(tree, (node) => typeof node.props.children === "string" && node.props.children.includes("no table is confirmed")));
});
