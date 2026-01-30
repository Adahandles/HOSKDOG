const axios = require('axios');
const config = require('../../config/faucet-settings.json');

/**
 * Relationship Intelligence and Beneficial Ownership Analysis
 * Analyzes blockchain transaction patterns to identify relationships between addresses
 * and beneficial ownership structures
 */

/**
 * Analyze relationships between wallet addresses
 * @param {string} address - Primary address to analyze
 * @param {number} depth - How many levels deep to analyze (default: 2)
 * @returns {Object} Relationship graph data
 */
async function analyzeAddressRelationships(address, depth = 2) {
  try {
    const relationships = {
      address,
      depth,
      connections: [],
      clusters: [],
      riskScore: 0,
      metadata: {
        analyzedAt: new Date().toISOString(),
        totalConnections: 0,
        uniqueAddresses: 0
      }
    };

    // Get transaction history for the address
    const txHistory = await getAddressTransactionHistory(address);
    
    // Build relationship graph from transactions
    const graph = buildRelationshipGraph(address, txHistory);
    relationships.connections = graph.connections;
    relationships.clusters = identifyClusters(graph);
    
    // Calculate risk score based on patterns
    relationships.riskScore = calculateRiskScore(graph);
    
    relationships.metadata.totalConnections = graph.connections.length;
    relationships.metadata.uniqueAddresses = new Set(
      graph.connections.map(c => c.target)
    ).size;

    return relationships;
  } catch (error) {
    console.error('Error analyzing address relationships:', error);
    throw error;
  }
}

/**
 * Identify beneficial ownership patterns
 * @param {string[]} addresses - Array of addresses to analyze
 * @returns {Object} Beneficial ownership structure
 */
async function analyzeBeneficialOwnership(addresses) {
  try {
    const ownership = {
      addresses,
      beneficialOwners: [],
      controlPatterns: [],
      distributionMetrics: {
        concentration: 0,
        diversity: 0,
        centralizedAddresses: []
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        addressCount: addresses.length
      }
    };

    // Analyze each address
    const analysisPromises = addresses.map(addr => 
      analyzeAddressRelationships(addr, 1)
    );
    const analyses = await Promise.all(analysisPromises);

    // Identify potential beneficial owners (addresses with many connections)
    ownership.beneficialOwners = identifyBeneficialOwners(analyses);
    
    // Identify control patterns
    ownership.controlPatterns = identifyControlPatterns(analyses);
    
    // Calculate distribution metrics
    ownership.distributionMetrics = calculateDistributionMetrics(analyses);

    return ownership;
  } catch (error) {
    console.error('Error analyzing beneficial ownership:', error);
    throw error;
  }
}

/**
 * Get transaction history for an address using Koios API
 * @param {string} address - Cardano address
 * @returns {Array} Transaction history
 */
