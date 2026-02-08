# Undocumented Fluid Framework Behaviors

This directory documents changes made to the Levee driver to accommodate undocumented behaviors and expectations of the Fluid Framework. These are cases where the Fluid Framework assumes certain conditions or conventions that are not specified in its public API documentation or driver interface contracts.

Each document describes:

- **The observed behavior** -- what the Fluid Framework expects
- **How it was discovered** -- the symptoms that surfaced when the expectation was not met
- **The fix applied** -- what the Levee driver does to satisfy the expectation
- **Relevant Fluid Framework source** -- pointers to the internal code that relies on the behavior
