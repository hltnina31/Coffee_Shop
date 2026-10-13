import test from "node:test";
import assert from "node:assert/strict";
import { latestDate, localDate, osloClock, parseDate, timeSlots, validateReservation } from "../shared/reservation.ts";

const now = new Date("2026-10-06T08:15:00Z");
const values = { name: "Example Visitor", email: "visitor@example.com", guests: "2", date: "2026-10-06", time: "10:30" };
test("valid request and all required fields", () => {
	assert.deepEqual(validateReservation(values, now), {});
	assert.deepEqual(Object.keys(validateReservation({ name: "", email: "", guests: "", date: "", time: "" }, now)), ["name", "email", "guests", "date", "time"]);
});
test("contact length, whitespace and control character validation", () => {
	assert.deepEqual(validateReservation({ ...values, name: " Visitor ", email: " visitor@example.com " }, now), {});
	for (const name of [" ", "x".repeat(101), "Name\u0000"]) assert.ok(validateReservation({ ...values, name }, now).name);
	for (const email of ["bad", "a@b", "a b@example.com", "a\u0000@example.com", "a".repeat(255) + "@example.com"]) assert.ok(validateReservation({ ...values, email }, now).email);
});
test("guest boundaries, malformed calendar dates and leap days", () => {
	for (const guests of ["0", "9", "1.5", "abc"]) assert.ok(validateReservation({ ...values, guests }, now).guests);
	for (const guests of ["1", "8"]) assert.deepEqual(validateReservation({ ...values, guests }, now), {});
	for (const date of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "0000-01-01", "2026-2-01"]) assert.equal(parseDate(date), null);
	assert.ok(parseDate("2028-02-29"));
});
test("past dates and 90-day horizon", () => {
	assert.ok(validateReservation({ ...values, date: "2026-10-05" }, now).date);
	assert.equal(latestDate(now), "2027-01-04");
	assert.deepEqual(validateReservation({ ...values, date: "2027-01-04" }, now), {});
	assert.ok(validateReservation({ ...values, date: "2027-01-05" }, now).date);
});
test("weekday/weekend opening and closing boundaries", () => {
	const weekday = timeSlots("2026-10-07", now), weekend = timeSlots("2026-10-10", now);
	assert.equal(weekday.length, 18); assert.equal(weekday[0].value, "10:00"); assert.equal(weekday.at(-1)?.value, "18:30");
	assert.equal(weekend.length, 12); assert.equal(weekend[0].value, "12:00"); assert.equal(weekend.at(-1)?.value, "17:30");
	for (const time of ["09:30", "10:15", "19:00", "02:30"]) assert.ok(validateReservation({ ...values, time }, now).time);
	assert.ok(validateReservation({ ...values, date: "2026-10-10", time: "18:00" }, now).time);
});
test("a slot is rejected at its start and after it passes", () => {
	assert.ok(timeSlots(values.date, now)[0].disabled);
	assert.deepEqual(validateReservation(values, new Date("2026-10-06T08:29:59Z")), {});
	assert.ok(validateReservation(values, new Date("2026-10-06T08:30:00Z")).time);
	assert.ok(timeSlots(values.date, new Date("2026-10-06T17:00:00Z")).every((slot) => slot.disabled));
});
test("Oslo midnight is independent of device timezone", () => {
	const previous = process.env.TZ;
	try {
		for (const zone of ["America/Los_Angeles", "Asia/Tokyo", "UTC"]) {
			process.env.TZ = zone;
			assert.equal(localDate(new Date("2026-10-06T22:00:00Z")), "2026-10-07");
			assert.equal(localDate(new Date("2026-10-06T21:59:59Z")), "2026-10-06");
			assert.equal(timeSlots("2026-10-10", now)[0].value, "12:00");
		}
	} finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
test("Oslo daylight-saving transitions and daytime slots", () => {
	assert.deepEqual(osloClock(new Date("2026-03-29T00:59:59Z")), { date: "2026-03-29", time: "01:59:59" });
	assert.deepEqual(osloClock(new Date("2026-03-29T01:00:00Z")), { date: "2026-03-29", time: "03:00:00" });
	assert.deepEqual(osloClock(new Date("2026-10-25T00:59:59Z")), { date: "2026-10-25", time: "02:59:59" });
	assert.deepEqual(osloClock(new Date("2026-10-25T01:00:00Z")), { date: "2026-10-25", time: "02:00:00" });
	assert.ok(timeSlots("2026-03-29", new Date("2026-03-28T12:00:00Z")).every((slot) => Number(slot.value.slice(0, 2)) >= 12));
});
