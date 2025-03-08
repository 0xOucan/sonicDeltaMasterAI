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
  SONIC_ROUTER_ADDRESS,
  SONIC_ROUTER_ABI,
  ODOS_ROUTER_ADDRESS,
  ODOS_ROUTER_ABI,
} from "./constants";

import { SonicSwapSchema } from "./schemas";
import { SonicSwapError, InsufficientLiquidityError } from "./errors";
import { ERC20_ABI } from "../wsswapx-beefy/constants";

export class SonicActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("sonic", []);
  }

  private async handleSonicSwap(
    walletProvider: EvmWalletProvider,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    slippage: number,
  ): Promise<string> {
    const address = await walletProvider.getAddress();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

    // Get expected output amount
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http()
    });

    const path = [tokenIn, tokenOut];
    const amounts = await publicClient.readContract({
      address: SONIC_ROUTER_ADDRESS as Hex,
      abi: SONIC_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [amountIn, path as Hex[]]
    });

    const amountOutMin = amounts[1] * BigInt(Math.floor((100 - slippage) * 1000)) / BigInt(100000);

    // Approve router
    const approveTx = await walletProvider.sendTransaction({
      to: tokenIn as Hex,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [SONIC_ROUTER_ADDRESS as Hex, amountIn],
      }),
    });


    await walletProvider.waitForTransactionReceipt(approveTx);
    // Execute swap
    const swapTx = await walletProvider.sendTransaction({
      to: SONIC_ROUTER_ADDRESS as Hex,
      data: encodeFunctionData({
        abi: SONIC_ROUTER_ABI,
        functionName: "swapExactTokensForTokens",
        args: [amountIn, amountOutMin, path as Hex[], address as Hex, deadline],
      }),
    });

    return swapTx;
  }

  private async handleOdosSwap(
    walletProvider: EvmWalletProvider,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
  ): Promise<string> {
    // Note: This is a simplified version. In practice, you'd need to:
    // 1. Call ODOS API to get the optimal route
    // 2. Get the encoded swap data
    // 3. Execute the swap through the ODOS router
    const address = await walletProvider.getAddress();

    // Approve ODOS router
    const approveTx = await walletProvider.sendTransaction({
      to: tokenIn as Hex,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ODOS_ROUTER_ADDRESS as Hex, amountIn],
      }),
    });

    await walletProvider.waitForTransactionReceipt(approveTx);

    // In practice, you would get this data from ODOS API
    const swapData = "0x"; // Placeholder

    const swapTx = await walletProvider.sendTransaction({
      to: ODOS_ROUTER_ADDRESS as Hex,
      data: encodeFunctionData({
        abi: ODOS_ROUTER_ABI,
        functionName: "swapCompact",
        args: [swapData as Hex],
      }),
    });

    return swapTx;
  }

  @CreateAction({
    name: "swap-tokens",
    description: "Swap tokens using Sonic or ODOS routing",
    schema: SonicSwapSchema,
  })
  async swap(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SonicSwapSchema>,
  ): Promise<string> {
    try {
      const amountIn = BigInt(args.amountIn);
      const slippage = args.slippage || 0.5;
      const useOdos = args.useOdos || false;

      //const txHash = useOdos
      //  ? await this.handleOdosSwap(walletProvider, args.tokenIn, args.tokenOut, amountIn)
      //  : await this.handleSonicSwap(walletProvider, args.tokenIn, args.tokenOut, amountIn, slippage);

     
      let txHash;
      if (useOdos) {
      console.log(144)
        txHash = await this.handleOdosSwap(walletProvider, args.tokenIn, args.tokenOut, amountIn)
      } else {
        console.log(147)
        txHash = await this.handleSonicSwap(walletProvider, args.tokenIn, args.tokenOut, amountIn, slippage);
      }

      await walletProvider.waitForTransactionReceipt(txHash as `0x${string}`);

      console.log(153);
      console.log(txHash);

      return `Swap executed successfully!\nTransaction: https://sonicscan.org/tx/${txHash}`;
    } catch (error) {
      if (error instanceof SonicSwapError) {
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

export const sonicActionProvider = () => new SonicActionProvider();
