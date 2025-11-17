---
title: CCL FAQ
description: Frequently asked questions about CCL
---

## Are there types?

No. Keys and values are strings. Your application converts them:

```ccl
port = 5432
enabled = true
```

The values in this case are `"5432"` and `"true"`.

## Can I use dots in keys?

Yes. `database.host` is a **literal string key** with dots:

```ccl
database.host = localhost  # Key: "database.host"
```

For nested structure, use indentation instead.

## How do I nest?

Use indentation:

```ccl
database =
  host = localhost
  port = 5432
```

## How do lists work?

Empty keys create list items:

```ccl
servers =
  = web1.example.com
  = web2.example.com
```

## Are comments part of the data?

Yes. Comments are entries with `/` as the key:

```ccl
/= This is a comment
key = value
```

Filter them in your application.
