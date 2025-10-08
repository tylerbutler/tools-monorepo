; Keys
(single_line_key) @variable.other.member
(key_continuation) @variable.other.member
(multiline_key) @variable.other.member

; Assignment operator
(assignment) @operator

; Values
(single_line_value) @string
(value_line) @string

; Content lines (raw text in nested blocks)
(content_line) @text

; Comments - separate marker and text
(comment_marker) @comment.marker
(comment_text) @comment.text

; Indentation tokens (only highlight visible ones)
(indent) @punctuation.indent

; Note: dedent and newline tokens are zero-width/invisible, so no highlighting needed
