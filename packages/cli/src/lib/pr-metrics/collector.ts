/*!
 * Copyright (c) Tyler Butler. All rights reserved.
 * Licensed under the MIT License.
 */

import { execFileSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "pathe";

import {
	PR_COMMENTS_QUERY,
	PR_LIST_QUERY,
	PR_REVIEW_THREADS_QUERY,
	PR_REVIEWS_QUERY,
	THREAD_COMMENTS_QUERY,
} from "./queries.js";
import type {
	CollectorArgs,
	CollectorLogger,
	PRCommentsResponse,
	PRListResponse,
	RawPRCommentNode,
	RawReviewNode,
	RawReviewThreadCommentNode,
	RawReviewThreadNode,
	ReviewsResponse,
	ReviewThreadsResponse,
	ThreadCommentsResponse,
} from "./types.js";

/**
 * Execute a GraphQL query via the gh CLI.
 */
function executeGraphQL<T>(
	query: string,
	variables: Record<string, unknown>,
): T {
	const ghArgs = ["api", "graphql", "-f", `query=${query}`];

	for (const [key, value] of Object.entries(variables)) {
		if (value !== null && value !== undefined) {
			// Use -F for typed values (numbers, booleans), -f for strings
			const flag = typeof value === "string" ? "-f" : "-F";
			ghArgs.push(flag, `${key}=${value}`);
		}
	}

	const result = execFileSync("gh", ghArgs, {
		encoding: "utf-8",
		maxBuffer: 100 * 1024 * 1024, // 100MB buffer
	});

	return JSON.parse(result);
}

/**
 * Fetch all reviews for a PR, handling pagination.
 */
function fetchAllReviews(
	owner: string,
	repo: string,
	prNumber: number,
	initialReviews: RawReviewNode[],
	initialHasMore: boolean,
	initialCursor: string | null,
): RawReviewNode[] {
	const reviews = [...initialReviews];
	let hasMore = initialHasMore;
	let cursor = initialCursor;

	while (hasMore && cursor) {
		const response = executeGraphQL<ReviewsResponse>(PR_REVIEWS_QUERY, {
			owner,
			repo,
			prNumber,
			cursor,
		});

		const { pageInfo, nodes } = response.data.repository.pullRequest.reviews;
		reviews.push(...nodes);
		hasMore = pageInfo.hasNextPage;
		cursor = pageInfo.endCursor;
	}

	return reviews;
}

/**
 * Fetch all PR comments (issue-style), handling pagination.
 */
function fetchAllPRComments(
	owner: string,
	repo: string,
	prNumber: number,
	initialComments: RawPRCommentNode[],
	initialHasMore: boolean,
	initialCursor: string | null,
): RawPRCommentNode[] {
	const comments = [...initialComments];
	let hasMore = initialHasMore;
	let cursor = initialCursor;

	while (hasMore && cursor) {
		const response = executeGraphQL<PRCommentsResponse>(PR_COMMENTS_QUERY, {
			owner,
			repo,
			prNumber,
			cursor,
		});

		const { pageInfo, nodes } = response.data.repository.pullRequest.comments;
		comments.push(...nodes);
		hasMore = pageInfo.hasNextPage;
		cursor = pageInfo.endCursor;
	}

	return comments;
}

/**
 * Fetch all comments for a review thread, handling pagination.
 */
function fetchAllThreadComments(
	threadId: string,
	initialComments: RawReviewThreadCommentNode[],
	initialHasMore: boolean,
	initialCursor: string | null,
): RawReviewThreadCommentNode[] {
	const comments = [...initialComments];
	let hasMore = initialHasMore;
	let cursor = initialCursor;

	while (hasMore && cursor) {
		const response = executeGraphQL<ThreadCommentsResponse>(
			THREAD_COMMENTS_QUERY,
			{
				threadId,
				cursor,
			},
		);

		const { pageInfo, nodes } = response.data.node.comments;
		comments.push(...nodes);
		hasMore = pageInfo.hasNextPage;
		cursor = pageInfo.endCursor;
	}

	return comments;
}

/**
 * Fetch all review threads for a PR, handling pagination for both threads and their comments.
 */
function fetchAllReviewThreads(
	owner: string,
	repo: string,
	prNumber: number,
	initialThreads: RawReviewThreadNode[],
	initialHasMore: boolean,
	initialCursor: string | null,
): RawReviewThreadNode[] {
	const threads = [...initialThreads];
	let hasMore = initialHasMore;
	let cursor = initialCursor;

	// Paginate threads if needed
	while (hasMore && cursor) {
		const response = executeGraphQL<ReviewThreadsResponse>(
			PR_REVIEW_THREADS_QUERY,
			{
				owner,
				repo,
				prNumber,
				cursor,
			},
		);

		const { pageInfo, nodes } =
			response.data.repository.pullRequest.reviewThreads;
		threads.push(...nodes);
		hasMore = pageInfo.hasNextPage;
		cursor = pageInfo.endCursor;
	}

	// Paginate comments within each thread if needed
	for (const thread of threads) {
		if (thread.comments.pageInfo.hasNextPage) {
			thread.comments.nodes = fetchAllThreadComments(
				thread.id,
				thread.comments.nodes,
				thread.comments.pageInfo.hasNextPage,
				thread.comments.pageInfo.endCursor,
			);
		}
	}

	return threads;
}

/**
 * JSON Lines writer for streaming output.
 */
class JsonLinesWriter {
	private stream: ReturnType<typeof createWriteStream>;
	private count = 0;

	public constructor(filePath: string) {
		const dir = dirname(filePath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		this.stream = createWriteStream(filePath);
	}

	public write(record: Record<string, unknown>): void {
		this.stream.write(`${JSON.stringify(record)}\n`);
		this.count++;
	}

	public close(): Promise<number> {
		return new Promise((resolve) => {
			this.stream.end(() => resolve(this.count));
		});
	}
}

/**
 * Result of a collection operation.
 */
export interface CollectResult {
	prsCount: number;
	reviewsCount: number;
	reviewCommentsCount: number;
	prCommentsCount: number;
	outputDir: string;
}

/**
 * Writers context for writing PR data.
 */
interface Writers {
	prsWriter: JsonLinesWriter;
	reviewsWriter: JsonLinesWriter;
	reviewCommentsWriter: JsonLinesWriter;
	prCommentsWriter: JsonLinesWriter;
}

/**
 * Write reviews to the reviews.jsonl file.
 */
function writeReviews(
	reviews: RawReviewNode[],
	repoKey: string,
	prNumber: number,
	writer: JsonLinesWriter,
): void {
	for (const review of reviews) {
		writer.write({
			repo: repoKey,
			pr_number: prNumber,
			review_id: review.id,
			author: review.author?.login ?? null,
			state: review.state,
			submitted_at: review.submittedAt,
			body_length: review.body?.length ?? 0,
		});
	}
}

/**
 * Write PR comments to the pr_comments.jsonl file.
 */
function writePRComments(
	comments: RawPRCommentNode[],
	repoKey: string,
	prNumber: number,
	writer: JsonLinesWriter,
): void {
	for (const comment of comments) {
		writer.write({
			repo: repoKey,
			pr_number: prNumber,
			comment_id: comment.id,
			author: comment.author?.login ?? null,
			created_at: comment.createdAt,
			body_length: comment.body?.length ?? 0,
		});
	}
}

/**
 * Write review thread comments to the review_comments.jsonl file.
 */
function writeReviewComments(
	threads: RawReviewThreadNode[],
	repoKey: string,
	prNumber: number,
	writer: JsonLinesWriter,
): void {
	for (const thread of threads) {
		for (const comment of thread.comments.nodes) {
			writer.write({
				repo: repoKey,
				pr_number: prNumber,
				comment_id: comment.id,
				review_id: comment.pullRequestReview?.id ?? null,
				author: comment.author?.login ?? null,
				created_at: comment.createdAt,
				body_length: comment.body?.length ?? 0,
				path: thread.path,
				line: thread.line,
				is_resolved: thread.isResolved,
			});
		}
	}
}

/**
 * Process a single PR and write all associated data.
 */
function processPR(
	pr: import("./types.js").RawPRNode,
	owner: string,
	repo: string,
	repoKey: string,
	writers: Writers,
): void {
	// Fetch all nested resources with pagination
	const reviews = fetchAllReviews(
		owner,
		repo,
		pr.number,
		pr.reviews.nodes,
		pr.reviews.pageInfo.hasNextPage,
		pr.reviews.pageInfo.endCursor,
	);

	const prComments = fetchAllPRComments(
		owner,
		repo,
		pr.number,
		pr.comments.nodes,
		pr.comments.pageInfo.hasNextPage,
		pr.comments.pageInfo.endCursor,
	);

	const reviewThreads = fetchAllReviewThreads(
		owner,
		repo,
		pr.number,
		pr.reviewThreads.nodes,
		pr.reviewThreads.pageInfo.hasNextPage,
		pr.reviewThreads.pageInfo.endCursor,
	);

	// Write PR record
	writers.prsWriter.write({
		repo: repoKey,
		number: pr.number,
		title: pr.title,
		author: pr.author?.login ?? null,
		state: pr.state,
		created_at: pr.createdAt,
		merged_at: pr.mergedAt,
		closed_at: pr.closedAt,
		additions: pr.additions,
		deletions: pr.deletions,
		changed_files: pr.changedFiles,
		base_ref: pr.baseRefName,
		head_ref: pr.headRefName,
		is_draft: pr.isDraft,
	});

	// Write related records
	writeReviews(reviews, repoKey, pr.number, writers.reviewsWriter);
	writePRComments(prComments, repoKey, pr.number, writers.prCommentsWriter);
	writeReviewComments(
		reviewThreads,
		repoKey,
		pr.number,
		writers.reviewCommentsWriter,
	);
}

/**
 * Check if a PR is within the date range.
 */
function isPRWithinDateRange(
	prCreatedAt: string,
	since: Date | undefined,
): boolean {
	if (!since) {
		return true;
	}
	const createdAt = new Date(prCreatedAt);
	return createdAt >= since;
}

/**
 * Collect all PR data from GitHub and write to JSON Lines files.
 */
export async function collect(
	args: CollectorArgs,
	logger: CollectorLogger,
): Promise<CollectResult> {
	const [owner, repo] = args.repo.split("/");
	if (!owner || repo === undefined) {
		throw new Error("Invalid repo format. Expected: owner/repo");
	}

	const repoKey = `${owner}/${repo}`;
	logger.info(`Collecting PR data for ${repoKey}...`);

	// Ensure output directory exists
	if (!existsSync(args.output)) {
		mkdirSync(args.output, { recursive: true });
	}

	// Create writers for each table
	const writers: Writers = {
		prsWriter: new JsonLinesWriter(join(args.output, "prs.jsonl")),
		reviewsWriter: new JsonLinesWriter(join(args.output, "reviews.jsonl")),
		reviewCommentsWriter: new JsonLinesWriter(
			join(args.output, "review_comments.jsonl"),
		),
		prCommentsWriter: new JsonLinesWriter(
			join(args.output, "pr_comments.jsonl"),
		),
	};

	// Fetch PRs with pagination
	let prCursor: string | null = null;
	let hasNextPage = true;
	let totalPRs = 0;

	while (hasNextPage) {
		logger.verbose(`Fetching PRs... (${totalPRs} so far)`);

		const response: PRListResponse = executeGraphQL<PRListResponse>(
			PR_LIST_QUERY,
			{ owner, repo, cursor: prCursor },
		);

		const pullRequests = response.data.repository.pullRequests;
		const { pageInfo, nodes } = pullRequests;

		for (const pr of nodes) {
			// Check if we should stop based on --since
			if (!isPRWithinDateRange(pr.createdAt, args.since)) {
				// Stop fetching - we've gone past the since date
				hasNextPage = false;
				break;
			}

			processPR(pr, owner, repo, repoKey, writers);
			totalPRs++;
		}

		hasNextPage = hasNextPage && pageInfo.hasNextPage;
		prCursor = pageInfo.endCursor;
	}

	// Close all writers and get counts
	const [prsCount, reviewsCount, reviewCommentsCount, prCommentsCount] =
		await Promise.all([
			writers.prsWriter.close(),
			writers.reviewsWriter.close(),
			writers.reviewCommentsWriter.close(),
			writers.prCommentsWriter.close(),
		]);

	return {
		prsCount,
		reviewsCount,
		reviewCommentsCount,
		prCommentsCount,
		outputDir: args.output,
	};
}
