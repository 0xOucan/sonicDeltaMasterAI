# 🚀 SONICdeltaAIMASTER

An intelligent 🤖 blockchain assistant for Sonic Network, specializing in **Delta Neutral DeFi strategies** with comprehensive portfolio management and advanced yield optimization capabilities.

## 🔥 Core Features: Delta Neutral Strategies

### 🏦 Aave Delta Neutral Strategy

Our original Delta Neutral strategy delivers stable, market-neutral yields by balancing lending and yield farming positions:

1. 💰 **Supply USDC.e to Aave** as collateral
2. 🏦 **Borrow wS tokens** at 50% of borrowing capacity
3. 🌾 **Deploy borrowed wS** into Beefy's high-yield wS-SwapX vault
4. 💸 **Earn positive yield spread** between borrowing costs and farming returns

### 🆕 MachFi Delta Neutral Strategy

Our new MachFi-based Delta Neutral strategy offers an alternative approach:

1. 💰 **Supply USDC.e to MachFi** as collateral
2. 🏦 **Borrow S tokens** at 50% of borrowing capacity
3. 🔄 **Wrap S tokens to wS**
4. 🌾 **Deploy wS** into Beefy's high-yield wS-SwapX vault
5. 💸 **Earn positive yield spread** between borrowing costs and farming returns

Both strategies offer these advantages:

- 🛡️ **Market Neutral Exposure**: Minimizes price risk for the borrowed asset
- 🤖 **Automatic Optimization**: Dynamically adjusts positions based on current market rates
- 📈 **Leveraged Yield**: Amplifies returns through strategic borrowing
- ⚖️ **Risk Managed**: Maintains safe health factors with built-in safeguards

### 🎯 Delta Neutral Commands

Check strategy APY:
```
delta-neutral-apy
```

Example Output:
```
# 📐 Delta Neutral Strategy APY Comparison 📊

## 🏛️ MachFi-Beefy Strategy
- 🐮 Beefy wS-SwapX Vault APY: +143.94% 🚀
- 🏦 MachFi S Borrow APY: -3.27% 💸
- 💵 MachFi USDC.e Supply APY: +3.42% 📈
- ⚖️ Effective Borrowing Cost (50% LTV): -1.63% 📉
- 📈 Effective Supply Yield (50% remaining): +1.71% 💹

🔄 Net Strategy APY: 144.01% 🔥  
✅ Strategy is profitable! The yield farming returns exceed borrowing costs.
```

Execute the delta neutral strategy with a specific USDC.e amount:
```
execute-delta-neutral 10
```

## 🎮 Interactive Modes

- 💬 **Chat Mode**: Interactive conversation with the AI assistant for strategy planning and execution
- 📱 **Telegram Mode**: Access all features via Telegram with an enhanced user interface:
  - 🔘 **Interactive Inline Keyboards**: Navigate strategies and options with buttons
  - 📋 **Context-aware Menus**: Organized menus for different DeFi strategies 
  - 🧠 **Smart Command Parsing**: Execute operations with commands like `/wrap 3` or `/executedeltaneutral 10`
  - 📊 **Rich Visual Feedback**: Emojis and formatted responses for better readability
  - 📲 **Mobile-Friendly**: Perfect for on-the-go DeFi management
- 🎓 **Demo Mode**: Guided walkthrough of key features and strategies
- 🤖 **Auto Mode**: Autonomous strategy execution and position management

## 📈 Additional DeFi Strategies

### 🌊 wS-SwapX-Beefy Strategy (Live APY fetched from Beefy API)
* ✅ Pre-checks token balances for strategy eligibility
* 💎 Deposit wS into SwapX vault
* 🎫 Receive LP tokens
* 🚜 Stake LP tokens in Beefy vault
* 💰 Earn high APY rewards (dynamically fetched from Beefy API)
* 🔄 Withdrawal functionality
* 🔍 Detailed transaction links to SonicScan

### 💵 USDC.e-SwapX-Beefy Strategy
* 🔄 Similar workflow to wS strategy
* 💰 Handles USDC.e deposits and withdrawals
* 🔗 Integrated with SwapX and Beefy vaults
* 📊 Full transaction tracking
* 💹 Accurate APY data (using vault ID: swapx-ichi-ws-usdc.e-usdc.e)

## 📊 Comprehensive Portfolio Management

