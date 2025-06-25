function getComicUrl(comicId?: string | number) {
	if (comicId === undefined || comicId === "") {
		return "https://xkcd.com/info.0.json";
	}
	return `https://xkcd.com/${comicId}/info.0.json`;
}

/**
 * Comic model representing an XKCD comic with all its metadata.
 *
 * @public
 */
export interface Comic {
	/** The alt text for the comic image */
	alt?: string;
	/** The day of the month the comic was published */
	day?: number;
	/** The URL of the comic image */
	img?: string;
	/** A link related to the comic (if any) */
	link?: URL;
	/** The month the comic was published */
	month?: number;
	/** News or additional information about the comic */
	news?: string;
	/** The comic number/ID (required) */
	num: number;
	/** A URL-safe version of the comic title */
	safe_title?: string;
	/** The title of the comic */
	title?: string;
	/** The transcript text of the comic */
	transcript?: string;
	/** The year the comic was published */
	year?: number;
}

/**
 * Properties for rendering a comic frame with navigation information.
 *
 * @public
 */
export interface ComicFrameProps {
	/** The comic data to display */
	comic: Comic;
	/** The ID of the previous comic for navigation */
	previousId: string;
	/** The ID of the next comic for navigation (if available) */
	nextId?: string;
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
