# AgentKit Chatbot Example

This example demonstrates how to build a chatbot using AgentKit that can interact with various protocols on Base network.

## Features

- Interactive chat mode
- Telegram bot mode
- Autonomous action mode
- Support for Base Mainnet and Base Sepolia
- Integration with multiple protocols:
  - Xocolatl Protocol (XOC) - Mexican Peso Stablecoin
  - WETH operations
  - ERC20 token operations

## Xocolatl Protocol Features

The chatbot supports full interaction with the Xocolatl Protocol on Base Mainnet:

### Collateral Management
- Deposit WETH or CBETH as collateral
- Withdraw collateral
- Check collateral balances and ratios
- View maximum mintable XOC

### XOC Token Operations
- Mint XOC using WETH or CBETH collateral
- Transfer XOC tokens
- Check XOC balances
- Approve XOC spending

### Protocol Parameters
- WETH: 80% max LTV, 85% liquidation threshold
- CBETH: 80% max LTV, 85% liquidation threshold

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
# OpenAI API Key
OPENAI_API_KEY="your_openai_api_key"

# Network Configuration
NETWORK_ID="base-sepolia"
NETWORK_ID_2="base-mainnet"

# Wallet Private Key (DO NOT SHARE!)
WALLET_PRIVATE_KEY="your_wallet_private_key"  # Use same key for all networks

# Optional: Telegram Bot Token
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
```

## Usage

Start the chatbot:
```bash
npm start
```

Choose your mode:
1. Chat mode - Interactive console chat
2. Telegram mode - Telegram bot interface
3. Auto mode - Autonomous operation

### Example Commands

1. Wrap ETH to WETH:
```
wrap 0.0001 ETH to WETH
```

2. Deposit WETH as collateral:
```
deposit 0.0001 WETH as collateral in the XOC protocol
```

3. Mint XOC:
```
mint 1 XOC using my WETH collateral
```

4. Check collateral info:
```
show my collateral information
```

## Contract Addresses (Base Mainnet)

### Core Protocol
- XOC Token: `0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf`
- WETH: `0x4200000000000000000000000000000000000006`
- CBETH: `0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22`

### Houses of Reserve
- WETH Reserve: `0xfF69E183A863151B4152055974aa648b3165014D`
- CBETH Reserve: `0x5c4a154690AE52844F151bcF3aA44885db3c8A58`

### Other Components
- House of Coin: `0x02c531Cd9791dD3A31428B2987A82361D72F9b13`
- Account Liquidator: `0x4b75Fb5B0D323672fc6Eac5Afbf487AE4c2ff6de`

## Safety Features

- Network validation before transactions
- Balance and allowance checks
- Collateralization ratio monitoring
- Detailed error messages
- Transaction confirmation waiting

## Error Handling

The chatbot handles various error scenarios:
- Insufficient balances
- Insufficient allowances
- Undercollateralized positions
- Network mismatches
- Failed transactions

## Development

To add new features or modify existing ones:
1. Update the relevant action provider in `src/action-providers/`
2. Add new schemas if needed
3. Update the constants and error handlers
4. Test thoroughly on testnet first

## License

MIT
