

## Plan: Move Export Section to Settings

### Changes

**`src/pages/Insights.tsx`**
- Remove the entire "Manage Your Data" LazySection (lines 166-208)
- Remove unused imports: `DataExport`, `ReportExport`, `DataImport`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `Upload`, `FileText`, and the `handleImportComplete` function

**`src/pages/Settings.tsx`**
- Import `DataExport`, `ReportExport`, `DataImport`
- Add a new "Data Management" Card after the "Re-analyze" section containing:
  - Import subsection (DataImport with reload-on-complete)
  - Export subsection (DataExport + ReportExport)
- Same layout as the current Insights version but styled consistently with Settings cards

