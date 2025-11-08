# Sailing Animation for Sail CLI

A beautiful Unicode-based terminal animation featuring a sailing boat for the Sail build orchestrator.

## Features

- **Unicode Block Elements**: Modern pixel-art style using block characters (▓, █, ░, ▒)
- **Smooth Animation**: 12-frame animation with boat movement and wave effects
- **Vertical Bobbing**: Realistic boat motion on waves
- **Animated Waves**: Dynamic water effects using Unicode wave characters (≈, ~, ∼, ≋, ∿)
- **Color Support**: Cyan-colored waves via picocolors
- **Message Updates**: Display build progress messages below the animation

## Usage

### Basic Animation

```typescript
import { SailAnimation } from '@tylerbu/sail';

const animation = new SailAnimation();

// Start the animation
animation.start('⛵ Building your project...');

// Update the message
animation.updateMessage('🔨 Compiling TypeScript...');

// Stop and clear
animation.stop();

// Or stop and show final message
animation.done('✅ Build complete!');
```

### Integration with ProgressBarManager

The `SailAnimation` class uses `log-update` internally, making it compatible with the existing `ProgressBarManager`:

```typescript
import { SailAnimation } from '@tylerbu/sail';

const animation = new SailAnimation();

// Use during build process
animation.start('Starting build...');

// Update as build progresses
for (const task of tasks) {
  animation.updateMessage(`Building ${task.name}...`);
  await task.execute();
}

animation.done('✅ Build complete! Smooth sailing ahead.');
```

### Demo

Try the animation demo:

```bash
# From the sail package directory
node demo-sail-animation.mjs
```

Or using the TypeScript demo:

```bash
tsx src/core/execution/demo-animation.ts
```

## API

### `SailAnimation`

#### `start(message?: string): void`

Starts the sailing animation. Optionally displays a message below the animation.

#### `updateMessage(message: string): void`

Updates the message displayed below the animation while it's running.

#### `stop(): void`

Stops the animation and clears the display.

#### `done(finalMessage?: string): void`

Stops the animation and persists the final frame with an optional message.

#### `running: boolean`

Returns whether the animation is currently running.

## Technical Details

### Animation Frames

The animation consists of 12 frames that create:
- Horizontal boat movement (15 character positions)
- Vertical bobbing effect (alternating frames)
- Wave animation (6-phase cycle)

### Unicode Characters Used

**Boat:**
- `▓` (U+2593) - Dark shade for sail structure
- `█` (U+2588) - Full block for solid parts
- `▀` (U+2580) - Upper half block for hull
- `│` (U+2502) - Box drawing for mast

**Waves:**
- `≈` (U+2248) - Almost equal to
- `~` (U+007E) - Tilde
- `∼` (U+223C) - Tilde operator
- `～` (U+FF5E) - Fullwidth tilde
- `≋` (U+224B) - Triple tilde
- `∿` (U+223F) - Sine wave
- `░` (U+2591) - Light shade
- `▒` (U+2592) - Medium shade

### Performance

- **Frame Rate**: 100ms per frame (~10 FPS)
- **Memory**: Frames are pre-generated and cached
- **CPU**: Minimal - simple string concatenation and `log-update` calls

## Design Inspiration

The sailing boat design is inspired by ASCII art from [asciiart.eu](https://www.asciiart.eu/vehicles/boats), reimagined using Unicode block elements for a modern terminal aesthetic.

## Future Enhancements

Potential additions:
- Multiple boat designs (sailboat, speedboat, cargo ship)
- Different weather conditions (calm, stormy, sunset)
- Progress-based animation (boat moves further as build progresses)
- Color themes (day, night, stormy)
- Wind effects (sail movement based on "wind speed")
- Integration with build metrics (boat speed = build speed)
