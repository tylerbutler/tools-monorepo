#include <tree_sitter/parser.h>
#include <cstdio>
#include <cstring>
#include <vector>
#include <queue>

// Debug logging disabled for clean output
// #define DEBUG_LOG(fmt, ...) fprintf(stderr, "[SCANNER] " fmt "\n", ##__VA_ARGS__)
#define DEBUG_LOG(fmt, ...)

namespace {

enum TokenType {
  NEWLINE,
  INDENT,
  DEDENT
};

struct Scanner {
  std::vector<uint16_t> indent_stack;
  std::queue<TokenType> pending_tokens;
  bool at_line_start;
  uint16_t current_indent;

  Scanner() : at_line_start(true), current_indent(0) {
    indent_stack.push_back(0); // Base indentation level
    DEBUG_LOG("Scanner created with base indentation");
  }

  bool scan(TSLexer *lexer, const bool *valid_symbols) {
    DEBUG_LOG("=== scan() called ===");
    DEBUG_LOG("Lookahead: '%c' (%d)", 
              lexer->lookahead >= 32 ? lexer->lookahead : '?', lexer->lookahead);
    DEBUG_LOG("Valid symbols: NEWLINE=%d INDENT=%d DEDENT=%d", 
              valid_symbols[NEWLINE], valid_symbols[INDENT], valid_symbols[DEDENT]);
    DEBUG_LOG("State: at_line_start=%d, current_indent=%d, stack_size=%zu, stack_top=%d",
              at_line_start, current_indent, indent_stack.size(), 
              indent_stack.empty() ? -1 : indent_stack.back());

    // Handle pending DEDENT tokens first
    if (!pending_tokens.empty()) {
      TokenType token = pending_tokens.front();
      pending_tokens.pop();
      DEBUG_LOG("Returning pending DEDENT token");
      lexer->result_symbol = token;
      return true;
    }

    // Handle newlines - can occur anywhere, not just at line start
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

    // Handle DEDENT at newlines when DEDENT is expected but NEWLINE is not
    if ((lexer->lookahead == '\n' || lexer->lookahead == '\r') && valid_symbols[DEDENT] && !valid_symbols[NEWLINE] && !at_line_start) {
      DEBUG_LOG("At newline with DEDENT expected, checking indentation of next line");
      
      // Look ahead to see the next line's indentation without consuming the newline yet
      size_t saved_position = lexer->get_column(lexer);
      
      // Skip the current newline temporarily
      if (lexer->lookahead == '\r') {
        lexer->advance(lexer, false);
        if (lexer->lookahead == '\n') {
          lexer->advance(lexer, false);
        }
      } else {
        lexer->advance(lexer, false);
      }
      
      // Count next line's indentation
      uint16_t next_indent = 0;
      while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
        if (lexer->lookahead == ' ') {
          next_indent++;
        } else if (lexer->lookahead == '\t') {
          next_indent += 8;
        }
        lexer->advance(lexer, false);
      }
      
      uint16_t current_stack_top = indent_stack.back();
      DEBUG_LOG("Next line indentation: %d, current stack top: %d", next_indent, current_stack_top);
      
      if (next_indent < current_stack_top) {
        DEBUG_LOG("Next line has less indentation, generating DEDENT tokens");
        
        // Generate DEDENT tokens for all levels we're popping
        while (!indent_stack.empty() && indent_stack.back() > next_indent) {
          indent_stack.pop_back();
          pending_tokens.push(DEDENT);
          DEBUG_LOG("Queued DEDENT, stack now size %zu", indent_stack.size());
        }
        
        // Ensure we have the next indentation level in the stack
        if (indent_stack.empty() || indent_stack.back() != next_indent) {
          indent_stack.push_back(next_indent);
        }
        
        if (!pending_tokens.empty()) {
          TokenType token = pending_tokens.front();
          pending_tokens.pop();
          DEBUG_LOG("Returning DEDENT token, parser will handle newline separately");
          lexer->result_symbol = token;
          return true;
        }
      } else {
        DEBUG_LOG("Next line indentation same or greater, no DEDENT needed");
      }
    }

