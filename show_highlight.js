#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m', 
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
};

// Color mapping for highlight groups
const highlightColors = {
  'variable.other.member': colors.blue,
  'operator': colors.yellow,
  'string': colors.green,
  'comment.line': colors.gray,
  'punctuation.indent': colors.cyan
};

// Get file path from command line argument
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node show_highlight.js <ccl-file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`Error: File '${filePath}' not found`);
  process.exit(1);
}

const code = fs.readFileSync(filePath, 'utf8');
const lines = code.split('\n');

try {
  // Run tree-sitter query to get highlighting info
  const queryOutput = execSync(`npx tree-sitter query queries/highlights.scm "${filePath}"`, {encoding: 'utf8'});
  
  // Parse the query output to extract highlights
  const highlights = [];
  const queryLines = queryOutput.split('\n').filter(line => line.includes('capture:'));
  
  for (const line of queryLines) {
    const match = line.match(/capture: \d+ - ([^,]+), start: \((\d+), (\d+)\), end: \((\d+), (\d+)\), text: `([^`]*)`/);
    if (match) {
      const [, type, startRow, startCol, endRow, endCol, text] = match;
      highlights.push({
        type: type.trim(),
        startRow: parseInt(startRow),
        startCol: parseInt(startCol),
        endRow: parseInt(endRow),
        endCol: parseInt(endCol),
        text: text
      });
    }
  }
  
  // Sort highlights by position
  highlights.sort((a, b) => {
    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
    return a.startCol - b.startCol;
  });
  
  // Apply highlighting to each line
  const highlightedLines = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let highlightedLine = '';
    let pos = 0;
    
    // Find highlights for this line
    const lineHighlights = highlights.filter(h => h.startRow === i);
    
    for (const highlight of lineHighlights) {
      // Add unhighlighted text before this highlight
      highlightedLine += line.slice(pos, highlight.startCol);
      
      // Add highlighted text
      const color = highlightColors[highlight.type] || colors.reset;
      highlightedLine += color + highlight.text + colors.reset;
      
      pos = highlight.endCol;
    }
    
    // Add remaining unhighlighted text
    highlightedLine += line.slice(pos);
    highlightedLines.push(highlightedLine);
  }
  
  // Output the syntax-highlighted content
  console.log(highlightedLines.join('\n'));
  
} catch (error) {
  // Fallback: just output the raw content if highlighting fails
  console.log(code);
}