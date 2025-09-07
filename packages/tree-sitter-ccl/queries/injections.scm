; CCL self-injection for nested sections
; This tells tree-sitter to re-parse nested section content as CCL
((nested_content) @injection.content
 (#set! injection.language "ccl"))