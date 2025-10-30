
// Format HOSKDOG raw balance into decimal display
function formatHOSKDOG(rawBalance) {
    const decimals = 6;
    const factor = Math.pow(10, decimals);
    return (rawBalance / factor).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Example usage:
let raw = 2500000;  // from wallet or blockchain
console.log(formatHOSKDOG(raw)); // Outputs: 2.500000
