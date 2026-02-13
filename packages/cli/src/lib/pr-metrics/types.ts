/*!
 * Copyright (c) Tyler Butler. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Normalized PR record for the prs table.
 */
export interface PRRecord {
	repo: string;
	number: number;
	title: string;
	author: string | null;
	state: "OPEN" | "CLOSED" | "MERGED";
	created_at: string;
	merged_at: string | null;
	closed_at: string | null;
	additions: number;
	deletions: number;
	changed_files: number;
	base_ref: string;
	head_ref: string;
	is_draft: boolean;
}

/**
 * Normalized review record for the reviews table.
 */
export interface ReviewRecord {
	repo: string;
	pr_number: number;
	review_id: string;
	author: string | null;
	state: string;
	submitted_at: string;
	body_length: number;
}

/**
 * Normalized review comment record for the review_comments table.
 * These are comments on code review threads (inline comments).
 */
export interface ReviewCommentRecord {
	repo: string;
	pr_number: number;
	comment_id: string;
	review_id: string | null;
	author: string | null;
	created_at: string;
	body_length: number;
	path: string | null;
	line: number | null;
	is_resolved: boolean;
}

/**
 * Normalized PR comment record for the pr_comments table.
 * These are issue-style comments on the PR (not inline code comments).
 */
export interface PRCommentRecord {
	repo: string;
	pr_number: number;
	comment_id: string;
	author: string | null;
	created_at: string;
	body_length: number;
}

/**
 * Arguments for the collect function.
 */
export interface CollectorArgs {
	repo: string;
	output: string;
	since?: Date | undefined;
}

/**
 * Raw PR data from GitHub GraphQL API (initial fetch).
 */
export interface RawPRNode {
	number: number;
	title: string;
	author: { login: string } | null;
	state: "OPEN" | "CLOSED" | "MERGED";
	createdAt: string;
	mergedAt: string | null;
	closedAt: string | null;
	additions: number;
	deletions: number;
	changedFiles: number;
	baseRefName: string;
	headRefName: string;
	isDraft: boolean;
	reviews: {
		totalCount: number;
		pageInfo: { hasNextPage: boolean; endCursor: string | null };
		nodes: RawReviewNode[];
	};
	comments: {
		totalCount: number;
		pageInfo: { hasNextPage: boolean; endCursor: string | null };
		nodes: RawPRCommentNode[];
	};
	reviewThreads: {
		totalCount: number;
		pageInfo: { hasNextPage: boolean; endCursor: string | null };
		nodes: RawReviewThreadNode[];
	};
}

export interface RawReviewNode {
	id: string;
	author: { login: string } | null;
	state: string;
	submittedAt: string;
	body: string | null;
}

export interface RawPRCommentNode {
	id: string;
	author: { login: string } | null;
	createdAt: string;
	body: string | null;
}

export interface RawReviewThreadNode {
	id: string;
	isResolved: boolean;
	path: string | null;
	line: number | null;
	comments: {
		totalCount: number;
		pageInfo: { hasNextPage: boolean; endCursor: string | null };
		nodes: RawReviewThreadCommentNode[];
	};
}

export interface RawReviewThreadCommentNode {
	id: string;
	author: { login: string } | null;
	createdAt: string;
	body: string | null;
	pullRequestReview: { id: string } | null;
}

/**
 * GraphQL response for PR list query.
 */
export interface PRListResponse {
	data: {
		repository: {
			pullRequests: {
				pageInfo: { hasNextPage: boolean; endCursor: string | null };
				nodes: RawPRNode[];
			};
		};
	};
}

/**
 * GraphQL response for paginated reviews query.
 */
export interface ReviewsResponse {
	data: {
		repository: {
			pullRequest: {
				reviews: {
					pageInfo: { hasNextPage: boolean; endCursor: string | null };
					nodes: RawReviewNode[];
				};
			};
		};
	};
}

/**
 * GraphQL response for paginated PR comments query.
 */
export interface PRCommentsResponse {
	data: {
		repository: {
			pullRequest: {
				comments: {
					pageInfo: { hasNextPage: boolean; endCursor: string | null };
					nodes: RawPRCommentNode[];
				};
			};
		};
	};
}

/**
 * GraphQL response for paginated review threads query.
 */
export interface ReviewThreadsResponse {
	data: {
		repository: {
			pullRequest: {
				reviewThreads: {
					pageInfo: { hasNextPage: boolean; endCursor: string | null };
					nodes: RawReviewThreadNode[];
				};
			};
		};
	};
}

/**
 * GraphQL response for paginated thread comments query.
 */
export interface ThreadCommentsResponse {
	data: {
		node: {
			comments: {
				pageInfo: { hasNextPage: boolean; endCursor: string | null };
				nodes: RawReviewThreadCommentNode[];
			};
		};
	};
}

/**
 * Logger interface for collection progress output.
 */
export interface CollectorLogger {
	info: (message: string) => void;
	verbose: (message: string) => void;
	log: (message: string) => void;
}
