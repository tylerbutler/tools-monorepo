#include <tree_sitter/parser.h>

#if defined(__GNUC__) || defined(__clang__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wmissing-field-initializers"
#endif

#define LANGUAGE_VERSION 14
#define STATE_COUNT 30
#define LARGE_STATE_COUNT 2
#define SYMBOL_COUNT 20
#define ALIAS_COUNT 0
#define TOKEN_COUNT 9
#define EXTERNAL_TOKEN_COUNT 0
#define FIELD_COUNT 0
#define MAX_ALIAS_SEQUENCE_LENGTH 4
#define PRODUCTION_ID_COUNT 1

enum {
  aux_sym__item_token1 = 1,
  sym_single_line_key = 2,
  sym_key_continuation = 3,
  sym_assignment = 4,
  aux_sym_single_line_value_token1 = 5,
  sym_indent = 6,
  sym_marker = 7,
  sym_comment_text = 8,
  sym_document = 9,
  sym__item = 10,
  sym_entry = 11,
  sym_multiline_key = 12,
  sym__value = 13,
  sym_single_line_value = 14,
  sym_multiline_value = 15,
  sym_value_line = 16,
  sym_comment = 17,
  aux_sym_document_repeat1 = 18,
  aux_sym_multiline_value_repeat1 = 19,
};

static const char * const ts_symbol_names[] = {
  [ts_builtin_sym_end] = "end",
  [aux_sym__item_token1] = "_item_token1",
  [sym_single_line_key] = "single_line_key",
  [sym_key_continuation] = "key_continuation",
  [sym_assignment] = "assignment",
  [aux_sym_single_line_value_token1] = "single_line_value_token1",
  [sym_indent] = "indent",
  [sym_marker] = "marker",
  [sym_comment_text] = "comment_text",
  [sym_document] = "document",
  [sym__item] = "_item",
  [sym_entry] = "entry",
  [sym_multiline_key] = "multiline_key",
  [sym__value] = "_value",
  [sym_single_line_value] = "single_line_value",
  [sym_multiline_value] = "multiline_value",
  [sym_value_line] = "value_line",
  [sym_comment] = "comment",
  [aux_sym_document_repeat1] = "document_repeat1",
  [aux_sym_multiline_value_repeat1] = "multiline_value_repeat1",
};

static const TSSymbol ts_symbol_map[] = {
  [ts_builtin_sym_end] = ts_builtin_sym_end,
  [aux_sym__item_token1] = aux_sym__item_token1,
  [sym_single_line_key] = sym_single_line_key,
  [sym_key_continuation] = sym_key_continuation,
  [sym_assignment] = sym_assignment,
  [aux_sym_single_line_value_token1] = aux_sym_single_line_value_token1,
  [sym_indent] = sym_indent,
  [sym_marker] = sym_marker,
  [sym_comment_text] = sym_comment_text,
  [sym_document] = sym_document,
  [sym__item] = sym__item,
  [sym_entry] = sym_entry,
  [sym_multiline_key] = sym_multiline_key,
  [sym__value] = sym__value,
  [sym_single_line_value] = sym_single_line_value,
  [sym_multiline_value] = sym_multiline_value,
  [sym_value_line] = sym_value_line,
  [sym_comment] = sym_comment,
  [aux_sym_document_repeat1] = aux_sym_document_repeat1,
  [aux_sym_multiline_value_repeat1] = aux_sym_multiline_value_repeat1,
};

