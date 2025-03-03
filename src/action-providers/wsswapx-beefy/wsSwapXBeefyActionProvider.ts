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
import { parseEther } from "viem";
import { estimateGasParameters, estimateContractGas } from "../../utils/gas-utils";

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

import { checkTokenBalance } from "../balance-checker/balanceCheckerActionProvider";

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
      // Check wS balance first
      const wsBalance = await checkTokenBalance(
        walletProvider,
        WS_TOKEN_ADDRESS,
        BigInt(args.amount),
        "wS",
        18
      );

      if (!wsBalance.hasBalance) {
        return wsBalance.message;
      }

      let response = "Executing full wS SwapX Beefy strategy:\n\n";
      response += `${wsBalance.message}\n\n`;
      
      const address = await walletProvider.getAddress();

      // Step 1: Approve wS for SwapX
      try {
        // Prepare data for transaction
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [SWAPX_VAULT_ADDRESS as Hex, BigInt(args.amount)],
        });
        
        // Estimate gas parameters
        const gasParams = await estimateGasParameters(
          WS_TOKEN_ADDRESS as Hex,
          approveData,
          BigInt(0)
        );
        
        const approveSwapXTx = await walletProvider.sendTransaction({
          to: WS_TOKEN_ADDRESS as Hex,
          data: approveData,
          ...gasParams
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
        // Log transaction parameters for debugging
        console.log("Attempting SwapX deposit with parameters:", {
          amount: args.amount,
          to: address
        });

        // First check if user has approved the spending
        const publicClient = createPublicClient({
          chain: sonic,
          transport: http()
        });

        const allowance = await publicClient.readContract({
          address: WS_TOKEN_ADDRESS as Hex,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address as Hex, SWAPX_VAULT_ADDRESS as Hex]
        });

        if (allowance < BigInt(args.amount)) {
          return `Strategy execution failed: Insufficient allowance for SwapX vault. Please execute step 1 again.`;
        }

        // Then execute the deposit with increased gas
        const depositData = encodeFunctionData({
          abi: SWAPX_VAULT_ABI,
          functionName: "deposit",
          args: [BigInt(args.amount), BigInt(0), address as Hex],
        });
        
        // Estimate gas parameters properly instead of using a fixed value
        const depositGasParams = await estimateContractGas({
          contractAddress: SWAPX_VAULT_ADDRESS as Hex,
          abi: SWAPX_VAULT_ABI,
          functionName: "deposit",
          args: [BigInt(args.amount), BigInt(0), address as Hex],
        });
        
        const depositSwapXTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: depositData,
          ...depositGasParams // Use estimated gas parameters
        });

        response += `2. Deposited wS into SwapX vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${depositSwapXTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(depositSwapXTx);
        await sleep(5000);
      
        // Get LP token balance directly from SwapX vault
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
        console.error('Step 2 error:', error);
        return `Strategy execution failed at Step 2 (Deposit wS): ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 3: Approve SwapX vault LP tokens for Beefy vault
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

export const wsSwapXBeefyActionProvider = () => new WSSwapXBeefyActionProvider();