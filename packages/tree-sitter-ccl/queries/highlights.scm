; Keys
(single_line_key) @variable.other.member
(key_continuation) @variable.other.member
(multiline_key) @variable.other.member

; Assignment operator
(assignment) @operator

; Values
(single_line_value) @string

; Content lines - raw content that can be injected as CCL
(content_line) @string

; Note: With injection support, content_line will be re-parsed as structured CCL
; providing proper syntax highlighting within nested sections

; Comments - separate marker and text
(comment_marker) @comment.marker
(comment_text) @comment.text

; Indentation tokens (only highlight visible ones)
(indent) @punctuation.indent

; Note: dedent and newline tokens are zero-width/invisible, so no highlighting needed