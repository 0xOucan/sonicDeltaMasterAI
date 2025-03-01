import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import "reflect-metadata";

export class StrategyManagerActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("strategy-manager", []);
  }

  @CreateAction({
    name: "list-strategies",
    description: "Display available DeFi strategies and usage examples",
    schema: z.object({}),
  })
  async listStrategies(): Promise<string> {
    return `Available DeFi Strategies:

1. wS-SwapX-Beefy Strategy
   - Description: Deposit wS into SwapX vault to receive LP tokens, then stake them in Beefy for additional rewards
   - Usage: "execute full wS swapx beefy strategy with 1.0 wS"
   - Requirements: 
     * Sufficient wS tokens
     * Gas for 4 transactions

2. wS-USDC.e Uniswap Beefy Strategy
   - Description: Deposit USDC.e into Uniswap wS-USDC.e pool and stake LP tokens in Beefy
   - Usage: "provide 1 USDC.e to the uniswap beefy wS USDC.e vault strategy"
   - Requirements:
     * Sufficient USDC.e tokens
     * Gas for 2 transactions

Basic Token Operations:
- Wrap S to wS: "wrap 1.0 S"
- Unwrap wS to S: "unwrap 1.0 wS"
- Check balances: "check balance"

More strategies coming soon!

To execute a strategy, use the exact command format shown in the usage example.
You can check your token balances first to ensure you have sufficient funds.`;
  }

  @CreateAction({
    name: "show-menu",
    description: "Alias for list-strategies command",
    schema: z.object({}),
  })
  async showMenu(): Promise<string> {
    return this.listStrategies();
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const strategyManagerActionProvider = () => new StrategyManagerActionProvider();