

## Plan: Move Import Info Text Into a Dialog

### Current State
The `DataImport` component shows "Supports: .txt, .md, .json, .pdf" and "Multiple files allowed" as static text below the import button. The button directly opens the file picker.

### Changes

**File: `src/components/DataImport.tsx`**

- Add a `Dialog` that opens when clicking the import button (instead of directly opening the file picker)
- Inside the dialog:
  - Title: "Import Files"
  - Move the two info lines ("Supports: ..." and "Multiple files allowed") into the dialog body
  - Add a "Choose Files" button that triggers the hidden file input
  - Show the progress bar inside the dialog when importing
- Remove the info text from below the button
- Close the dialog automatically when import completes

| Line Range | Change |
|---|---|
| 338-357 | Replace inline button+info with Dialog trigger button |
| New dialog content | Dialog with info text + file picker button + progress |

