import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, createPublicClient, http, parseUnits } from "viem";
import type { Hex } from "viem";
import "reflect-metadata";
import { sonic } from 'viem/chains';

import {
  SWAPX_VAULT_ADDRESS,
  BEEFY_VAULT_ADDRESS,
  USDC_E_ADDRESS,
  SWAPX_VAULT_ABI,
  BEEFY_VAULT_ABI,
  ERC20_ABI,
} from "./constants";

import {
  DepositUSDCeSwapXSchema,
  ApproveSwapXSchema,
  ApproveBeefySchema,
  DepositBeefySchema,
} from "./schemas";

import {
  USDCeSwapXBeefyError,
  InsufficientBalanceError,
  InsufficientAllowanceError,
} from "./errors";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";

const formatAmount = (amount: string): string => {
  if (!amount.includes('.')) {
    return amount + '.0';
  }
  return amount;
};

export class USDCeSwapXBeefyActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("usdce-swapx-beefy", []);
  }

  @CreateAction({
    name: "execute-usdce-strategy",
    description: "Execute the full USDC.e SwapX Beefy strategy",
    schema: DepositUSDCeSwapXSchema,
  })
  async executeFullStrategy(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositUSDCeSwapXSchema>
  ): Promise<string> {
    try {
      const formattedAmount = formatAmount(args.amount);
      const amount = parseUnits(formattedAmount, 6); // USDC.e has 6 decimals
      const address = await walletProvider.getAddress();
      let response = "Executing full USDC.e SwapX Beefy strategy:\n\n";

      // Step 1: Approve USDC.e for SwapX
      try {
        const approveSwapXTx = await walletProvider.sendTransaction({
          to: USDC_E_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [SWAPX_VAULT_ADDRESS as Hex, amount],
          }),
        });
        
        response += `1. Approved USDC.e for SwapX vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${approveSwapXTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(approveSwapXTx);
        await sleep(5000);
      } catch (error) {
        console.error('Step 1 error:', error);
        return `Strategy execution failed at Step 1 (Approve USDC.e): ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 2: Deposit USDC.e into SwapX
      let lpTokenBalance: bigint;
      try {
        const publicClient = createPublicClient({
          chain: sonic,
          transport: http()
        });

        const allowance = await publicClient.readContract({
          address: USDC_E_ADDRESS as Hex,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address as Hex, SWAPX_VAULT_ADDRESS as Hex] as const
        });

        if (allowance < amount) {
          return `Strategy execution failed: Insufficient allowance for SwapX vault. Please execute step 1 again.`;
        }

        const depositTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: SWAPX_VAULT_ABI,
            functionName: "deposit",
            args: [BigInt(0), amount, address as Hex],
          }),
          gas: BigInt(1200000),
        });

        response += `2. Deposited ${args.amount} USDC.e into SwapX vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${depositTx}\n\n`;

        const receipt = await walletProvider.waitForTransactionReceipt(depositTx);
        await sleep(5000);

        // Get LP token balance after deposit
        lpTokenBalance = await publicClient.readContract({
          address: SWAPX_VAULT_ADDRESS as Hex,
          abi: SWAPX_VAULT_ABI,
          functionName: "balanceOf",
          args: [address as Hex],
        });

        if (lpTokenBalance === BigInt(0)) {
          throw new Error("No LP tokens received from deposit");
        }

      } catch (error) {
        console.error('Step 2 error:', error);
        if (error instanceof Error && error.message.includes('try later')) {
          return `The SwapX vault is temporarily unavailable for deposits. Please try again in a few minutes.`;
        }
        return `Strategy execution failed at Step 2 (Deposit USDC.e): ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 3: Approve SwapX LP tokens for Beefy vault
      try {
        const approveBeefyTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: SWAPX_VAULT_ABI,
            functionName: "approve",
            args: [BEEFY_VAULT_ADDRESS as Hex, lpTokenBalance],
          }),
        });

        response += `3. Approved SwapX LP tokens for Beefy vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${approveBeefyTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(approveBeefyTx);
        await sleep(5000);
      } catch (error) {
        console.error('Step 3 error:', error);
        return `Strategy execution failed at Step 3 (Approve LP tokens): ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 4: Deposit LP tokens into Beefy
      try {
        const depositBeefyTx = await walletProvider.sendTransaction({
          to: BEEFY_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: BEEFY_VAULT_ABI,
            functionName: "deposit",
            args: [lpTokenBalance],
          }),
        });

        response += `4. Deposited SwapX LP tokens into Beefy vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${depositBeefyTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(depositBeefyTx);

        response += `Strategy execution completed successfully!\n` +
                    `You can now earn yield on your deposited tokens.`;
      } catch (error) {
        console.error('Step 4 error:', error);
        return `Strategy execution failed at Step 4 (Deposit to Beefy): ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      return response;

    } catch (error) {
      console.error('Strategy execution error:', error);
      if (error instanceof Error) {
        return `Strategy execution failed: ${error.message}`;
      }
      return `Unknown error occurred during strategy execution`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const usdceSwapXBeefyActionProvider = () => new USDCeSwapXBeefyActionProvider(); 