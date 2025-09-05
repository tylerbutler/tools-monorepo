; Keys
(single_line_key) @variable.other.member
(key_continuation) @variable.other.member

; Assignment operator
(assignment) @operator

; Values
(single_line_value) @string
(value_line) @string

; Comments
(comment
  marker: "/=" @comment.line
  text: (comment_text)? @comment.line)

; Nested structure indentation
(multiline_value
  indent: _ @punctuation.indent)

(nested_section
  indent: _ @punctuation.indent)

; Special highlighting for empty keys (lists)
(entry
  assignment: (assignment) @operator
  value: (single_line_value) @string.unquoted
  (#match? @string.unquoted "^\\s*$")
  (#set! "priority" 105))

; String content in multiline values
(multiline_value
  (value_line) @string.unquoted)

; Nested section entries
(nested_section
  (entry) @meta.embedded)