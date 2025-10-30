
# 🐶 HOSKDOG Token Metadata for Integrators & DEXs

This file is intended for dApp developers, wallets, and DEXs that want to support the HOSKDOG token with correct decimal formatting and display conventions.

---

## 🧾 Basic Token Info

- **Token Name**: HOSKDOG
- **Ticker**: HOSKDOG
- **Policy ID**: 9560f81458d28648d9261d180ee2b10afcf6b2305909d367f8f9f0ad
- **Asset Name (Hex)**: 484f534b444f47
- **Fingerprint**: asset1hhuertk37z54kra8a7u9sy4... (shortened for display)

---

## 🔢 Decimal Convention

HOSKDOG uses **6 decimal places** for display formatting.

- `1,000,000 raw HOSKDOG` = `1.000000 displayed HOSKDOG`

All on-chain balances and transactions are handled as integers; decimals are a UI convention.

---

## 📦 Supply

- **Total Raw Supply**: 1,000,000,000,000,000 (1 quadrillion)
- **Display Supply (6 decimals)**: 1,000,000.000000 HOSKDOG

---

## 🧰 Sample Formatter (JavaScript)

```js
function formatHOSKDOG(rawBalance) {
    const factor = 1_000_000;
    return (rawBalance / factor).toLocaleString('en-US', {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
    });
}
```

---

## 📤 Hosting & Info

- **Website**: https://github.com/Adahandles/HOSKDOG
- **Explorer Link**: https://adastat.net/tokens/9560f81458d28648d9261d180ee2b10afcf6b2305909d367f8f9f0ad484b4447
- **Source Code**: https://github.com/Adahandles/HOSKDOG

---

## 🧠 Notes

If you're a wallet or DEX developer and would like to integrate HOSKDOG with proper decimal formatting, please honor the `6-decimal` display standard above.

For questions, open an issue in the GitHub repo or reach out via the project README contact info.