static const TSSymbolMetadata ts_symbol_metadata[] = {
  [ts_builtin_sym_end] = {
    .visible = false,
    .named = true,
  },
  [aux_sym__item_token1] = {
    .visible = false,
    .named = false,
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
  [sym_comment_text] = {
    .visible = true,
    .named = true,
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
  [sym__value] = {
    .visible = false,
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
  [21] = 21,
  [22] = 22,
  [23] = 23,
  [24] = 24,
  [25] = 25,
  [26] = 26,
  [27] = 27,
  [28] = 28,
  [29] = 29,
};

static bool ts_lex(TSLexer *lexer, TSStateId state) {
  START_LEXER();
  eof = lexer->eof(lexer);
  switch (state) {
    case 0:
      if (eof) ADVANCE(6);
      if (lookahead == '\n') ADVANCE(7);
      if (lookahead == '\r') ADVANCE(1);
      if (lookahead == '/') ADVANCE(10);
      if (lookahead == '=') ADVANCE(11);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(9);
      if (lookahead != 0) ADVANCE(8);
      END_STATE();
    case 1:
      if (lookahead == '\n') ADVANCE(7);
      END_STATE();
    case 2:
      if (lookahead == '\n') ADVANCE(7);
      if (lookahead == '\r') ADVANCE(1);
      if (lookahead == ' ') ADVANCE(16);
      END_STATE();
    case 3:
      if (lookahead == '=') ADVANCE(15);
      END_STATE();
    case 4:
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r' &&
          lookahead != '=') ADVANCE(10);
      END_STATE();
    case 5:
      if (eof) ADVANCE(6);
      if (lookahead == '\n') ADVANCE(7);
      if (lookahead == '\r') ADVANCE(1);
      if (lookahead == '/') ADVANCE(3);
      if (lookahead == '=') ADVANCE(11);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(14);
      if (lookahead != 0) ADVANCE(8);
      END_STATE();
    case 6:
      ACCEPT_TOKEN(ts_builtin_sym_end);
      END_STATE();
    case 7:
      ACCEPT_TOKEN(aux_sym__item_token1);
      END_STATE();
    case 8:
      ACCEPT_TOKEN(sym_single_line_key);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r' &&
          lookahead != '=') ADVANCE(8);
      END_STATE();
    case 9:
      ACCEPT_TOKEN(sym_key_continuation);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(9);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r' &&
          lookahead != '=') ADVANCE(10);
      END_STATE();
    case 10:
      ACCEPT_TOKEN(sym_key_continuation);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r' &&
          lookahead != '=') ADVANCE(10);
      END_STATE();
    case 11:
      ACCEPT_TOKEN(sym_assignment);
      END_STATE();
    case 12:
      ACCEPT_TOKEN(aux_sym_single_line_value_token1);
      if (lookahead == '\n') ADVANCE(7);
      if (lookahead == '\r') ADVANCE(1);
      if (lookahead != 0) ADVANCE(13);
      END_STATE();
    case 13:
      ACCEPT_TOKEN(aux_sym_single_line_value_token1);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r') ADVANCE(13);
      END_STATE();
    case 14:
      ACCEPT_TOKEN(sym_indent);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(14);
      END_STATE();
    case 15:
      ACCEPT_TOKEN(sym_marker);
      END_STATE();
    case 16:
      ACCEPT_TOKEN(sym_comment_text);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r') ADVANCE(16);
      END_STATE();
    default:
      return false;
  }
}

static const TSLexMode ts_lex_modes[STATE_COUNT] = {
  [0] = {.lex_state = 0},
  [1] = {.lex_state = 5},
  [2] = {.lex_state = 5},
  [3] = {.lex_state = 5},
  [4] = {.lex_state = 5},
  [5] = {.lex_state = 5},
  [6] = {.lex_state = 5},
  [7] = {.lex_state = 5},
  [8] = {.lex_state = 5},
  [9] = {.lex_state = 5},
  [10] = {.lex_state = 5},
  [11] = {.lex_state = 5},
  [12] = {.lex_state = 12},
  [13] = {.lex_state = 5},
  [14] = {.lex_state = 13},
  [15] = {.lex_state = 0},
  [16] = {.lex_state = 13},
  [17] = {.lex_state = 2},
  [18] = {.lex_state = 13},
  [19] = {.lex_state = 0},
  [20] = {.lex_state = 0},
  [21] = {.lex_state = 0},
  [22] = {.lex_state = 0},
  [23] = {.lex_state = 0},
  [24] = {.lex_state = 0},
  [25] = {.lex_state = 4},
  [26] = {.lex_state = 0},
  [27] = {.lex_state = 0},
  [28] = {.lex_state = 0},
  [29] = {.lex_state = 0},
};

static const uint16_t ts_parse_table[LARGE_STATE_COUNT][SYMBOL_COUNT] = {
  [0] = {
    [ts_builtin_sym_end] = ACTIONS(1),
    [aux_sym__item_token1] = ACTIONS(1),
    [sym_single_line_key] = ACTIONS(1),
    [sym_key_continuation] = ACTIONS(1),
    [sym_assignment] = ACTIONS(1),
    [sym_indent] = ACTIONS(1),
  },
  [1] = {
    [sym_document] = STATE(27),
    [sym__item] = STATE(2),
    [sym_entry] = STATE(2),
    [sym_multiline_key] = STATE(26),
    [sym_comment] = STATE(2),
    [aux_sym_document_repeat1] = STATE(2),
    [ts_builtin_sym_end] = ACTIONS(3),
    [aux_sym__item_token1] = ACTIONS(5),
    [sym_single_line_key] = ACTIONS(7),
    [sym_assignment] = ACTIONS(9),
    [sym_marker] = ACTIONS(11),
  },
};

