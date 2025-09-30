# Canvas Interaction Improvements

This document tracks the ongoing improvements to Node-RED's canvas interaction across different devices, input methods, and browser zoom settings.

## Objectives

Improve canvas interaction to work consistently and intuitively across:
- **Browser zoom levels**: 100%, 125%, 150%, 200%, etc.
- **Input devices**: Mouse, trackpad, and touchscreen
- **Platforms**: Desktop (Windows, macOS, Linux) and mobile/tablet devices

## What Has Been Implemented

### Zoom Functionality

#### Smooth Zoom Animation (commits: bdfa06b, a12b65b)
- ✅ 125ms smooth zoom transitions with ease-out curves
- ✅ Natural acceleration/deceleration for zoom operations
- ✅ Reduced acceleration from 2x to 1.2x max for better control
- ✅ Asymmetric zoom speeds (zoom out 40-50% slower than zoom in)
- ✅ Gentler acceleration range (0.7-1.1) for smoother transitions
- ✅ No jarring animations during mouse wheel zoom

#### Zoom Input Methods (commits: e7a028b, bdfa06b)
- ✅ Mouse wheel zoom
- ✅ Alt+scroll zoom mode (keyboard modifier alternative)
- ✅ Space+scroll zoom mode (keyboard modifier alternative)
- ✅ Trackpad pinch-to-zoom (browsers translate to Ctrl+wheel events)
- ✅ Touch screen pinch-to-zoom with proper center tracking (direct touch events)
- ✅ UI zoom buttons (corrected zoom in/out direction)
- ✅ Zoom-to-fit button (zooms out to show all nodes with padding, respects minimum zoom)

**Note**: Ctrl+wheel is used for trackpad pinch gestures on desktop. Browsers automatically translate two-finger pinch gestures on trackpads into Ctrl+wheel events. This is separate from touchscreen pinch-to-zoom, which uses direct touch events (touchstart/touchmove/touchend).

#### Zoom Focal Point (commits: e42b09de, feec7ec, e7a028b)
- ✅ Cursor-centered zoom (focuses on cursor position)
- ✅ Store focal point in workspace coordinates instead of screen coordinates
- ✅ Prevents focal point drift when scroll changes due to canvas boundaries
- ✅ Maintains consistent zoom focus even when view shifts at edges
- ✅ Fixed focal point during pinch gestures

#### Zoom Direction & Behavior (commits: 37f9786, bdfa06b)
- ✅ Fixed trackpad zoom direction (spreading fingers zooms in, pinching zooms out)
- ✅ Matches standard macOS trackpad behavior
- ✅ Proper ratio-based scaling for pinch gestures
- ✅ Scale lock issues fixed with improved tolerance handling

#### Dynamic Zoom Limits (commits: 7918693, f13ed66)
- ✅ Calculate minimum zoom dynamically based on viewport size
- ✅ Ensure canvas always covers entire viewport (no empty space visible)
- ✅ Use 'cover' behavior: canvas fills viewport completely
- ✅ Recalculate minimum zoom on window resize
- ✅ Automatically adjust zoom if current level falls below new minimum after resize
- ✅ Prevent zooming out beyond what's needed to fill viewport

### Panning Functionality

#### Pan Input Methods (commit: feec7ec)
- ✅ Two-finger pan gesture for touch devices
- ✅ Spacebar+left-click panning for desktop
- ✅ Mode locking to prevent laggy gesture switching
- ✅ Lock into pan or zoom mode based on initial movement
- ✅ Better gesture detection thresholds (10px for zoom, 5px for pan)

#### Scroll Behavior (commit: e7a028b)
- ✅ Momentum scrolling with edge bounce animation
- ✅ Enhanced spacebar handling to prevent scroll artifacts

### UI/UX Enhancements

#### Gesture State Management (commits: e42b09de, bdfa06b, 121982e)
- ✅ Improved gesture state management for trackpad and touch gestures
- ✅ Proper state cleanup when cursor leaves canvas
- ✅ Clear touchStartTime timeout when entering two-finger pan mode
- ✅ Prevent interference between long-press detection and pan gestures

#### UI Pinch-Zoom Prevention (commit: e0c5b84)
- ✅ Prevent UI pinch-to-zoom while keeping canvas zoomable
- ✅ Apply `touch-action: pan-x pan-y` to html, body, and editor elements
- ✅ Apply `touch-action: none` to canvas for custom gestures
- ✅ JavaScript prevention for trackpad pinch on non-canvas areas
- ✅ Block Ctrl+wheel events outside the workspace chart

