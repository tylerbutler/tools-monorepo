#include <tree_sitter/parser.h>

#if defined(__GNUC__) || defined(__clang__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wmissing-field-initializers"
#endif

#define LANGUAGE_VERSION 14
#define STATE_COUNT 21
#define LARGE_STATE_COUNT 2
#define SYMBOL_COUNT 19
#define ALIAS_COUNT 0
#define TOKEN_COUNT 8
#define EXTERNAL_TOKEN_COUNT 0
#define FIELD_COUNT 0
#define MAX_ALIAS_SEQUENCE_LENGTH 3
#define PRODUCTION_ID_COUNT 1

enum {
  sym_single_line_key = 1,
  sym_key_continuation = 2,
  sym_assignment = 3,
  aux_sym_single_line_value_token1 = 4,
  sym_indent = 5,
  sym_marker = 6,
  aux_sym_comment_text_token1 = 7,
  sym_document = 8,
  sym__item = 9,
  sym_entry = 10,
  sym_multiline_key = 11,
  sym_single_line_value = 12,
  sym_multiline_value = 13,
  sym_value_line = 14,
  sym_comment = 15,
  sym_comment_text = 16,
  aux_sym_document_repeat1 = 17,
  aux_sym_multiline_value_repeat1 = 18,
};

static const char * const ts_symbol_names[] = {
  [ts_builtin_sym_end] = "end",
  [sym_single_line_key] = "single_line_key",
  [sym_key_continuation] = "key_continuation",
  [sym_assignment] = "assignment",
  [aux_sym_single_line_value_token1] = "single_line_value_token1",
  [sym_indent] = "indent",
  [sym_marker] = "marker",
  [aux_sym_comment_text_token1] = "comment_text_token1",
  [sym_document] = "document",
  [sym__item] = "_item",
  [sym_entry] = "entry",
  [sym_multiline_key] = "multiline_key",
  [sym_single_line_value] = "single_line_value",
  [sym_multiline_value] = "multiline_value",
  [sym_value_line] = "value_line",
  [sym_comment] = "comment",
  [sym_comment_text] = "comment_text",
  [aux_sym_document_repeat1] = "document_repeat1",
  [aux_sym_multiline_value_repeat1] = "multiline_value_repeat1",
};

static const TSSymbol ts_symbol_map[] = {
  [ts_builtin_sym_end] = ts_builtin_sym_end,
  [sym_single_line_key] = sym_single_line_key,
  [sym_key_continuation] = sym_key_continuation,
  [sym_assignment] = sym_assignment,
  [aux_sym_single_line_value_token1] = aux_sym_single_line_value_token1,
  [sym_indent] = sym_indent,
  [sym_marker] = sym_marker,
  [aux_sym_comment_text_token1] = aux_sym_comment_text_token1,
  [sym_document] = sym_document,
  [sym__item] = sym__item,
  [sym_entry] = sym_entry,
  [sym_multiline_key] = sym_multiline_key,
  [sym_single_line_value] = sym_single_line_value,
  [sym_multiline_value] = sym_multiline_value,
  [sym_value_line] = sym_value_line,
  [sym_comment] = sym_comment,
  [sym_comment_text] = sym_comment_text,
  [aux_sym_document_repeat1] = aux_sym_document_repeat1,
  [aux_sym_multiline_value_repeat1] = aux_sym_multiline_value_repeat1,
};

static const TSSymbolMetadata ts_symbol_metadata[] = {
  [ts_builtin_sym_end] = {
    .visible = false,
    .named = true,
  },
  [sym_single_line_key] = {
    .visible = true,
    .named = true,
  },
  [sym_key_continuation] = {
    .visible = true,
    .named = true,
  },
  [sym_assignment] = {
    .visible = true,
    .named = true,
  },
  [aux_sym_single_line_value_token1] = {
    .visible = false,
    .named = false,
  },
  [sym_indent] = {
    .visible = true,
    .named = true,
  },
  [sym_marker] = {
    .visible = true,
    .named = true,
  },
  [aux_sym_comment_text_token1] = {
    .visible = false,
    .named = false,
  },
  [sym_document] = {
    .visible = true,
    .named = true,
  },
  [sym__item] = {
    .visible = false,
    .named = true,
  },
  [sym_entry] = {
    .visible = true,
    .named = true,
  },
  [sym_multiline_key] = {
    .visible = true,
    .named = true,
  },
  [sym_single_line_value] = {
    .visible = true,
    .named = true,
  },
  [sym_multiline_value] = {
    .visible = true,
    .named = true,
  },
  [sym_value_line] = {
    .visible = true,
    .named = true,
  },
  [sym_comment] = {
    .visible = true,
    .named = true,
  },
  [sym_comment_text] = {
    .visible = true,
    .named = true,
  },
  [aux_sym_document_repeat1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_multiline_value_repeat1] = {
    .visible = false,
    .named = false,
  },
};