    // Handle indentation at the start of a line
    if (at_line_start) {
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
      
      at_line_start = false;
      uint16_t previous_indent = indent_stack.back();
      
      DEBUG_LOG("Counted indentation: current=%d, previous=%d", current_indent, previous_indent);
      
      if (current_indent > previous_indent && valid_symbols[INDENT]) {
        DEBUG_LOG("Indentation increased, pushing to stack and returning INDENT");
        indent_stack.push_back(current_indent);
        lexer->result_symbol = INDENT;
        return true;
      } else if (current_indent < previous_indent && valid_symbols[DEDENT]) {
        DEBUG_LOG("Indentation decreased, generating DEDENT tokens");
        
        // Generate DEDENT tokens for all levels we're popping
        while (!indent_stack.empty() && indent_stack.back() > current_indent) {
          indent_stack.pop_back();
          pending_tokens.push(DEDENT);
          DEBUG_LOG("Queued DEDENT, stack now size %zu", indent_stack.size());
        }
        
        // Ensure we have the current indentation level in the stack
        if (indent_stack.empty() || indent_stack.back() != current_indent) {
          indent_stack.push_back(current_indent);
        }
        
        if (!pending_tokens.empty()) {
          TokenType token = pending_tokens.front();
          pending_tokens.pop();
          DEBUG_LOG("Returning first DEDENT token");
          lexer->result_symbol = token;
          return true;
        }
      }
    }

    // Handle EOF - emit all remaining DEDENT tokens  
    if (lexer->lookahead == 0 && indent_stack.size() > 1 && valid_symbols[DEDENT]) {
      DEBUG_LOG("EOF detected, generating remaining DEDENT tokens");
      
      while (indent_stack.size() > 1) {
        indent_stack.pop_back();
        pending_tokens.push(DEDENT);
        DEBUG_LOG("Queued EOF DEDENT, stack now size %zu", indent_stack.size());
      }
      
      if (!pending_tokens.empty()) {
        TokenType token = pending_tokens.front();
        pending_tokens.pop();
        DEBUG_LOG("Returning EOF DEDENT token");
        lexer->result_symbol = token;
        return true;
      }
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
    memcpy(buffer + offset, &current_indent, sizeof(uint16_t));
    offset += sizeof(uint16_t);
    
    // Serialize indent_stack size
    uint16_t stack_size = static_cast<uint16_t>(indent_stack.size());
    memcpy(buffer + offset, &stack_size, sizeof(uint16_t));
    offset += sizeof(uint16_t);
    
    // Serialize indent_stack contents
    for (uint16_t indent : indent_stack) {
      if (offset + sizeof(uint16_t) >= 1024) break; // Avoid buffer overflow
      memcpy(buffer + offset, &indent, sizeof(uint16_t));
      offset += sizeof(uint16_t);
    }
    
    // Serialize pending_tokens size
    uint16_t pending_size = static_cast<uint16_t>(pending_tokens.size());
    memcpy(buffer + offset, &pending_size, sizeof(uint16_t));
    offset += sizeof(uint16_t);
    
    // Note: We don't serialize pending_tokens contents since they should be consumed immediately
    
    DEBUG_LOG("Serialized %d bytes: at_line_start=%d, current=%d, stack_size=%d", 
              offset, at_line_start, current_indent, stack_size);
    return offset;
  }

  void deserialize(const char *buffer, unsigned length) {
    DEBUG_LOG("deserialize() called with %d bytes", length);
    
    if (length == 0) {
      at_line_start = true;
      current_indent = 0;
      indent_stack.clear();
      indent_stack.push_back(0);
      while (!pending_tokens.empty()) pending_tokens.pop();
      DEBUG_LOG("Empty buffer, reset to defaults");
      return;
    }
    
    unsigned offset = 0;
    
    // Deserialize at_line_start
    if (offset < length) {
      at_line_start = buffer[offset] == 1;
      offset++;
    }
    
    // Deserialize current_indent
    if (offset + sizeof(uint16_t) <= length) {
      memcpy(&current_indent, buffer + offset, sizeof(uint16_t));
      offset += sizeof(uint16_t);
    }
    
    // Deserialize indent_stack
    if (offset + sizeof(uint16_t) <= length) {
      uint16_t stack_size;
      memcpy(&stack_size, buffer + offset, sizeof(uint16_t));
      offset += sizeof(uint16_t);
      
      indent_stack.clear();
      for (uint16_t i = 0; i < stack_size && offset + sizeof(uint16_t) <= length; i++) {
        uint16_t indent;
        memcpy(&indent, buffer + offset, sizeof(uint16_t));
        indent_stack.push_back(indent);
        offset += sizeof(uint16_t);
      }
      
      if (indent_stack.empty()) {
        indent_stack.push_back(0); // Ensure base level
      }
    }
    
    // Clear pending tokens on deserialization
    while (!pending_tokens.empty()) pending_tokens.pop();
    
    DEBUG_LOG("Deserialized: at_line_start=%d, current=%d, stack_size=%zu", 
              at_line_start, current_indent, indent_stack.size());
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