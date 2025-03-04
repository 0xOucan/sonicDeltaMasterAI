import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, createPublicClient, http, parseEther } from "viem";
import type { Hex } from "viem";
import "reflect-metadata";
import { sonic } from 'viem/chains';

import {
  SWAPX_VAULT_ADDRESS,
  BEEFY_VAULT_ADDRESS,
  WS_TOKEN_ADDRESS,
  SWAPX_VAULT_ABI,
  BEEFY_VAULT_ABI,
  ERC20_ABI,
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
    name: "execute-full-ws-swapx-beefy-strategy",
    description: "Execute the full wS SwapX Beefy strategy",
    schema: DepositWsSwapXSchema,
  })
  async executeFullStrategy(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositWsSwapXSchema>
  ): Promise<string> {
    try {
      // Convert human readable amount to wei
      const amount = parseEther(args.amount);
      const address = await walletProvider.getAddress();

      // Get current balance
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      const currentBalance = await publicClient.readContract({
        address: WS_TOKEN_ADDRESS as Hex,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as Hex]
      });

      if (currentBalance < amount) {
        return `Insufficient wS balance. You have ${currentBalance.toString()} wei but need ${amount.toString()} wei`;
      }

      let response = "Executing full wS SwapX Beefy strategy:\n\n";
      
      // Step 1: Approve wS for SwapX
      try {
        const approveSwapXTx = await walletProvider.sendTransaction({
          to: WS_TOKEN_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [SWAPX_VAULT_ADDRESS as Hex, amount],
          }),
        });
        
        response += `1. Approved wS for SwapX vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${approveSwapXTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(approveSwapXTx);
        await sleep(5000);
      } catch (error) {
        console.error('Step 1 error:', error);
        return `Strategy execution failed at Step 1 (Approve wS): ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 2: Deposit into SwapX
      let lpTokenBalance: bigint;
      try {
        const allowance = await publicClient.readContract({
          address: WS_TOKEN_ADDRESS as Hex,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address as Hex, SWAPX_VAULT_ADDRESS as Hex] as const
        });

        if (allowance < amount) {
          return `Strategy execution failed: Insufficient allowance for SwapX vault. Please execute step 1 again.`;
        }

        const depositSwapXTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: SWAPX_VAULT_ABI,
            functionName: "deposit",
            args: [amount, BigInt(0), address as Hex],
          }),
          gas: BigInt(1000000),
        });

        response += `2. Deposited wS into SwapX vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${depositSwapXTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(depositSwapXTx);
        await sleep(5000);
      
        lpTokenBalance = await publicClient.readContract({
          address: SWAPX_VAULT_ADDRESS as Hex,
          abi: SWAPX_VAULT_ABI,
          functionName: 'balanceOf',
          args: [address as Hex]
        });

        if (lpTokenBalance === BigInt(0)) {
          return "Strategy execution failed: No SwapX LP tokens received after deposit. Please try again later or with a different amount.";
        }

        response += `Received ${lpTokenBalance} SwapX LP tokens\n\n`;
      } catch (error) {
        if (error instanceof Error && error.message.includes('try later')) {
          return `The SwapX vault is temporarily unavailable for deposits. Please try again in a few minutes.`;
        }
        console.error('Step 2 error:', error);
        return `Strategy execution failed at Step 2 (Deposit wS): ${error instanceof Error ? error.message : 'Unknown error'}`;
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
            functionName: "depositAll",
            args: [],
          }),
          gas: BigInt(600000),
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

  @CreateAction({
    name: "wsswapx-beefy-withdraw",
    description: "Withdraw your position from wS SwapX Beefy strategy",
    schema: z.object({}).strip(),
  })
  async withdrawPosition(
    walletProvider: EvmWalletProvider,
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      let response = `Withdrawing from wS SwapX Beefy strategy:\n\n`;

      // Step 1: Check Beefy vault balance
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      const beefyBalance = await publicClient.readContract({
        address: BEEFY_VAULT_ADDRESS as Hex,
        abi: BEEFY_VAULT_ABI,
        functionName: 'balanceOf',
        args: [address as Hex]
      });

      if (beefyBalance === BigInt(0)) {
        return "No balance found in Beefy vault. Nothing to withdraw.";
      }

      // Step 2: Withdraw all from Beefy vault
      try {
        const withdrawAllTx = await walletProvider.sendTransaction({
          to: BEEFY_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: BEEFY_VAULT_ABI,
            functionName: "withdrawAll"
          }),
          gas: BigInt(400000),
        });

        response += `1. Withdrawn from Beefy vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${withdrawAllTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(withdrawAllTx);
        await sleep(5000); // Wait for state updates
      } catch (error) {
        console.error('Beefy withdrawal error:', error);
        return `Failed to withdraw from Beefy vault: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 3: Check SwapX LP balance
      const swapXBalance = await publicClient.readContract({
        address: SWAPX_VAULT_ADDRESS as Hex,
        abi: SWAPX_VAULT_ABI,
        functionName: 'balanceOf',
        args: [address as Hex]
      });

      if (swapXBalance === BigInt(0)) {
        return response + "\nNo SwapX LP tokens found after Beefy withdrawal. Please check your balance and try again.";
      }

      // Step 4: Withdraw from SwapX
      try {
        const withdrawTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: SWAPX_VAULT_ABI,
            functionName: "withdraw",
            args: [swapXBalance, address as Hex]
          }),
          gas: BigInt(7000000),
        });

        response += `2. Withdrawn from SwapX vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${withdrawTx}`;

        await walletProvider.waitForTransactionReceipt(withdrawTx);
        return response;
      } catch (error) {
        console.error('SwapX withdrawal error:', error);
        return `Failed to withdraw from SwapX vault: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy withdrawal error:', error);
      return `Failed to execute withdrawal: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const wsSwapXBeefyActionProvider = () => new WSSwapXBeefyActionProvider();