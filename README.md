# Sonic Blockchain Chatbot

A versatile chatbot for interacting with the Sonic blockchain, featuring advanced DeFi strategies and blockchain interactions.

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
  * Detailed transaction links to SonicScan

- **Shadow Swap**
  * Swap USDC.e to wS tokens directly
  * Swap wS to USDC.e tokens directly
  * Auto-approval of token spending
  * Balance verification before transactions
  * Slippage protection

### Token Operations
- **Native S to wS wrapping**
  * Wrap S tokens to wS for DeFi compatibility
  * Unwrap wS back to S tokens
  * Check S/wS balances
- **Transfer tokens**
- **Approve token spending**
- **Basic ERC20 token interactions**

### Wallet Operations
- **Balance Checker**
  * View native S balance
  * Check wS, USDC.e and other token balances
  * Balance verification before transactions
- **Transaction tracking**
- **Blockchain data queries**

## Upcoming Features

We are actively developing and expanding Sonic-specific features:

- [x] Wallet balance scanner for strategy eligibility
- [x] Token swapping via Shadow Exchange
- [ ] Additional DeFi strategies
- [ ] Strategy performance tracking
- [ ] Auto-compound features
- [ ] Risk assessment tools
- [ ] Portfolio management
- [ ] Strategy comparison tools

## Using DeFi Strategies

To view available strategies:
```
list strategies
```
or
```
show menu
```

To execute a strategy:
```
execute full wS swapx beefy strategy with 1.0 wS
```

## Shadow Swap Operations

Swap USDC.e to wS:
```
swap 1.0 USDC.e to wS
```

Swap wS to USDC.e:
```
swap 1.0 wS to USDC.e
```

Approve token for trading:
```
approve 10.0 USDC.e for Shadow
```

## Basic Token Operations

Wrap S to wS:
```
wrap 1.0 S
```

Unwrap wS to S:
```
unwrap 1.0 wS
```

Check your balances:
```
check balance
```

## Demo Mode

Run a guided demo showcasing key features:
```
Choose mode: demo
```

In Telegram, use:
```
/demo
```

The demo will:
1. Check wallet balances
2. Wrap S to wS
3. Verify the wrapped tokens
4. Execute the SwapX-Beefy strategy
5. Check updated balances

## Environment Setup

Required environment variables:
```
OPENAI_API_KEY=your_openai_api_key_here
WALLET_PRIVATE_KEY=your_wallet_private_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here (optional)
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your credentials
4. Build the project: `npm run build`
5. Start the chatbot: `npm start`

## Sonic Blockchain Specifics

- Native Token: S
- Wrapped Token: wS
- Chain ID: 146
- Block Explorer: https://sonicscan.org

## License

MIT License
