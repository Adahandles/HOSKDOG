const express = require('express');
const {
  analyzeAddressRelationships,
  analyzeBeneficialOwnership,
  generateNetworkGraph
} = require('../utils/relationship-analyzer');

const router = express.Router();

/**
 * POST /api/relationships/analyze
 * Analyze relationships for a single wallet address
 * 
 * Body: { address: string, depth?: number }
 * Returns: Relationship analysis including connections, clusters, and risk score
 */
router.post('/relationships/analyze', async (req, res) => {
  try {
    const { address, depth = 2 } = req.body;

    if (!address) {
      return res.status(400).json({ 
        error: 'Wallet address is required',
        usage: 'POST { "address": "addr1..." }'
      });
    }

    // Validate address format (basic check)
    if (!address.startsWith('addr1') && !address.startsWith('stake1')) {
      return res.status(400).json({ 
        error: 'Invalid Cardano address format',
        details: 'Address must start with addr1 or stake1'
      });
    }

    console.log(`Analyzing relationships for address: ${address} (depth: ${depth})`);

    const relationships = await analyzeAddressRelationships(address, depth);

    res.json({
      success: true,
      data: relationships
    });

  } catch (error) {
    console.error('Relationship analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze relationships',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/relationships/graph
 * Get network graph data for visualization
 * 
 * Body: { address: string, depth?: number }
 * Returns: Network graph with nodes and edges for visualization
 */
router.post('/relationships/graph', async (req, res) => {
  try {
    const { address, depth = 2 } = req.body;

    if (!address) {
      return res.status(400).json({ 
        error: 'Wallet address is required' 
      });
    }

    console.log(`Generating network graph for: ${address}`);

    const relationships = await analyzeAddressRelationships(address, depth);
    const graph = generateNetworkGraph(relationships);

    res.json({
      success: true,
      data: graph,
      metadata: {
        address,
        depth,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Network graph generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate network graph',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/ownership/beneficial
 * Analyze beneficial ownership patterns across multiple addresses
 * 
 * Body: { addresses: string[] }
 * Returns: Beneficial ownership analysis including potential owners and control patterns
 */
router.post('/ownership/beneficial', async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ 
        error: 'Array of wallet addresses is required',
        usage: 'POST { "addresses": ["addr1...", "addr1..."] }'
      });
    }

    // Limit number of addresses to prevent abuse
    const maxAddresses = 20;
    if (addresses.length > maxAddresses) {
      return res.status(400).json({ 
        error: `Too many addresses. Maximum ${maxAddresses} allowed`,
        provided: addresses.length
      });
    }

    // Validate all addresses
    const invalidAddresses = addresses.filter(addr => 
      !addr.startsWith('addr1') && !addr.startsWith('stake1')
    );
    
    if (invalidAddresses.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid address format detected',
        invalidAddresses: invalidAddresses.slice(0, 5) // Show first 5
      });
    }

    console.log(`Analyzing beneficial ownership for ${addresses.length} addresses`);

    const ownership = await analyzeBeneficialOwnership(addresses);

    res.json({
      success: true,
      data: ownership
    });

  } catch (error) {
    console.error('Beneficial ownership analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze beneficial ownership',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/ownership/distribution
 * Analyze token distribution patterns
 * 
 * Body: { addresses: string[] }
 * Returns: Distribution metrics including concentration and diversity
 */
router.post('/ownership/distribution', async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ 
        error: 'Array of wallet addresses is required' 
      });
    }

    if (addresses.length > 50) {
      return res.status(400).json({ 
        error: 'Too many addresses. Maximum 50 allowed for distribution analysis' 
      });
    }

    console.log(`Analyzing distribution for ${addresses.length} addresses`);

    const ownership = await analyzeBeneficialOwnership(addresses);

    res.json({
      success: true,
      data: {
        addressCount: addresses.length,
        distributionMetrics: ownership.distributionMetrics,
        beneficialOwnerCount: ownership.beneficialOwners.length,
        controlPatternCount: ownership.controlPatterns.length,
        summary: {
          isHighlyConcentrated: ownership.distributionMetrics.concentration > 50,
          isDiverse: ownership.distributionMetrics.diversity > 50,
          hasCentralization: ownership.distributionMetrics.centralizedAddresses.length > 0
        }
      }
    });

  } catch (error) {
    console.error('Distribution analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze distribution',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/relationships/health
 * Health check for relationship intelligence service
 */
router.get('/relationships/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Relationship Intelligence & Beneficial Ownership Analysis',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/relationships/analyze',
      'POST /api/relationships/graph',
      'POST /api/ownership/beneficial',
      'POST /api/ownership/distribution'
    ]
  });
});

module.exports = router;
