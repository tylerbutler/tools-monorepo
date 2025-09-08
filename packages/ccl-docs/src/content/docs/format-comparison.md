---
title: Configuration Format Comparison
description: Comparing CCL with JSON, YAML, TOML, INI, and environment variables to help you choose the right format for your project.
---

## Format Comparison Overview

| Feature | JSON | YAML | TOML | INI | Env Vars | CCL |
|---------|------|------|------|-----|----------|-----|
| Comments | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Human Readable | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Hierarchical | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Lists/Arrays | ✅ | ✅ | ✅ | ❌ | ⚠️ | ✅ |
| String Quoting | Required | Optional | Mixed | Optional | N/A | Optional |
| Multiline Values | Escaped | Native | Limited | ❌ | ❌ | ✅ |
| Duplicate Keys | Error | Error | Error | Overwrite | Overwrite | Merge |

## JSON vs CCL

### Basic Structure

**JSON (config.json):**
```json
{
  "app": {
    "name": "MyApplication", 
    "version": "1.2.3",
    "debug": true
  },
  "server": {
    "host": "localhost",
    "port": 8080,
    "ssl": {
      "enabled": true,
      "cert_file": "/path/to/cert.pem"
    }
  },
  "database": {
    "connections": [
      "postgres://db1.example.com/myapp",
      "postgres://db2.example.com/myapp"
    ]
  }
}
```

**CCL (config.ccl):**
```ccl
/= Application Configuration
app.name = MyApplication
app.version = 1.2.3
app.debug = true

/= Server Configuration  
server.host = localhost
server.port = 8080
server.ssl.enabled = true
server.ssl.cert_file = /path/to/cert.pem

/= Database Configuration
database.connections =
  = postgres://db1.example.com/myapp
  = postgres://db2.example.com/myapp
```

### Key Differences

- **Comments**: JSON has no comment support; CCL uses `/=` for documentation
- **Quotes**: JSON requires quotes on all strings; CCL treats everything as strings
- **Readability**: CCL is more readable with less punctuation
- **Lists**: JSON arrays `["a", "b"]` become CCL lists with `= a` and `= b`

### When to Choose Each

- **JSON**: API responses, data interchange, when you need strict syntax
- **CCL**: Human-authored configuration files, when you need comments and documentation

## YAML vs CCL

### Basic Structure

**YAML (config.yaml):**
```yaml
# Application settings
app:
  name: MyApplication
  version: "1.2.3"
  debug: true
  
# Server settings
server:
  host: localhost
  port: 8080
  middlewares:
    - cors
    - authentication
    - logging
    
# Database settings
database:
  primary:
    host: db1.example.com
    port: 5432
  replica:
    host: db2.example.com  
    port: 5432
```

**CCL (config.ccl):**
```ccl
/= Application settings
app.name = MyApplication
app.version = 1.2.3
app.debug = true

/= Server settings
server.host = localhost
server.port = 8080
server.middlewares =
  = cors
  = authentication
  = logging

/= Database settings
database.primary.host = db1.example.com
database.primary.port = 5432
database.replica.host = db2.example.com
database.replica.port = 5432
```

### Key Differences

- **Indentation**: YAML relies on precise indentation; CCL uses explicit structure
- **Lists**: YAML uses `- item`; CCL uses `= item`  
- **Quotes**: YAML has complex quoting rules; CCL treats all values as strings
- **Error-prone**: YAML indentation errors are common; CCL structure is more explicit

### When to Choose Each

- **YAML**: Ansible playbooks, Docker Compose, when indentation feels natural
- **CCL**: When you want explicit structure without indentation sensitivity

## TOML vs CCL

### Basic Structure

**TOML (config.toml):**
```toml
[app]
name = "MyApplication"
version = "1.2.3"
debug = true

[server]
host = "localhost"
port = 8080

[server.ssl]
enabled = true
cert_file = "/path/to/cert.pem"

[database]
hosts = ["localhost", "replica.example.com"]

[database.primary]
host = "localhost"
port = 5432
```

**CCL (config.ccl):**
```ccl
/= Application configuration
app.name = MyApplication
app.version = 1.2.3
app.debug = true

/= Server configuration
server.host = localhost
server.port = 8080
server.ssl.enabled = true
server.ssl.cert_file = /path/to/cert.pem

/= Database configuration
database.hosts =
  = localhost
  = replica.example.com

database.primary.host = localhost
database.primary.port = 5432
```

### Key Differences

- **Sections**: TOML uses `[section]` headers; CCL uses dot notation or nested sections
- **Arrays**: TOML uses `["a", "b"]`; CCL uses list syntax with `= item`
- **Types**: TOML has strict typing; CCL treats all values as strings with smart parsing
- **Verbosity**: CCL is less verbose with fewer brackets and quotes

### When to Choose Each

- **TOML**: Rust projects (Cargo.toml), Python packaging, when you want strict typing
- **CCL**: When you prefer simpler syntax and don't need strict types

## INI vs CCL

### Basic Structure

**INI (config.ini):**
```ini
[app]
name=MyApplication
version=1.2.3
debug=true

[server]
host=localhost
port=8080

[database]
host=localhost
port=5432
name=myapp_dev
# No native array support
url1=postgres://db1:5432/myapp
url2=postgres://db2:5432/myapp
```

**CCL (config.ccl):**
```ccl
/= Application Configuration
app.name = MyApplication
app.version = 1.2.3
app.debug = true

/= Server Configuration
server.host = localhost
server.port = 8080

/= Database Configuration  
database.host = localhost
database.port = 5432
database.name = myapp_dev
database.urls =
  = postgres://db1:5432/myapp
  = postgres://db2:5432/myapp
```