static const uint16_t ts_small_parse_table[] = {
  [0] = 7,
    ACTIONS(7), 1,
      sym_single_line_key,
    ACTIONS(9), 1,
      sym_assignment,
    ACTIONS(11), 1,
      sym_marker,
    ACTIONS(13), 1,
      ts_builtin_sym_end,
    ACTIONS(15), 1,
      aux_sym__item_token1,
    STATE(26), 1,
      sym_multiline_key,
    STATE(3), 4,
      sym__item,
      sym_entry,
      sym_comment,
      aux_sym_document_repeat1,
  [25] = 7,
    ACTIONS(17), 1,
      ts_builtin_sym_end,
    ACTIONS(19), 1,
      aux_sym__item_token1,
    ACTIONS(22), 1,
      sym_single_line_key,
    ACTIONS(25), 1,
      sym_assignment,
    ACTIONS(28), 1,
      sym_marker,
    STATE(26), 1,
      sym_multiline_key,
    STATE(3), 4,
      sym__item,
      sym_entry,
      sym_comment,
      aux_sym_document_repeat1,
  [50] = 3,
    ACTIONS(33), 1,
      sym_indent,
    STATE(4), 1,
      aux_sym_multiline_value_repeat1,
    ACTIONS(31), 5,
      ts_builtin_sym_end,
      aux_sym__item_token1,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [64] = 3,
    ACTIONS(38), 1,
      sym_indent,
    STATE(4), 1,
      aux_sym_multiline_value_repeat1,
    ACTIONS(36), 5,
      ts_builtin_sym_end,
      aux_sym__item_token1,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [78] = 1,
    ACTIONS(40), 6,
      ts_builtin_sym_end,
      aux_sym__item_token1,
      sym_single_line_key,
      sym_assignment,
      sym_indent,
      sym_marker,
  [87] = 1,
    ACTIONS(42), 5,
      ts_builtin_sym_end,
      aux_sym__item_token1,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [95] = 1,
    ACTIONS(44), 5,
      ts_builtin_sym_end,
      aux_sym__item_token1,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [103] = 1,
    ACTIONS(46), 5,
      ts_builtin_sym_end,
      aux_sym__item_token1,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [111] = 1,
    ACTIONS(48), 5,
      ts_builtin_sym_end,
      aux_sym__item_token1,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [119] = 1,
    ACTIONS(50), 5,
      ts_builtin_sym_end,
      aux_sym__item_token1,
      sym_single_line_key,
      sym_assignment,
      sym_marker,
  [127] = 4,
    ACTIONS(52), 1,
      aux_sym__item_token1,
    ACTIONS(54), 1,
      aux_sym_single_line_value_token1,
    STATE(10), 1,
      sym__value,
    STATE(22), 1,
      sym_single_line_value,
  [140] = 3,
    ACTIONS(38), 1,
      sym_indent,
    STATE(5), 1,
      aux_sym_multiline_value_repeat1,
    STATE(8), 1,
      sym_multiline_value,
  [150] = 2,
    ACTIONS(56), 1,
      aux_sym_single_line_value_token1,
    STATE(24), 1,
      sym_single_line_value,
  [157] = 2,
    ACTIONS(58), 1,
      aux_sym__item_token1,
    ACTIONS(60), 1,
      sym_assignment,
  [164] = 2,
    ACTIONS(62), 1,
      aux_sym_single_line_value_token1,
    STATE(29), 1,
      sym_value_line,
  [171] = 2,
    ACTIONS(64), 1,
      aux_sym__item_token1,
    ACTIONS(66), 1,
      sym_comment_text,
  [178] = 2,
    ACTIONS(56), 1,
      aux_sym_single_line_value_token1,
    STATE(21), 1,
      sym_single_line_value,
  [185] = 1,
    ACTIONS(68), 1,
      aux_sym__item_token1,
  [189] = 1,
    ACTIONS(70), 1,
      sym_assignment,
  [193] = 1,
    ACTIONS(72), 1,
      aux_sym__item_token1,
  [197] = 1,
    ACTIONS(74), 1,
      aux_sym__item_token1,
  [201] = 1,
    ACTIONS(76), 1,
      aux_sym__item_token1,
  [205] = 1,
    ACTIONS(78), 1,
      aux_sym__item_token1,
  [209] = 1,
    ACTIONS(80), 1,
      sym_key_continuation,
  [213] = 1,
    ACTIONS(82), 1,
      sym_assignment,
  [217] = 1,
    ACTIONS(84), 1,
      ts_builtin_sym_end,
  [221] = 1,
    ACTIONS(86), 1,
      aux_sym__item_token1,
  [225] = 1,
    ACTIONS(88), 1,
      aux_sym__item_token1,
};

