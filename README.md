# Sonic Blockchain Chatbot

A versatile chatbot for interacting with Sonic blockchain, demonstrating integration with common blockchain features and protocols.

## Networks

- Sonic Blockchain (Chain ID: 146)

## Operating Modes

The chatbot supports three operating modes:

1. **Chat Mode**: Interactive command-line interface for direct user interaction
2. **Autonomous Mode**: Bot operates independently, executing transactions at set intervals
3. **Telegram Mode**: Interface through Telegram messenger

## Current Features

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

We are actively working on Sonic-specific features that will be added in the near future:

- [ ] Sonic token swapping
- [ ] Integration with Sonic-native DeFi protocols
- [ ] Sonic-specific NFT operations
- [ ] Custom actions for Sonic ecosystem

## Development

To add new features or modify existing ones:
1. Create a new action provider in `src/action-providers/`
2. Add new schemas if needed
3. Update the constants and error handlers
4. Test thoroughly

> Note: The Xocolatl and BOBC protocol action providers are kept in the project as reference for creating new Sonic-specific actions. They are not currently used in the chatbot.

## Environment Setup

Required environment variables:
```
OPENAI_API_KEY=your_openai_api_key_here
WALLET_PRIVATE_KEY=your_wallet_private_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here (optional, only for Telegram mode)
```

## License

MIT
