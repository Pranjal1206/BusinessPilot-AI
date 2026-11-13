# Static frontend deployment

Public URL: https://pranjal1206.github.io/BusinessPilot-AI/

The published site is the existing HTML/CSS/JavaScript invoice-selection frontend, not the full-stack application described in the main README. This checkout does not contain the `src/` directory needed to build that Next.js application. The invoice button validates a local file selection and displays its name; it does not upload, store or analyze the file. Authentication, PostgreSQL, AI and PayPal are not part of this static deployment.

## GitHub Pages

- Publishing source: branch `arena/1112c6fa-businesspilot-ai`, repository root.
- The root `index.html` redirects to `frontend/` using relative URLs, so the GitHub Pages project path is preserved.
- `.nojekyll` disables Jekyll processing for this plain HTML site.
- Pushing changes to the publishing branch triggers a new Pages build. If the branch is later merged into `main`, update the Pages source to `main` to publish future main-branch changes.
- Check build status with `gh api repos/Pranjal1206/BusinessPilot-AI/pages/builds/latest`.

Only deploy the static frontend. Do not add database URLs, API keys or PayPal secrets to browser JavaScript.

## Local preview

From the repository root:

```bash
python3 -m http.server 3000 --bind 0.0.0.0 --directory frontend
```

Open port 3000. Serving only `frontend/` avoids exposing other repository files through the development server.

## Smoke checks

1. Open the site on desktop and at a 375px mobile viewport.
2. Confirm the stylesheet and JavaScript load without 404s or console errors.
3. Click **Upload Invoice** without a file: an inline selection prompt should appear.
4. Select a PDF, PNG or JPG and click the button: its filename should appear with an explicit notice that no file was uploaded.
5. Confirm there is no horizontal overflow on mobile.
