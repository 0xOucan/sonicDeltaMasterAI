# AgentKit Multi-Protocol Chatbot

This chatbot demonstrates integration with multiple DeFi protocols across Base networks:

## Supported Protocols

### Xocolatl Protocol (Base Mainnet)
- Mexican Peso Stablecoin (XOC)
- Collateral types: WETH, CBETH
- LTV: 80%, Liquidation threshold: 85%
- Features:
  - Deposit/withdraw collateral
  - Mint/burn XOC
  - Transfer tokens
  - Monitor positions

### BOBC Protocol (Base Sepolia)
- Bolivian Stablecoin (BOBC)
- Collateral type: WETH
- Fixed rate: 1 USD = 7 BOB
- Minimum collateralization: 200%
- Features:
  - Claim WETH from faucet
  - Deposit/withdraw collateral
  - Mint/burn BOBC
  - Monitor health factor
  - Liquidate positions

## Contract Addresses

### Xocolatl (Base Mainnet)
- XOC: `0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf`
- WETH Reserve: `0xfF69E183A863151B4152055974aa648b3165014D`
- CBETH Reserve: `0x5c4a154690AE52844F151bcF3aA44885db3c8A58`
- House of Coin: `0x02c531Cd9791dD3A31428B2987A82361D72F9b13`

### BOBC (Base Sepolia)
- Engine: `0xA7e9D84133936Ab2599BB8ec5B29caa9Df4A9bD1`
- BOBC Token: `0x947eA44Bd6560476819a91F2a5DBf030C43dee26`
- WETH: `0xec915716AE8cC0359A88c24E214792f6A12c192b`
- Faucet: `0x2AB5d7A0009b0409A422587A6B0ff18f40a8Cec6`

## Example Commands

### Xocolatl (Base Mainnet)
```
deposit 0.0001 WETH as collateral in XOC protocol
mint 1 XOC using WETH collateral
show my XOC collateral info
```

### BOBC (Base Sepolia)
```
claim 0.1 WETH from faucet
deposit 0.1 WETH as collateral in BOBC protocol
mint 50 BOBC
show my health factor
```

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
