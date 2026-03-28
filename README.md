# Tea Time

A static web app for tea recommendations and browsing. Hosted on GitHub Pages.

## Maintaining `teas.csv`

The tea catalog lives in `teas.csv`. Edit it in **macOS Numbers** and export back to CSV when done.

### Exporting from Numbers

1. Open the spreadsheet in Numbers.
2. **File → Export To → CSV…**
3. In the export dialog, set **Text Encoding** to **Unicode (UTF-8)**.
4. Save as `teas.csv`, replacing the existing file in this repository.
5. Open the exported file in a text editor and verify it looks reasonable (no mangled characters, correct number of columns).

### Column reference

| Column | Expected values | Notes |
|---|---|---|
| Name | Free text | Required |
| Sourcer | Free text | Brand or supplier |
| Type | Free text | e.g. Black (Red), Green, Matcha, Herbal |
| Origin | Free text or `n.a.` | Country of origin |
| Theme | Free text | e.g. `Christmas`, `Specials: Herbs`. Leave blank if none |
| Daytime | `Morning`, `Day`, or `Evening` | When the tea is recommended. Leave blank for any time |
| Temp | Free text | Brewing temperature, e.g. `90℃` |
| Brew | Free text | Brewing time, e.g. `5 min` |
| Quantity | `Full`, `Half`, `Quarter`, or `Empty` | Current stock level |
| Repurchase? | `Yes` or `No` | Whether to reorder when empty. Leave blank if undecided |
| Collection | `Core` or `Testing` | Core teas get higher recommendation weight |
| Since | Year | When the tea was added, e.g. `2025` |
| Description | Free text | A sentence or two about the tea |
| Additives | Free text | e.g. `Flavors (vanilla, caramel)`. Leave blank if none |
| Aroma Notes | Free text | Comma-separated tasting notes |

### Tips

- **Spelling and case matter** for Daytime, Quantity, Repurchase?, and Collection. Use exactly the values listed above (the app tolerates minor case differences, but not typos).
- **Don't rename or reorder columns.** The app matches columns by their header names.
- **Commas in text** are fine — Numbers wraps those fields in quotes automatically on export.
- **Avoid trailing whitespace** in cells. Numbers generally doesn't add any, but double-check if you've copy-pasted from elsewhere.
- **Theme prefixes**: teas with a theme starting with `Specials` (e.g. `Specials: Herbs`) are grouped under the Specials toggle in the Recommend view. Teas with `Christmas` in the theme are auto-enabled in December.
