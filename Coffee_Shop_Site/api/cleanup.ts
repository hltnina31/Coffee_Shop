import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { deleteExpiredRequests } from "../server/database.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	res.setHeader("Cache-Control", "no-store");
	if (req.method !== "GET") return res.status(405).setHeader("Allow", "GET").json({ error: "Only GET is supported." });
	const secret = process.env.CRON_SECRET;
	const expected = `Bearer ${secret}`;
	const supplied = req.headers.authorization;
	if (!secret || secret.length < 32 || typeof supplied !== "string" || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
		return res.status(401).json({ error: "Unauthorized." });
	}
	try {
		const deleted = await deleteExpiredRequests(process.env.DATABASE_URL ?? "");
		return res.status(200).json({ deleted });
	} catch {
		return res.status(503).json({ error: "Cleanup could not be completed." });
	}
}
