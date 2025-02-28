import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, createPublicClient, http } from "viem";
import type { Hex } from "viem";
import "reflect-metadata";
import { sonic } from 'viem/chains';

import {
  SWAPX_VAULT_ADDRESS,
  BEEFY_VAULT_ADDRESS,
  WS_TOKEN_ADDRESS,
  SWAPX_VAULT_ABI,
  BEEFY_VAULT_ABI,
} from "./constants";

import {
  DepositWsSwapXSchema,
  ApproveSwapXSchema,
  ApproveBeefySchema,
  DepositBeefySchema,
} from "./schemas";

import {
  WSSwapXBeefyError,
  InsufficientBalanceError,
  InsufficientAllowanceError,
} from "./errors";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";

export class WSSwapXBeefyActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("wsswapx-beefy", []);
  }

  @CreateAction({
    name: "step1-approve-ws-swapx",
    description: `
Step 1: Approve wS tokens to be spent by SwapX vault.
Parameters:
- amount: Amount of wS to approve (in wei)
`,
    schema: ApproveSwapXSchema,
  })
  async approveWsSwapX(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveSwapXSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: SWAPX_VAULT_ABI,
        functionName: "approve",
        args: [SWAPX_VAULT_ADDRESS as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: WS_TOKEN_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Step 1 Complete: Successfully approved ${args.amount} wS for SwapX vault. Please wait a few seconds before proceeding to step 2.`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "step2-deposit-ws-swapx",
    description: `
Step 2: Deposit wS tokens into SwapX vault (execute after step 1).
Parameters:
- amount: Amount of wS to deposit (in wei)
`,
    schema: DepositWsSwapXSchema,
  })
  async depositWsSwapX(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositWsSwapXSchema>,
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      
      const data = encodeFunctionData({
        abi: SWAPX_VAULT_ABI,
        functionName: "deposit",
        args: [BigInt(args.amount), BigInt(0), address as Hex],
      });

      const tx = await walletProvider.sendTransaction({
        to: SWAPX_VAULT_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Step 2 Complete: Successfully deposited ${args.amount} wS into SwapX vault. Please wait a few seconds before proceeding to step 3.`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "step3-approve-swapx-beefy",
    description: `
Step 3: Approve SwapX LP tokens to be spent by Beefy vault (execute after step 2).
Parameters:
- amount: Amount of SwapX LP tokens to approve
`,
    schema: ApproveBeefySchema,
  })
  async approveSwapXBeefy(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveBeefySchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: BEEFY_VAULT_ABI,
        functionName: "approve",
        args: [BEEFY_VAULT_ADDRESS as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: SWAPX_VAULT_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Step 3 Complete: Successfully approved ${args.amount} SwapX LP tokens for Beefy vault. Please wait a few seconds before proceeding to step 4.`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "step4-deposit-swapx-beefy",
    description: `
Step 4: Deposit SwapX LP tokens into Beefy vault (final step).
Parameters:
- amount: Amount of SwapX LP tokens to deposit
`,
    schema: DepositBeefySchema,
  })
  async depositSwapXBeefy(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositBeefySchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: BEEFY_VAULT_ABI,
        functionName: "deposit",
        args: [BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: BEEFY_VAULT_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Step 4 Complete: Successfully deposited ${args.amount} SwapX LP tokens into Beefy vault. Strategy execution complete!`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const wsSwapXBeefyActionProvider = () => new WSSwapXBeefyActionProvider();