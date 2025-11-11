/**
 * Footnotes processing utilities for integrating with Littlefoot.js
 * Transforms GFM footnotes to be compatible with Littlefoot's expected format
 */
import { visit } from "unist-util-visit";
/**
 * Default options for footnote processing
 */
const defaultOptions = {
    referenceSelector: 'sup[id^="user-content-fnref-"]',
    definitionSelector: "section[data-footnotes]",
    activateOnLoad: true,
    littlefootOptions: {
        allowDuplicates: false,
        allowMultiple: false,
        dismissDelay: 100,
        dismissOnUnhover: true,
        hoverDelay: 250,
        scope: "body",
    },
};
/**
 * Transforms GFM footnotes in HAST to be compatible with Littlefoot.js
 * This function modifies the HTML AST to ensure footnotes work with Littlefoot
 *
 * @param tree - HAST tree to transform
 * @param options - Configuration options
 */
export function transformFootnotesForLittlefoot(tree, options = {}) {
    const _opts = { ...defaultOptions, ...options };
    // Track footnote references and definitions
    const footnoteMap = new Map();
    // First pass: find all footnote references
    visit(tree, "element", (node) => {
        // Look for sup elements containing links with footnote references
        if (node.tagName === "sup" &&
            node.children[0] &&
            node.children[0].type === "element" &&
            node.children[0].tagName === "a") {
            const linkElement = node.children[0];
            // Check if this is a footnote reference link
            if (linkElement.properties?.["id"] &&
                typeof linkElement.properties["id"] === "string" &&
                linkElement.properties["id"].startsWith("user-content-fnref-")) {
                const footnoteId = linkElement.properties["id"].replace("user-content-fnref-", "");
                // Add rel="footnote" for Littlefoot recognition
                // Use kebab-case for standard HTML attributes
                linkElement.properties["rel"] = "footnote";
                linkElement.properties["data-footnote-id"] = footnoteId;
                // Store for mapping with definition
                if (footnoteMap.has(footnoteId)) {
                    // biome-ignore lint/style/noNonNullAssertion: Map.has() guarantees entry exists
                    footnoteMap.get(footnoteId).ref = node;
                }
                else {
                    // biome-ignore lint/suspicious/noExplicitAny: Placeholder for paired definition element
                    footnoteMap.set(footnoteId, { ref: node, def: null });
                }
            }
        }
    });
    // Second pass: find footnote definitions and transform them
    visit(tree, "element", (node) => {
        // Match section with dataFootnotes property (camelCase in HAST)
        if (node.tagName === "section" &&
            node.properties?.["dataFootnotes"] !== undefined) {
            // Find all footnote list items within this section
            visit(node, "element", (listItem) => {
                if (listItem.tagName === "li" &&
                    listItem.properties?.["id"] &&
                    typeof listItem.properties["id"] === "string" &&
                    listItem.properties["id"].startsWith("user-content-fn-")) {
                    const footnoteId = listItem.properties["id"].replace("user-content-fn-", "");
                    // Transform for Littlefoot compatibility
                    listItem.properties["id"] = `fn:${footnoteId}`;
                    listItem.properties["data-footnote-id"] = footnoteId;
                    // Remove the back-reference link (↩) as Littlefoot handles this
                    // Match dataFootnoteBackref property (camelCase in HAST)
                    visit(listItem, "element", (backRef, index, parent) => {
                        if (backRef.tagName === "a" &&
                            backRef.properties?.["dataFootnoteBackref"] !== undefined &&
                            parent &&
                            typeof index === "number") {
                            parent.children.splice(index, 1);
                        }
                    });
                    // Store for mapping
                    if (footnoteMap.has(footnoteId)) {
                        // biome-ignore lint/style/noNonNullAssertion: Map.has() guarantees entry exists
                        footnoteMap.get(footnoteId).def = listItem;
                    }
                    else {
                        // biome-ignore lint/suspicious/noExplicitAny: Placeholder for paired reference element
                        footnoteMap.set(footnoteId, { ref: null, def: listItem });
                    }
                }
            });
        }
    });
}
/**
 * Generates the Littlefoot.js initialization script
 *
 * @param options - Configuration options
 * @returns JavaScript code as a string
 */
export function generateLittlefootScript(options = {}) {
    const opts = {
        ...defaultOptions,
        ...options,
        littlefootOptions: {
            ...defaultOptions.littlefootOptions,
            ...(options.littlefootOptions || {}),
        },
    };
    const littlefootConfig = JSON.stringify(opts.littlefootOptions, null, 2);
    return `
// Initialize Littlefoot.js for interactive footnotes
import { littlefoot } from 'littlefoot';

function initializeLittlefoot() {
  littlefoot(${littlefootConfig});
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLittlefoot);
} else {
  initializeLittlefoot();
}
`.trim();
}
/**
 * Generates the CSS imports needed for Littlefoot.js
 *
 * @returns CSS import statements
 */
export function generateLittlefootCSS() {
    return `
/* Littlefoot.js CSS for interactive footnotes */
import 'littlefoot/dist/littlefoot.css';

/* Optional: Custom footnote styling */
.littlefoot-footnote__wrapper {
  max-width: 400px;
}

.littlefoot-footnote__content {
  font-size: 0.9em;
  line-height: 1.4;
}

/* Style footnote references */
a[rel="footnote"] {
  text-decoration: none;
  color: #0066cc;
  font-weight: 500;
}

a[rel="footnote"]:hover {
  text-decoration: underline;
}
`.trim();
}
/**
 * Creates a rehype plugin for processing footnotes with Littlefoot.js
 *
 * @param options - Configuration options
 * @returns Rehype plugin function
 */
export function rehypeFootnotes(options = {}) {
    return (tree) => {
        transformFootnotesForLittlefoot(tree, options);
    };
}
//# sourceMappingURL=index.js.map