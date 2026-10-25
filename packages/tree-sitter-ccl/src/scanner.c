#include <tree_sitter/alloc.h>
#include <tree_sitter/parser.h>

#include <stdint.h>
#include <string.h>

enum TokenType { NEWLINE, INDENT, DEDENT, ENTRY_START, ERROR_SENTINEL };

enum { TAB_WIDTH = 8 };

typedef struct {
	uint32_t baseline;
	bool has_baseline;
	bool at_line_start;
	bool in_block;
} Scanner;

static bool is_newline(int32_t character) {
	return character == '\n' || character == '\r';
}

static void advance_newline(TSLexer *lexer) {
	if (lexer->lookahead == '\r') {
		lexer->advance(lexer, false);
		if (lexer->lookahead == '\n') {
			lexer->advance(lexer, false);
		}
	} else {
		lexer->advance(lexer, false);
	}
}

static uint32_t measure_indent(TSLexer *lexer) {
	uint32_t indent = lexer->get_column(lexer);
	while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
		indent += lexer->lookahead == '\t' ? TAB_WIDTH : 1;
		lexer->advance(lexer, false);
	}
	return indent;
}

void *tree_sitter_ccl_external_scanner_create(void) {
	Scanner *scanner = ts_calloc(1, sizeof(Scanner));
	scanner->at_line_start = true;
	return scanner;
}

void tree_sitter_ccl_external_scanner_destroy(void *payload) {
	ts_free(payload);
}

unsigned tree_sitter_ccl_external_scanner_serialize(void *payload, char *buffer) {
	const Scanner *scanner = payload;
	memcpy(buffer, &scanner->baseline, sizeof(scanner->baseline));
	buffer[4] = scanner->has_baseline;
	buffer[5] = scanner->at_line_start;
	buffer[6] = scanner->in_block;
	return 7;
}

void tree_sitter_ccl_external_scanner_deserialize(void *payload,
											   const char *buffer,
											   unsigned length) {
	Scanner *scanner = payload;
	*scanner = (Scanner){.at_line_start = true};
	if (length == 7) {
		memcpy(&scanner->baseline, buffer, sizeof(scanner->baseline));
		scanner->has_baseline = buffer[4];
		scanner->at_line_start = buffer[5];
		scanner->in_block = buffer[6];
	}
}

bool tree_sitter_ccl_external_scanner_scan(void *payload, TSLexer *lexer,
										 const bool *valid_symbols) {
	Scanner *scanner = payload;
	if (valid_symbols[ERROR_SENTINEL]) {
		return false;
	}

	if (lexer->eof(lexer)) {
		if (scanner->in_block && valid_symbols[DEDENT]) {
			scanner->in_block = false;
			lexer->result_symbol = DEDENT;
			return true;
		}
		return false;
	}

	if (is_newline(lexer->lookahead) && valid_symbols[NEWLINE] &&
		!(scanner->at_line_start && valid_symbols[INDENT])) {
		advance_newline(lexer);
		lexer->mark_end(lexer);
		scanner->at_line_start = true;
		lexer->result_symbol = NEWLINE;
		return true;
	}

	if (!scanner->at_line_start ||
		(lexer->get_column(lexer) != 0 && scanner->has_baseline &&
		 !lexer->is_at_included_range_start(lexer))) {
		return false;
	}

	// DEDENT must leave the following entry's indentation in the input.
	lexer->mark_end(lexer);
	uint32_t indent = measure_indent(lexer);
	bool blank_line = false;

	while (is_newline(lexer->lookahead)) {
		advance_newline(lexer);
		if (!blank_line) {
			lexer->mark_end(lexer);
		}
		blank_line = true;
		if (!valid_symbols[INDENT] || scanner->in_block || !scanner->has_baseline) {
			break;
		}
		indent = measure_indent(lexer);
	}

	// Blank lines before a value belong to that value. Probe ahead without
	// committing them unless a block actually follows.
	if (!scanner->in_block && scanner->has_baseline && valid_symbols[INDENT] &&
		!lexer->eof(lexer) && !is_newline(lexer->lookahead) &&
		indent > scanner->baseline) {
		lexer->mark_end(lexer);
		scanner->in_block = true;
		scanner->at_line_start = false;
		lexer->result_symbol = INDENT;
		return true;
	}

	if (blank_line) {
		if (!valid_symbols[NEWLINE]) {
			return false;
		}
		scanner->at_line_start = true;
		lexer->result_symbol = NEWLINE;
		return true;
	}

	// One parse owns one baseline and raw value blocks, not a stack of
	// Python-style indentation levels. Each injection gets a new scanner.
	if (scanner->in_block && valid_symbols[DEDENT] &&
		(lexer->eof(lexer) || indent <= scanner->baseline)) {
		scanner->in_block = false;
		lexer->result_symbol = DEDENT;
		return true;
	}

	if (!scanner->in_block && valid_symbols[ENTRY_START] && !lexer->eof(lexer) &&
		(!scanner->has_baseline || indent <= scanner->baseline)) {
		if (!scanner->has_baseline) {
			scanner->baseline = indent;
			scanner->has_baseline = true;
		}
		lexer->mark_end(lexer);
		scanner->at_line_start = false;
		lexer->result_symbol = ENTRY_START;
		return true;
	}

	return false;
}
