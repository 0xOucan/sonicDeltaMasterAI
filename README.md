# AgentKit Chatbot with BOBC & Xocolatl Protocols

A Telegram chatbot powered by AgentKit that interacts with BOBC (Bolivian Stablecoin) and Xocolatl protocols on Base and Base Sepolia networks.

## Features

- **Multi-Network Support**
  - Base Sepolia (Testnet)
  - Base (Mainnet)

- **BOBC Protocol Integration**
  - Overcollateralized stablecoin system pegged to BOB
  - 200% minimum collateralization ratio
  - WETH collateral management
  - Health factor monitoring
  - Liquidation functionality
  - Fixed exchange rate: 1 USD = 7 BOB

- **Xocolatl Protocol Integration**
  - Mexican Peso stablecoin (XOC)
  - Collateral management
  - Minting and burning capabilities

- **Telegram Interface**
  - Interactive chat commands
  - Real-time blockchain interactions
  - Balance checking
  - Transaction status updates

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Telegram Bot Token
- Coinbase Developer Platform API Keys
- OpenAI API Key

## Installation

1. Clone the repository:
bash
git clone <repository-url>
cd <project-directory>

2. Install dependencies:

```bash
npm install
```

3. Copy the environment example file and fill in your credentials:

```bash
cp .env.example .env
```

## Environment Variables

Create a `.env` file with the following variables:

```env
CDP_API_KEY_NAME="your_cdp_api_key_name"
CDP_API_KEY_PRIVATE_KEY="your_cdp_private_key"
OPENAI_API_KEY="your_openai_api_key"
NETWORK_ID="base-sepolia"
NETWORK_ID_2="base"
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
```

## Project Structure

```
src/
├── action-providers/
│   ├── bobc-protocol/
│   │   ├── bobcProtocolActionProvider.ts
│   │   ├── constants.ts
│   │   ├── index.ts
│   │   └── schemas.ts
│   └── xocolatl/
│       ├── xocolatlActionProvider.ts
│       ├── constants.ts
│       ├── index.ts
│       └── schemas.ts
├── chatbot.ts
└── telegram-interface.ts
```

## Available Actions

### BOBC Protocol
- Check WETH/BOBC balances
- Claim WETH from faucet (testnet)
- Deposit WETH collateral
- Mint BOBC stablecoins
- Monitor health factor
- Perform liquidations
- View collateral information

### Xocolatl Protocol
- Check XOC balance
- Deposit/withdraw collateral
- Mint/burn XOC
- Transfer XOC

## Usage

1. Start the development server:

```bash
npm run dev
```

2. Build the project:

```bash
npm run build
```

3. Start the production server:

```bash
npm start
```

## Telegram Bot Commands

Start interacting with the bot by sending messages in Telegram. The bot understands natural language and can:
- Check balances
- Execute transactions
- Provide protocol information
- Monitor positions

## Development

### Adding New Actions

1. Create a new action provider in `src/action-providers/`
2. Define schemas using Zod
3. Implement the action provider class
4. Register the provider in `chatbot.ts`

### Testing

```bash
npm test
```

## Security

- Environment variables are required for secure operation
- Private keys should never be committed to the repository
- Use testnet for development and testing

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For support, please [create an issue](your-repo-issues-url) or contact the maintainers.

## Smart Contract Addresses

### BOBC Protocol (Base Sepolia)

```
ENGINE_ADDRESS: "0xA7e9D84133936Ab2599BB8ec5B29caa9Df4A9bD1"
BOBC_ADDRESS: "0x947eA44Bd6560476819a91F2a5DBf030C43dee26"
WETH_ADDRESS: "0xec915716AE8cC0359A88c24E214792f6A12c192b"
FAUCET_ADDRESS: "0x2AB5d7A0009b0409A422587A6B0ff18f40a8Cec6"
```

### Protocol Features
- Overcollateralization: Minimum 200% ratio required
- Oracle Integration: Uses Chainlink for ETH/USD price feeds
- Fixed Exchange Rate: 1 USD = 7 BOB
- Liquidation Threshold: Health factor below 1

## Quick Start Guide

1. **Network Selection**
   - Choose between Base Sepolia (testnet) and Base (mainnet)
   - Default: Base Sepolia for testing

2. **BOBC Protocol Interaction**
   ```
   1. Check WETH balance
   2. Claim WETH from faucet (testnet only)
   3. Approve WETH spending
   4. Deposit WETH as collateral
   5. Mint BOBC (maintain 200% collateralization)
   6. Monitor health factor
   ```

3. **Monitoring & Management**
   - Regular health factor checks
   - Collateral ratio monitoring
   - Position management
   - Liquidation protection

## Error Handling

Common errors and solutions:
- Insufficient collateral: Deposit more WETH
- Low health factor: Add collateral or repay BOBC
- Network issues: Verify connection and retry
- Transaction failures: Check gas and approvals

## Best Practices

1. **Testing**
   - Start with small amounts
   - Use testnet for practice
   - Monitor positions regularly

2. **Security**
   - Never share private keys
   - Keep environment variables secure
   - Regular backup of wallet data

3. **Development**
   - Follow TypeScript best practices
   - Document code changes
   - Test thoroughly before deployment
