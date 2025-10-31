# WaveSurfer.js Reference Documentation

## Overview
WaveSurfer.js v7 - Audio waveform visualization library
- Official Docs: https://wavesurfer.xyz/docs/
- API Reference: https://wavesurfer-js.pages.dev/docs/
- NPM: https://www.npmjs.com/package/wavesurfer.js

## Key Rendering & Zoom Options

### Core Options

#### `minPxPerSec` (number)
- **Description**: Minimum pixels per second of audio (i.e. zoom level)
- **Behavior**: When set to a higher value, the container will scroll
- **Usage**: Controls how zoomed in the waveform appears
- **Example**: `minPxPerSec: 100` = 100 pixels per second of audio

#### `fillParent` (boolean)
- **Description**: Stretches the waveform to fill its container
- **Default**: true (enabled by default)
- **Usage**: Controls whether waveform fills available width

#### `autoCenter` (boolean)
- **Description**: When autoScroll is active, maintains the cursor centered within the waveform during playback
- **Behavior**: In v7, autoCenter is now always immediate unless the audio is playing
- **Usage**: Keeps playback position centered while playing

#### `autoScroll` (boolean)
- **Description**: Automatically repositions the container to keep the current playback position visible
- **Usage**: Scrolls waveform to follow playback

### Rendering Options

#### `renderFunction` (function)
- **Description**: Accepts a custom function with parameters for audio peaks and canvas context
- **Usage**: Enables bespoke visual rendering
- **Parameters**: `(channelData, ctx)` where channelData are audio peaks, ctx is canvas context

#### `normalize` (boolean)
- **Description**: Expands the waveform to occupy the full available height
- **Usage**: Maximizes visual use of vertical space

#### Waveform Styling
- **`barWidth`**: Width of each bar
- **`barHeight`**: Height of each bar
- **`barRadius`**: Border radius of bars
- **`barGap`**: Space between bars
- **`barAlign`**: Alignment of bars

### Visual Styling

#### Colors
- **`waveColor`**: Color of the waveform (supports string, array, or gradient)
- **`progressColor`**: Color of the progress mask
- **`cursorColor`**: Color of the playback cursor
- **`cursorWidth`**: Width of the playback cursor

#### Layout
- **`height`**: Waveform height in pixels or "auto" for container-based sizing

## Changes in v7

### Removed Options (now defaults)
- **`responsive`**: Now enabled by default
- **`pixelRatio`**: Automatically uses `window.devicePixelRatio`
- **`barMinHeight`**: Set to 1 pixel minimum by default
- **`scrollParent`**: Removed - container scrolls automatically when `minPxPerSec` is higher
- **CSS styling**: `backgroundColor` and `hideCursor` should be set via CSS

### Shadow DOM Styling
WaveSurfer v7 uses Shadow DOM. Style elements using `::part()` pseudo-selector:

```css
#waveform ::part(cursor):before {
  content: '🏄';
}

#waveform ::part(region) {
  font-family: fantasy;
}
```

## Methods

### `zoom(pxPerSec)`
- **Description**: Horizontally zooms the waveform in and out
- **Parameter**: Number of horizontal pixels per second of audio
- **Side Effects**: Changes `minPxPerSec` parameter and enables scroll behavior

### `setOptions(options)`
- **Description**: Update rendering options dynamically
- **Parameters**: Object with new options (height, waveColor, cursorColor, etc.)

## Official Plugins

8 official plugins for specialized functionality:
1. **Timeline**: Show time markers
2. **Minimap**: Overview of full track
3. **Spectrogram**: Frequency visualization
4. **Envelope**: Volume envelope
5. **Regions**: Mark sections of audio
6. **Record**: Recording functionality
7. **Hover**: Show time on hover
8. **Zoom**: Enhanced zoom controls

## Known Issues & Solutions

### Issue: Waveform only renders partial track with high minPxPerSec
**Problem**: When using high `minPxPerSec` values (e.g. 100) with CSS transforms for scrolling, WaveSurfer may only render a portion of the track.

**Potential Solutions**:
1. Set container width before WaveSurfer initializes:
   ```javascript
   container.style.width = `${duration * pixelsPerSecond}px`;
   ```
2. Use the official Zoom plugin instead of manual zoom
3. Dynamically update rendered portion as user scrolls
4. Consider using `scrollParent` alternative (container scrolls automatically in v7)

### Issue: Transform conflicts with WaveSurfer rendering
**Problem**: Applying CSS `translateX()` may move container out of sync with internal rendering.

**Solution**: Let WaveSurfer handle scrolling natively rather than applying external transforms.

## Resources

- Official Documentation: https://wavesurfer.xyz/docs/
- TypeScript API: https://wavesurfer-js.pages.dev/docs/types/wavesurfer.WaveSurferOptions
- GitHub Issues: https://github.com/katspaugh/wavesurfer.js/issues
- Stack Overflow: https://stackoverflow.com/questions/tagged/wavesurfer.js

## Project Usage

Our current implementation uses:
```typescript
WaveSurfer.create({
  container: containerRef.current,
  waveColor: waveColor,
  progressColor: waveColor, // Same color = solid waveform
  cursorColor: 'transparent',
  barWidth: 3,
  barGap: 1,
  barRadius: 2,
  height: 60,
  normalize: true,
  backend: 'MediaElement',
  interact: true,
  minPxPerSec: 100, // High zoom for close-up view
  hideScrollbar: true,
});
```

**Current Challenge**: Getting full-track rendering with high zoom + centered scrolling.
