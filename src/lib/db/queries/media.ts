import { db } from "../database.ts";

export async function addMediaEntry(
	id: string,
	path: string,
	userId: string,
	mimeType: string,
): Promise<boolean> {
	return await db
		.insertInto("media")
		.values({
			id: id,
			path: path,
			userId: userId,
			mimeType: mimeType,
			alternativeText: null,
		})
		.executeTakeFirst()
		.then((media) => {
			if (!media.numInsertedOrUpdatedRows) return false;

			return true;
		})
		.catch((err) => {
			console.error("Failed to add media entry", err);
			return false;
		});
}

export async function getMediaById(id: string): Promise<{
	path: string;
	userId: string;
	mimeType: string;
	alternativeText: string | null;
} | null> {
	return await db
		.selectFrom("media")
		.where("id", "=", id)
		.select(["path", "userId", "mimeType", "alternativeText"])
		.executeTakeFirst()
		.then((media) => {
			if (!media) return null;

			return media;
		})
		.catch((err) => {
			console.error("Failed to fetch media", err);
			return null;
		});
}
