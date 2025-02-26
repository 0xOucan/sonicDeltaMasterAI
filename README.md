# Sonic Blockchain Chatbot

A versatile chatbot for interacting with the Sonic blockchain, demonstrating advanced token wrapping and blockchain interaction features.

## Networks

- Sonic Blockchain (Chain ID: 146)

## Operating Modes

The chatbot supports three operating modes:

1. **Chat Mode**: Interactive command-line interface for direct user interaction
2. **Autonomous Mode**: Bot operates independently, executing transactions at set intervals
3. **Telegram Mode**: Interface through Telegram messenger

## Current Features

### Token Wrapping
- Wrap native S tokens to wS tokens
- Unwrap wS tokens back to native S tokens
- Check S and wS token balances
- Transfer wS tokens
- Approve wS token spending

### Token Operations
- Check token balances
- Transfer tokens
- Approve token spending
- Basic ERC20 token interactions

### Wallet Operations
- Check wallet status
- View transaction history
- Get blockchain data

## Upcoming Features

We are actively developing and expanding Sonic-specific features:

- [ ] Advanced token swapping mechanisms
- [ ] Integration with Sonic-native DeFi protocols
- [ ] Enhanced NFT operations
- [ ] Custom cross-chain actions
- [ ] Automated trading strategies

## Sonic Token Wrapping Details

### Wrap S to wS
- Convert native Sonic (S) tokens to wrapped Sonic (wS) tokens
- Useful for DeFi interactions and smart contract compatibility
- Minimal gas fees
- Instant conversion

### Unwrap wS to S
- Convert wrapped Sonic (wS) tokens back to native Sonic (S) tokens
- Full 1:1 redemption
- No additional fees beyond network gas costs

## Development

To add new features or modify existing ones:
1. Create a new action provider in `src/action-providers/`
2. Add new schemas if needed
3. Update the constants and error handlers
4. Test thoroughly on Sonic testnet

> Note: The previous protocol action providers are kept in the project as reference for future development.

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
- RPC Endpoint: Configurable in code

## License

MIT License
