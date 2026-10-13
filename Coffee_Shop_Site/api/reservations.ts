import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createReservationStore } from "../server/database.js";
import { handleReservationRequest } from "../server/reservations.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	res.setHeader("Cache-Control", "no-store");
	const result = await handleReservationRequest(req, createReservationStore(process.env.DATABASE_URL ?? ""), {
		enabled: process.env.RESERVATIONS_ENABLED === "true",
		origin: process.env.ALLOWED_ORIGIN ?? "",
		hashSecret: process.env.RESERVATION_HASH_SECRET ?? "",
	});
	for (const [key, value] of Object.entries(result.headers ?? {})) res.setHeader(key, value);
	return res.status(result.status).json(result.body);
}
