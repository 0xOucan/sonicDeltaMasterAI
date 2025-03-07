# 🚀 SONICdeltaAIMASTER

An intelligent 🤖 blockchain assistant for Sonic Network, specializing in **Delta Neutral DeFi strategies** with comprehensive portfolio management and advanced yield optimization capabilities.

## 🔥 Core Feature: Delta Neutral Strategy

Our flagship Delta Neutral strategy delivers stable, market-neutral yields by balancing lending and yield farming positions:

1. 💰 **Supply USDC.e to Aave** as collateral
2. 🏦 **Borrow wS tokens** at 50% of borrowing capacity
3. 🌾 **Deploy borrowed wS** into Beefy's high-yield wS-SwapX vault
4. 💸 **Earn positive yield spread** between borrowing costs and farming returns

This sophisticated approach generates consistent returns regardless of token price movements, offering a low-risk DeFi strategy with these advantages:

- 🛡️ **Market Neutral Exposure**: Minimizes price risk for the borrowed asset
- 🤖 **Automatic Optimization**: Dynamically adjusts positions based on current market rates
- 📈 **Leveraged Yield**: Amplifies returns through strategic borrowing
- ⚖️ **Risk Managed**: Maintains safe health factors on Aave with built-in safeguards

### 🎯 Delta Neutral Commands

Check strategy APY:
```
delta-neutral-apy
```

Example Output:
```
## 📊 Delta Neutral Strategy - APY Breakdown

💰 **Beefy wS-SwapX Vault APY:** +15.00%
🏦 **Aave wS Borrow APY:** -4.00%

🔄 **Net Strategy APY:** 11.00%

✅ **Strategy is profitable!** The yield farming returns currently exceed borrowing costs.

### 🔍 How It Works
1. 💰 Your USDC.e is supplied to Aave as collateral
2. 🏦 50% of your borrowing power is used to borrow wS
3. 🌾 Borrowed wS is deployed in Beefy's wS-SwapX vault
4. 💸 You earn the spread between borrowing costs and farming returns
```

Execute the delta neutral strategy with a specific USDC.e amount:
```
execute-delta-neutral 10
```

## 🎮 Interactive Modes

- 💬 **Chat Mode**: Interactive conversation with the AI assistant for strategy planning and execution
- 📱 **Telegram Mode**: Access all features via Telegram for on-the-go DeFi management
- 🎓 **Demo Mode**: Guided walkthrough of key features and strategies
- 🤖 **Auto Mode**: Autonomous strategy execution and position management

## 📈 Additional DeFi Strategies

### 🌊 wS-SwapX-Beefy Strategy (APY ~500%)
* ✅ Pre-checks token balances for strategy eligibility
* 💎 Deposit wS into SwapX vault
* 🎫 Receive LP tokens
* 🚜 Stake LP tokens in Beefy vault
* 💰 Earn high APY rewards (~500%)
* 🔄 Withdrawal functionality
* 🔍 Detailed transaction links to SonicScan

### 💵 USDC.e-SwapX-Beefy Strategy
* 🔄 Similar workflow to wS strategy
* 💰 Handles USDC.e deposits and withdrawals
* 🔗 Integrated with SwapX and Beefy vaults
* 📊 Full transaction tracking

## 📊 Comprehensive Portfolio Management

### 🔍 Advanced Balance Checker
* 💰 View native S balance
* 🪙 Check wS, USDC.e and other token balances
* 📈 Track Aave supplied assets
* 🏦 Monitor Beefy vault positions
* ✅ Balance verification before transactions
* 💹 View total portfolio value across all assets

### 🐮 Beefy Portfolio Tracker
* 📊 View all Beefy vault positions
* 📈 Track vault performance
* 💰 Monitor rewards and yields
* 💱 Real-time USD value calculations

## 🏦 Aave Protocol Integration

- 📊 **Complete Lending Dashboard**:
  * 💰 View net worth and net APY
  * ❤️ Track health factor
  * 📈 Monitor supplied and borrowed assets
  * 💪 Check available borrowing power

- 🏦 **Lending Operations**:
  * 💰 Supply assets (USDC.e, WETH)
  * 🏷️ Borrow against collateral
  * 💸 Repay borrowed positions
  * 📊 View maximum borrowable amounts

## 🪙 Token Operations

- 🔄 **Native S to wS wrapping**
  * 📦 Wrap S tokens to wS for DeFi compatibility
  * 📭 Unwrap wS back to S tokens
  * 💰 Check S/wS balances
- 💎 **Token Management**
  * 💸 Transfer tokens
  * ✅ Approve token spending
  * 🔗 Basic ERC20 token interactions
  * 📥 Supply tokens to protocols

## 💰 Supported Assets

- 🔷 Native S Token
- 💵 USDC.e (Bridged USDC)
- ⚡ WETH (Wrapped ETH)
- 🔷 wS (Wrapped S)
- 📈 aSonWETH (Aave Sonic WETH)
- 💰 aSonUSDC.e (Aave Sonic USDC.e)
- 🐮 Beefy Vault Tokens

## 🚀 Getting Started

1. 📝 Copy `.env.example` to `.env` and fill in your own credentials:
   ```
   OPENAI_API_KEY="your_openai_api_key_here"
   WALLET_PRIVATE_KEY="your_private_key_here"
   TELEGRAM_BOT_TOKEN="your_bot_token_here" # Optional
   ```

2. ⚙️ Install dependencies and run the project:
   ```
   npm install
   npm start
   ```

3. 🎮 Choose your preferred interaction mode:
   - 💬 Chat mode for direct conversation
   - 📱 Telegram mode for mobile access
   - 🎓 Demo mode for guided tour
   - 🤖 Auto mode for autonomous strategy execution

## 🔒 Security Features

- ✅ Comprehensive balance checks before operations
- ⛽ Gas estimation for transactions
- 🛡️ Safe approval limits
- 📝 Transaction verification and monitoring
- ❤️ Health factor monitoring for lending positions