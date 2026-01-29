/*!
 * Copyright (c) Tyler Butler. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Generate the DuckDB SQL query for contributor metrics report.
 *
 * @param dataDir - Directory containing the JSON Lines data files
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns SQL query string
 */
export function generateReportQuery(
	dataDir: string,
	startDate: string,
	endDate: string,
): string {
	return `
SET VARIABLE start_date = '${startDate}';
SET VARIABLE end_date = '${endDate}';
SET VARIABLE data_dir = '${dataDir}';

CREATE OR REPLACE TEMP TABLE excluded_bots AS
SELECT unnest(['dependabot', 'dependabot[bot]', 'msftbot', 'msftbot[bot]', 'github-actions[bot]']) AS bot;

CREATE OR REPLACE VIEW prs AS SELECT * FROM read_json_auto(getvariable('data_dir') || '/prs.jsonl');
CREATE OR REPLACE VIEW reviews AS SELECT * FROM read_json_auto(getvariable('data_dir') || '/reviews.jsonl');
CREATE OR REPLACE VIEW review_comments AS SELECT * FROM read_json_auto(getvariable('data_dir') || '/review_comments.jsonl');

WITH
prs_opened AS (
    SELECT author, COUNT(*) as prs_opened
    FROM prs
    WHERE created_at >= getvariable('start_date')
      AND created_at < getvariable('end_date')
      AND author NOT IN (SELECT bot FROM excluded_bots)
    GROUP BY author
),
prs_merged AS (
    SELECT
        author,
        COUNT(*) as prs_merged,
        ROUND(AVG(EPOCH(merged_at::TIMESTAMP - created_at::TIMESTAMP) / 3600), 1) as avg_pr_duration_hours
    FROM prs
    WHERE merged_at >= getvariable('start_date')
      AND merged_at < getvariable('end_date')
      AND author NOT IN (SELECT bot FROM excluded_bots)
    GROUP BY author
),
time_to_first_review AS (
    SELECT
        p.author,
        ROUND(AVG(EPOCH(first_review::TIMESTAMP - p.created_at::TIMESTAMP) / 3600), 1) as avg_time_to_first_review_hours
    FROM prs p
    JOIN (
        SELECT pr_number, MIN(submitted_at) as first_review
        FROM reviews r
        JOIN prs p2 ON r.pr_number = p2.number AND r.repo = p2.repo
        WHERE r.author != p2.author
          AND r.author NOT IN (SELECT bot FROM excluded_bots)
        GROUP BY pr_number
    ) fr ON p.number = fr.pr_number
    WHERE p.created_at >= getvariable('start_date')
      AND p.created_at < getvariable('end_date')
      AND p.author NOT IN (SELECT bot FROM excluded_bots)
    GROUP BY p.author
),
reviews_given AS (
    SELECT
        r.author,
        COUNT(DISTINCT r.pr_number) as prs_reviewed,
        COUNT(*) as reviews_given
    FROM reviews r
    JOIN prs p ON r.repo = p.repo AND r.pr_number = p.number
    WHERE r.submitted_at >= getvariable('start_date')
      AND r.submitted_at < getvariable('end_date')
      AND r.author != p.author
      AND r.author NOT IN (SELECT bot FROM excluded_bots)
    GROUP BY r.author
),
comments_given AS (
    SELECT author, COUNT(*) as review_comments_given
    FROM review_comments
    WHERE created_at >= getvariable('start_date')
      AND created_at < getvariable('end_date')
      AND author NOT IN (SELECT bot FROM excluded_bots)
    GROUP BY author
),
all_contributors AS (
    SELECT author FROM prs_opened
    UNION SELECT author FROM prs_merged
    UNION SELECT author FROM reviews_given
    UNION SELECT author FROM comments_given
)
SELECT
    c.author as contributor,
    COALESCE(o.prs_opened, 0) as prs_opened,
    COALESCE(m.prs_merged, 0) as prs_merged,
    COALESCE(rg.prs_reviewed, 0) as prs_reviewed,
    COALESCE(rg.reviews_given, 0) as reviews_given,
    COALESCE(cg.review_comments_given, 0) as review_comments_given,
    m.avg_pr_duration_hours,
    ttfr.avg_time_to_first_review_hours
FROM all_contributors c
LEFT JOIN prs_opened o ON c.author = o.author
LEFT JOIN prs_merged m ON c.author = m.author
LEFT JOIN reviews_given rg ON c.author = rg.author
LEFT JOIN comments_given cg ON c.author = cg.author
LEFT JOIN time_to_first_review ttfr ON c.author = ttfr.author
ORDER BY COALESCE(o.prs_opened, 0) + COALESCE(rg.prs_reviewed, 0) DESC;
`;
}
