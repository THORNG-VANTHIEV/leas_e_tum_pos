# Session Control Rules (ច្បាប់គ្រប់គ្រងដំណើរការគម្រោង)

These rules are triggered by specific user phrases:

## 1. "taking a break"
When the user says **"taking a break"** (or expresses taking a break / សម្រាក):
1. Check git status. If there are changes, commit and push them to GitHub.
2. Stop and kill all running development server processes to let the system relax and save resources:
   ```bash
   pkill -f "multiplex.*artisan dev" || true
   pkill -f "artisan serve" || true
   pkill -f "vite" || true
   pkill -f "queue:listen" || true
   pkill -f "pail" || true
   ```
3. Confirm to the user that changes are saved and the dev server has been stopped to let the system rest.

## 2. "on time coding"
When the user says **"on time coding"** (or tells to resume / ធ្វើការបន្ត):
1. Immediately launch the development server in the background:
   ```bash
   php artisan dev
   ```
   (or start `php artisan serve --port=8000` and `npm run dev`)
2. Verify that the server is live and responding at `http://127.0.0.1:8000`.
3. Report to the user that the dev environment is up, running, and ready for work.

## 3. Git Push Policy (ច្បាប់ Git Commit & Push)
- **Do NOT push code automatically to GitHub (`git push`)**:
  1. Local commits (`git commit`) are allowed and encouraged whenever needed to cleanly save progress.
  2. **NEVER execute `git push` automatically** after making code edits or fixing issues.
  3. **Wait until the user explicitly asks to push** (e.g., "push", "push code", "push to github", or during the "taking a break" workflow). Only push when requested.
