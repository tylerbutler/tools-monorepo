`sail demo-animation`
=====================

Demo the sailing animation. Press Ctrl+C to exit.

* [`sail demo-animation`](#sail-demo-animation)

## `sail demo-animation`

Demo the sailing animation. Press Ctrl+C to exit.

```
USAGE
  $ sail demo-animation [-d <value>] [-m <value>]

FLAGS
  -d, --duration=<value>  Duration in seconds (default: runs until Ctrl+C)
  -m, --message=<value>   [default: ⛵ Sail is building your project...] Custom message to display

DESCRIPTION
  Demo the sailing animation. Press Ctrl+C to exit.

EXAMPLES
  Run the animation demo

    $ sail demo-animation

  Run demo for 5 seconds

    $ sail demo-animation --duration 5

  Run demo with custom message

    $ sail demo-animation --message "Building your project..."
```

_See code: [src/commands/demo-animation.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail/src/commands/demo-animation.ts)_
