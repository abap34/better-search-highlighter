## Overview

Better Search Highlighter is a Chrome extension that provides page search with multi-level highlighting for matched text.

- Search text on the current page, similar to the standard browser find feature.
- Change the highlight level with the `ArrowUp` and `ArrowDown` keys.
  - Level 1: yellow highlight similar to the standard browser search
  - Level 2: red highlight
  - Level 3: blinking red highlight, only when blinking is enabled
  - Level 4: dim the whole page and spotlight only the current match
- Blinking can be disabled for users who are sensitive to flashing effects.
  - `prefers-reduced-motion` is also respected.
- All processing runs locally.
- To avoid performance impact on dynamically generated or very large pages, the extension limits how much text it loads. Enable the "Search all content" option when you want to search the entire page.
  - Warning: this searches the page without a scan limit and may affect performance on some pages.

## Usage

Open the search panel in one of these ways:

- Extension action button
- Right-click menu
- Keyboard shortcut

Default shortcuts:

- Windows / Linux: `Alt+Shift+F`
- macOS: `Option+Shift+F`

Panel controls:

- Up arrow button / `Shift+Enter`: move to the previous match
- Down arrow button / `Enter`: move to the next match
- Match number field: enter a number such as `40`, then press `Enter`
- `ArrowUp`: increase the highlight level
- `ArrowDown`: decrease the highlight level
- `Escape`: close the panel

## Settings

Settings can be changed from "Settings" in the search panel.

- Enable / disable blinking
- Enable / disable "Search all content"
- Reset highlight level
- Reset panel position
- Open Chrome shortcut settings
- Reset all settings
