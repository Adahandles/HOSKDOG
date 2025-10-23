# Ticker Logo Configuration

This document explains how to configure and use ticker logos on the HOSKDOG website.

## Overview

The site now displays small logos next to every token/ticker text across the Cross-Chain Meme Swap Hub. The logos are configurable via a JSON file and automatically applied to all tickers throughout the site.

## Configuration File

Logo mappings are stored in `data/token-logos.json`:

```json
{
  "tokens": {
    "HKDG": "https://ipfs.io/ipfs/QmWf799LdLps83xPwDCE9Rb4qgGp547FqoATK7Lz2xiyLD",
    "SNEK": "https://cdn.jsdelivr.net/gh/snek-network/assets/logo.png",
    "ADA": "https://assets.coingecko.com/coins/images/975/small/cardano.png",
    ...
  }
}
```

## Adding a New Token Logo

To add a logo for a new token:

1. Open `data/token-logos.json`
2. Add a new entry with the token ticker and logo URL:
   ```json
   "YOUR_TOKEN": "https://example.com/path/to/logo.png"
   ```
3. Save the file - changes will be reflected immediately when the page is reloaded

## Logo Requirements

- **Format**: PNG, JPG, or any web-compatible image format
- **Recommended Size**: 40x40 pixels or larger (will be scaled down)
- **Shape**: Logos are displayed in circles, so square images work best
- **Hosting**: Can be hosted on IPFS, CDN, or any publicly accessible URL

## CSS Classes

Three CSS classes are available for ticker logos:

### `.ticker-inline`
Container that wraps the logo and ticker text together
- Uses flexbox for inline alignment
- 0.4rem gap between logo and text

### `.ticker-logo`
Standard size for inline ticker logos (20x20 pixels)
- Circular with rounded border
- Subtle cyan shadow
- Used in most locations (token lists, pairs, etc.)

### `.title-logo`
Larger size for prominent displays (28x28 pixels)
- Used in headings and hero sections
- More prominent shadow effect

## JavaScript API

### `tickerHTML(name, size='small')`

Helper function that generates HTML for a ticker with its logo.

**Parameters:**
- `name` (string): The token ticker (e.g., 'HKDG', 'ADA')
- `size` (string, optional): Either 'small' (default) or 'large'

**Returns:**
- HTML string with logo and ticker text, or just the ticker if no logo is configured

**Example:**
```javascript
tickerHTML('HKDG')        // Returns: <span class="ticker-inline"><img...>HKDG</span>
tickerHTML('HKDG', 'large') // Returns: <span class="ticker-inline"><img class="title-logo"...>HKDG</span>
```

## Error Handling

If a logo image fails to load (404, network error, etc.):
- The `onerror` handler automatically hides the image
- Only the ticker text is displayed
- No broken image icons are shown to users

## Browser Compatibility

The logo feature works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Performance

- Logo configuration is fetched asynchronously on page load
- Images are lazy-loaded by the browser
- Failed images don't block page rendering
- Minimal impact on page load time

## Future Enhancements

Possible future improvements:
- Local image hosting option
- Automatic fallback to default logo
- Admin panel for managing logos
- Logo caching strategy
