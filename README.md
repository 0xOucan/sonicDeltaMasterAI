# Sonic Blockchain Chatbot

A versatile chatbot for interacting with the Sonic blockchain, featuring advanced DeFi strategies, lending protocols, and comprehensive portfolio management.

## Current Features

### Interactive Modes
- **Chat Mode**: Interactive conversation with the AI assistant
- **Telegram Mode**: Interact with the assistant through Telegram
- **Demo Mode**: Guided demonstration of key features
- **Auto Mode**: Autonomous execution of strategies

### DeFi Strategies
- **wS-SwapX-Beefy Strategy**
  * Pre-checks token balances for strategy eligibility
  * Deposit wS into SwapX vault
  * Receive LP tokens
  * Stake LP tokens in Beefy vault
  * Earn additional rewards
  * Withdrawal functionality
  * Detailed transaction links to SonicScan

- **USDC.e-SwapX-Beefy Strategy**
  * Similar workflow to wS strategy
  * Handles USDC.e deposits and withdrawals
  * Integrated with SwapX and Beefy vaults
  * Full transaction tracking

### Lending Protocol Integration
- **Aave Supply Operations**
  * Supply tokens to Aave protocol
  * View supplied assets
  * Track lending positions
  * Earn interest on deposits

### Portfolio Management
- **Beefy Portfolio Tracker**
  * View all Beefy vault positions
  * Track vault performance
  * Monitor rewards and yields
  * Real-time USD value calculations

### Token Operations
- **Native S to wS wrapping**
  * Wrap S tokens to wS for DeFi compatibility
  * Unwrap wS back to S tokens
  * Check S/wS balances
- **Transfer tokens**
- **Approve token spending**
- **Basic ERC20 token interactions**

### Wallet Operations
- **Advanced Balance Checker**
  * View native S balance
  * Check wS, USDC.e and other token balances
  * Track Aave supplied assets
  * Monitor Beefy vault positions
  * Balance verification before transactions
- **Transaction tracking**
- **Blockchain data queries**

### Portfolio Management
- Check wallet balances with USD values
- View total portfolio value across all assets
- Track supplied assets in Aave protocol
- Monitor native token and ERC20 balances

### Aave Protocol Integration
- Supply assets (USDC.e, WETH)
- Borrow against collateral
- Check borrowing power and available credit
- View maximum borrowable amounts per asset
- Monitor health factor and liquidation thresholds
- Repay borrowed positions
- Track lending APY rates

### Token Operations
- Supply USDC.e to Aave
- Supply WETH to Aave
- Withdraw supplied assets
- Approve token spending
- Check token balances and allowances

### Supported Assets
- Native S Token
- USDC.e (Bridged USDC)
- WETH (Wrapped ETH)
- wS (Wrapped S)
- aSonWETH (Aave Sonic WETH)
- aSonUSDC.e (Aave Sonic USDC.e)

## Usage Examples

Check Aave Dashboard:
```
aave dashboard
lending dashboard
aave positions
lending protocol
```

Example Output:
```
📊 AAVE LENDING DASHBOARD

OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Net Worth: $4.72
Net APY: -0.11%
Health Factor: 4.60

SUPPLIED ASSETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Balance: $5.72   APY: 0.46%

USDC.e: 3.00 ($3.00) - APY: 0.86%
WETH: 0.001273 ($2.74) - APY: 0.01%

BORROWED ASSETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Balance: $1.00   APY: -3.21%

USDC.e: 1.00 ($1.00) - APY: -3.21%

BORROWING POWER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Available: $3.43

USDC.e: 3.43 ($3.43)
WETH: 0.001595 ($3.43)
S: 6.02 ($3.43)
```

Key Features of Aave Dashboard:
- Shows total net worth
- Displays Net APY (can be negative)
- Tracks health factor
- Lists supplied assets with their APY
- Shows borrowed assets with negative APY
- Provides available borrowing power