### 🔍 Advanced Balance Checker
* 💰 View native S balance
* 🪙 Check wS, USDC.e and other token balances
* 📈 Track Aave and MachFi positions with direct blockchain data access
* 🏦 Monitor Beefy vault positions
* ✅ Balance verification before transactions
* 💹 View total portfolio value across all assets
* 🔄 Dual approach for position data: direct contract calls with regex fallback

### 🐮 Beefy Portfolio Tracker
* 📊 View all Beefy vault positions
* 📈 Track vault performance
* 💰 Monitor rewards and yields
* 💱 Real-time USD value calculations
* 🔄 Robust API integration with multiple fallback mechanisms

## 🏦 Lending Protocol Integrations

### 🏦 Aave Protocol Integration

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
  
- 🔢 **Direct Data Access**:
  * 💡 New getAaveAccountData method for direct blockchain data fetching
  * 📊 Accurate net worth calculation bypassing text parsing
  * 🔄 Improved reliability with multiple data sources

### 🆕 MachFi Protocol Integration

- 📊 **Comprehensive Lending Dashboard**:
  * 💰 Track net worth and portfolio APY
  * ❤️ Monitor health factor and risk level
  * 📈 View supplied assets with APYs
  * 📉 Monitor borrowed assets with negative values for clear visualization
  * 💪 Check available borrowing power in USD and token amounts

- 🏦 **Lending Operations**:
  * 💰 Supply collateral (USDC.e, S)
  * 🏷️ Borrow assets against your collateral
  * 💸 Repay borrowed positions
  * 📤 Withdraw supplied assets
  
- 🔢 **Direct Data Access**:
  * 💡 New getMachfiAccountData method for direct blockchain data fetching
  * 📊 Accurate market-by-market value calculation
  * 🔄 Improved reliability with direct oracle price integration

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
- 🏦 cS, cUSDC.e (MachFi tokens)
- 🐮 Beefy Vault Tokens

## 🚀 Getting Started

1. 📝 Copy `.env.example` to `.env` and fill in your own credentials:
   ```
   OPENAI_API_KEY="your_openai_api_key_here"
   WALLET_PRIVATE_KEY="your_private_key_here"
   TELEGRAM_BOT_TOKEN="your_bot_token_here" # Optional
   ```

2. ### 🚀 Project Setup Instructions

To set up the project, follow these steps:

1. 📦 Install dependencies:
   ```
   npm install
   ```

2. 🛠️ Build the project:
   ```
   npm run build
   ```

3. 🌟 Start the application:
   ```
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

## 🌟 Recent Improvements

### 💅 Enhanced UI & UX
- 📱 **Emoji-Rich Responses**: Added contextual emojis throughout all outputs for better visual appeal
- 📊 **Improved Formatting**: Enhanced Markdown formatting with consistent section hierarchy
- 💬 **Clearer Instructions**: More intuitive command instructions and feedback

### 🔍 Beefy API Integration
- 🎯 **Exact Vault IDs**: Using precise vault IDs for accurate APY data:
  * wS-SwapX: swapx-ichi-ws-usdc.e
  * USDC.e-SwapX: swapx-ichi-ws-usdc.e-usdc.e
- 🛠️ **Robust Data Fetching**: Multiple fallback mechanisms for reliable APY data
- 🧩 **Enhanced Debugging**: Comprehensive logging of API responses and parsing steps

### 💰 Portfolio Value Calculation
- 🔢 **Direct Blockchain Access**: Direct methods to fetch Aave and MachFi positions
- 🔄 **Dual Approach**: Primary blockchain data with regex fallback
- 📊 **Accurate Total Value**: Reliable portfolio value calculations for Telegram /balance command

## 🚧 Current Development Status

### 📊 Delta Neutral Strategy Options

We currently offer two delta neutral strategy options:

1. 🏦 **Aave-Based Strategy**:
   * 💰 Uses Aave for supplying USDC.e collateral and borrowing wS
   * 🌐 Dependent on USDC.e pool capacity

2. 🆕 **MachFi-Based Strategy**:
   * 💰 Uses MachFi for supplying USDC.e collateral
   * 🏦 Borrows native S tokens and wraps to wS
   * 🔍 May offer different APYs and risk profiles

3. 🛠️ **Upcoming Improvements**:
   * 📊 Multi-protocol liquidity optimization
   * 🔒 Enhanced risk management techniques
   * 🔄 Automated position rebalancing


**Disclaimer**: Cryptocurrency investments involve risk. Always do your own research and consult with a financial advisor.