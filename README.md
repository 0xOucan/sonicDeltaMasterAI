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
- Token Swaps
  * Swap S for USDC.e
  * Swap USDC.e for S
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

Swap S for USDC.e:
```
swap s for usdc 1.0
```

Swap USDC.e for S:
```
swap usdc for s 1.0
```

## Environment Setup

Required environment variables:
```