static const uint32_t ts_small_parse_table_map[] = {
  [SMALL_STATE(2)] = 0,
  [SMALL_STATE(3)] = 25,
  [SMALL_STATE(4)] = 50,
  [SMALL_STATE(5)] = 64,
  [SMALL_STATE(6)] = 78,
  [SMALL_STATE(7)] = 87,
  [SMALL_STATE(8)] = 95,
  [SMALL_STATE(9)] = 103,
  [SMALL_STATE(10)] = 111,
  [SMALL_STATE(11)] = 119,
  [SMALL_STATE(12)] = 127,
  [SMALL_STATE(13)] = 140,
  [SMALL_STATE(14)] = 150,
  [SMALL_STATE(15)] = 157,
  [SMALL_STATE(16)] = 164,
  [SMALL_STATE(17)] = 171,
  [SMALL_STATE(18)] = 178,
  [SMALL_STATE(19)] = 185,
  [SMALL_STATE(20)] = 189,
  [SMALL_STATE(21)] = 193,
  [SMALL_STATE(22)] = 197,
  [SMALL_STATE(23)] = 201,
  [SMALL_STATE(24)] = 205,
  [SMALL_STATE(25)] = 209,
  [SMALL_STATE(26)] = 213,
  [SMALL_STATE(27)] = 217,
  [SMALL_STATE(28)] = 221,
  [SMALL_STATE(29)] = 225,
};

static const TSParseActionEntry ts_parse_actions[] = {
  [0] = {.entry = {.count = 0, .reusable = false}},
  [1] = {.entry = {.count = 1, .reusable = false}}, RECOVER(),
  [3] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_document, 0),
  [5] = {.entry = {.count = 1, .reusable = true}}, SHIFT(2),
  [7] = {.entry = {.count = 1, .reusable = true}}, SHIFT(15),
  [9] = {.entry = {.count = 1, .reusable = true}}, SHIFT(18),
  [11] = {.entry = {.count = 1, .reusable = true}}, SHIFT(17),
  [13] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_document, 1),
  [15] = {.entry = {.count = 1, .reusable = true}}, SHIFT(3),
  [17] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2),
  [19] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(3),
  [22] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(15),
  [25] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(18),
  [28] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(17),
  [31] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_multiline_value_repeat1, 2),
  [33] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_multiline_value_repeat1, 2), SHIFT_REPEAT(16),
  [36] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_multiline_value, 1),
  [38] = {.entry = {.count = 1, .reusable = true}}, SHIFT(16),
  [40] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_multiline_value_repeat1, 3),
  [42] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_entry, 4),
  [44] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym__value, 2),
  [46] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_comment, 3),
  [48] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_entry, 3),
  [50] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_comment, 2),
  [52] = {.entry = {.count = 1, .reusable = true}}, SHIFT(13),
  [54] = {.entry = {.count = 1, .reusable = false}}, SHIFT(23),
  [56] = {.entry = {.count = 1, .reusable = true}}, SHIFT(23),
  [58] = {.entry = {.count = 1, .reusable = true}}, SHIFT(25),
  [60] = {.entry = {.count = 1, .reusable = true}}, SHIFT(12),
  [62] = {.entry = {.count = 1, .reusable = true}}, SHIFT(28),
  [64] = {.entry = {.count = 1, .reusable = true}}, SHIFT(11),
  [66] = {.entry = {.count = 1, .reusable = true}}, SHIFT(19),
  [68] = {.entry = {.count = 1, .reusable = true}}, SHIFT(9),
  [70] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_multiline_key, 3),
  [72] = {.entry = {.count = 1, .reusable = true}}, SHIFT(10),
  [74] = {.entry = {.count = 1, .reusable = true}}, SHIFT(8),
  [76] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_single_line_value, 1),
  [78] = {.entry = {.count = 1, .reusable = true}}, SHIFT(7),
  [80] = {.entry = {.count = 1, .reusable = true}}, SHIFT(20),
  [82] = {.entry = {.count = 1, .reusable = true}}, SHIFT(14),
  [84] = {.entry = {.count = 1, .reusable = true}},  ACCEPT_INPUT(),
  [86] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_value_line, 1),
  [88] = {.entry = {.count = 1, .reusable = true}}, SHIFT(6),
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
