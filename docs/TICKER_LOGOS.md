# Token Logo Configuration

HOSKDOG uses a simple JSON file at `data/token-logos.json` to map token tickers to logo images located in the `images/` directory.  When adding a new token to the ticker or to other UI components, please update both the JSON mapping and include a PNG or SVG file in the `images/` directory.

Example mapping:

```json
{
  "HKDG": "hoskdog.png",
  "SNEK": "snek.png",
  "HOSKY": "hosky.png",
  "ADA": "cardano.png"
}
```
