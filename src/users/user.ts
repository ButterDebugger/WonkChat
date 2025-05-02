import fetch from "./fetch.ts";
import subscribe from "./subscribe.ts";
import unsubscribe from "./unsubscribe.ts";
import { getUserViews } from "../lib/data.ts";
import type { SessionEnv } from "../auth/session.ts";
import { OpenAPIHono } from "@hono/zod-openapi";

export const router = new OpenAPIHono<SessionEnv>();

router.route("/", fetch);
router.route("/", subscribe);
router.route("/", unsubscribe);

// User subscriptions
const userSubscriptions = new Map<string, Set<string>>();

export async function addSubscriber(username: string, subscriber: string) {
	const subscribers = userSubscriptions.get(username) ?? new Set();
	subscribers.add(subscriber);
	userSubscriptions.set(username, subscribers);
}

export async function removeSubscriber(username: string, subscriber: string) {
	const subscribers = userSubscriptions.get(username) ?? new Set();
	subscribers.delete(subscriber);
	userSubscriptions.set(username, subscribers);
}

export async function getSubscribers(username: string): Promise<string[]> {
	const viewers = (await getUserViews(username)) ?? new Set();
	const subscriptions = userSubscriptions.get(username) ?? new Set();

	return Array.from(new Set([...viewers, ...subscriptions]));
}