async function getAddressTransactionHistory(address) {
  try {
    const koiosUrl = process.env.KOIOS_API || config.api.koiosUrl;
    const response = await axios.post(`${koiosUrl}/address_txs`, {
      _addresses: [address]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    if (!response.data || response.data.length === 0) {
      return [];
    }

    // Limit to recent transactions to avoid overwhelming the system
    const txs = response.data[0]?.tx_list || [];
    return txs.slice(0, 50); // Analyze most recent 50 transactions
  } catch (error) {
    console.error('Error fetching transaction history:', error.message);
    return [];
  }
}

/**
 * Build a relationship graph from transaction data
 * @param {string} sourceAddress - Source address
 * @param {Array} transactions - Transaction list
 * @returns {Object} Relationship graph
 */
function buildRelationshipGraph(sourceAddress, transactions) {
  const graph = {
    source: sourceAddress,
    connections: [],
    transactionCount: transactions.length,
    firstSeen: null,
    lastSeen: null
  };

  const addressFrequency = {};

  transactions.forEach(tx => {
    const txHash = tx.tx_hash;
    const timestamp = tx.block_time || Date.now();

    // Track first and last seen
    if (!graph.firstSeen || timestamp < graph.firstSeen) {
      graph.firstSeen = timestamp;
    }
    if (!graph.lastSeen || timestamp > graph.lastSeen) {
      graph.lastSeen = timestamp;
    }

    // For relationship analysis, we'd need to fetch full transaction details
    // This is a simplified version tracking transaction frequency
    if (!addressFrequency[txHash]) {
      addressFrequency[txHash] = {
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp
      };
    } else {
      addressFrequency[txHash].count++;
      addressFrequency[txHash].lastSeen = timestamp;
    }
  });

  // Build connections from frequency data
  Object.entries(addressFrequency).forEach(([hash, data]) => {
    graph.connections.push({
      target: hash.substring(0, 16) + '...', // Truncated for display
      strength: data.count,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      type: 'transaction'
    });
  });

  return graph;
}

/**
 * Identify clusters of related addresses
 * @param {Object} graph - Relationship graph
 * @returns {Array} Clusters
 */
function identifyClusters(graph) {
  const clusters = [];
  const connections = graph.connections;

  // Group by transaction frequency patterns
  const highFrequency = connections.filter(c => c.strength >= 3);
  const mediumFrequency = connections.filter(c => c.strength === 2);
  const lowFrequency = connections.filter(c => c.strength === 1);

  if (highFrequency.length > 0) {
    clusters.push({
      id: 'high-frequency',
      type: 'frequent-interaction',
      addresses: highFrequency.map(c => c.target),
      size: highFrequency.length,
      riskLevel: 'medium'
    });
  }

  if (mediumFrequency.length > 0) {
    clusters.push({
      id: 'medium-frequency',
      type: 'moderate-interaction',
      addresses: mediumFrequency.map(c => c.target),
      size: mediumFrequency.length,
      riskLevel: 'low'
    });
  }

  if (lowFrequency.length > 0) {
    clusters.push({
      id: 'low-frequency',
      type: 'rare-interaction',
      addresses: lowFrequency.map(c => c.target),
      size: lowFrequency.length,
      riskLevel: 'low'
    });
  }

  return clusters;
}

/**
 * Calculate risk score based on transaction patterns
 * @param {Object} graph - Relationship graph
 * @returns {number} Risk score (0-100)
 */
function calculateRiskScore(graph) {
  let score = 0;

  // High number of connections increases risk slightly
  if (graph.connections.length > 30) {
    score += 20;
  } else if (graph.connections.length > 15) {
    score += 10;
  }

  // Very frequent interactions with same addresses
  const highFrequencyCount = graph.connections.filter(c => c.strength >= 5).length;
  if (highFrequencyCount > 5) {
    score += 30;
  } else if (highFrequencyCount > 2) {
    score += 15;
  }

  // New address (less transaction history)
  if (graph.transactionCount < 5) {
    score += 10;
  }

  return Math.min(score, 100); // Cap at 100
}

/**
 * Identify potential beneficial owners from multiple address analyses
 * @param {Array} analyses - Array of address analyses
 * @returns {Array} Potential beneficial owners
 */
function identifyBeneficialOwners(analyses) {
  const beneficialOwners = [];
  
  // Find addresses that appear in multiple analyses (common connections)
  const addressOccurrences = {};
  
  analyses.forEach(analysis => {
    analysis.connections.forEach(connection => {
      const target = connection.target;
      if (!addressOccurrences[target]) {
        addressOccurrences[target] = {
          address: target,
          occurrences: 0,
          totalStrength: 0,
          connectedAddresses: []
        };
      }
      addressOccurrences[target].occurrences++;
      addressOccurrences[target].totalStrength += connection.strength;
      addressOccurrences[target].connectedAddresses.push(analysis.address);
    });
  });

  // Identify potential beneficial owners (appear in multiple address networks)
  Object.values(addressOccurrences).forEach(data => {
    if (data.occurrences >= 2) {
      beneficialOwners.push({
        address: data.address,
        likelihood: Math.min((data.occurrences / analyses.length) * 100, 100),
        strength: data.totalStrength,
        connectedAddresses: data.connectedAddresses,
        type: data.occurrences >= analyses.length * 0.5 ? 'strong' : 'moderate'
      });
    }
  });

  // Sort by likelihood descending
  beneficialOwners.sort((a, b) => b.likelihood - a.likelihood);

  return beneficialOwners;
}

/**
 * Identify control patterns in the address network
 * @param {Array} analyses - Array of address analyses
 * @returns {Array} Control patterns
 */
function identifyControlPatterns(analyses) {
  const patterns = [];

  // Pattern 1: Hub address (one address connected to many others)
  analyses.forEach(analysis => {
    if (analysis.connections.length > 10) {
      patterns.push({
        type: 'hub',
        address: analysis.address,
        connectionCount: analysis.connections.length,
        description: 'Address with high number of connections (potential hub)'
      });
    }
  });

  // Pattern 2: Synchronized activity (addresses with similar transaction timing)
  const timingGroups = groupByTransactionTiming(analyses);
  if (timingGroups.length > 0) {
    timingGroups.forEach((group, index) => {
      if (group.addresses.length >= 2) {
        patterns.push({
          type: 'synchronized',
          addresses: group.addresses,
          description: 'Addresses with synchronized transaction patterns',
          confidence: group.confidence
        });
      }
    });
  }

  return patterns;
}

/**
 * Group addresses by similar transaction timing
 * @param {Array} analyses - Array of address analyses
 * @returns {Array} Timing groups
 */
function groupByTransactionTiming(analyses) {
  // Simplified implementation
  // In production, would use more sophisticated time-series analysis
  const groups = [];
  
  // Group addresses active in similar time windows
  const timeWindow = 3600000; // 1 hour in milliseconds
  
  analyses.forEach(analysis => {
    if (analysis.connections.length > 0) {
      const avgTime = analysis.connections.reduce((sum, c) => 
        sum + (c.lastSeen || 0), 0
      ) / analysis.connections.length;
      
      let addedToGroup = false;
      for (const group of groups) {
        if (Math.abs(group.avgTime - avgTime) < timeWindow) {
          group.addresses.push(analysis.address);
          group.avgTime = (group.avgTime + avgTime) / 2; // Recalculate average
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push({
          addresses: [analysis.address],
          avgTime,
          confidence: 0.5
        });
      }
    }
  });
  
  return groups.filter(g => g.addresses.length >= 2);
}

/**
 * Calculate distribution metrics for token holdings
 * @param {Array} analyses - Array of address analyses
 * @returns {Object} Distribution metrics
 */
function calculateDistributionMetrics(analyses) {
  const metrics = {
    concentration: 0,
    diversity: 0,
    centralizedAddresses: []
  };

  if (analyses.length === 0) return metrics;

  // Calculate concentration (Gini coefficient approximation)
  const connectionCounts = analyses.map(a => a.connections.length);
  const totalConnections = connectionCounts.reduce((sum, count) => sum + count, 0);
  
  if (totalConnections > 0) {
    // Higher concentration means fewer addresses hold most connections
    const maxPossibleConcentration = totalConnections;
    const actualConcentration = Math.max(...connectionCounts);
    metrics.concentration = (actualConcentration / maxPossibleConcentration) * 100;
  }

  // Calculate diversity (how spread out the connections are)
  const uniqueConnections = new Set();
  analyses.forEach(analysis => {
    analysis.connections.forEach(conn => {
      uniqueConnections.add(conn.target);
    });
  });
  
  metrics.diversity = (uniqueConnections.size / analyses.length) * 10; // Scale to reasonable range

  // Identify centralized addresses (top 20% by connection count)
  const sorted = analyses
    .map(a => ({ address: a.address, connections: a.connections.length }))
    .sort((a, b) => b.connections - a.connections);
  
  const top20Percent = Math.max(1, Math.ceil(sorted.length * 0.2));
  metrics.centralizedAddresses = sorted.slice(0, top20Percent);

  return metrics;
}

/**
 * Generate a visual representation of the relationship network
 * @param {Object} relationships - Relationship data
 * @returns {Object} Network graph data for visualization
 */
function generateNetworkGraph(relationships) {
  const nodes = [
    {
      id: relationships.address,
      label: relationships.address.substring(0, 12) + '...',
      type: 'primary',
      connections: relationships.connections.length
    }
  ];

  const edges = [];

  relationships.connections.forEach((connection, index) => {
    nodes.push({
      id: connection.target,
      label: connection.target,
      type: 'connected',
      strength: connection.strength
    });

    edges.push({
      source: relationships.address,
      target: connection.target,
      weight: connection.strength,
      type: connection.type
    });
  });

  return {
    nodes,
    edges,
    clusters: relationships.clusters
  };
}

module.exports = {
  analyzeAddressRelationships,
  analyzeBeneficialOwnership,
  generateNetworkGraph,
  getAddressTransactionHistory
};
