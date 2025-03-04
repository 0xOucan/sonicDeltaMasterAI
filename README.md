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

Check Portfolio:
```
check balances
```

Check Borrowing Power:
```
check borrowing power
```

Check Maximum Borrowable Amount:
```
check max borrowable USDC_E
check max borrowable WETH
check max borrowable WS
```

Supply Assets:
```
aave-supply-usdce 100
aave-supply-weth 0.1
```

Borrow Assets:
```
borrow from aave USDC_E 100
borrow from aave WETH 0.1
borrow from aave WS 1.0
```

Repay Borrowed Assets:
```
repay to aave USDC_E 100
repay to aave WETH 0.1
repay to aave WS 1.0
```

## Resources
- Block Explorer: https://sonicscan.org
- Aave Documentation: https://docs.aave.com

## License

MIT License
