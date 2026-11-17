/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
	name: "ccl",

	externals: ($) => [
		$.newline,
		$.indent,
		$.dedent,
		$._entry_start,
		$._error_sentinel,
	],

	conflicts: ($) => [[$.entry], [$.comment], [$._value]],

	extras: () => [/[ \t]/],

	rules: {
		document: ($) => repeat(choice($.entry, $.comment, $.newline)),

		// Entry boundaries come from the scanner, so indentation cannot be
		// discarded as whitespace to reinterpret a nested line as a root entry.
		entry: ($) =>
			seq($._entry_start, optional($.key), $.assignment, optional($._value)),

		key: ($) => choice($.single_line_key, $.multiline_key),

		single_line_key: () => /[^\s=][^\n\r=]*/,

		multiline_key: ($) =>
			seq(
				$.single_line_key,
				repeat1(seq($.newline, optional($.key_continuation))),
			),

		key_continuation: () => /[^\n\r=]+/,

		assignment: () => "=",

		_value: ($) =>
			choice(
				seq(
					$.single_line_value,
					optional(seq($.newline, $.nested_content_block)),
				),
				seq($.newline, $.nested_content_block),
			),

		single_line_value: () => token.immediate(/[^\n\r]+/),

		// Values remain raw text. Injection queries parse their nested CCL.
		nested_content_block: ($) =>
			seq($.indent, repeat(choice($.content_line, $.newline)), $.dedent),

		content_line: () => /[^\n\r]+/,

		comment: ($) =>
			seq(
				$._entry_start,
				alias(token(/\/[ \t]*=/), $.comment_marker),
				alias(/[^\r\n]*/, $.comment_text),
				optional($.multiline_comment_content),
			),

		multiline_comment_content: ($) =>
			seq(
				$.newline,
				$.indent,
				repeat(choice($.comment_content_line, $.newline)),
				$.dedent,
			),

		comment_content_line: ($) =>
			prec.right(seq(alias(/[^\n\r]+/, $.comment_text), optional($.newline))),
	},
});