static const TSSymbol ts_alias_sequences[PRODUCTION_ID_COUNT][MAX_ALIAS_SEQUENCE_LENGTH] = {
  [0] = {0},
};

static const uint16_t ts_non_terminal_alias_map[] = {
  0,
};

static const TSStateId ts_primary_state_ids[STATE_COUNT] = {
  [0] = 0,
  [1] = 1,
  [2] = 2,
  [3] = 3,
  [4] = 4,
  [5] = 5,
  [6] = 6,
  [7] = 7,
  [8] = 8,
  [9] = 9,
  [10] = 10,
  [11] = 11,
  [12] = 12,
  [13] = 13,
  [14] = 14,
  [15] = 15,
  [16] = 16,
  [17] = 17,
  [18] = 18,
  [19] = 19,
  [20] = 20,
};

static bool ts_lex(TSLexer *lexer, TSStateId state) {
  START_LEXER();
  eof = lexer->eof(lexer);
  switch (state) {
    case 0:
      if (eof) ADVANCE(9);
      if (lookahead == '\n') SKIP(0)
      if (lookahead == '\r') SKIP(4)
      if (lookahead == '/') ADVANCE(12);
      if (lookahead == '=') ADVANCE(13);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(11);
      if (lookahead != 0) ADVANCE(10);
      END_STATE();
    case 1:
      if (lookahead == '\n') SKIP(2)
      END_STATE();
    case 2:
      if (lookahead == '\n') SKIP(2)
      if (lookahead == '\r') SKIP(1)
      if (lookahead == '=') ADVANCE(13);
      if (lookahead != 0) ADVANCE(12);
      END_STATE();
    case 3:
      if (lookahead == '=') ADVANCE(17);
      END_STATE();
    case 4:
      if (eof) ADVANCE(9);
      if (lookahead == '\n') SKIP(0)
      END_STATE();
    case 5:
      if (eof) ADVANCE(9);
      if (lookahead == '\n') SKIP(6)
      END_STATE();
    case 6:
      if (eof) ADVANCE(9);
      if (lookahead == '\n') SKIP(6)
      if (lookahead == '\r') SKIP(5)
      if (lookahead == '/') ADVANCE(3);
      if (lookahead == '=') ADVANCE(13);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(16);
      if (lookahead != 0) ADVANCE(10);
      END_STATE();
    case 7:
      if (eof) ADVANCE(9);
      if (lookahead == '\n') SKIP(8)
      END_STATE();
    case 8:
      if (eof) ADVANCE(9);
      if (lookahead == '\n') SKIP(8)
      if (lookahead == '\r') SKIP(7)
      if (lookahead == ' ') ADVANCE(18);
      if (lookahead == '/') ADVANCE(3);
      if (lookahead == '=') ADVANCE(13);
      if (lookahead != 0 &&
          lookahead != '\t') ADVANCE(10);
      END_STATE();
    case 9:
      ACCEPT_TOKEN(ts_builtin_sym_end);
      END_STATE();
    case 10:
      ACCEPT_TOKEN(sym_single_line_key);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r' &&
          lookahead != '=') ADVANCE(10);
      END_STATE();
    case 11:
      ACCEPT_TOKEN(sym_key_continuation);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(11);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r' &&
          lookahead != '=') ADVANCE(12);
      END_STATE();
    case 12:
      ACCEPT_TOKEN(sym_key_continuation);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r' &&
          lookahead != '=') ADVANCE(12);
      END_STATE();
    case 13:
      ACCEPT_TOKEN(sym_assignment);
      END_STATE();
    case 14:
      ACCEPT_TOKEN(aux_sym_single_line_value_token1);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(14);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r') ADVANCE(15);
      END_STATE();
    case 15:
      ACCEPT_TOKEN(aux_sym_single_line_value_token1);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r') ADVANCE(15);
      END_STATE();
    case 16:
      ACCEPT_TOKEN(sym_indent);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(16);
      END_STATE();
    case 17:
      ACCEPT_TOKEN(sym_marker);
      END_STATE();
    case 18:
      ACCEPT_TOKEN(aux_sym_comment_text_token1);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r') ADVANCE(18);
      END_STATE();
    default:
      return false;
  }
}

