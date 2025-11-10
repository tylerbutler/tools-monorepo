/**
 * Footnotes processing utilities for integrating with Littlefoot.js
 * Transforms GFM footnotes to be compatible with Littlefoot's expected format
 */
import type { Root } from "hast";
/**
 * Configuration options for footnote processing
 */
export interface FootnoteOptions {
    /** CSS selector for footnote references (default: 'sup[id^="user-content-fnref-"]') */
    referenceSelector?: string;
    /** CSS selector for footnote definitions (default: 'section[data-footnotes]') */
    definitionSelector?: string;
    /** Whether to activate littlefoot automatically (default: true) */
    activateOnLoad?: boolean;
    /** Littlefoot.js options to pass through */
    littlefootOptions?: {
        allowDuplicates?: boolean;
        allowMultiple?: boolean;
        anchorParentSelector?: string;
        anchorPattern?: RegExp;
        dismissDelay?: number;
        dismissOnUnhover?: boolean;
        footnoteSelector?: string;
        hoverDelay?: number;
        numberResetSelector?: string;
        scope?: string;
        [key: string]: any;
    };
}
/**
 * Transforms GFM footnotes in HAST to be compatible with Littlefoot.js
 * This function modifies the HTML AST to ensure footnotes work with Littlefoot
 *
 * @param tree - HAST tree to transform
 * @param options - Configuration options
 */
export declare function transformFootnotesForLittlefoot(tree: Root, options?: FootnoteOptions): void;
/**
 * Generates the Littlefoot.js initialization script
 *
 * @param options - Configuration options
 * @returns JavaScript code as a string
 */
export declare function generateLittlefootScript(options?: FootnoteOptions): string;
/**
 * Generates the CSS imports needed for Littlefoot.js
 *
 * @returns CSS import statements
 */
export declare function generateLittlefootCSS(): string;
/**
 * Creates a rehype plugin for processing footnotes with Littlefoot.js
 *
 * @param options - Configuration options
 * @returns Rehype plugin function
 */
export declare function rehypeFootnotes(options?: FootnoteOptions): (tree: Root) => void;
//# sourceMappingURL=index.d.ts.map