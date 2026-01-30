# Relationship Intelligence & Beneficial Ownership Analysis

## Overview

The Relationship Intelligence and Beneficial Ownership Analysis system provides advanced blockchain analytics to identify relationships between wallet addresses and detect beneficial ownership patterns in the Cardano ecosystem.

## Features

### 🔍 Single Address Analysis
- Analyze transaction patterns for individual addresses
- Identify connected addresses and relationship clusters
- Calculate risk scores based on transaction behavior
- Track transaction frequency and timing patterns

### 👥 Beneficial Ownership Detection
- Analyze multiple addresses to identify common beneficial owners
- Detect control patterns across address networks
- Calculate distribution metrics (concentration and diversity)
- Identify hub addresses and synchronized activity patterns

### 📊 Distribution Analytics
- Token distribution concentration analysis
- Diversity metrics across address sets
- Centralization detection
- Network topology analysis

## API Endpoints

### 1. Analyze Single Address Relationships

**Endpoint:** `POST /api/relationships/analyze`

**Description:** Analyzes relationships and transaction patterns for a single wallet address.

**Request Body:**
```json
{
  "address": "addr1q9lgquer5840jyexr52zjlpvvv33d7qkg4k35ty9f85leftvz5gkpuwt36e4h6zle5trhx3xqus8q08ac60hxe8pc4mqhuyj7k",
  "depth": 2
}
```

**Parameters:**
- `address` (required): Cardano wallet address (addr1... or stake1...)
- `depth` (optional): Analysis depth level (default: 2, range: 1-3)

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "addr1q...",
    "depth": 2,
    "connections": [
      {
        "target": "abc123...",
        "strength": 5,
        "firstSeen": 1640000000000,
        "lastSeen": 1650000000000,
        "type": "transaction"
      }
    ],
    "clusters": [
      {
        "id": "high-frequency",
        "type": "frequent-interaction",
        "addresses": ["..."],
        "size": 3,
        "riskLevel": "medium"
      }
    ],
    "riskScore": 25,
    "metadata": {
      "analyzedAt": "2024-01-30T12:00:00.000Z",
      "totalConnections": 15,
      "uniqueAddresses": 12
    }
  }
}
```

### 2. Get Network Graph

**Endpoint:** `POST /api/relationships/graph`

**Description:** Generates network graph data for visualization of address relationships.

**Request Body:**
```json
{
  "address": "addr1q...",
  "depth": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "addr1q...",
        "label": "addr1q...",
        "type": "primary",
        "connections": 15
      },
      {
        "id": "target1",
        "label": "target1",
        "type": "connected",
        "strength": 5
      }
    ],
    "edges": [
      {
        "source": "addr1q...",
        "target": "target1",
        "weight": 5,
        "type": "transaction"
      }
    ],
    "clusters": [...]
  },
  "metadata": {
    "address": "addr1q...",
    "depth": 2,
    "nodeCount": 16,
    "edgeCount": 15,
    "generatedAt": "2024-01-30T12:00:00.000Z"
  }
}
```

### 3. Analyze Beneficial Ownership

**Endpoint:** `POST /api/ownership/beneficial`

**Description:** Analyzes multiple addresses to identify potential beneficial owners and control patterns.

**Request Body:**
```json
{
  "addresses": [
    "addr1q...",
    "addr1q...",
    "addr1q..."
  ]
}
```

**Parameters:**
- `addresses` (required): Array of Cardano addresses (max 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "addresses": ["addr1q..."],
    "beneficialOwners": [
      {
        "address": "addr1q...",
        "likelihood": 85.5,
        "strength": 15,
        "connectedAddresses": ["addr1q...", "addr1q..."],
        "type": "strong"
      }
    ],
    "controlPatterns": [
      {
        "type": "hub",
        "address": "addr1q...",
        "connectionCount": 25,
        "description": "Address with high number of connections (potential hub)"
      },
      {
        "type": "synchronized",
        "addresses": ["addr1q...", "addr1q..."],
        "description": "Addresses with synchronized transaction patterns",
        "confidence": 0.75
      }
    ],
    "distributionMetrics": {
      "concentration": 45.5,
      "diversity": 8.2,
      "centralizedAddresses": [
        {
          "address": "addr1q...",
          "connections": 25
        }
      ]
    },
    "metadata": {
      "analyzedAt": "2024-01-30T12:00:00.000Z",
      "addressCount": 10
    }
  }
}
```

