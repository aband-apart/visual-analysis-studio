# Visual Analysis Studio

A single-session, beginner-friendly formal-analysis activity for community college Visual Arts students. The site uses public-domain collection data from the Art Institute of Chicago and The Metropolitan Museum of Art.

## Features

- Random artwork on load with automatic museum API fallback
- Image, title, artist, date, medium, and collection metadata
- Fixed four-step formal-analysis framework
- Beginner prompts and progressive disclosure
- Four labeled response fields
- Plain-text clipboard export
- No login, tracking, database, or saved history
- Responsive layout, semantic HTML, visible keyboard focus, reduced-motion and forced-color support

## Run locally

Because museum data is loaded with `fetch`, serve the folder over HTTP instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Recommended free hosting: GitHub Pages

GitHub Pages is the best fit because this project is a dependency-free static site and does not need a server or environment variables.

1. Create a GitHub repository.
2. Add `index.html`, `styles.css`, `app.js`, and this README.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)`, then save.

The published URL will use the format `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

## Accessibility target

The interface is designed toward WCAG 2.2 AA: semantic heading order, native interactive elements, descriptive artwork alt text, keyboard access, large controls, high-contrast focus styles, responsive reflow, and non-color status text. Automated and manual checks are still recommended after any content or code change.
