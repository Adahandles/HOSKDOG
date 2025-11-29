
# HOSKDOG

HOSKDOG is a meme-powered native token built on the Cardano blockchain. It combines community-driven energy with on-chain meme utility to bring fun, engagement, and decentralization to the Cardano ecosystem.

---

## Deposit Feature

The deposit feature allows users to send ADA to the HOSKDOG treasury using their Cardano wallet (Eternl, Nami, or Flint). The system includes:

- **Wallet Connection**: CIP-30 compliant wallet integration
- **Fee Estimation**: Shows estimated network fees before signing
- **Secure Transaction Building**: Server-side transaction building keeps Blockfrost API key secret
- **Multi-Network Support**: Works with Mainnet and Preprod (testnet)

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

1. Click one of the wallet buttons (Eternl, Nami, Flint)
2. Authorize the connection in your wallet
3. Enter the ADA amount (minimum 1 ADA)
4. Click "Prepare Deposit"
5. Review the fee estimate in the confirmation modal
6. Click "Sign & Send"
7. Confirm the transaction in your wallet
8. Wait for the transaction hash to appear

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
| `NETWORK` | Cardano network | `Mainnet` or `Preprod` |
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

- [ ] Server starts without errors (`npm start` in `server/`)
- [ ] Health check returns OK: `curl http://localhost:4000/api/health`
- [ ] Deposit page loads: `http://localhost:8080/deposit.html`
- [ ] Wallet connection works via unified dropdown (Eternl, Lace, Nami, etc.)
- [ ] Amount validation shows errors for invalid input
- [ ] "Generate Preview" shows deposit preview with fee estimate
- [ ] "Confirm & Sign" button only enabled after preview is generated
- [ ] Confirmation modal shows correct amount and fee
- [ ] Transaction can be signed with wallet
- [ ] Transaction submits and returns txHash
- [ ] Transaction visible on Cardanoscan

### File Structure

```
HOSKDOG/
├── assets/
│   ├── js/
│   │   └── wallet-dropdown.js    # Unified wallet dropdown component
│   └── css/
│       └── style.css             # Main stylesheet
├── public/
│   ├── deposit.html              # Deposit UI with preview flow
│   ├── deposit-client.js         # Client-side deposit logic with fee estimation
│   ├── slurp-logic.html          # Slurp logic page
│   └── deposit-local-fallback.js # Local testing fallback
├── server/
│   ├── package.json              # Server dependencies
│   ├── index.js                  # Express server
│   ├── .env.example              # Environment template
│   └── README.md                 # Server documentation
├── index.html                    # Main homepage
└── README.md                     # This file
```

---

## Deposit Preview Feature

The deposit feature includes a preview flow that shows transaction details BEFORE signing:

### Preview Flow

1. **Connect Wallet**: Use the unified wallet dropdown to connect Eternl, Lace, Nami, or other CIP-30 wallets
2. **Enter Amount**: Input the ADA amount to deposit (minimum 1 ADA)
3. **Generate Preview**: Click "Generate Preview" to see:
   - Deposit amount
   - Estimated network fee
   - Total deduction (amount + fee)
   - Expected receipt
4. **Confirm & Sign**: Only enabled after preview is generated and wallet is connected

### Fee Estimation

Fee estimation follows this priority order:

1. **Server Estimation** (recommended): Uses the deposit server's `/api/build-tx` endpoint which builds a transaction skeleton with Lucid/Blockfrost to calculate accurate fees
2. **Blockfrost Fallback**: If server is unavailable but `BLOCKFROST_API_KEY` is provided in the advanced options, uses Blockfrost directly (development only)
3. **Conservative Fallback**: If neither server nor Blockfrost is available, uses a conservative estimate:
   ```
   fallbackFeeAda = 0.17 + 0.0001 * 200 (bytes) ≈ 0.19 ADA
   ```

### Environment Variables for Fee Estimation

| Variable | Required | Description |
|----------|----------|-------------|
| `BLOCKFROST_KEY` | Yes (server) | Blockfrost API key for the deposit server |
| `NETWORK` | No | `Mainnet` (default) or `Preprod` |

---

## Unified Wallet Dropdown

The application uses a single "Connect Wallet" dropdown across all pages instead of separate wallet buttons. This provides:

- **Single point of connection**: One dropdown to select from available wallets
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Event-driven**: Emits `walletConnected` and `walletDisconnected` events for cross-component communication
- **Auto-detection**: Automatically detects installed CIP-30 wallets

### Supported Wallets

- Eternl
- Lace
- Nami
- Flint
- Typhon
- NuFi

---

## Faucet Feature

See [FAUCET_README.md](./FAUCET_README.md) for documentation on the HOSKDOG token faucet system.

---

## License

MIT

---

*HOSKDOG is a meme token created for entertainment purposes. Not financial advice.*
