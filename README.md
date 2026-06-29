# UET LMS DMC — Firefox Extension

> Automatically calculates and displays semester-wise SGPA and CGPA on the UET LMS grades page, with one-click PDF export in official DMC format.
## The Problem

UET LMS (lms.uet.edu.pk) shows your course results but does **not** display your SGPA or CGPA per semester. Students manually calculate their GPA using a calculator every time they check results — which is tedious and error-prone.

## The Solution

UET LMS DMC injects SGPA and CGPA values directly into your grades page after each semester's courses, automatically, every time you visit.

---

## Features

- **Semester-wise SGPA** displayed inline after each semester's courses
- **Running CGPA** that updates cumulatively after every semester
- Supports both **Confirmed** and **Provisional** results
- **One-click PDF export** in the official UET DMC format — with semester totals, GPA/CGPA per semester, and the cumulative formula at the bottom
- Re-injects automatically when "Show Semester Summary" is clicked (Odoo SPA behavior handled via MutationObserver)
- Zero configuration — works automatically on page load

---

## Installation

### From Mozilla Add-ons (recommended)
1. Visit the [Firefox Add-on page](https://addons.mozilla.org/firefox/addon/uet-lms-dmc/)
2. Click **Add to Firefox**
3. Done — open UET LMS and go to **Results → View DMC**

### Manual (Developer)
1. Clone this repo
2. Open Firefox → `about:debugging` → **This Firefox**
3. Click **Load Temporary Add-on** → select `manifest.json`

---

## How It Works

### Tech Stack
- **Vanilla JavaScript** — no frameworks, no build tools
- **Firefox WebExtension API** (Manifest V2)
- **MutationObserver** — handles Odoo's SPA re-renders on button clicks
- **DOM injection** — inserts `<tr>` rows directly into the existing grade table
- **iframe + contentWindow.print()** — PDF export without opening new tabs (Firefox security constraint workaround)

### Architecture

```
uet-lms-dmc/
├── manifest.json      # Extension config — URL matching, permissions, icons
├── content.js         # Main script — scraper, GPA calculator, DOM injector, PDF builder
└── icons/
    ├── icon48.png
    ├── icon96.png
    └── icon128.png
```

### GPA Calculation

```
SGPA = Σ(Grade Points this semester) / Σ(Credit Hours this semester)
CGPA = Σ(Grade Points all semesters) / Σ(Credit Hours all semesters)
```

Grade rows are identified by scraping `table.oe_form_group tr` and filtering rows where:
- `cells.length === 7`
- `cells[3]` matches `/^\d+\.\d+$/` (credit hours as decimal)

This uniquely identifies grade rows vs header/summary rows in the Odoo-rendered DOM.

---

## Screenshots

| Grades page with SGPA/CGPA | PDF Export Preview |
|---|---|
| *(SGPA and CGPA in red after each semester)* | *(Official DMC format with semester totals)* |

---

## Privacy

This extension does **not** collect, store, or transmit any data. All processing happens locally in your browser. The extension only reads content already visible to you on lms.uet.edu.pk.

---

## Development Notes

### Key Challenges Solved

**1. Odoo SPA behavior**
The LMS is built on OpenERP/Odoo. Clicking "Show Semester Summary" triggers a DOM re-render that wipes injected content. Solved with a debounced `MutationObserver` that re-injects after every DOM mutation.

**2. Firefox extension security**
`window.open()` and `blob:` URL navigation are blocked in Firefox content scripts. PDF export uses an `<iframe srcdoc=...>` overlay with `contentWindow.print()` instead.

**3. Reverse engineering the DOM**
No public API or source code available. Used Firefox DevTools to identify the Odoo form structure and find the unique selector pattern for grade rows.

**4. Mozilla validation**
`data_collection_permissions` must be declared inside `browser_specific_settings.gecko` and requires `strict_min_version: "140.0"`. The `required` array must contain at least one item — use `"none"` for extensions that collect no data.

---

## Contributing

Pull requests welcome. If you find a bug or the LMS updates its DOM structure:
1. Fork the repo
2. Open `content.js` and update the selector in `getGradeRows()`
3. Test on `lms.uet.edu.pk/web#action=...`
4. Submit a PR

---

## Author

**Ayesha Abbas**
BS Computer Science — UET Lahore (2024–2028)
[GitHub](https://github.com/AyeshaAbbas-engg) · [dev.to](https://dev.to/ayeshaabbas)

---

## License

MIT License — free to use, modify, and distribute.
