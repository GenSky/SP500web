# S&P500web

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
- Per-session gym log
- Done and missed training day tracker
- Exercise checklists
- Lift weights
- Cardio type, time, level, and speed
- Achievement badges
- Monthly progress chart

The app uses browser `localStorage`, so entries stay saved in the same browser on the same device. There is no backend, database, login, API key, or paid service.

## Gym Log Workflow

Use the `Gym Log` section every time you go to the gym.

1. Pick the training date.
2. Confirm the training day.
3. Set the status to `Done` or `Missed`.
4. Check off the exercises completed that day.
5. Enter weights for any lifts performed.
6. Enter cardio type, minutes, level, and speed when applicable.
7. Add notes for technique, recovery, pain, energy, or missed work.
8. Click `Save Gym Log`.

The weekly day tracker shows whether each planned training day is done, missed, or not logged yet. Completed gym logs count toward the workout total and the 100/200 workout achievement badges.

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
4. Enter a repository name, for example `SP500web`.
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
4. In the commit message box, type `Initial S&P500web dashboard`.
5. Click `Commit changes`.

### 3. Push With Git Instead

If you prefer the command line, run these commands from the project folder:

```bash
git init
git add index.html style.css app.js README.md LICENSE .gitignore
git commit -m "Initial S&P500web dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/SP500web.git
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
https://YOUR-USERNAME.github.io/SP500web/
```

GitHub Pages can take a few minutes to publish the first time.

## Local Use

You can also open `index.html` directly in a browser. The dashboard does not require a server.

## Privacy

All progress entries are stored only in the browser's local storage. The data is not sent anywhere.
