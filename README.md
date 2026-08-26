# Visual Analysis Studio — Version 2

A single-session, beginner-friendly formal-analysis activity for community college Visual Arts students. The site uses public-domain collection data from the Art Institute of Chicago and The Metropolitan Museum of Art.

## Version 2 improvements

- Persistent **View artwork** control and accessible large-image dialog
- Visible **Look / Think / Write** identity on desktop
- Artwork dimensions and direct museum-record links
- Optional beginner glossary for formal-analysis terms
- Real response progress using “Started” and “Not started” text
- More compact mobile introduction
- Warning before leaving when responses contain writing
- Plain-text download in addition to clipboard export
- Faster parallel Met record checks and greater Art Institute result variety
- Clearer privacy statement about external museum and font requests

## Core behavior

- No login, account, analytics, advertising, database, or saved response history
- Everything resets after a confirmed reload or exit
- A random museum source is tried first; the other is used automatically on failure
- Exact four-step formal-analysis framework is preserved

## Run locally

Serve the folder over HTTP so museum `fetch` requests work normally:

```bash
python3 -m http.server 8000
```

Visit `http://localhost:8000`.

## Update an existing GitHub Pages site

Upload these Version 2 files to the root of the existing repository and allow GitHub to replace files with the same names:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

Do not upload the ZIP itself. GitHub Pages will redeploy automatically after the commit.

## New GitHub Pages site

1. Create a public GitHub repository.
2. Upload the files above to the repository root.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**, `main`, and `/ (root)`.
5. Save and wait for the published URL.

## Accessibility target

The interface is designed toward WCAG 2.2 AA using semantic headings, native controls, a native dialog, descriptive artwork alt text, keyboard operation, visible focus, large targets, responsive reflow, reduced-motion support, forced-color support, and text—not color alone—for progress and status.
