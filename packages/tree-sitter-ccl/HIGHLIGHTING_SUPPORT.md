# CCL Tree-sitter Highlighting Support Matrix

## The Two Levels of Highlighting

### 🟡 **Basic Level** (Grammar-only highlighting)
- Uses only the base tree-sitter grammar
- Nested content appears as monochrome strings
- Fast, simple, works everywhere

### 🟢 **Enhanced Level** (Grammar + Injections)  
- Uses tree-sitter injection mechanism
- Nested content gets full CCL syntax highlighting
- Requires injection-aware tooling

---

## Tool Support Breakdown

### ⚡ **BASIC Highlighting Tools**

#### Command Line Tools
- `tree-sitter parse` - Raw parsing only
- `tree-sitter query` - Query results only  
- Basic tree-sitter language bindings
- Simple highlighting implementations

#### Basic Editors/IDEs
- Editors with basic tree-sitter support but no injections
- Older syntax highlighting systems
- Simple web-based syntax highlighters

#### Example Output:
```
config =
  host = localhost    ← 🟢 All green (treated as string)
  port = 8080         ← 🟢 All green (treated as string)
  nested =            ← 🟢 All green (treated as string) 
    user = admin      ← 🟢 All green (treated as string)
```

---

### 🌈 **ENHANCED Highlighting Tools**

#### Modern Editors (Full Support)
- **Neovim** (nvim-treesitter) - ✅ Full injection support
- **VS Code** (tree-sitter extensions) - ✅ Full injection support  
- **Helix** - ✅ Built-in injection support
- **Zed** - ✅ Advanced tree-sitter integration
- **Emacs** (tree-sitter mode) - ✅ Injection-aware

#### Language Servers
- Language servers implementing tree-sitter injections
- Advanced IDE features (semantic highlighting, navigation)
- Code analysis tools with injection parsing

#### Web Platforms
- **GitHub** (custom injection-like rules) - ✅ Enhanced highlighting
- **GitLab** (syntax highlighting) - Varies by implementation
- Advanced web-based code viewers

#### Example Output:
```
config =
  🔵 host 🟡 = 🟢 localhost      ← Blue key, yellow =, green value
  🔵 port 🟡 = 🟢 8080           ← Blue key, yellow =, green value  
  🔵 nested 🟡 =                 ← Blue key, yellow =
    🔵 user 🟡 = 🟢 admin        ← Blue key, yellow =, green value
```

---

### 🔧 **SIMULATED Enhanced Tools**

#### Custom Implementations
- Our `show_highlight_enhanced.js` - Manual injection simulation
- Custom parsers with regex-based enhancement  
- Tools that implement their own nested parsing logic

---

## Real-World Impact

### **For End Users:**

#### **Basic Tools** (Majority of tools today)
- ✅ **Pros**: Fast, works everywhere, reliable structure parsing
- ❌ **Cons**: Nested content less visually distinct, harder to read complex CCL

#### **Enhanced Tools** (Modern editors/IDEs)  
- ✅ **Pros**: Beautiful, fully-highlighted nested CCL, easier to read/debug
- ✅ **Pros**: Better developer experience, semantic understanding
- ❌ **Cons**: Requires modern tooling with injection support

---

## Migration Path

### **Phase 1: Basic Support** (Available Now)
All tools get correct parsing + basic highlighting immediately

### **Phase 2: Enhanced Support** (Gradual Rollout)
Modern editors gradually adopt injection support for better UX

### **Phase 3: Universal Enhanced** (Future)
As injection support becomes standard, most tools will show enhanced highlighting

---

## Recommendation

**Ship the current implementation** - it provides:
1. ✅ **Universal compatibility** - works with all tree-sitter tools
2. ✅ **Correct parsing** - no ambiguity or conflicts  
3. ✅ **Upgrade path** - modern tools automatically get enhanced highlighting
4. ✅ **Future-proof** - injection mechanism is the industry standard

The limitation is temporary and will resolve naturally as tooling evolves!