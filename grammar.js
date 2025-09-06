/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'ccl',

  externals: $ => [
    $.newline,
    $.indent,
    $.dedent
  ],

  conflicts: $ => [
    [$.nested_section, $.multiline_value],
    [$.nested_content, $.multiline_value],
    [$.comment]
  ],

  extras: $ => [
    /[ \t]/,  // Allow spaces and tabs as extras, but not newlines
  ],

  rules: {
    document: $ => repeat($._item),

    _item: $ => choice(
      prec(2, $.comment),      // High precedence for comments
      prec(1, $.entry),
      $.newline
    ),

    entry: $ => choice(
      // key = value (single line)
      seq(
        $.single_line_key,
        $.assignment,
        $._value
      ),
      // multiline_key = value
      seq(
        $.multiline_key,
        $.assignment,
        $.single_line_value
      ),
      // = value (list syntax)
      seq(
        $.assignment,
        $.single_line_value
      )
    ),

    single_line_key: $ => /[^\s=\n\/][^\n\r=]*/,

    multiline_key: $ => seq(
      $.single_line_key,
      $.newline,
      $.key_continuation
    ),

    key_continuation: $ => /[^\n\r=]+/,

    assignment: $ => '=',

    _value: $ => choice(
      // Single line value (unambiguous)
      $.single_line_value,
      // Nested section with recursive CCL parsing - prefer when content has '='
      prec.dynamic(2, $.nested_section),
      // Multiline value with plain text - fallback
      prec.dynamic(1, $.multiline_value)
    ),

    single_line_value: $ => /[^\n\r]*/,

    // Nested section with content for later injection
    nested_section: $ => seq(
      $.newline,
      $.indent,
      $.nested_content,
      $.dedent
    ),

    // Raw content that can be injected as CCL
    nested_content: $ => repeat1(choice(
      $.content_line,
      $.newline
    )),
    
    content_line: $ => /[^\n\r]*/,


    // Multiline value with plain text lines
    multiline_value: $ => seq(
      $.newline,
      $.indent,
      repeat($.content_line),
      $.dedent
    ),

    comment: $ => choice(
      // Multiline comment with indented continuation - only when indent follows immediately
      prec.dynamic(2, seq(
        alias('/=', $.comment_marker),
        alias(/[^\r\n]*/, $.comment_text),
        $.multiline_comment_content
      )),
      // Single line comment - default case
      seq(
        alias('/=', $.comment_marker),
        alias(/[^\r\n]*/, $.comment_text)
      )
    ),

    multiline_comment_content: $ => seq(
      $.newline,
      $.indent,
      repeat1($.comment_content_line),
      $.dedent
    ),

    comment_content_line: $ => seq(
      alias(/[^\n\r]*/, $.comment_text),
      $.newline
    ),
  }
});