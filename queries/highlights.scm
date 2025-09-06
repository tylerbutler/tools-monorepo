; Keys
(single_line_key) @variable.other.member
(key_continuation) @variable.other.member

; Assignment operator
(assignment) @operator

; Values
(single_line_value) @string

; Value lines - try to detect CCL patterns within them
(value_line) @string

; Detect CCL patterns within value_line content
; This is a more advanced approach that would require custom highlighting logic
; For now, keeping value_line as @string

; Comments
(comment) @comment.line

; Indentation
(indent) @punctuation.indent