### 4. Analyze Token Distribution

**Endpoint:** `POST /api/ownership/distribution`

**Description:** Provides detailed distribution metrics for a set of addresses.

**Request Body:**
```json
{
  "addresses": ["addr1q...", "addr1q..."]
}
```

**Parameters:**
- `addresses` (required): Array of addresses (max 50 for distribution analysis)

**Response:**
```json
{
  "success": true,
  "data": {
    "addressCount": 20,
    "distributionMetrics": {
      "concentration": 52.3,
      "diversity": 6.8,
      "centralizedAddresses": [...]
    },
    "beneficialOwnerCount": 3,
    "controlPatternCount": 2,
    "summary": {
      "isHighlyConcentrated": true,
      "isDiverse": false,
      "hasCentralization": true
    }
  }
}
```

### 5. Health Check

**Endpoint:** `GET /api/relationships/health`

**Description:** Check the status of the relationship intelligence service.

**Response:**
```json
{
  "status": "OK",
  "service": "Relationship Intelligence & Beneficial Ownership Analysis",
  "timestamp": "2024-01-30T12:00:00.000Z",
  "endpoints": [
    "POST /api/relationships/analyze",
    "POST /api/relationships/graph",
    "POST /api/ownership/beneficial",
    "POST /api/ownership/distribution"
  ]
}
```

## Data Models

### Relationship Data Structure
```javascript
{
  address: string,           // Primary address analyzed
  depth: number,             // Analysis depth
  connections: [             // Array of connected addresses
    {
      target: string,        // Connected address
      strength: number,      // Connection strength (transaction count)
      firstSeen: timestamp,  // First interaction
      lastSeen: timestamp,   // Most recent interaction
      type: string          // Connection type
    }
  ],
  clusters: [               // Address clusters
    {
      id: string,          // Cluster identifier
      type: string,        // Cluster type
      addresses: [string], // Addresses in cluster
      size: number,        // Cluster size
      riskLevel: string    // Risk assessment
    }
  ],
  riskScore: number,       // Risk score (0-100)
  metadata: object         // Analysis metadata
}
```

### Beneficial Ownership Structure
```javascript
{
  addresses: [string],          // Analyzed addresses
  beneficialOwners: [           // Potential beneficial owners
    {
      address: string,          // Owner address
      likelihood: number,       // Likelihood percentage (0-100)
      strength: number,         // Total connection strength
      connectedAddresses: [string], // Connected addresses
      type: string             // 'strong' or 'moderate'
    }
  ],
  controlPatterns: [           // Detected control patterns
    {
      type: string,            // Pattern type
      description: string,     // Pattern description
      // Additional pattern-specific fields
    }
  ],
  distributionMetrics: {       // Distribution analysis
    concentration: number,     // Concentration percentage
    diversity: number,         // Diversity score
    centralizedAddresses: [...]
  }
}
```

## Analysis Algorithms

### Risk Score Calculation

The risk score (0-100) is calculated based on:

1. **Connection Volume** (0-20 points)
   - > 30 connections: +20 points
   - 15-30 connections: +10 points

2. **Interaction Frequency** (0-30 points)
   - > 5 high-frequency connections: +30 points
   - 2-5 high-frequency connections: +15 points

3. **Transaction History** (0-10 points)
   - < 5 transactions: +10 points (new address)

**Risk Levels:**
- 0-30: Low Risk
- 31-60: Medium Risk
- 61-100: High Risk

### Cluster Identification

Addresses are grouped into clusters based on interaction frequency:

1. **High-Frequency Cluster** (≥3 interactions)
   - Risk Level: Medium
   - Type: frequent-interaction

2. **Medium-Frequency Cluster** (2 interactions)
   - Risk Level: Low
   - Type: moderate-interaction

3. **Low-Frequency Cluster** (1 interaction)
   - Risk Level: Low
   - Type: rare-interaction

### Beneficial Owner Detection

Beneficial owners are identified by:

1. **Cross-Network Presence**: Address appears in multiple address networks
2. **Connection Strength**: High total interaction strength
3. **Likelihood Score**: `(occurrences / total_addresses) * 100`
4. **Classification**:
   - Strong: Present in ≥50% of analyzed networks
   - Moderate: Present in <50% of analyzed networks

### Control Pattern Detection

**Hub Pattern:**
- Address with >10 connections
- Indicates central control point

