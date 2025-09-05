; Keys
(single_line_key) @variable.other.member
(key_continuation) @variable.other.member

; Assignment operator
(assignment) @operator

; Values
(single_line_value) @string
(content_line) @string

; Comments
(comment
  (marker) @comment.line
  (comment_text)? @comment.line)

; Indentation
(indent) @punctuation.indent