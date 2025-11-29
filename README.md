
# HOSKDOG

HOSKDOG is a meme-powered native token built on the Cardano blockchain. It combines community-driven energy with on-chain meme utility to bring fun, engagement, and decentralization to the Cardano ecosystem.

---

## Deposit Feature

The deposit feature allows users to send ADA to the HOSKDOG treasury using their Cardano wallet. The system includes:

- **Unified Wallet Connection**: Single "Connect Wallet" dropdown supporting Eternl, Lace, Nami, Flint, and other wallets
- **Deposit Preview**: Shows estimated fees, total deduction, and expected receipt BEFORE signing
- **Fee Estimation**: Uses server-side calculation when available, with conservative fallback
- **Secure Transaction Building**: Server-side transaction building keeps Blockfrost API key secret
- **Multi-Network Support**: Works with Mainnet and Preprod (testnet)

### Wallet Connection

The wallet connection uses a unified dropdown that:
- Supports multiple wallet types (Eternl, Lace, Nami, Flint, and others)
- Is accessible via keyboard navigation
- Works on both desktop and mobile devices
- Shows connection status and detected wallet availability

### Deposit Preview

Before signing a transaction, users see a preview showing:
- **Deposit Amount**: The amount of ADA to send
- **Estimated Network Fee**: Conservative estimate (~0.17-0.20 ADA typically)
- **Total Deduction**: Sum of deposit amount and fee
- **Expected Receipt**: Net amount the treasury will receive

The "Prepare Deposit" button is disabled until:
1. A wallet is connected
2. A valid amount (≥1 ADA) is entered
3. The preview calculation completes

### Fee Estimation

Fee estimation follows this priority:
1. **Server-side estimation**: Uses Blockfrost API if configured
2. **Conservative fallback**: Formula: `0.17 + 0.0001 * 200 = ~0.19 ADA`

The fallback provides a safe upper bound when the server is unavailable.

### HOSKDOG Receiving Address (Mainnet)

```
addr1q9lgquer5840jyexr52zjlpvvv33d7qkg4k35ty9f85leftvz5gkpuwt36e4h6zle5trhx3xqus8q08ac60hxe8pc4mqhuyj7k
```

⚠️ **Warning**: Make sure your wallet is on the same network (Mainnet/Testnet) as the deposit page setting.

### Quick Start

#### 1. Start the Deposit Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env and add your Blockfrost API key
npm start
```

#### 2. Open the Deposit Page

Serve the `public/` directory with any HTTP server and open `deposit.html`:

```bash
# Using Python
python3 -m http.server 8080 --directory public

# Using Node.js (npx serve)
npx serve public -p 8080
```

Then visit: `http://localhost:8080/deposit.html`

#### 3. Connect Wallet and Deposit

1. Click the "Connect Wallet" dropdown button
2. Select your wallet type (Eternl, Lace, Nami, Flint, or Other)
3. Authorize the connection in your wallet
4. Enter the ADA amount (minimum 1 ADA)
5. Review the deposit preview (amount, fee, total)
6. Click "Prepare Deposit"
7. Review the confirmation modal
8. Click "Sign & Send"
9. Confirm the transaction in your wallet
10. Wait for the transaction hash to appear

### Server API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/build-tx` | POST | Build unsigned transaction |
| `/api/submit` | POST | Submit signed transaction |

#### Build Transaction Request

```json
POST /api/build-tx
{
  "senderAddress": "addr1q...",
  "lovelace": "5000000"
}
```

#### Build Transaction Response

```json
{
  "unsignedTxCborHex": "84a400...",
  "estimatedFee": "175000",
  "recipient": "addr1q9lgquer5840jyexr52zjlpvvv33d7qkg4k35ty9f85leftvz5gkpuwt36e4h6zle5trhx3xqus8q08ac60hxe8pc4mqhuyj7k",
  "network": "Mainnet"
}
```

