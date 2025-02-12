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
  - Integration with Alux lending pool
    - Supply WETH as collateral
    - Borrow XOC with variable/stable rate
    - Repay XOC loans
    - Withdraw collateral

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

## Operating Modes

The chatbot supports three operating modes:

1. **Chat Mode**: Interactive command-line interface for direct user interaction
2. **Autonomous Mode**: Bot operates independently, executing transactions at set intervals
3. **Telegram Mode**: Interface through Telegram messenger

## Network Support

- Base Mainnet
- Base Sepolia (Testnet)
- Network selection at startup
- Automatic network validation before transactions

## Core Features

### Token Operations
- Check token balances
- Transfer tokens
- Approve token spending
- Wrap/unwrap ETH to WETH

### Lending Operations
- Supply collateral
- Borrow assets
- Repay loans
- Withdraw collateral
- Monitor positions
- View collateralization ratios

### Safety Features
- Network validation before transactions
- Balance and allowance checks
- Collateralization ratio monitoring
- Detailed error messages
- Transaction confirmation waiting
- Custom error handling for common scenarios

## Error Handling

The chatbot handles various error scenarios:
- Insufficient balances
- Insufficient allowances
- Undercollateralized positions
- Network mismatches
- Failed transactions
- Invalid input validation

## Development

To add new features or modify existing ones:
1. Update the relevant action provider in `src/action-providers/`
2. Add new schemas if needed
3. Update the constants and error handlers
4. Test thoroughly on testnet first

## Environment Setup

Required environment variables:
```
OPENAI_API_KEY=your_openai_api_key_here
NETWORK_ID=your_network_id_here
NETWORK_ID_2=your_secondary_network_id_here
WALLET_PRIVATE_KEY=your_wallet_private_key_here
```

## License

MIT
