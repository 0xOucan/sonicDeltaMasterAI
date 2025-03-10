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
import { SwapFailedError, PriceImpactError, SlippageExceededError } from "./errors";

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
      let response = `🔄 **Preparing to swap ${args.amount} S to USDC.e using SwapX...**\n\n`;

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
      
      response += `1. 💰 Checked S balance: ${formatUnits(balance, 18)} S ✓\n\n`;

      // Set a very low minimum amount out to ensure the transaction succeeds
      // This is based on the transaction example showing a minimum of 0.000443 USDC.e
      // We're using a value that's approximately 0.03% of the expected output for 1 S
      const expectedRatePerS = 0.44; // Based on transaction logs showing ~0.44 USDC.e per 1 S
      const calculatedMin = parseFloat(args.amount) * expectedRatePerS * 0.97; // 3% slippage allowance
      
      const minAmountOut = args.minAmountOut 
        ? parseUnits(args.minAmountOut, 6) 
        : parseUnits(calculatedMin.toFixed(6), 6);
        
      console.log(`Using minimum output amount of ${formatUnits(minAmountOut, 6)} USDC.e with 3% slippage protection`);
      
      try {
        // Wrap S to WS first
        response += `2. 🔄 Wrapping ${args.amount} S to wS...\n`;
        const wrapTx = await walletProvider.sendTransaction({
          to: SWAPX_ADDRESSES.WS_TOKEN as Hex,
          data: encodeFunctionData({
            abi: WS_TOKEN_ABI,
            functionName: "deposit"
          }),
          value: amount
        });

        await walletProvider.waitForTransactionReceipt(wrapTx);
        response += `   ✅ Success! Transaction: [View Transaction](${EXPLORER_BASE_URL}${wrapTx})\n\n`;
        await sleep(2000); // Wait for state updates

        // Approve WS spending
        response += `3. 🔐 Approving wS for SwapX Router...\n`;
        const approveTx = await walletProvider.sendTransaction({
          to: SWAPX_ADDRESSES.WS_TOKEN as Hex,
          data: encodeFunctionData({
            abi: WS_TOKEN_ABI,
            functionName: "approve",
            args: [SWAPX_ADDRESSES.ROUTER as Hex, amount]
          })
        });

        await walletProvider.waitForTransactionReceipt(approveTx);
        response += `   ✅ Success! Transaction: [View Transaction](${EXPLORER_BASE_URL}${approveTx})\n\n`;
        await sleep(2000);

        // Execute swap
        response += `4. 💱 Executing swap of ${args.amount} S to USDC.e...\n`;
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

        await walletProvider.waitForTransactionReceipt(swapTx);
        response += `   ✅ Success! Transaction: [View Transaction](${EXPLORER_BASE_URL}${swapTx})\n\n`;

        response += `🎉 **Swap completed successfully!** Your ${args.amount} S tokens have been swapped to USDC.e.\n\n`;
        response += `If you need any further assistance, feel free to ask!`;
        return response;
      } catch (error) {
        console.error('Transaction error:', error);
        
        // Check for specific error messages
        if (error instanceof Error) {
          const slippageError = SlippageExceededError.fromError(error, args.amount, "S");
          if (slippageError) {
            return slippageError.getUserFriendlyMessage();
          }
        }
        
        throw new SwapFailedError(error instanceof Error ? error.message : 'Unknown error');
      }
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
      let response = `🔄 **Preparing to swap ${args.amount} USDC.e to S using SwapX...**\n\n`;

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

      // Set appropriate minimum amount out
      // This is based on the exchange rate of approximately 1 USDC.e ≈ 2 S
      const expectedRatePerUSDCe = 2.0; // Based on approximate exchange rate
      const calculatedMin = parseFloat(args.amount) * expectedRatePerUSDCe * 0.97; // 3% slippage allowance
      
      const minAmountOut = args.minAmountOut 
        ? parseUnits(args.minAmountOut, 18) 
        : parseUnits(calculatedMin.toFixed(18), 18);
        
      console.log(`Using minimum output amount of ${formatUnits(minAmountOut, 18)} S with 3% slippage protection`);

      try {
        // Approve USDC.e spending
        response += `2. 🔐 Approving USDC.e for SwapX Router...\n`;
        const approveTx = await walletProvider.sendTransaction({
          to: TOKEN_ADDRESSES.USDC_E as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [SWAPX_ADDRESSES.ROUTER as Hex, amount]
          })
        });

        await walletProvider.waitForTransactionReceipt(approveTx);
        response += `   ✅ Success! Transaction: [View Transaction](${EXPLORER_BASE_URL}${approveTx})\n\n`;
        await sleep(2000);

        // Execute swap
        response += `3. 💱 Executing swap of ${args.amount} USDC.e to S...\n`;
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

        await walletProvider.waitForTransactionReceipt(swapTx);
        response += `   ✅ Success! Transaction: [View Transaction](${EXPLORER_BASE_URL}${swapTx})\n\n`;

        response += `🎉 **Swap completed successfully!** Your ${args.amount} USDC.e have been swapped to S.\n\n`;
        response += `If you need any further assistance, feel free to ask!`;
        return response;
      } catch (error) {
        console.error('Transaction error:', error);
        
        // Check for specific error messages
        if (error instanceof Error) {
          const slippageError = SlippageExceededError.fromError(error, args.amount, "USDC.e");
          if (slippageError) {
            return slippageError.getUserFriendlyMessage();
          }
        }
        
        throw new SwapFailedError(error instanceof Error ? error.message : 'Unknown error');
      }
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

      // Add 30% buffer to gas estimate for swap transactions to ensure they go through
      return (gasEstimate * 130n) / 100n;
    } catch (error) {
      console.error('Gas estimation error:', error);
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // If the error is due to "Too little received", we'll throw a SlippageExceededError
        if (errorMessage.includes('Too little received')) {
          const slippageError = new SlippageExceededError("the requested", "tokens");
          throw slippageError;
        }
        
        throw new Error(`Failed to estimate gas: ${errorMessage}`);
      }
      
      throw new Error('Failed to estimate gas: Unknown error');
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }
} 