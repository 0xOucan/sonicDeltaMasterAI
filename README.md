# 🚀 Sonic Blockchain Chatbot

A versatile chatbot for interacting with the Sonic blockchain, featuring advanced DeFi strategies, lending protocols, and comprehensive portfolio management.

## 📊 Current Features

### 🤖 Interactive Modes
- **💬 Chat Mode**: Interactive conversation with the AI assistant
- **📱 Telegram Mode**: Interact with the assistant through Telegram
- **🔍 Demo Mode**: Guided demonstration of key features
- **🔄 Auto Mode**: Autonomous execution of strategies

### 💹 DeFi Strategies

#### ⚖️ Delta Neutral Strategy (APY ~11%)

Our advanced Delta Neutral strategy leverages Aave lending and Beefy yield farming to create a position that generates yield while minimizing price exposure:

1. Supply USDC.e to Aave as collateral
2. Borrow wS tokens at 50% of borrowing capacity
3. Deploy borrowed wS into Beefy's high-yield wS-SwapX vault
4. Earn the spread between borrowing costs and farming yield

This approach aims to profit from the difference between borrowing APY and farming APY, creating a more stable return profile regardless of token price movements.

**Commands:**
```
delta-neutral-apy
execute-delta-neutral 100
```

**Example Output:**
```
## ⚖️ Delta Neutral Strategy - APY Breakdown

💰 **Beefy wS-SwapX Vault APY:** +15.00%
🏦 **Aave wS Borrow APY:** -4.00%

🔄 **Net Strategy APY:** 11.00%

✅ **Strategy is profitable!** The yield farming returns currently exceed borrowing costs.

### How It Works
1. Your USDC.e is supplied to Aave as collateral
2. 50% of your borrowing power is used to borrow wS
3. Borrowed wS is deployed in Beefy's wS-SwapX vault
4. You earn the spread between borrowing costs and farming returns
```

#### 🔥 wS-SwapX-Beefy Strategy (APY ~500%)
- Pre-checks token balances for strategy eligibility
- Deposit wS into SwapX vault
- Receive LP tokens
- Stake LP tokens in Beefy vault
- Earn high APY rewards (~500%)
- Withdrawal functionality
- Detailed transaction links to SonicScan

**Commands:**
```
execute-full-ws-swapx-beefy-strategy 10
```

**Example Output:**
```
## 🔥 Executing full wS SwapX Beefy strategy:

✅ Sufficient wS balance: 20.5 wS

📝 Transaction 1/3: Approve SwapX LP vault to spend wS
🔄 Transaction submitted: 0x7a8e9f... [View on SonicScan](https://sonicscan.org/tx/0x7a8e9f...)
✅ Approval successful!

📝 Transaction 2/3: Deposit 10 wS into SwapX vault
🔄 Transaction submitted: 0x3b2c1d... [View on SonicScan](https://sonicscan.org/tx/0x3b2c1d...)
✅ Deposit successful! Received 9.843 LP tokens

📝 Transaction 3/3: Stake LP tokens in Beefy vault
🔄 Transaction submitted: 0x6f4e2a... [View on SonicScan](https://sonicscan.org/tx/0x6f4e2a...)
✅ Staking successful! Received 9.843 mooTokens

🎉 Strategy execution complete! You've successfully:
1. Deposited 10 wS into SwapX vault
2. Received 9.843 LP tokens
3. Staked LP tokens in Beefy vault earning ~500% APY
```

#### 💰 USDC.e-SwapX-Beefy Strategy (APY ~250%)
- Similar workflow to wS strategy
- Handles USDC.e deposits and withdrawals
- Integrated with SwapX and Beefy vaults
- Full transaction tracking

**Commands:**
```
execute-usdce-strategy 100
```

### 🏦 Lending Protocol Integration
- **Aave Supply Operations**
  * Supply tokens to Aave protocol
  * View supplied assets
  * Track lending positions
  * Earn interest on deposits

**Commands:**
```
aave dashboard
supply-usdc 100
supply-weth 0.1
borrow-usdc 50
```

**Example Output:**
```
📊 AAVE LENDING DASHBOARD

OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Net Worth: $4.72
📈 Net APY: -0.11%
❤️ Health Factor: 4.60

SUPPLIED ASSETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💲 Balance: $5.72   APY: 0.46%

💵 USDC.e: 3.00 ($3.00) - APY: 0.86%
💎 WETH: 0.001273 ($2.74) - APY: 0.01%

BORROWED ASSETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💸 Balance: $1.00   APY: -3.21%

💵 USDC.e: 1.00 ($1.00) - APY: -3.21%

BORROWING POWER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Available: $3.43

💵 USDC.e: 3.43 ($3.43)
💎 WETH: 0.001595 ($3.43)
🪙 S: 6.02 ($3.43)
```

