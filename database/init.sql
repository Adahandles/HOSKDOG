-- HOSKDOG Database Schema

-- Slurp history table
CREATE TABLE IF NOT EXISTS slurp_history (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL,
    tx_hash VARCHAR(255) UNIQUE NOT NULL,
    amount_hkdg BIGINT NOT NULL,
    amount_ada BIGINT,
    is_meme_holder BOOLEAN DEFAULT FALSE,
    slurp_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deposit history table
CREATE TABLE IF NOT EXISTS deposit_history (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL,
    tx_hash VARCHAR(255) UNIQUE NOT NULL,
    amount_ada BIGINT NOT NULL,
    fee_ada BIGINT NOT NULL,
    deposit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    last_action TIMESTAMP NOT NULL,
    attempt_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address, action_type)
);

-- Faucet stats table
CREATE TABLE IF NOT EXISTS faucet_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_slurps INT DEFAULT 0,
    total_hkdg_distributed BIGINT DEFAULT 0,
    total_ada_deposited BIGINT DEFAULT 0,
    unique_wallets INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_slurp_wallet ON slurp_history(wallet_address);
CREATE INDEX idx_slurp_timestamp ON slurp_history(slurp_timestamp DESC);
CREATE INDEX idx_deposit_wallet ON deposit_history(wallet_address);
CREATE INDEX idx_rate_limit_lookup ON rate_limits(wallet_address, action_type);
CREATE INDEX idx_faucet_stats_date ON faucet_stats(date DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for slurp_history
CREATE TRIGGER update_slurp_history_updated_at
    BEFORE UPDATE ON slurp_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
