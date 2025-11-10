import type { Root } from "mdast";
import type { Plugin } from "unified";
interface Options {
    defaultCollectionLevel?: number;
    defaultPageLevel?: number;
    maxLevel?: number;
}
/**
 * Remark plugin to normalize heading levels based on context
 *
 * By default, content collection pages (articles, projects) start at h2
 * since their titles are h1 in the layout. Other pages start at h1.
 *
 * Override behavior via frontmatter:
 *   headingStartLevel: 3  # Force highest heading to be h3
 */
export declare const remarkNormalizeHeadings: Plugin<[Options?], Root>;
export {};
//# sourceMappingURL=index.d.ts.map