### 📋 Portfolio Management
- **🐮 Beefy Portfolio Tracker**
  * View all Beefy vault positions with current APY
  * Track vault performance
  * Monitor rewards and yields
  * Real-time USD value calculations
  * Daily yield estimates

**Commands:**
```
check-beefy-portfolio
```

**Example Output:**
```
## 🐮 Beefy Finance Portfolio for 0x1234...5678

### 📊 wS-SwapX Vault

- 💰 **Current Balance**: 9.84320000 mooTokens
- 🔄 **Underlying Balance**: 9.87654321 LP
- 💵 **USD Value**: $125.75
- 📈 **Current APY**: 498.62%
- 💸 **Est. Daily Yield**: $1.7124/day
- 📊 **Price per Share**: 1.00338000
- 🕒 **Last Transaction**: 2/28/2024, 3:15:24 PM

## 💲 Total Portfolio Value: $125.75

*Note: APY values are current rates and subject to change based on market conditions.*
```

- **🔍 Portfolio Strategy Analyzer**
  * Automatically analyze wallet balances
  * Recommend compatible strategies based on assets
  * Show current APY for each strategy
  * Provide easy-to-use commands

**Commands:**
```
analyze-portfolio-strategies
```

**Example Output:**
```
## 🔍 Portfolio Strategy Analysis for 0x1234...5678

### 💼 Available Assets

- 🪙 **Native S**: 15.2500 ($8.69)
  - *Tip: You can wrap your S tokens to wS using the `wrap-s` command to use them in strategies.*
- 🌀 **wS**: 5.4321 ($3.10)
- 💵 **USDC.e**: 245.75 ($245.75)

### ✅ Compatible Strategies

#### 🔥 wS-SwapX-Beefy Strategy (APY: ~498.62%)
Deposit wS into SwapX vault, then stake LP tokens in Beefy vault for high APY returns.
- **Required Asset**: wS
- **Command**: `execute-full-ws-swapx-beefy-strategy [amount]`
- **Example**: `execute-full-ws-swapx-beefy-strategy 10` (deposit 10 wS)

#### 💰 USDC.e-SwapX-Beefy Strategy (APY: ~252.31%)
Deposit USDC.e into SwapX vault, then stake LP tokens in Beefy vault for stable returns.
- **Required Asset**: USDC.e
- **Command**: `execute-usdce-strategy [amount]`
- **Example**: `execute-usdce-strategy 100` (deposit 100 USDC.e)

#### ⚖️ Delta Neutral Strategy (APY: ~11.00%)
Supply USDC.e to Aave, borrow wS, and deploy borrowed wS into Beefy's high-yield vault for market-neutral returns.
- **Required Asset**: USDC.e
- **Command**: `execute-delta-neutral [amount]`
- **Example**: `execute-delta-neutral 100` (use 100 USDC.e as collateral)
- **APY Check**: Use `delta-neutral-apy` to get current exact APY details

### 💡 Recommendations

You have both wS and USDC.e, giving you access to all strategies. For optimal returns:
- Use the Delta-Neutral strategy for market-neutral returns
- Deploy wS in the wS-SwapX-Beefy strategy for higher yield (but with price exposure)
```

### 💱 Token Operations
- **🪙 Native S to wS wrapping**
  * Wrap S tokens to wS for DeFi compatibility
  * Unwrap wS back to S tokens
  * Check S/wS balances
- **📤 Transfer tokens**
- **👍 Approve token spending**
- **💼 Basic ERC20 token interactions**

### 💰 Wallet Operations
- **👛 Advanced Balance Checker**
  * View native S balance
  * Check wS, USDC.e and other token balances
  * Track Aave supplied assets
  * Monitor Beefy vault positions
  * Balance verification before transactions
- **📝 Transaction tracking**
- **🔎 Blockchain data queries**

**Commands:**
```
check-balances
```

**Example Output:**
```
Current Portfolio for 0x1234...5678:

🪙 Native S: 15.250000 ($8.69)

Wallet Assets:
🌀 wS: 5.432100 ($3.10)
💵 USDC.e: 245.750000 ($245.75)
💎 WETH: 0.012500 ($26.88)

Supplied in Aave:
🏦💵 aSonUSDC.e: 100.000000 ($100.00)
🏦💎 aSonWETH: 0.025000 ($53.75)

💰 Total Portfolio Value: $438.17
```

### 🏦 Aave Protocol Integration
- Supply assets (USDC.e, WETH)
- Borrow against collateral
- Check borrowing power and available borrowing power
- View maximum borrowable amounts per asset
- Monitor health factor and liquidation thresholds
- Repay borrowed positions
- Track lending APY rates

### 💱 Supported Assets
- 🪙 Native S Token
- 💵 USDC.e (Bridged USDC)
- 💎 WETH (Wrapped ETH)
- 🌀 wS (Wrapped S)
- 🏦💎 aSonWETH (Aave Sonic WETH)
- 🏦💵 aSonUSDC.e (Aave Sonic USDC.e)