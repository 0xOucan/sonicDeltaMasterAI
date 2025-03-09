import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { 
  encodeFunctionData, 
  createPublicClient, 
  http, 
  parseUnits,
  formatUnits,
  type Hex,
  type Address
} from "viem";
import { sonic } from 'viem/chains';
import "reflect-metadata";

import {
  SWAPX_ADDRESSES,
  TOKEN_ADDRESSES,
  SWAPX_ROUTER_ABI,
  WS_TOKEN_ABI,
  ERC20_ABI,
  TOKEN_INFO,
  EXPLORER_BASE_URL
} from "./constants";

import {
  SwapSToUSDCeSchema,
  SwapUSDCeToSSchema,
  SwapSchema
} from "./schemas";

import { checkTokenBalance } from "../balance-checker/balanceCheckerActionProvider";
import { SwapFailedError, PriceImpactError } from "./errors";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class SwapXActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("swapx", []);
  }

  @CreateAction({
    name: "swapx-s-to-usdce",
    description: "Swap S to USDC.e using SwapX DEX (e.g., 'swapx-s-to-usdce 2.0')",
    schema: SwapSToUSDCeSchema,
  })
  async swapSToUSDCe(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapSToUSDCeSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 18); // S has 18 decimals
      const address = await walletProvider.getAddress();
      let response = `🔄 **The swap from S to USDC.e has been successfully executed.** Here are the details of the transactions:\n\n`;

      // Check S balance
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });
      
      const balance = await publicClient.getBalance({
        address: address as Hex
      });
      
      if (balance < amount) {
        return `❌ **Insufficient S balance**. Required: ${formatUnits(amount, 18)} S, Available: ${formatUnits(balance, 18)} S`;
      }

      // Calculate minimum amount out with 0.1% slippage if not provided
      const minAmountOut = args.minAmountOut ? 
        parseUnits(args.minAmountOut, 6) : 
        parseUnits("0.939", 6); // Based on the example transaction

      // Wrap S to WS first
      const wrapTx = await walletProvider.sendTransaction({
        to: SWAPX_ADDRESSES.WS_TOKEN as Hex,
        data: encodeFunctionData({
          abi: WS_TOKEN_ABI,
          functionName: "deposit"
        }),
        value: amount
      });

      response += `1. 🔄 Wrapped ${args.amount} S to wS  \n` +
                  `   Transaction: [View Transaction](${EXPLORER_BASE_URL}${wrapTx})\n\n`;

      await walletProvider.waitForTransactionReceipt(wrapTx);
      await sleep(2000); // Wait for state updates

      // Approve WS spending
      const approveTx = await walletProvider.sendTransaction({
        to: SWAPX_ADDRESSES.WS_TOKEN as Hex,
        data: encodeFunctionData({
          abi: WS_TOKEN_ABI,
          functionName: "approve",
          args: [SWAPX_ADDRESSES.ROUTER as Hex, amount]
        })
      });

      response += `2. ✅ Approved wS spending for SwapX  \n` +
                  `   Transaction: [View Transaction](${EXPLORER_BASE_URL}${approveTx})\n\n`;

      await walletProvider.waitForTransactionReceipt(approveTx);
      await sleep(2000);

      // Execute swap
      const swapParams = {
        tokenIn: TOKEN_ADDRESSES.WS,
        tokenOut: TOKEN_ADDRESSES.USDC_E,
        recipient: address as Hex,
        amountIn: amount,
        amountOutMinimum: minAmountOut,
        limitSqrtPrice: 0n
      };

      const swapTx = await walletProvider.sendTransaction({
        to: SWAPX_ADDRESSES.ROUTER as Hex,
        data: encodeFunctionData({
          abi: SWAPX_ROUTER_ABI,
          functionName: "exactInputSingle",
          args: [swapParams]
        })
      });

      response += `3. 💱 Swapped ${args.amount} S for USDC.e  \n` +
                  `   Transaction: [View Transaction](${EXPLORER_BASE_URL}${swapTx})\n\n`;

      await walletProvider.waitForTransactionReceipt(swapTx);
      response += `If you need any further assistance, feel free to ask!`;
      return response;

    } catch (error) {
      console.error('Swap error:', error);
      throw new SwapFailedError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  @CreateAction({
    name: "swapx-usdce-to-s",
    description: "Swap USDC.e to S using SwapX DEX (e.g., 'swapx-usdce-to-s 1.0')",
    schema: SwapUSDCeToSSchema,
  })
  async swapUSDCeToS(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapUSDCeToSSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 6); // USDC.e has 6 decimals
      const address = await walletProvider.getAddress();
      let response = `🔄 **The swap from USDC.e to S has been successfully executed.** Here are the details of the transactions:\n\n`;

      // Check USDC.e balance
      try {
        const balanceCheck = await checkTokenBalance(
          walletProvider,
          TOKEN_ADDRESSES.USDC_E,
          amount,
          "USDC.e",
          6
        );
        
        if (!balanceCheck.hasBalance) {
          return balanceCheck.message;
        }
        
        response += `1. 💰 Checked USDC.e balance: ${formatUnits(balanceCheck.currentBalance, 6)} USDC.e ✓\n\n`;
      } catch (error) {
        console.error('Balance check error:', error);
        return `❌ Error checking balance: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Calculate minimum amount out with 0.1% slippage if not provided
      const minAmountOut = args.minAmountOut ? 
        parseUnits(args.minAmountOut, 18) : 
        parseUnits("1.98", 18); // Example with 0.1% slippage

      // Approve USDC.e spending
      const approveTx = await walletProvider.sendTransaction({
        to: TOKEN_ADDRESSES.USDC_E as Hex,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [SWAPX_ADDRESSES.ROUTER as Hex, amount]
        })
      });

      response += `2. ✅ Approved USDC.e spending for SwapX  \n` +
                  `   Transaction: [View Transaction](${EXPLORER_BASE_URL}${approveTx})\n\n`;

      await walletProvider.waitForTransactionReceipt(approveTx);
      await sleep(2000);

      // Execute swap
      const swapParams = {
        tokenIn: TOKEN_ADDRESSES.USDC_E,
        tokenOut: TOKEN_ADDRESSES.WS,
        recipient: address as Hex,
        amountIn: amount,
        amountOutMinimum: minAmountOut,
        limitSqrtPrice: 0n
      };

      const swapTx = await walletProvider.sendTransaction({
        to: SWAPX_ADDRESSES.ROUTER as Hex,
        data: encodeFunctionData({
          abi: SWAPX_ROUTER_ABI,
          functionName: "exactInputSingle",
          args: [swapParams]
        })
      });

      response += `3. 💱 Swapped ${args.amount} USDC.e for S  \n` +
                  `   Transaction: [View Transaction](${EXPLORER_BASE_URL}${swapTx})\n\n`;

      await walletProvider.waitForTransactionReceipt(swapTx);
      response += `If you have any more requests or need further assistance, just let me know!`;
      return response;

    } catch (error) {
      console.error('Swap error:', error);
      throw new SwapFailedError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  @CreateAction({
    name: "swapx-swap",
    description: "Swap tokens using SwapX DEX",
    schema: SwapSchema,
  })
  async swap(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapSchema>
  ): Promise<string> {
    if (args.tokenIn === "S" && args.tokenOut === "USDC_E") {
      return this.swapSToUSDCe(walletProvider, {
        amount: args.amount,
        minAmountOut: args.minAmountOut
      });
    } else if (args.tokenIn === "USDC_E" && args.tokenOut === "S") {
      return this.swapUSDCeToS(walletProvider, {
        amount: args.amount,
        minAmountOut: args.minAmountOut
      });
    } else {
      throw new SwapFailedError("Unsupported token pair");
    }
  }

  private async estimateGas(walletProvider: EvmWalletProvider, txParams: any) {
    try {
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      const gasEstimate = await publicClient.estimateGas({
        account: await walletProvider.getAddress() as Address,
        ...txParams
      });

      // Add 20% buffer to gas estimate
      return (gasEstimate * 120n) / 100n;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to estimate gas: ${error.message}`);
      }
      throw new Error('Failed to estimate gas: Unknown error');
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }
} 