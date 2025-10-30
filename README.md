# HOSKDOG

HOSKDOG is the **super meme dog of Cardano**, combining the best aspects of Snek (community‑first, deflationary ethos) and Hosky (fun, open, accessible) into a single project.  This repository hosts the source code for the HOSKDOG website and associated documentation.  The project is designed to be **cleanly structured** and easy to navigate for contributors.

## Project Structure

```
hoskdog/
├── index.html             # Main website entry point
├── assets/
│   ├── css/style.css      # Site‑wide stylesheet
│   └── js/script.js       # JavaScript for interactive features
├── images/                # Logos and media assets
├── data/
│   └── token-logos.json   # Mapping of token tickers to logo filenames
├── docs/                  # Project documentation
│   ├── TICKER_LOGOS.md    # How to add new token logos
│   └── HOSKDOG_Manifesto.md # The HOSKDOG manifesto
└── metadata/
    └── hoskdog_metadata.json # On‑chain metadata for the HOSKDOG token
```

## Development

This is a static site.  You can serve it locally with any static file server (for example `python3 -m http.server`).  To deploy on GitHub Pages, simply push the contents of the `hoskdog` folder to the `main` branch of this repository.  All external assets are stored in the `images/` directory, and token logos are configured via `data/token-logos.json`.

## Token Supply

HOSKDOG is a non‑inflationary token with a fixed supply of **1,000 tokens**, minted under policy ID `9560f81458…f0ad`【695069577218189†L115-L128】.  Distribution is transparent: 60 % for community rewards, 25 % to the treasury, 10 % for ecosystem development and partnerships, and 5 % reserved for liquidity provision.
