# Hosting the Untethered Podcast

The Untethered Podcast is self-hosted on **Garden Steward's Firebase Hosting** — $0/month, no vendor lock-in, all under our own domain.

## Architecture

```
public/podcast.xml              → https://garden-steward.web.app/podcast.xml
public/podcast/episode-1.mp3    → https://garden-steward.web.app/podcast/episode-1.mp3
public/podcast/cover-art.jpg    → https://garden-steward.web.app/podcast/cover-art.jpg
```

Vite copies `public/` → `dist/` during `vite build`, and Firebase Hosting serves
everything from `dist/`. Static files are served before the SPA catch-all rewrite.

## How to Publish a New Episode

### Step 1: Get the final audio file

- Cypress records the episode and sends you the raw audio
- Post-process with ffmpeg (trim, compress, normalize, add intro/outro)
- Export as MP3 (192-256 kbps recommended, mono is fine for spoken word)

### Step 2: Upload to repo

```bash
# Save the MP3 in the podcast directory
cp /path/to/episode-N-final.mp3 public/podcast/episode-N.mp3
```

### Step 3: Update the RSS feed

Edit `public/podcast.xml`:

1. **Update `<lastBuildDate>`** at the top to today's date (RFC 2822 format)
2. **Copy the example `<item>` block** from the comments in the XML
3. **Fill in episode details:**
   - `<title>` — "Ep N: Episode Title"
   - `<enclosure>` — update `length` attribute (file size in BYTES — get it with `ls -l`)
   - `<pubDate>` — launch date in RFC 2822 (e.g., `Wed, 17 Jun 2026 06:00:00 GMT`)
   - `<itunes:duration>` — HH:MM:SS format
   - `<itunes:episode>` — episode number
   - `<guid>` — update the anchor fragment: `#episode-N`
   - `<description>` — plain text summary (~2 sentences)
   - `<content:encoded>` — full show notes with HTML

### Step 4: Get the file size for the enclosure

```bash
ls -l public/podcast/episode-N.mp3
# Output: -rw-r--r-- 1 rowan rowan 12345678 Jun 17 12:00 episode-N.mp3
# The number before the date is the size in bytes — put this in `length=""`
```

### Step 5: Deploy

```bash
npm run deploy
# This runs: vite build && firebase deploy
```

### Step 6: Verify

- Visit `https://garden-steward.web.app/podcast.xml` in a browser — should show the XML
- Run through a validator: https://castfeedvalidator.com/
- Or use a podcast app test subscription

## Initial Setup (One-Time)

1. ~~Create `public/podcast.xml`~~ ✅ Done
2. ~~Create `public/podcast/` directory~~ ✅ Done
3. ~~Get cover art~~ — Tracked in GAR-6, place it at `public/podcast/cover-art.jpg`
4. Submit RSS feed to directories:
   - **Apple Podcasts:** https://podcastsconnect.apple.com/
   - **Spotify:** https://podcasters.spotify.com/
   - Google Podcasts (via Google's directory)

## Audio File Guidelines

| Property | Recommendation |
|----------|---------------|
| Format | MP3 (MPEG Audio Layer 3) |
| Bitrate | 192 kbps (spoken word) |
| Sample rate | 44.1 kHz |
| Channel | Mono (spoken word) or Stereo (music) |
| Normalization | -16 LUFS (broadcast standard) |
| Max file size | < 200 MB (most podcast apps handle this) |

## What About GCS?

The project's GCS bucket (`steward-garden-images`) has **public access prevention**
enforced, so it can't serve public objects. Firebase Hosting is a simpler, better fit
for static podcast audio files.