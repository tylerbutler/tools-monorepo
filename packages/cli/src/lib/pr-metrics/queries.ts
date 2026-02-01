/*!
 * Copyright (c) Tyler Butler. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Query to fetch PR list with basic info and first page of nested resources.
 * We use smaller page sizes to stay under GitHub's 500k node limit.
 * Nested resources are paginated separately if they have more items.
 */
export const PR_LIST_QUERY = `
query($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(first: 25, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        number
        title
        author { login }
        state
        createdAt
        mergedAt
        closedAt
        additions
        deletions
        changedFiles
        baseRefName
        headRefName
        isDraft
        reviews(first: 20) {
          totalCount
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            author { login }
            state
            submittedAt
            body
          }
        }
        comments(first: 20) {
          totalCount
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            author { login }
            createdAt
            body
          }
        }
        reviewThreads(first: 20) {
          totalCount
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            isResolved
            path
            line
            comments(first: 20) {
              totalCount
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                author { login }
                createdAt
                body
                pullRequestReview { id }
              }
            }
          }
        }
      }
    }
  }
}
`;

/**
 * Query to fetch additional reviews for a PR (pagination).
 */
export const PR_REVIEWS_QUERY = `
query($owner: String!, $repo: String!, $prNumber: Int!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $prNumber) {
      reviews(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          author { login }
          state
          submittedAt
          body
        }
      }
    }
  }
}
`;

/**
 * Query to fetch additional PR comments (pagination).
 */
export const PR_COMMENTS_QUERY = `
query($owner: String!, $repo: String!, $prNumber: Int!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $prNumber) {
      comments(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          author { login }
          createdAt
          body
        }
      }
    }
  }
}
`;

/**
 * Query to fetch additional review threads for a PR (pagination).
 */
export const PR_REVIEW_THREADS_QUERY = `
query($owner: String!, $repo: String!, $prNumber: Int!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $prNumber) {
      reviewThreads(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          path
          line
          comments(first: 100) {
            totalCount
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              author { login }
              createdAt
              body
              pullRequestReview { id }
            }
          }
        }
      }
    }
  }
}
`;

/**
 * Query to fetch additional comments for a review thread (pagination).
 */
export const THREAD_COMMENTS_QUERY = `
query($threadId: ID!, $cursor: String) {
  node(id: $threadId) {
    ... on PullRequestReviewThread {
      comments(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          author { login }
          createdAt
          body
          pullRequestReview { id }
        }
      }
    }
  }
}
`;
