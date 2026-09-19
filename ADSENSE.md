# Enable Google AdSense on ToolNest

The live site must stay on HTTPS (GitHub Pages) before Google will review it.

## Apply

1. Open [adsense.google.com](https://www.google.com/adsense) and apply with the GitHub Pages URL.
2. If Google gives a **site verification** meta tag or script, paste it into `index.html` `<head>` (that snippet is allowed before ads fill).
3. Wait for approval. Do not click your own ads at any time.

## After approval

1. Replace `ca-pub-YOUR_ID` in `index.html` and uncomment the Auto ads script.
2. Uncomment at most **one** in-content unit and **one** sidebar unit on the tool view. Fill in `data-ad-slot` from AdSense → Ads → By ad unit.
3. Put this line in `ads.txt` (use your numeric pub id):

   `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`

4. In AdSense, turn on **Auto ads** and **Privacy & messaging** (EU/UK consent).
5. Wait 24–48 hours for ads.txt to be crawled.

## What not to do

- Do not restore the old fake “📢 Ad” placeholder boxes.
- Do not stack four ad units on every page for the first review.
- Earnings on a new utilities site are usually small until you have real traffic.