#### Minimap Navigation (commit: 53dce6a)
- ✅ Auto-show minimap on zoom and pan operations
- ✅ Minimap appears for 2 seconds during navigation then fades out
- ✅ Smooth fade in/out animations for minimap visibility
- ✅ Minimap stays visible if manually toggled with button
- ✅ Emit `view:navigate` events for all zoom and pan operations

#### Visual Polish (commit: 53dce6a)
- ✅ Hide scrollbars on canvas while keeping it scrollable
- ✅ Clean visual appearance without visible scrollbars

### Code Architecture

#### New Modules (commit: bdfa06b)
- ✅ `view-zoom-animator.js` - Zoom animation utilities (223 lines)
- ✅ `view-zoom-constants.js` - Zoom configuration constants (21 lines)
- ✅ Updated Gruntfile to include new zoom modules in build

## Current Expectations

### Cross-Device Consistency
- Zoom and pan should feel natural on mouse, trackpad, and touchscreen
- Gestures should be responsive without lag or mode switching artifacts
- Zoom focal point should remain stable regardless of input method

### Browser Zoom Compatibility
- Canvas interaction should work correctly at all browser zoom levels
- UI elements should remain accessible and functional
- No layout breaking or interaction dead zones

### Visual Feedback
- Minimap should provide contextual navigation feedback
- Smooth animations should make interactions feel polished
- No visual glitches or artifacts during zoom/pan operations

### Performance
- All interactions should be smooth (60fps target)
- No janky animations or delayed responses
- Efficient gesture detection without excessive computation

## Recent Fixes

### Grey Padding at Canvas Bottom (Latest)
**Issue**: When scrolled to the bottom of the canvas, 5 pixels of grey space appeared below the grid, allowing users to scroll slightly beyond the canvas boundary.

**Root Cause**: Default browser margins on SVG elements caused the viewport's `scrollHeight` to be 8005px instead of 8000px, creating extra scrollable area beyond the canvas.

**Solution**:
- Added explicit `padding: 0` and `margin: 0` to `#red-ui-workspace-chart` container
- Added `display: block`, `margin: 0`, and `padding: 0` to SVG element via `#red-ui-workspace-chart > svg` selector
- The `display: block` prevents inline element spacing issues

**Files Changed**:
- `workspace.scss:41-42, 52-57` - Added margin/padding resets for container and SVG

**Result**: Canvas now has exact 8000px scrollable area with no grey padding visible at bottom.

### Spacebar Hold Scrolling Bug
**Issue**: When holding spacebar down, the canvas would move down unexpectedly, making the space+scroll interaction buggy.

**Root Cause**: The `preventDefault()` was only called on the first spacebar keydown event. When spacebar is held, browsers fire repeated keydown events. After the first keydown set `spacebarPressed = true`, subsequent keydown events weren't prevented because the condition `e.type === "keydown" && !spacebarPressed` failed, allowing browser's default space-scroll behavior.

**Solution**:
- Moved `preventDefault()` and `stopPropagation()` outside the conditional checks
- Now blocks ALL spacebar events (both keydown repeats and keyup), not just the first keydown

**Files Changed**:
- `view.js:611-619` - Restructured spacebar event handler to always prevent default

**Result**: Holding spacebar no longer causes unwanted canvas scrolling.

### Minimap Auto-Show Behavior
**Issue**: Minimap was showing on selection changes and when entering pan mode (before actual panning), causing unnecessary flashing.

**Solution**:
- Removed `view:selection-changed` event listener - minimap no longer shows when selecting nodes
- Removed `view:navigate` emissions from pan mode entry points (touch long-press, spacebar+click, middle-click)
- Added `view:navigate` emission to regular touchpad scroll handler for consistent behavior
- Kept emissions only during actual panning movement and zooming

**Files Changed**:
- `view-navigator.js:195-198` - Removed selection-changed listener
- `view.js:483, 1529, 1539` - Removed navigate events from pan mode entry
- `view.js:876` - Added navigate event to touchpad scroll handler

**Result**: Minimap now appears only during actual panning (touchpad or mouse) and zooming, not on selection or pan mode entry.

### Diagonal Trackpad Panning
**Issue**: Trackpad scrolling was restricted to horizontal OR vertical movement, not both simultaneously.

**Root Cause**: Browser's native scroll behavior on `overflow: auto` containers locks into one axis at a time, even before JavaScript wheel events fire.

**Solution**:
- Added `evt.preventDefault()` and `evt.stopPropagation()` to regular scroll handling
- Manually apply both `deltaX` and `deltaY` to scrollLeft/scrollTop simultaneously
- Prevents browser's axis-locked scroll behavior from taking over
- Also updated CSS `touch-action` from `pan-x pan-y` to `manipulation` (though this primarily affects touch events, not trackpad)

