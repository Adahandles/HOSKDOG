
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
- [ ] Wallet connection works (Eternl, Nami, or Flint)
- [ ] Amount validation shows errors for invalid input
- [ ] "Prepare Deposit" builds transaction successfully
- [ ] Confirmation modal shows correct amount and fee
- [ ] Transaction can be signed with wallet
- [ ] Transaction submits and returns txHash
- [ ] Transaction visible on Cardanoscan

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
