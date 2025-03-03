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
  AAVE_POOL_ADDRESS,
  USDC_E_ADDRESS,
  WETH_ADDRESS,
  AAVE_POOL_ABI,
  ERC20_ABI,
} from "./constants";

import {
  SupplyUSDCeSchema,
  SupplyWETHSchema,
  ApproveUSDCeSchema,
  ApproveWETHSchema,
  WithdrawUSDCeSchema,
  WithdrawWETHSchema,
} from "./schemas";

import { checkTokenBalance } from "../balance-checker/balanceCheckerActionProvider";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";

export class AaveSupplyActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("aave-supply", []);
  }

  @CreateAction({
    name: "aave-supply-usdce",
    description: "Supply USDC.e to Aave lending protocol (e.g., 'aave-supply-usdce 1.0')",
    schema: SupplyUSDCeSchema,
  })
  async supplyUSDCe(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SupplyUSDCeSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 6);
      const address = await walletProvider.getAddress();
      let response = `Executing Aave USDC.e supply strategy:\n\n`;

      // Step 1: Check balance
      const balanceCheck = await checkTokenBalance(
        walletProvider,
        USDC_E_ADDRESS,
        amount,
        "USDC.e",
        6
      );

      if (!balanceCheck.hasBalance) {
        return balanceCheck.message;
      }

      // Step 2: Approve USDC.e for Aave if needed
      try {
        const approveTx = await walletProvider.sendTransaction({
          to: USDC_E_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [AAVE_POOL_ADDRESS as Hex, amount],
          }),
        });

        response += `1. Approved ${args.amount} USDC.e for Aave protocol\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${approveTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(approveTx);
        await sleep(5000); // Wait for state updates
      } catch (error) {
        console.error('Approval error:', error);
        return `Failed to approve USDC.e: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 3: Supply to Aave
      try {
        const supplyTx = await walletProvider.sendTransaction({
          to: AAVE_POOL_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "supply",
            args: [USDC_E_ADDRESS as Hex, amount, address as Hex, 0],
          }),
          gas: BigInt(300000),
        });

        response += `2. Supplied ${args.amount} USDC.e to Aave\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${supplyTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(supplyTx);
        return response;
      } catch (error) {
        console.error('Supply error:', error);
        return `Failed to supply USDC.e to Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "aave-supply-weth",
    description: "Supply WETH to Aave lending protocol (e.g., 'aave-supply-weth 0.1')",
    schema: SupplyWETHSchema,
  })
  async supplyWETH(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SupplyWETHSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 18);
      const address = await walletProvider.getAddress();
      let response = `Executing Aave WETH supply strategy:\n\n`;

      // Step 1: Check balance
      const balanceCheck = await checkTokenBalance(
        walletProvider,
        WETH_ADDRESS,
        amount,
        "WETH",
        18
      );

      if (!balanceCheck.hasBalance) {
        return balanceCheck.message;
      }

      // Step 2: Approve WETH for Aave if needed
      try {
        const approveTx = await walletProvider.sendTransaction({
          to: WETH_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [AAVE_POOL_ADDRESS as Hex, amount],
          }),
        });

        response += `1. Approved ${args.amount} WETH for Aave protocol\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${approveTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(approveTx);
        await sleep(5000); // Wait for state updates
      } catch (error) {
        console.error('Approval error:', error);
        return `Failed to approve WETH: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 3: Supply to Aave
      try {
        const supplyTx = await walletProvider.sendTransaction({
          to: AAVE_POOL_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "supply",
            args: [WETH_ADDRESS as Hex, amount, address as Hex, 0],
          }),
          gas: BigInt(300000),
        });

        response += `2. Supplied ${args.amount} WETH to Aave\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${supplyTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(supplyTx);
        return response;
      } catch (error) {
        console.error('Supply error:', error);
        return `Failed to supply WETH to Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "aave-withdraw-usdce",
    description: "Withdraw USDC.e from Aave lending protocol (e.g., 'aave-withdraw-usdce 1.0' or 'aave-withdraw-usdce max')",
    schema: WithdrawUSDCeSchema,
  })
  async withdrawUSDCe(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof WithdrawUSDCeSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 6);
      const address = await walletProvider.getAddress();
      let response = `Executing Aave USDC.e withdrawal:\n\n`;

      try {
        const withdrawTx = await walletProvider.sendTransaction({
          to: AAVE_POOL_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "withdraw",
            args: [USDC_E_ADDRESS as Hex, amount, address as Hex],
          }),
          gas: BigInt(300000),
        });

        response += `Withdrew ${args.amount} USDC.e from Aave\n` +
                    `Transaction: ${EXPLORER_BASE_URL}${withdrawTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(withdrawTx);
        return response;
      } catch (error) {
        console.error('Withdrawal error:', error);
        return `Failed to withdraw USDC.e from Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "aave-withdraw-weth",
    description: "Withdraw WETH from Aave lending protocol (e.g., 'aave-withdraw-weth 0.1' or 'aave-withdraw-weth max')",
    schema: WithdrawWETHSchema,
  })
  async withdrawWETH(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof WithdrawWETHSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 18);
      const address = await walletProvider.getAddress();
      let response = `Executing Aave WETH withdrawal:\n\n`;

      try {
        const withdrawTx = await walletProvider.sendTransaction({
          to: AAVE_POOL_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "withdraw",
            args: [WETH_ADDRESS as Hex, amount, address as Hex],
          }),
          gas: BigInt(300000),
        });

        response += `Withdrew ${args.amount} WETH from Aave\n` +
                    `Transaction: ${EXPLORER_BASE_URL}${withdrawTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(withdrawTx);
        return response;
      } catch (error) {
        console.error('Withdrawal error:', error);
        return `Failed to withdraw WETH from Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}