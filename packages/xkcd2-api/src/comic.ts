/**
 * Comic model
 *
 * @public
 */
export interface Comic {
	alt?: string;
	day?: number;
	img?: string;
	link?: URL;
	month?: number;
	news?: string;
	num: number;
	safe_title?: string;
	title?: string;
	transcript?: string;
	year?: number;
}

/**
 * @public
 */
export interface ComicFrameProps {
	comic: Comic;
	previousId: string;
	nextId?: string;
}

function getComicUrl(comicId?: string | number) {
	if (comicId === undefined || comicId === "") {
		return "https://xkcd.com/info.0.json";
	}
	return `https://xkcd.com/${comicId}/info.0.json`;
}

/**
 * @param comicId - The ID of the comic to retrieve. If this is not provided, the most recent comic will be returned.
 * @returns The comic metadata.
 *
 * @public
 */
export async function getComicProps(
	comicId?: string | number,
): Promise<ComicFrameProps> {
	const url = getComicUrl(comicId);

	const response = await fetch(url);
	if (response.status !== 200) {
		throw new Error(
			`Status code ${response.status} (${response.statusText}) from ${url}`,
		);
	}
	const comic = (await response.json()) as Comic;
	const previousId = String(comic.num - 1);
	const nextId = String(comic.num + 1);

	// Try to get the next comic's JSON. If it 404s, then there's no next comic
	const nextUrl = getComicUrl(nextId);
	const nextResponse = await fetch(nextUrl, { method: "HEAD" });

	if (nextResponse.status === 404) {
		return { comic, previousId };
	}

	return { comic, previousId, nextId };
}

/**
 * Returns a random comic ID within the bounds of the currently published comics.
 *
 * @public
 */
export async function getRandomComicId(): Promise<number> {
	// Get latest comic to get upper bound
	const { comic } = await getComicProps();
	// I don't think a cryptographically sound RNG is needed for this
	const rv = Math.random();
	const randId = Math.floor(rv * comic.num);
	return randId;
}
