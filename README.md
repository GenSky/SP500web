# PROJECT 50 - EGO LESS STRENGTH

A free, static GitHub Pages fitness dashboard for long-term personal tracking.

Motto:

> EARN THE RIGHT TO ADD 5 POUNDS

## What It Tracks

- Weight
- Body fat
- Waist
- Squat
- Deadlift
- Notes
- Workout count
- Achievement badges
- Monthly progress chart

The app uses browser `localStorage`, so entries stay saved in the same browser on the same device. There is no backend, database, login, API key, or paid service.

## Files

- `index.html` - Page structure and dashboard content
- `style.css` - Dark responsive dashboard styling
- `app.js` - Local storage, tracker, chart, badges, and interactions
- `README.md` - Project and deployment instructions
- `LICENSE` - MIT license
- `.gitignore` - Common local files to ignore

## Offline Behavior

The dashboard is HTML, CSS, and JavaScript only. Progress data is stored locally in the browser.

The page attempts to load Chart.js from a CDN as requested. If the CDN is unavailable or the page is opened offline, the app automatically uses a built-in canvas chart fallback so the tracker remains usable offline.

## Deploy to GitHub Pages

### 1. Create a Repository

1. Go to [https://github.com](https://github.com).
2. Click the `+` button in the top-right corner.
3. Click `New repository`.
4. Enter a repository name, for example `project-50-ego-less-strength`.
5. Choose `Public`.
6. Do not add a README, license, or `.gitignore` because these files already exist in this project.
7. Click `Create repository`.

### 2. Upload Files in the Browser

1. Open the new repository on GitHub.
2. Click `uploading an existing file`.
3. Drag these files into the upload area:
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
   - `LICENSE`
   - `.gitignore`
4. In the commit message box, type `Initial PROJECT 50 dashboard`.
5. Click `Commit changes`.

### 3. Push With Git Instead

If you prefer the command line, run these commands from the project folder:

```bash
git init
git add index.html style.css app.js README.md LICENSE .gitignore
git commit -m "Initial PROJECT 50 dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/project-50-ego-less-strength.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

### 4. Enable GitHub Pages

1. Open the repository on GitHub.
2. Click `Settings`.
3. In the left sidebar, click `Pages`.
4. Under `Build and deployment`, find `Source`.
5. Select `Deploy from a branch`.
6. Under `Branch`, choose `main`.
7. In the folder dropdown, choose `/ (root)`.
8. Click `Save`.

### 5. Visit the Live URL

1. Stay on the `Pages` settings screen.
2. Wait for GitHub to show the message `Your site is live at`.
3. Click the live URL.

The URL will usually look like this:

```text
https://YOUR-USERNAME.github.io/project-50-ego-less-strength/
```

GitHub Pages can take a few minutes to publish the first time.

## Local Use

You can also open `index.html` directly in a browser. The dashboard does not require a server.

## Privacy

All progress entries are stored only in the browser's local storage. The data is not sent anywhere.