static const TSLexMode ts_lex_modes[STATE_COUNT] = {
  [0] = {.lex_state = 0},
  [1] = {.lex_state = 6},
  [2] = {.lex_state = 6},
  [3] = {.lex_state = 6},
  [4] = {.lex_state = 6},
  [5] = {.lex_state = 6},
  [6] = {.lex_state = 8},
  [7] = {.lex_state = 14},
  [8] = {.lex_state = 6},
  [9] = {.lex_state = 6},
  [10] = {.lex_state = 14},
  [11] = {.lex_state = 6},
  [12] = {.lex_state = 6},
  [13] = {.lex_state = 6},
  [14] = {.lex_state = 6},
  [15] = {.lex_state = 6},
  [16] = {.lex_state = 14},
  [17] = {.lex_state = 2},
  [18] = {.lex_state = 0},
  [19] = {.lex_state = 0},
  [20] = {.lex_state = 0},
};

static const uint16_t ts_parse_table[LARGE_STATE_COUNT][SYMBOL_COUNT] = {
  [0] = {
    [ts_builtin_sym_end] = ACTIONS(1),
    [sym_single_line_key] = ACTIONS(1),
    [sym_key_continuation] = ACTIONS(1),
    [sym_assignment] = ACTIONS(1),
    [sym_indent] = ACTIONS(1),
  },
  [1] = {
    [sym_document] = STATE(20),
    [sym__item] = STATE(2),
    [sym_entry] = STATE(2),
    [sym_multiline_key] = STATE(19),
    [sym_comment] = STATE(2),
    [aux_sym_document_repeat1] = STATE(2),
    [ts_builtin_sym_end] = ACTIONS(3),
    [sym_single_line_key] = ACTIONS(5),
    [sym_assignment] = ACTIONS(7),
    [sym_marker] = ACTIONS(9),
  },
};

static const uint16_t ts_small_parse_table[] = {
  [0] = 6,
    ACTIONS(5), 1,
      sym_single_line_key,
    ACTIONS(7), 1,
      sym_assignment,
    ACTIONS(9), 1,
      sym_marker,
    ACTIONS(11), 1,
      ts_builtin_sym_end,
    STATE(19), 1,
      sym_multiline_key,
    STATE(3), 4,
      sym__item,
      sym_entry,
      sym_comment,
      aux_sym_document_repeat1,
  [22] = 6,
    ACTIONS(13), 1,
      ts_builtin_sym_end,
    ACTIONS(15), 1,
      sym_single_line_key,
    ACTIONS(18), 1,
      sym_assignment,
    ACTIONS(21), 1,
      sym_marker,
    STATE(19), 1,
      sym_multiline_key,
    STATE(3), 4,
      sym__item,
      sym_entry,
      sym_comment,
      aux_sym_document_repeat1,
  [44] = 3,
    ACTIONS(26), 1,
      sym_indent,
    STATE(5), 1,
      aux_sym_multiline_value_repeat1,
    ACTIONS(24), 4,
      ts_builtin_sym_end,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [57] = 3,
    ACTIONS(30), 1,
      sym_indent,
    STATE(5), 1,
      aux_sym_multiline_value_repeat1,
    ACTIONS(28), 4,
      ts_builtin_sym_end,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [70] = 3,
    ACTIONS(35), 1,
      aux_sym_comment_text_token1,
    STATE(11), 1,
      sym_comment_text,
    ACTIONS(33), 4,
      ts_builtin_sym_end,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [83] = 5,
    ACTIONS(37), 1,
      aux_sym_single_line_value_token1,
    ACTIONS(39), 1,
      sym_indent,
    STATE(4), 1,
      aux_sym_multiline_value_repeat1,
    STATE(12), 1,
      sym_single_line_value,
    STATE(14), 1,
      sym_multiline_value,
  [99] = 1,
    ACTIONS(28), 5,
      ts_builtin_sym_end,
      sym_single_line_key,
      sym_assignment,
      sym_indent,
      sym_marker,
  [107] = 1,
    ACTIONS(41), 5,
      ts_builtin_sym_end,
      sym_single_line_key,
      sym_assignment,
      sym_indent,
      sym_marker,
  [115] = 5,
    ACTIONS(37), 1,
      aux_sym_single_line_value_token1,
    ACTIONS(39), 1,
      sym_indent,
    STATE(4), 1,
      aux_sym_multiline_value_repeat1,
    STATE(14), 1,
      sym_multiline_value,
    STATE(15), 1,
      sym_single_line_value,
  [131] = 1,
    ACTIONS(43), 4,
      ts_builtin_sym_end,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [138] = 1,
    ACTIONS(45), 4,
      ts_builtin_sym_end,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [145] = 1,
    ACTIONS(47), 4,
      ts_builtin_sym_end,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [152] = 1,
    ACTIONS(49), 4,
      ts_builtin_sym_end,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [159] = 1,
    ACTIONS(51), 4,
      ts_builtin_sym_end,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [166] = 2,
    ACTIONS(53), 1,
      aux_sym_single_line_value_token1,
    STATE(8), 1,
      sym_value_line,
  [173] = 2,
    ACTIONS(55), 1,
      sym_key_continuation,
    ACTIONS(57), 1,
      sym_assignment,
  [180] = 1,
    ACTIONS(59), 1,
      sym_assignment,
  [184] = 1,
    ACTIONS(57), 1,
      sym_assignment,
  [188] = 1,
    ACTIONS(61), 1,
      ts_builtin_sym_end,
};