#### Submit Transaction Request

```json
POST /api/submit
{
  "signedTxCborHex": "84a400..."
}
```

#### Submit Transaction Response

```json
{
  "txHash": "abc123...",
  "explorerUrl": "https://cardanoscan.io/transaction/abc123...",
  "network": "Mainnet"
}
```

### Environment Variables

Create `server/.env` from `server/.env.example`:

| Variable | Description | Example |
|----------|-------------|---------|
| `BLOCKFROST_KEY` | Your Blockfrost API key | `mainnetABC123...` |
| `BLOCKFROST_API_KEY` | Alternative name for Blockfrost key | `mainnetABC123...` |
| `NETWORK` | Cardano network | `Mainnet` or `Preprod` |
| `CARDANO_NETWORK` | Alternative name for network | `mainnet` or `testnet` |
| `PORT` | Server port | `4000` |
| `HOSKDOG_RECEIVING_ADDRESS` | Deposit recipient address | `addr1q9lg...` |
| `CORS_ORIGIN` | Allowed CORS origin | `https://yourdomain.com` |

### Security Considerations

1. **Never commit API keys**: The `.env` file is in `.gitignore`
2. **Restrict CORS**: In production, set `CORS_ORIGIN` to your frontend domain only
3. **Add rate limiting**: For production, add rate limiting middleware
4. **Use HTTPS**: Always deploy behind TLS/HTTPS
5. **Add authentication**: Consider adding API authentication for production

### Testing Checklist

#### Wallet Connection Dropdown
- [ ] Dropdown opens on click
- [ ] Dropdown closes on outside click or Escape key
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Wallet options are accessible (screen reader compatible)
- [ ] Correct wallet connects when selected
- [ ] Button shows connected wallet name after connection

#### Deposit Preview
- [ ] Preview appears when valid amount entered (≥1 ADA)
- [ ] Preview shows deposit amount correctly
- [ ] Preview shows estimated fee (~0.17-0.20 ADA)
- [ ] Preview shows total deduction (amount + fee)
- [ ] Preview shows expected receipt
- [ ] Preview updates when amount changes
- [ ] Error message shows for invalid amounts (<1 ADA)

#### Prepare Button State
- [ ] Button disabled until wallet connected
- [ ] Button disabled until valid amount entered
- [ ] Button disabled until preview computed
- [ ] Button text indicates what action is needed
- [ ] Button enables when all conditions met

#### Transaction Flow
- [ ] Server starts without errors (`npm start` in `server/`)
- [ ] Health check returns OK: `curl http://localhost:4000/api/health`
- [ ] Deposit page loads: `http://localhost:8080/deposit.html`
- [ ] Wallet connection works (Eternl, Lace, Nami, Flint, or Other)
- [ ] Amount validation shows errors for invalid input
- [ ] "Prepare Deposit" builds transaction successfully
- [ ] Confirmation modal shows correct amount and fee
- [ ] Transaction can be signed with wallet
- [ ] Transaction submits and returns txHash
- [ ] Transaction visible on Cardanoscan

#### Mobile Testing
- [ ] Dropdown is usable on mobile (touch events work)
- [ ] Preview section is readable on small screens
- [ ] Buttons are large enough to tap

### File Structure

```
HOSKDOG/
├── public/
│   ├── deposit.html              # Deposit UI
│   ├── deposit-client.js         # Client-side logic
│   └── deposit-local-fallback.js # Local testing fallback
├── server/
│   ├── package.json              # Server dependencies
│   ├── index.js                  # Express server
│   ├── .env.example              # Environment template
│   └── README.md                 # Server documentation
└── README.md                     # This file
```

---

## Faucet Feature

See [FAUCET_README.md](./FAUCET_README.md) for documentation on the HOSKDOG token faucet system.

---

## License

MIT

---

*HOSKDOG is a meme token created for entertainment purposes. Not financial advice.*
