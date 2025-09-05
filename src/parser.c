#include <tree_sitter/parser.h>

#if defined(__GNUC__) || defined(__clang__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wmissing-field-initializers"
#endif

#define LANGUAGE_VERSION 14
#define STATE_COUNT 18
#define LARGE_STATE_COUNT 4
#define SYMBOL_COUNT 16
#define ALIAS_COUNT 0
#define TOKEN_COUNT 8
#define EXTERNAL_TOKEN_COUNT 0
#define FIELD_COUNT 0
#define MAX_ALIAS_SEQUENCE_LENGTH 3
#define PRODUCTION_ID_COUNT 1

enum {
  sym_key = 1,
  sym_assignment = 2,
  sym_inline_value = 3,
  aux_sym_block_value_token1 = 4,
  aux_sym_block_value_token2 = 5,
  anon_sym_SLASH_EQ = 6,
  sym__newline = 7,
  sym_document = 8,
  sym__item = 9,
  sym_entry = 10,
  sym_value = 11,
  sym_block_value = 12,
  sym_comment = 13,
  aux_sym_document_repeat1 = 14,
  aux_sym_block_value_repeat1 = 15,
};

static const char * const ts_symbol_names[] = {
  [ts_builtin_sym_end] = "end",
  [sym_key] = "key",
  [sym_assignment] = "assignment",
  [sym_inline_value] = "inline_value",
  [aux_sym_block_value_token1] = "block_value_token1",
  [aux_sym_block_value_token2] = "block_value_token2",
  [anon_sym_SLASH_EQ] = "/=",
  [sym__newline] = "_newline",
  [sym_document] = "document",
  [sym__item] = "_item",
  [sym_entry] = "entry",
  [sym_value] = "value",
  [sym_block_value] = "block_value",
  [sym_comment] = "comment",
  [aux_sym_document_repeat1] = "document_repeat1",
  [aux_sym_block_value_repeat1] = "block_value_repeat1",
};

static const TSSymbol ts_symbol_map[] = {
  [ts_builtin_sym_end] = ts_builtin_sym_end,
  [sym_key] = sym_key,
  [sym_assignment] = sym_assignment,
  [sym_inline_value] = sym_inline_value,
  [aux_sym_block_value_token1] = aux_sym_block_value_token1,
  [aux_sym_block_value_token2] = aux_sym_block_value_token2,
  [anon_sym_SLASH_EQ] = anon_sym_SLASH_EQ,
  [sym__newline] = sym__newline,
  [sym_document] = sym_document,
  [sym__item] = sym__item,
  [sym_entry] = sym_entry,
  [sym_value] = sym_value,
  [sym_block_value] = sym_block_value,
  [sym_comment] = sym_comment,
  [aux_sym_document_repeat1] = aux_sym_document_repeat1,
  [aux_sym_block_value_repeat1] = aux_sym_block_value_repeat1,
};