static const uint32_t ts_small_parse_table_map[] = {
  [SMALL_STATE(2)] = 0,
  [SMALL_STATE(3)] = 22,
  [SMALL_STATE(4)] = 44,
  [SMALL_STATE(5)] = 57,
  [SMALL_STATE(6)] = 70,
  [SMALL_STATE(7)] = 83,
  [SMALL_STATE(8)] = 99,
  [SMALL_STATE(9)] = 107,
  [SMALL_STATE(10)] = 115,
  [SMALL_STATE(11)] = 131,
  [SMALL_STATE(12)] = 138,
  [SMALL_STATE(13)] = 145,
  [SMALL_STATE(14)] = 152,
  [SMALL_STATE(15)] = 159,
  [SMALL_STATE(16)] = 166,
  [SMALL_STATE(17)] = 173,
  [SMALL_STATE(18)] = 180,
  [SMALL_STATE(19)] = 184,
  [SMALL_STATE(20)] = 188,
};

static const TSParseActionEntry ts_parse_actions[] = {
  [0] = {.entry = {.count = 0, .reusable = false}},
  [1] = {.entry = {.count = 1, .reusable = false}}, RECOVER(),
  [3] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_document, 0),
  [5] = {.entry = {.count = 1, .reusable = true}}, SHIFT(17),
  [7] = {.entry = {.count = 1, .reusable = true}}, SHIFT(7),
  [9] = {.entry = {.count = 1, .reusable = true}}, SHIFT(6),
  [11] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_document, 1),
  [13] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2),
  [15] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(17),
  [18] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(7),
  [21] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(6),
  [24] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_multiline_value, 1),
  [26] = {.entry = {.count = 1, .reusable = true}}, SHIFT(16),
  [28] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_multiline_value_repeat1, 2),
  [30] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_multiline_value_repeat1, 2), SHIFT_REPEAT(16),
  [33] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_comment, 1),
  [35] = {.entry = {.count = 1, .reusable = true}}, SHIFT(13),
  [37] = {.entry = {.count = 1, .reusable = true}}, SHIFT(14),
  [39] = {.entry = {.count = 1, .reusable = false}}, SHIFT(16),
  [41] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_value_line, 1),
  [43] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_comment, 2),
  [45] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_entry, 2),
  [47] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_comment_text, 1),
  [49] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_single_line_value, 1),
  [51] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_entry, 3),
  [53] = {.entry = {.count = 1, .reusable = true}}, SHIFT(9),
  [55] = {.entry = {.count = 1, .reusable = true}}, SHIFT(18),
  [57] = {.entry = {.count = 1, .reusable = true}}, SHIFT(10),
  [59] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_multiline_key, 2),
  [61] = {.entry = {.count = 1, .reusable = true}},  ACCEPT_INPUT(),
};

#ifdef __cplusplus
extern "C" {
#endif
#ifdef _WIN32
#define extern __declspec(dllexport)
#endif

extern const TSLanguage *tree_sitter_ccl(void) {
  static const TSLanguage language = {
    .version = LANGUAGE_VERSION,
    .symbol_count = SYMBOL_COUNT,
    .alias_count = ALIAS_COUNT,
    .token_count = TOKEN_COUNT,
    .external_token_count = EXTERNAL_TOKEN_COUNT,
    .state_count = STATE_COUNT,
    .large_state_count = LARGE_STATE_COUNT,
    .production_id_count = PRODUCTION_ID_COUNT,
    .field_count = FIELD_COUNT,
    .max_alias_sequence_length = MAX_ALIAS_SEQUENCE_LENGTH,
    .parse_table = &ts_parse_table[0][0],
    .small_parse_table = ts_small_parse_table,
    .small_parse_table_map = ts_small_parse_table_map,
    .parse_actions = ts_parse_actions,
    .symbol_names = ts_symbol_names,
    .symbol_metadata = ts_symbol_metadata,
    .public_symbol_map = ts_symbol_map,
    .alias_map = ts_non_terminal_alias_map,
    .alias_sequences = &ts_alias_sequences[0][0],
    .lex_modes = ts_lex_modes,
    .lex_fn = ts_lex,
    .primary_state_ids = ts_primary_state_ids,
  };
  return &language;
}
#ifdef __cplusplus
}
#endif
