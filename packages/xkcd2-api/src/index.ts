/**
 * TypeScript APIs for interacting with XKCD comics and implementing xkcd2.com functionality.
 *
 * @remarks
 * This package provides types and functions for fetching XKCD comic data from the official API
 * and includes utilities for building comic viewing applications.
 *
 * @packageDocumentation
 */

export {
	type Comic,
	type ComicFrameProps,
	getComicProps,
	getRandomComicId,
} from "./comic.js";
