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
    description: "List available DeFi strategies",
    schema: z.object({}),
  })
  async listStrategies(): Promise<string> {
    return `📋 Available DeFi Strategies:

1. 🌊 wS-SwapX-Beefy Strategy
   - 🔧 Command: execute full wS swapx beefy strategy with <amount> wS
   - 💡 Example: execute full wS swapx beefy strategy with 1.5 wS
   - 📥 Deposit wS tokens into SwapX vault
   - 🎫 Receive SwapX LP tokens
   - 🌾 Deposit LP tokens into Beefy vault for yield

2. 💵 USDC.e-SwapX-Beefy Strategy
   - 🔧 Command: execute usdce strategy with <amount> USDC.e
   - 💡 Example: execute usdce strategy with 2.5 USDC.e
   - 📥 Deposit USDC.e tokens into SwapX vault
   - 🎫 Receive SwapX LP tokens
   - 🌾 Deposit LP tokens into Beefy vault for yield

💡 You can check your token balances first to ensure you have sufficient funds.`;
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