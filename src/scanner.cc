#include <tree_sitter/parser.h>
#include <cstdio>
#include <cstring>

// Always enable debug logging for now
#define DEBUG_LOG(fmt, ...) fprintf(stderr, "[SCANNER] " fmt "\n", ##__VA_ARGS__)

namespace {

enum TokenType {
  NEWLINE,
  INDENT,
  DEDENT
};

struct Scanner {
  bool at_line_start;
  int current_indent;
  int previous_indent;

  Scanner() : at_line_start(true), current_indent(0), previous_indent(0) {
    DEBUG_LOG("Scanner created");
  }

  bool scan(TSLexer *lexer, const bool *valid_symbols) {
    DEBUG_LOG("=== scan() called ===");
    DEBUG_LOG("Lookahead: '%c' (%d)", 
              lexer->lookahead >= 32 ? lexer->lookahead : '?', lexer->lookahead);
    DEBUG_LOG("Valid symbols: NEWLINE=%d INDENT=%d DEDENT=%d", 
              valid_symbols[NEWLINE], valid_symbols[INDENT], valid_symbols[DEDENT]);
    DEBUG_LOG("State: at_line_start=%d, current_indent=%d, previous_indent=%d",
              at_line_start, current_indent, previous_indent);

    // Handle newlines
    if ((lexer->lookahead == '\n' || lexer->lookahead == '\r') && valid_symbols[NEWLINE]) {
      DEBUG_LOG("Found newline character");
      
      // Consume the newline
      if (lexer->lookahead == '\r') {
        lexer->advance(lexer, false);
        if (lexer->lookahead == '\n') {
          lexer->advance(lexer, false);
        }
      } else {
        lexer->advance(lexer, false);
      }
      
      at_line_start = true;
      lexer->result_symbol = NEWLINE;
      DEBUG_LOG("Returning NEWLINE token, set at_line_start=true");
      return true;
    }

    // Handle indentation at the start of a line
    if (at_line_start && (lexer->lookahead == ' ' || lexer->lookahead == '\t')) {
      DEBUG_LOG("At line start, counting indentation");
      
      // Count indentation
      current_indent = 0;
      while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
        if (lexer->lookahead == ' ') {
          current_indent++;
        } else if (lexer->lookahead == '\t') {
          current_indent += 8;  // Tab = 8 spaces
        }
        lexer->advance(lexer, false);
      }
      
      DEBUG_LOG("Counted indentation: current=%d, previous=%d", current_indent, previous_indent);
      
      at_line_start = false;
      
      if (current_indent > previous_indent && valid_symbols[INDENT]) {
        DEBUG_LOG("Indentation increased, returning INDENT");
        previous_indent = current_indent;
        lexer->result_symbol = INDENT;
        return true;
      } else if (current_indent < previous_indent && valid_symbols[DEDENT]) {
        DEBUG_LOG("Indentation decreased, returning DEDENT");
        previous_indent = current_indent;
        lexer->result_symbol = DEDENT;
        return true;
      }
    }

    // Handle EOF - emit DEDENT if we have remaining indentation
    if (lexer->lookahead == 0 && previous_indent > 0 && valid_symbols[DEDENT]) {
      DEBUG_LOG("EOF detected with remaining indentation, returning DEDENT");
      previous_indent = 0;
      lexer->result_symbol = DEDENT;
      return true;
    }

    // Reset at_line_start if we encounter non-whitespace
    if (at_line_start && lexer->lookahead != ' ' && lexer->lookahead != '\t' && 
        lexer->lookahead != '\n' && lexer->lookahead != '\r' && lexer->lookahead != 0) {
      DEBUG_LOG("Non-whitespace at line start, resetting flag");
      at_line_start = false;
    }

    DEBUG_LOG("No token matched, returning false");
    return false;
  }

  unsigned serialize(char *buffer) {
    DEBUG_LOG("serialize() called");
    unsigned offset = 0;
    
    // Serialize at_line_start
    buffer[offset] = at_line_start ? 1 : 0;
    offset++;
    
    // Serialize current_indent
    memcpy(buffer + offset, &current_indent, sizeof(int));
    offset += sizeof(int);
    
    // Serialize previous_indent
    memcpy(buffer + offset, &previous_indent, sizeof(int));
    offset += sizeof(int);
    
    DEBUG_LOG("Serialized %d bytes: at_line_start=%d, current=%d, previous=%d", 
              offset, at_line_start, current_indent, previous_indent);
    return offset;
  }

  void deserialize(const char *buffer, unsigned length) {
    DEBUG_LOG("deserialize() called with %d bytes", length);
    
    if (length == 0) {
      at_line_start = true;
      current_indent = 0;
      previous_indent = 0;
      DEBUG_LOG("Empty buffer, reset to defaults");
      return;
    }
    
    unsigned offset = 0;
    
    // Deserialize at_line_start
    at_line_start = buffer[offset] == 1;
    offset++;
    
    // Deserialize current_indent
    if (offset + sizeof(int) <= length) {
      memcpy(&current_indent, buffer + offset, sizeof(int));
      offset += sizeof(int);
    }
    
    // Deserialize previous_indent
    if (offset + sizeof(int) <= length) {
      memcpy(&previous_indent, buffer + offset, sizeof(int));
      offset += sizeof(int);
    }
    
    DEBUG_LOG("Deserialized: at_line_start=%d, current=%d, previous=%d", 
              at_line_start, current_indent, previous_indent);
  }
};

} // namespace

extern "C" {

void *tree_sitter_ccl_external_scanner_create() {
  DEBUG_LOG("Creating external scanner");
  return new Scanner();
}

void tree_sitter_ccl_external_scanner_destroy(void *payload) {
  DEBUG_LOG("Destroying external scanner");
  delete static_cast<Scanner*>(payload);
}

unsigned tree_sitter_ccl_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = static_cast<Scanner*>(payload);
  return scanner->serialize(buffer);
}

void tree_sitter_ccl_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = static_cast<Scanner*>(payload);
  scanner->deserialize(buffer, length);
}

bool tree_sitter_ccl_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = static_cast<Scanner*>(payload);
  return scanner->scan(lexer, valid_symbols);
}

} // extern "C"