**Synchronized Pattern:**
- Addresses with similar transaction timing
- Time window: 1 hour
- Minimum 2 addresses to form pattern

### Distribution Metrics

**Concentration:**
- Measures how concentrated connections are
- Formula: `(max_connections / total_connections) * 100`
- High concentration (>50%) indicates centralization

**Diversity:**
- Measures spread of unique connections
- Formula: `(unique_connections / address_count) * 10`
- Higher diversity indicates more distributed network

## Frontend Usage

### Accessing the Interface

Navigate to: `http://localhost:3000/relationship-intelligence.html`

### Single Address Analysis

1. Click the "Single Address" tab
2. Enter a Cardano wallet address
3. Click "Analyze Relationships"
4. View results including:
   - Total connections and unique addresses
   - Risk assessment
   - Relationship clusters
   - Top connections

### Beneficial Ownership Analysis

1. Click the "Beneficial Ownership" tab
2. Enter multiple addresses (one per line, max 20)
3. Click "Analyze Ownership"
4. View results including:
   - Ownership concentration and diversity metrics
   - Potential beneficial owners with likelihood scores
   - Control patterns detected

## Configuration

No additional configuration is required. The system uses the existing Koios API configuration from `config/faucet-settings.json`:

```json
{
  "api": {
    "koiosUrl": "https://api.koios.rest/api/v1"
  }
}
```

You can override the Koios API URL using the `KOIOS_API` environment variable:

```bash
KOIOS_API=https://api.koios.rest/api/v1
```

## Rate Limiting

The relationship intelligence endpoints are protected by the existing rate limiter middleware. Default limits:
- 100 requests per 15 minutes per IP
- Applies to all `/api/*` endpoints

## Security Considerations

1. **Input Validation**: All addresses are validated for proper Cardano format
2. **Request Limits**: Maximum addresses per request enforced
3. **Rate Limiting**: Prevents API abuse
4. **Error Handling**: Sensitive error details only shown in development mode

## Performance Notes

- Single address analysis: ~2-5 seconds
- Multi-address analysis (10 addresses): ~10-15 seconds
- Transaction history limited to 50 most recent transactions per address
- Network graph generation is optimized for <100 nodes

## Error Handling

Common errors and solutions:

**400 Bad Request:**
- Invalid address format (must start with addr1 or stake1)
- Too many addresses (exceeds max limit)
- Missing required fields

**500 Internal Server Error:**
- Koios API unavailable
- Network connectivity issues
- Check server logs for details

## Example Usage

### cURL Examples

**Analyze Single Address:**
```bash
curl -X POST http://localhost:3000/api/relationships/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "address": "addr1q9lgquer5840jyexr52zjlpvvv33d7qkg4k35ty9f85leftvz5gkpuwt36e4h6zle5trhx3xqus8q08ac60hxe8pc4mqhuyj7k",
    "depth": 2
  }'
```

**Analyze Beneficial Ownership:**
```bash
curl -X POST http://localhost:3000/api/ownership/beneficial \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      "addr1q...",
      "addr1q...",
      "addr1q..."
    ]
  }'
```

### JavaScript Example

```javascript
// Analyze single address
const response = await fetch('/api/relationships/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: 'addr1q...',
    depth: 2
  })
});

const data = await response.json();
console.log('Risk Score:', data.data.riskScore);
console.log('Connections:', data.data.connections.length);
```

## Troubleshooting

### Server won't start
- Check that all dependencies are installed: `npm install`
- Verify environment variables are set in `.env`
- Check server logs for specific errors

### API returns empty results
- Verify the address exists on the blockchain
- Check if address has transaction history
- Ensure Koios API is accessible

### Slow response times
- Reduce analysis depth (use depth: 1)
- Analyze fewer addresses at once
- Check network connectivity to Koios API

## Future Enhancements

Potential improvements for future versions:

1. **Graph Visualization**: Interactive network graph rendering
2. **Historical Analysis**: Track ownership changes over time
3. **Export Functions**: Export analysis results as CSV/JSON
4. **Advanced Filtering**: Filter by date ranges, transaction amounts
5. **Real-time Updates**: WebSocket support for live relationship updates
6. **Machine Learning**: Pattern recognition using ML models
7. **Comparative Analysis**: Compare multiple ownership structures
8. **Alert System**: Notify on suspicious patterns

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check server logs for detailed error messages
4. Submit an issue on the project repository

## License

This feature is part of the HOSKDOG project and follows the same MIT license.
