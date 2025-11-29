# HOSKDOG Deposit Server

A secure Express.js proxy server for building and submitting ADA deposit transactions to the HOSKDOG receiving address. This server keeps the Blockfrost API key secret on the server side, so the client/browser never needs access to it.

## Features

- **Secure API Key Handling**: Blockfrost API key stays on the server
- **Transaction Building**: Builds unsigned transactions for wallets to sign
- **Transaction Submission**: Submits signed transactions to the Cardano network
- **Network Support**: Works with both Mainnet and Preprod (testnet)
- **CORS Support**: Configurable CORS for frontend integration

## Endpoints

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "service": "HOSKDOG Deposit Server",
  "network": "Mainnet",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "configured": true
}
```

### `POST /api/build-tx`
Build an unsigned transaction for sending ADA to the HOSKDOG receiving address.

**Request Body:**
```json
{
  "senderAddress": "addr1q...",
  "lovelace": "5000000"
}
```

**Response:**
```json
{
  "unsignedTxCborHex": "84a400...",
  "estimatedFee": "175000",
  "recipient": "addr1q9lgquer5840jyexr52zjlpvvv33d7qkg4k35ty9f85leftvz5gkpuwt36e4h6zle5trhx3xqus8q08ac60hxe8pc4mqhuyj7k",
  "network": "Mainnet"
}
```

### `POST /api/submit`
Submit a signed transaction to the Cardano network.

**Request Body:**
```json
{
  "signedTxCborHex": "84a400..."
}
```

**Response:**
```json
{
  "txHash": "abc123...",
  "explorerUrl": "https://cardanoscan.io/transaction/abc123...",
  "network": "Mainnet"
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your Blockfrost API key:

```env
# Get your free key from https://blockfrost.io
BLOCKFROST_KEY=mainnetYOUR_ACTUAL_KEY_HERE

# Network: "Mainnet" or "Preprod"
NETWORK=Mainnet

# Server port
PORT=4000

# HOSKDOG receiving address
HOSKDOG_RECEIVING_ADDRESS=addr1q9lgquer5840jyexr52zjlpvvv33d7qkg4k35ty9f85leftvz5gkpuwt36e4h6zle5trhx3xqus8q08ac60hxe8pc4mqhuyj7k

# For production, restrict CORS to your domain
CORS_ORIGIN=https://yourdomain.com
```

### 3. Start the Server

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

The server will start on port 4000 (or the port specified in `.env`).

## Security Considerations

⚠️ **IMPORTANT**: This server should NOT be exposed publicly without proper security measures!

### Recommended Security Measures

1. **Restrict CORS Origins**: In production, set `CORS_ORIGIN` to your exact frontend domain.

2. **Rate Limiting**: Add rate limiting middleware to prevent abuse:
   ```javascript
   const rateLimit = require('express-rate-limit');
   app.use('/api', rateLimit({ windowMs: 60000, max: 10 }));
   ```

3. **Authentication**: For production, add authentication (API keys, JWT, etc.) to prevent unauthorized use.

4. **Recipient Validation**: The server only allows transactions to the configured HOSKDOG address. Do not modify this to accept arbitrary recipients, or the API could be misused as an open proxy.

5. **HTTPS**: Always use HTTPS in production. Deploy behind a reverse proxy (nginx, Cloudflare, etc.) that terminates TLS.

6. **Environment Security**: Never commit `.env` files with real API keys. The `.gitignore` should already exclude `.env`.

7. **Firewall**: If self-hosting, restrict direct access to the server port and only allow access through your reverse proxy.

### Testing Locally

For local development/testing:

1. Start the deposit server:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. Open `public/deposit.html` in a browser (serve it via any HTTP server).

3. Connect a wallet (Eternl, Nami, or Flint).

4. Enter an amount and confirm the deposit.

5. The wallet will prompt you to sign the transaction.

6. After signing, the transaction is submitted through the server.

## Troubleshooting

### "Server not configured"
The Blockfrost API key is missing or invalid. Check your `.env` file.

### "Network mismatch"
The connected wallet is on a different network than the server. Make sure your wallet and the server's `NETWORK` setting match.

### "Insufficient funds"
The sender wallet doesn't have enough ADA to cover the deposit plus network fees.

### CORS errors
Make sure the `CORS_ORIGIN` in `.env` matches your frontend's origin, or use `*` for local testing (not recommended for production).

## Testing Checklist

- [ ] Server starts without errors
- [ ] `/api/health` returns status OK and configured: true
- [ ] Connect wallet in `deposit.html`
- [ ] Enter amount and click "Prepare Deposit"
- [ ] Confirm fee estimate in modal
- [ ] Sign transaction with wallet
- [ ] Verify transaction hash returned and visible in explorer

## License

MIT
