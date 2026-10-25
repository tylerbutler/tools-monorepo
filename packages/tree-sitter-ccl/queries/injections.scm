; CCL Injection System
; ====================
; Re-parse nested_content_block nodes as CCL in a second pass
; This solves the ambiguity problem between structured content and plain text
;
; How it works:
; 1. First pass: Grammar captures nested content as raw text (content_line nodes)
; 2. Second pass: This injection re-parses the content as full CCL
; 3. Result: Can contain entries, comments, plain text - no ambiguity
;
; See ARCHITECTURE.md for detailed explanation of why injection is necessary

((nested_content_block) @injection.content
  (#set! injection.language "ccl")
  (#set! injection.include-children))
