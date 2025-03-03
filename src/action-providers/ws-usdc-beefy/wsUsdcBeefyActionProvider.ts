import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, createPublicClient, http } from "viem";
import type { Hex, Address } from "viem";
import { sonic } from 'viem/chains';
import "reflect-metadata";

import {
  BEEFY_TOKEN_MANAGER_ADDRESS,
  ZAP_ROUTER_ADDRESS,
  USDC_E_ADDRESS,
  WS_TOKEN_ADDRESS,
  BEEFY_TOKEN_MANAGER_ABI,
  ZAP_ROUTER_ABI,
  ERC20_ABI,
} from "./constants";

import { DepositWSUSDCSchema } from "./schemas";
import { InsufficientBalanceError } from "./errors";

export class WSUSDCBeefyActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("ws-usdc-beefy", []);
  }

  private async checkUSDCBalance(
    walletProvider: EvmWalletProvider,
    amount: string
  ): Promise<void> {
    const address = await walletProvider.getAddress() as Address;
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http()
    });

    const balance = await publicClient.readContract({
      address: USDC_E_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });

    if (balance < BigInt(amount)) {
      throw new InsufficientBalanceError(
        balance.toString(),
        amount
      );
    }
  }

  @CreateAction({
    name: "deposit-ws-usdc-beefy",
    description: `
Deposit USDC.e into the Uniswap wS-USDC.e Beefy vault strategy.
This action will:
1. Check USDC.e balance
2. Approve USDC.e spending
3. Execute deposit into the vault
Parameters:
- amount: Amount of USDC.e to deposit (in wei)
Example: To deposit 1 USDC.e, use amount: "1000000" (6 decimals)
`,
    schema: DepositWSUSDCSchema,
  })
  async depositWSUSDC(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositWSUSDCSchema>,
  ): Promise<string> {
    try {
      // Check USDC.e balance
      await this.checkUSDCBalance(walletProvider, args.amount);
      
      const address = await walletProvider.getAddress() as Address;
      
      // Approve USDC.e spending
      const approveTx = await walletProvider.sendTransaction({
        to: USDC_E_ADDRESS as Address,
        data: encodeFunctionData({
          abi: BEEFY_TOKEN_MANAGER_ABI,
          functionName: "approve",
          args: [BEEFY_TOKEN_MANAGER_ADDRESS as Address, BigInt(args.amount)],
        }),
      });

      await walletProvider.waitForTransactionReceipt(approveTx);
      console.log("USDC.e approved for spending");

      // Small delay to ensure approval is processed
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Execute deposit
      const depositTx = await walletProvider.sendTransaction({
        to: ZAP_ROUTER_ADDRESS as Address,
        data: encodeFunctionData({
          abi: ZAP_ROUTER_ABI,
          functionName: "executeOrder",
          args: [{
            inputs: [{
              token: USDC_E_ADDRESS as Address,
              amount: BigInt(args.amount)
            }],
            outputs: [],
            relay: {
              target: BEEFY_TOKEN_MANAGER_ADDRESS as Address,
              value: BigInt(0),
              data: "0x" as Hex
            },
            user: address,
            recipient: address
          }, []]
        }),
      });

      await walletProvider.waitForTransactionReceipt(depositTx);
      
      return `Successfully deposited ${args.amount} USDC.e into the wS-USDC.e Beefy vault\n` +
             `Approval TX: https://sonicscan.org/tx/${approveTx}\n` +
             `Deposit TX: https://sonicscan.org/tx/${depositTx}`;

    } catch (error) {
      if (error instanceof InsufficientBalanceError) {
        return `Error: ${error.message}`;
      }
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const wsUsdcBeefyActionProvider = () => new WSUSDCBeefyActionProvider();