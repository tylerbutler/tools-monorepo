/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'ccl',

  extras: $ => [
    /[ \t]/, // Only horizontal whitespace as extras
  ],

  rules: {
    document: $ => repeat($._item),

    _item: $ => choice(
      $.entry,
      $.comment,
      $._newline
    ),

    entry: $ => prec.left(seq(
      optional($.key),
      $.assignment,
      optional($.value)
    )),

    key: $ => /[^\s=\n\/][^\s=\n\/]*/,

    assignment: $ => '=',

    value: $ => choice(
      $.inline_value,
      $.block_value
    ),

    inline_value: $ => token(prec(-1, /[^\n\r]+/)),

    block_value: $ => seq(
      $._newline,
      repeat1(seq(
        /[ \t]+/,
        /[^\n\r]*/,
        optional($._newline)
      ))
    ),

    comment: $ => seq(
      '/=',
      /[^\n\r]*/
    ),

    _newline: $ => /\r?\n/,
  }
});