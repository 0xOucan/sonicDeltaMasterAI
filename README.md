# Sonic Blockchain Chatbot

A versatile chatbot for interacting with the Sonic blockchain, featuring advanced DeFi strategies and blockchain interactions.

## Current Features

### DeFi Strategies
- wS-SwapX-Beefy Strategy
  * Deposit wS into SwapX vault
  * Receive LP tokens
  * Stake LP tokens in Beefy vault
  * Earn additional rewards

### Token Operations
- Native S to wS wrapping
  * Wrap S tokens to wS for DeFi compatibility
  * Unwrap wS back to S tokens
  * Check S/wS balances
- Transfer tokens
- Approve token spending
- Basic ERC20 token interactions

### Wallet Operations
- Check wallet status
- View transaction history
- Get blockchain data

## Upcoming Features

We are actively developing and expanding Sonic-specific features:

- [ ] Wallet balance scanner for strategy eligibility
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

## Basic Token Operations

Wrap S to wS:
```
wrap 1.0 S
```

Unwrap wS to S:
```
unwrap 1.0 wS
```

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
4. Start the chatbot: `npm start`

## Sonic Blockchain Specifics

- Native Token: S
- Wrapped Token: wS
- Chain ID: 146
- Block Explorer: https://sonicscan.org

## License

MIT License