**Files Changed**:
- `view.js:864-890` - Added manual diagonal scroll handling
- `base.scss:22, 33` - Changed touch-action to manipulation

**Result**: Trackpad can now pan diagonally without axis-locking.

## Known Issues & Future Work

### To Be Tested
- [ ] Comprehensive testing across different browser zoom levels (100%, 125%, 150%, 200%)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Testing on different touchscreen devices (tablets, touch-enabled laptops)
- [ ] Testing with different trackpad sensitivities and gesture settings
- [x] Diagonal trackpad panning (fixed)

### Potential Improvements
- [ ] Additional fine-tuning of zoom speeds and acceleration curves based on user feedback
- [ ] Consider adding keyboard shortcuts for zoom reset (Ctrl+0 / Cmd+0)
- [ ] Evaluate need for custom zoom level indicator in UI
- [ ] Consider adding preferences for zoom/pan sensitivity

### Edge Cases to Monitor
- [ ] Behavior when canvas content is very small or very large
- [ ] Interaction with browser accessibility features
- [ ] Performance with extremely large flows (100+ nodes)
- [ ] Multi-monitor scenarios with different DPI settings

## Testing Checklist

When verifying canvas interaction improvements:

1. **Zoom Testing**
   - [ ] Mouse wheel zoom in/out
   - [ ] Alt+scroll zoom (keyboard modifier)
   - [ ] Space+scroll zoom (keyboard modifier)
   - [ ] Trackpad pinch gesture (spread = zoom in, pinch = zoom out, generates Ctrl+wheel)
   - [ ] Touch screen pinch gesture (direct touch events)
   - [ ] UI zoom buttons (zoom in, zoom out, reset)
   - [ ] Zoom-to-fit button (shows all nodes with padding, respects min zoom)
   - [ ] Zoom focal point stays on cursor position
   - [ ] Dynamic zoom limits prevent empty space

2. **Pan Testing**
   - [x] Two-finger pan on trackpad/touch
   - [x] Diagonal panning works (not axis-locked)
   - [x] Spacebar+click pan on desktop
   - [x] Momentum scrolling with edge bounce
   - [x] No lag when switching between pan and zoom

3. **UI/UX Testing**
   - [x] Minimap auto-shows during panning and zooming
   - [x] Minimap does not show on selection changes
   - [x] Minimap fades after 2 seconds
   - [x] No scrollbars visible on canvas
   - [x] No pinch-zoom on UI elements
   - [x] Gesture state cleanup on cursor exit

4. **Browser Zoom Testing**
   - [ ] Test at 100% browser zoom
   - [ ] Test at 125% browser zoom
   - [ ] Test at 150% browser zoom
   - [ ] Test at 200% browser zoom
   - [ ] Verify all interactions work at each zoom level

## Files Modified

Key files involved in canvas interaction improvements:

- `packages/node_modules/@node-red/editor-client/src/js/ui/view.js` - Main view controller
- `packages/node_modules/@node-red/editor-client/src/js/ui/view-zoom-animator.js` - Zoom animations
- `packages/node_modules/@node-red/editor-client/src/js/ui/view-zoom-constants.js` - Zoom configuration
- `packages/node_modules/@node-red/editor-client/src/js/ui/view-navigator.js` - Minimap controller
- `packages/node_modules/@node-red/editor-client/src/sass/workspace.scss` - Canvas styling
- `packages/node_modules/@node-red/editor-client/src/sass/base.scss` - Base UI styling
- `Gruntfile.js` - Build configuration

## Commit History

Interaction improvements span commits from e7a028b to present (13 commits total):

1. `e7a028b` - feat: Add enhanced zoom and scroll features
2. `bdfa06b` - Implement smooth zoom functionality with pinch-to-zoom support
3. `37f9786` - Fix trackpad zoom direction - spreading fingers now zooms in
4. `e42b09d` - Fix zoom focal point stability at canvas edges
5. `a12b65b` - Improve zoom smoothness and control
6. `feec7ec` - Add two-finger panning and spacebar+click panning
7. `e0c5b84` - Prevent UI pinch-to-zoom while keeping canvas zoomable
8. `121982e` - Fix zoom gesture detection after two-finger panning
9. `7918693` - Implement dynamic zoom limits to match canvas boundaries
10. `f13ed66` - Add dynamic minimum zoom recalculation on viewport resize
11. `53dce6a` - Hide scrollbars and add auto-show/hide minimap on navigation
12. `875db2c` - Enable diagonal trackpad panning by preventing axis-locked scroll
13. (current) - Improve minimap auto-show behavior to only trigger during actual navigation