static const TSSymbolMetadata ts_symbol_metadata[] = {
  [ts_builtin_sym_end] = {
    .visible = false,
    .named = true,
  },
  [sym_key] = {
    .visible = true,
    .named = true,
  },
  [sym_assignment] = {
    .visible = true,
    .named = true,
  },
  [sym_inline_value] = {
    .visible = true,
    .named = true,
  },
  [aux_sym_block_value_token1] = {
    .visible = false,
    .named = false,
  },
  [aux_sym_block_value_token2] = {
    .visible = false,
    .named = false,
  },
  [anon_sym_SLASH_EQ] = {
    .visible = true,
    .named = false,
  },
  [sym__newline] = {
    .visible = false,
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
  [sym_value] = {
    .visible = true,
    .named = true,
  },
  [sym_block_value] = {
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
  [aux_sym_block_value_repeat1] = {
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
};

static bool ts_lex(TSLexer *lexer, TSStateId state) {
  START_LEXER();
  eof = lexer->eof(lexer);
  switch (state) {
    case 0:
      if (eof) ADVANCE(6);
      if (lookahead == '\n') ADVANCE(16);
      if (lookahead == '\r') ADVANCE(1);
      if (lookahead == '/') ADVANCE(10);
      if (lookahead == '=') ADVANCE(8);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(12);
      if (lookahead != 0) ADVANCE(7);
      END_STATE();
    case 1:
      if (lookahead == '\n') ADVANCE(16);
      END_STATE();
    case 2:
      if (lookahead == '=') ADVANCE(15);
      END_STATE();
    case 3:
      if (eof) ADVANCE(6);
      if (lookahead == '\n') ADVANCE(16);
      if (lookahead == '\r') ADVANCE(1);
      if (lookahead == '/') ADVANCE(10);
      if (lookahead == '=') ADVANCE(8);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(9);
      if (lookahead != 0) ADVANCE(7);
      END_STATE();
    case 4:
      if (eof) ADVANCE(6);
      if (lookahead == '\n') ADVANCE(16);
      if (lookahead == '\r') ADVANCE(1);
      if (lookahead == '/') ADVANCE(2);
      if (lookahead == '=') ADVANCE(8);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(12);
      if (lookahead != 0) ADVANCE(7);
      END_STATE();
    case 5:
      if (eof) ADVANCE(6);
      if (lookahead == '\n') ADVANCE(16);
      if (lookahead == '\r') ADVANCE(1);
      if (lookahead == '/') ADVANCE(2);
      if (lookahead == '=') ADVANCE(8);
      if (lookahead == '\t' ||
          lookahead == ' ') SKIP(5)
      if (lookahead != 0) ADVANCE(7);
      END_STATE();
    case 6:
      ACCEPT_TOKEN(ts_builtin_sym_end);
      END_STATE();
    case 7:
      ACCEPT_TOKEN(sym_key);
      if (lookahead != 0 &&
          lookahead != '\t' &&
          lookahead != '\n' &&
          lookahead != '\r' &&
          lookahead != ' ' &&
          lookahead != '/' &&
          lookahead != '=') ADVANCE(7);
      END_STATE();
    case 8:
      ACCEPT_TOKEN(sym_assignment);
      END_STATE();
    case 9:
      ACCEPT_TOKEN(sym_inline_value);
      if (lookahead == '\n') ADVANCE(16);
      if (lookahead == '\r') ADVANCE(1);
      if (lookahead == '/') ADVANCE(10);
      if (lookahead == '=') ADVANCE(8);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(9);
      if (lookahead != 0) ADVANCE(7);
      END_STATE();
    case 10:
      ACCEPT_TOKEN(sym_inline_value);
      if (lookahead == '=') ADVANCE(15);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r') ADVANCE(11);
      END_STATE();
    case 11:
      ACCEPT_TOKEN(sym_inline_value);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r') ADVANCE(11);
      END_STATE();
    case 12:
      ACCEPT_TOKEN(aux_sym_block_value_token1);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(12);
      END_STATE();
    case 13:
      ACCEPT_TOKEN(aux_sym_block_value_token2);
      if (lookahead == '\t' ||
          lookahead == ' ') ADVANCE(13);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r') ADVANCE(14);
      END_STATE();
    case 14:
      ACCEPT_TOKEN(aux_sym_block_value_token2);
      if (lookahead != 0 &&
          lookahead != '\n' &&
          lookahead != '\r') ADVANCE(14);
      END_STATE();
    case 15:
      ACCEPT_TOKEN(anon_sym_SLASH_EQ);
      END_STATE();
    case 16:
      ACCEPT_TOKEN(sym__newline);
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
  [4] = {.lex_state = 3},
  [5] = {.lex_state = 3},
  [6] = {.lex_state = 4},
  [7] = {.lex_state = 4},
  [8] = {.lex_state = 4},
  [9] = {.lex_state = 4},
  [10] = {.lex_state = 5},
  [11] = {.lex_state = 5},
  [12] = {.lex_state = 5},
  [13] = {.lex_state = 5},
  [14] = {.lex_state = 5},
  [15] = {.lex_state = 13},
  [16] = {.lex_state = 0},
  [17] = {.lex_state = 13},
};

static const uint16_t ts_parse_table[LARGE_STATE_COUNT][SYMBOL_COUNT] = {
  [0] = {
    [ts_builtin_sym_end] = ACTIONS(1),
    [sym_key] = ACTIONS(1),
    [sym_assignment] = ACTIONS(1),
    [sym_inline_value] = ACTIONS(1),
    [aux_sym_block_value_token1] = ACTIONS(1),
    [anon_sym_SLASH_EQ] = ACTIONS(1),
    [sym__newline] = ACTIONS(1),
  },
  [1] = {
    [sym_document] = STATE(16),
    [sym__item] = STATE(2),
    [sym_entry] = STATE(2),
    [sym_comment] = STATE(2),
    [aux_sym_document_repeat1] = STATE(2),
    [ts_builtin_sym_end] = ACTIONS(3),
    [sym_key] = ACTIONS(5),
    [sym_assignment] = ACTIONS(7),
    [anon_sym_SLASH_EQ] = ACTIONS(9),
    [sym__newline] = ACTIONS(11),
  },
  [2] = {
    [sym__item] = STATE(3),
    [sym_entry] = STATE(3),
    [sym_comment] = STATE(3),
    [aux_sym_document_repeat1] = STATE(3),
    [ts_builtin_sym_end] = ACTIONS(13),
    [sym_key] = ACTIONS(5),
    [sym_assignment] = ACTIONS(7),
    [anon_sym_SLASH_EQ] = ACTIONS(9),
    [sym__newline] = ACTIONS(15),
  },
  [3] = {
    [sym__item] = STATE(3),
    [sym_entry] = STATE(3),
    [sym_comment] = STATE(3),
    [aux_sym_document_repeat1] = STATE(3),
    [ts_builtin_sym_end] = ACTIONS(17),
    [sym_key] = ACTIONS(19),
    [sym_assignment] = ACTIONS(22),
    [anon_sym_SLASH_EQ] = ACTIONS(25),
    [sym__newline] = ACTIONS(28),
  },
};

static const uint16_t ts_small_parse_table[] = {
  [0] = 5,
    ACTIONS(31), 1,
      ts_builtin_sym_end,
    ACTIONS(35), 1,
      sym_inline_value,
    STATE(10), 1,
      sym_block_value,
    STATE(11), 1,
      sym_value,
    ACTIONS(33), 4,
      sym_key,
      sym_assignment,
      anon_sym_SLASH_EQ,
      sym__newline,
  [19] = 5,
    ACTIONS(35), 1,
      sym_inline_value,
    ACTIONS(37), 1,
      ts_builtin_sym_end,
    STATE(10), 1,
      sym_block_value,
    STATE(13), 1,
      sym_value,
    ACTIONS(39), 4,
      sym_key,
      sym_assignment,
      anon_sym_SLASH_EQ,
      sym__newline,
  [38] = 4,
    ACTIONS(41), 1,
      ts_builtin_sym_end,
    ACTIONS(45), 1,
      aux_sym_block_value_token1,
    STATE(7), 1,
      aux_sym_block_value_repeat1,
    ACTIONS(43), 4,
      sym_key,
      sym_assignment,
      anon_sym_SLASH_EQ,
      sym__newline,
  [54] = 4,
    ACTIONS(47), 1,
      ts_builtin_sym_end,
    ACTIONS(51), 1,
      aux_sym_block_value_token1,
    STATE(7), 1,
      aux_sym_block_value_repeat1,
    ACTIONS(49), 4,
      sym_key,
      sym_assignment,
      anon_sym_SLASH_EQ,
      sym__newline,
  [70] = 3,
    ACTIONS(54), 1,
      sym__newline,
    ACTIONS(47), 2,
      ts_builtin_sym_end,
      aux_sym_block_value_token1,
    ACTIONS(49), 3,
      sym_key,
      sym_assignment,
      anon_sym_SLASH_EQ,
  [83] = 2,
    ACTIONS(57), 2,
      ts_builtin_sym_end,
      aux_sym_block_value_token1,
    ACTIONS(59), 4,
      sym_key,
      sym_assignment,
      anon_sym_SLASH_EQ,
      sym__newline,
  [94] = 1,
    ACTIONS(61), 5,
      ts_builtin_sym_end,
      sym_key,
      sym_assignment,
      anon_sym_SLASH_EQ,
      sym__newline,
  [102] = 1,
    ACTIONS(37), 5,
      ts_builtin_sym_end,
      sym_key,
      sym_assignment,
      anon_sym_SLASH_EQ,
      sym__newline,
  [110] = 1,
    ACTIONS(63), 5,
      ts_builtin_sym_end,
      sym_key,
      sym_assignment,
      anon_sym_SLASH_EQ,
      sym__newline,
  [118] = 1,
    ACTIONS(65), 5,
      ts_builtin_sym_end,
      sym_key,
      sym_assignment,
      anon_sym_SLASH_EQ,
      sym__newline,
  [126] = 1,
    ACTIONS(67), 1,
      sym_assignment,
  [130] = 1,
    ACTIONS(69), 1,
      aux_sym_block_value_token2,
  [134] = 1,
    ACTIONS(71), 1,
      ts_builtin_sym_end,
  [138] = 1,
    ACTIONS(73), 1,
      aux_sym_block_value_token2,
};

static const uint32_t ts_small_parse_table_map[] = {
  [SMALL_STATE(4)] = 0,
  [SMALL_STATE(5)] = 19,
  [SMALL_STATE(6)] = 38,
  [SMALL_STATE(7)] = 54,
  [SMALL_STATE(8)] = 70,
  [SMALL_STATE(9)] = 83,
  [SMALL_STATE(10)] = 94,
  [SMALL_STATE(11)] = 102,
  [SMALL_STATE(12)] = 110,
  [SMALL_STATE(13)] = 118,
  [SMALL_STATE(14)] = 126,
  [SMALL_STATE(15)] = 130,
  [SMALL_STATE(16)] = 134,
  [SMALL_STATE(17)] = 138,
};

static const TSParseActionEntry ts_parse_actions[] = {
  [0] = {.entry = {.count = 0, .reusable = false}},
  [1] = {.entry = {.count = 1, .reusable = false}}, RECOVER(),
  [3] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_document, 0),
  [5] = {.entry = {.count = 1, .reusable = true}}, SHIFT(14),
  [7] = {.entry = {.count = 1, .reusable = true}}, SHIFT(4),
  [9] = {.entry = {.count = 1, .reusable = true}}, SHIFT(15),
  [11] = {.entry = {.count = 1, .reusable = true}}, SHIFT(2),
  [13] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_document, 1),
  [15] = {.entry = {.count = 1, .reusable = true}}, SHIFT(3),
  [17] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2),
  [19] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(14),
  [22] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(4),
  [25] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(15),
  [28] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_document_repeat1, 2), SHIFT_REPEAT(3),
  [31] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_entry, 1),
  [33] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_entry, 1),
  [35] = {.entry = {.count = 1, .reusable = false}}, SHIFT(10),
  [37] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_entry, 2),
  [39] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_entry, 2),
  [41] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_block_value, 2),
  [43] = {.entry = {.count = 1, .reusable = false}}, REDUCE(sym_block_value, 2),
  [45] = {.entry = {.count = 1, .reusable = true}}, SHIFT(17),
  [47] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_block_value_repeat1, 2),
  [49] = {.entry = {.count = 1, .reusable = false}}, REDUCE(aux_sym_block_value_repeat1, 2),
  [51] = {.entry = {.count = 2, .reusable = true}}, REDUCE(aux_sym_block_value_repeat1, 2), SHIFT_REPEAT(17),
  [54] = {.entry = {.count = 2, .reusable = false}}, REDUCE(aux_sym_block_value_repeat1, 2), SHIFT_REPEAT(9),
  [57] = {.entry = {.count = 1, .reusable = true}}, REDUCE(aux_sym_block_value_repeat1, 3),
  [59] = {.entry = {.count = 1, .reusable = false}}, REDUCE(aux_sym_block_value_repeat1, 3),
  [61] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_value, 1),
  [63] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_comment, 2),
  [65] = {.entry = {.count = 1, .reusable = true}}, REDUCE(sym_entry, 3),
  [67] = {.entry = {.count = 1, .reusable = true}}, SHIFT(5),
  [69] = {.entry = {.count = 1, .reusable = true}}, SHIFT(12),
  [71] = {.entry = {.count = 1, .reusable = true}},  ACCEPT_INPUT(),
  [73] = {.entry = {.count = 1, .reusable = true}}, SHIFT(8),
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