### Key Differences

- **Arrays**: INI has no native array support; CCL has built-in list syntax
- **Nesting**: INI supports only one level of sections; CCL supports deep hierarchies
- **Comments**: Both support comments, but CCL's `/=` creates structured documentation
- **Parsing**: INI parsing varies by implementation; CCL has consistent rules

### When to Choose Each

- **INI**: Legacy Windows applications, simple key-value configurations
- **CCL**: When you need arrays, deep nesting, or consistent parsing

## Environment Variables vs CCL

### Basic Structure

**Environment Variables (.env):**
```bash
APP_NAME=MyApplication
APP_VERSION=1.2.3  
APP_DEBUG=true
SERVER_HOST=localhost
SERVER_PORT=8080
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=myapp_dev
DATABASE_URLS=postgres://db1:5432/myapp,postgres://db2:5432/myapp
```

**CCL (config.ccl):**
```ccl
/= Application Configuration
app.name = MyApplication
app.version = 1.2.3
app.debug = true

/= Server Configuration
server.host = localhost
server.port = 8080

/= Database Configuration  
database.host = localhost
database.port = 5432
database.name = myapp_dev
database.urls =
  = postgres://db1:5432/myapp
  = postgres://db2:5432/myapp
```

### Key Differences

- **Structure**: Environment variables are flat; CCL supports hierarchy
- **Arrays**: Environment variables use delimited strings; CCL has native lists
- **Documentation**: Environment variables have no comment support; CCL has rich documentation
- **Readability**: Environment variables become unwieldy at scale; CCL stays organized

### When to Choose Each

- **Environment Variables**: Deployment secrets, runtime overrides, containerized applications
- **CCL**: Complex configuration files, when you need structure and documentation

## Common Conversion Patterns

### Arrays and Lists

**From JSON:**
```json
{"items": ["a", "b", "c"]}
```

**From YAML:**
```yaml
items:
  - a
  - b  
  - c
```

**From TOML:**
```toml
items = ["a", "b", "c"]
```

**To CCL:**
```ccl
items =
  = a
  = b
  = c
```

### Nested Objects

**From JSON:**
```json
{
  "database": {
    "primary": {"host": "db1", "port": 5432},
    "replica": {"host": "db2", "port": 5432}
  }
}
```

**To CCL (Flat):**
```ccl
database.primary.host = db1
database.primary.port = 5432
database.replica.host = db2  
database.replica.port = 5432
```

**To CCL (Nested):**
```ccl
database =
  primary =
    host = db1
    port = 5432
  replica =
    host = db2
    port = 5432
```

### Comments and Documentation

**From YAML:**
```yaml
# Database configuration
database:
  host: localhost  # Primary database host
  port: 5432
```

**To CCL:**
```ccl
/= Database configuration
database =
  host = localhost
  /= Primary database host
  port = 5432
```

## Format Conversion Tools

### Automated Conversion

Some CCL implementations provide format conversion utilities:

```bash
# Example conversion commands (implementation-specific)
ccl-convert --from json config.json config.ccl
ccl-convert --from yaml config.yaml config.ccl
ccl-convert --from toml config.toml config.ccl
```

### Manual Conversion Process

1. **Analysis**
   - Identify nested objects and arrays
   - Note existing comment patterns
   - Check for special characters in keys/values

2. **Conversion**
   - Remove format-specific syntax (brackets, quotes, etc.)
   - Convert arrays to CCL list syntax
   - Update comment format to `/=`
   - Choose between flat dot notation or nested structure

3. **Validation**
   - Parse converted CCL files
   - Verify all values are accessible
   - Test with your application

## Format Selection Guide

### Use CCL when:
- Human-authored configuration files
- You need rich inline documentation  
- Configuration requires complex nested structures
- You want merge semantics for duplicate keys
- Simplicity and readability are priorities

### Keep JSON when:
- Building REST APIs or web services
- Exchanging data between systems
- You need strict syntax validation
- Working with JavaScript applications
- Schema validation is critical

### Keep YAML when:
- Writing Docker Compose files
- Configuring CI/CD pipelines
- Creating Ansible playbooks
- Working with Kubernetes manifests

### Keep TOML when:
- Configuring Rust projects (Cargo.toml)
- Python packaging (pyproject.toml)
- You need strict data types
- Configuration has clear sectional boundaries

### Keep Environment Variables when:
- Deploying containerized applications
- Managing deployment secrets
- Runtime configuration overrides
- Following 12-factor app principles

## Best Practices for Format Selection

1. **Consider Your Use Case**: API data vs human-authored configuration
2. **Evaluate Tooling**: Available parsers, editors, and validation tools
3. **Think About Maintenance**: Who will be editing these files?
4. **Plan for Growth**: Will the configuration become more complex over time?
5. **Consider Standards**: What formats does your ecosystem typically use?

## Common Considerations

### When Converting to CCL

**Advantages:**
- More readable and maintainable configuration files
- Better inline documentation capabilities
- Simpler syntax with fewer special characters
- Native support for lists and nested structures

**Considerations:**
- All values are strings (type conversion handled by applications)
- Smaller ecosystem compared to JSON/YAML
- May require updating existing tooling
- Team familiarity with the format

### Format Selection Summary

Choose the format that best matches your project's needs, existing tooling, team expertise, and long-term maintenance requirements. CCL excels for human-authored configuration files where readability and documentation are important.