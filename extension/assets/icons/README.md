# Icons

The extension icons in this directory are generated from `assets/icon.png`.

Required Chrome extension files:

- `icon-16.png`
- `icon-32.png`
- `icon-48.png`
- `icon-128.png`

Icons use a centered 70% crop before resizing so the artwork stays legible in
the toolbar and still reads clearly in store and extension-detail views.

Regenerate them with:

```sh
npm run generate:icons
```

`extension/manifest.json` references these files both as extension icons and
as action icons.
