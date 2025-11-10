import type { Root } from "mdast";
import type { Plugin } from "unified";
interface LazyLinksOptions {
    /**
     * Whether to persist the transformed links back to source files.
     *
     * When false (default): Transformation happens in-memory only during build.
     * Source files remain unchanged with [*] markers.
     *
     * When true: Source files are permanently modified, replacing [*] with
     * numbered links. Useful if you want the transformed format to be the
     * canonical version or need to use files outside of Astro.
     *
     * @default false
     */
    persist?: boolean;
}
/**
 * Remark plugin to transform lazy markdown links [*] into numbered references.
 *
 * Inspired by Brett Terpstra's lazy markdown reference links:
 * http://brettterpstra.com/2013/10/19/lazy-markdown-reference-links/
 *
 * Transforms:
 *   [link text][*]  and  [*]: http://url
 * Into:
 *   [link text][1]  and  [1]: http://url
 *
 * Features:
 * - Preserves existing numbered links
 * - Handles multiple overlapping lazy links
 * - Configurable persistence (in-memory or write back to source)
 *
 * @example
 * // In-memory transformation only (default)
 * remarkPlugins: [remarkLazyLinks]
 *
 * @example
 * // Persist changes back to source files
 * remarkPlugins: [[remarkLazyLinks, { persist: true }]]
 */
export declare const remarkLazyLinks: Plugin<[LazyLinksOptions?], Root>;
export {};
//# sourceMappingURL=index.d.ts.map