# Memory and Encoding Strategies Experiment

A static browser experiment built with plain HTML, CSS, and JavaScript.

## Run locally
1. Keep `index.html`, `styles.css`, and `script.js` in the same folder.
2. Open `index.html` in a modern browser.
3. Complete the three encoding blocks, 30-second distractor, and free-recall phase.
4. Download both CSV files from the results screen.

## Publish with GitHub Pages
1. Create a public GitHub repository.
2. Upload all three files to the repository's root folder.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. Wait for GitHub Pages to publish and open the provided public URL.

## Notes
- The three strategy orders are randomized for each session.
- The three six-word lists are independently shuffled and assigned to the strategies.
- Each word appears for 3 seconds.
- The distractor task runs for 30 seconds and records submitted numbers.
- Recall scoring is case-insensitive, ignores punctuation/spacing, accepts listed common variants, and allows a unique one-character typo for words of at least five letters. Ambiguous or meaning-changing responses are not automatically counted.
- Data stays in the participant's browser until CSV downloads are initiated. No server or database is used.

For a real study, obtain instructor/ethics approval, use an appropriate consent process, and pilot the scoring rules before collecting research data.
