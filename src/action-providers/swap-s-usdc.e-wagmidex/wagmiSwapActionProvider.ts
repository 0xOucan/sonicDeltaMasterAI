import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, parseUnits, parseGwei } from "viem";
import type { Hex } from "viem";
import { createPublicClient, http, type Address } from 'viem';
import { sonic } from 'viem/chains';
import "reflect-metadata";
import { sleep } from "../../utils/sleep";

import {
  WAGMI_ROUTER_ADDRESS,
  WAGMI_ROUTER_ABI,
  USDC_E_ADDRESS,
  WS_TOKEN_ADDRESS,
  ERC20_ABI,
  MAX_UINT256,
  TX_DELAY,
} from "./constants";

import {
  SwapForUsdcSchema,
  SwapUsdcForSSchema,
} from "./schemas";
import { WS_TOKEN_ABI } from "../swrapper/constants";
import { BalanceCheckerActionProvider } from "../balance-checker/balanceCheckerActionProvider";

const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";

// Define schema type for swap input
type SwapForUsdcInput = z.infer<typeof SwapForUsdcSchema>;
type SwapUsdcForSInput = z.infer<typeof SwapUsdcForSSchema>;

// Helper functions for token amounts
function toWei(amount: string, decimals: number): bigint {
  try {
    // Remove any trailing zeros after decimal
    const cleanAmount = amount.replace(/\.?0+$/, '');
    return parseUnits(cleanAmount, decimals);
  } catch (error) {
    console.error('Error converting to wei:', error);
    throw new Error(`Invalid amount format: ${amount}`);
  }
}

function fromWei(amount: bigint, decimals: number): string {
  try {
    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;
    return `${integerPart}${fractionalPart ? `.${fractionalPart}` : ''}`;
  } catch (error) {
    console.error('Error converting from wei:', error);
    return amount.toString();
  }
}

function encodePath(path: string): Hex {
  return `0x${path}` as Hex;
}

function encodeInputSingle(amountIn: bigint): Hex {
  return encodePacked([
    amountIn,                         // amountIn
    BigInt(0),                        // amountOutMin
    "0x0000000000000000000000000000000000000000", // recipient (zero address)
  ]) as Hex;
}

function encodeOutputSingle(amountOut: bigint): Hex {
  return encodePacked([
    amountOut,                        // amountOut
    BigInt(MAX_UINT256),             // amountInMax
    "0x0000000000000000000000000000000000000000", // recipient (zero address)
  ]) as Hex;
}

function encodePacked(values: (bigint | string)[]): Hex {
  const packed = "0x" + values.map(value => {
    if (typeof value === 'bigint') {
      return value.toString(16).padStart(64, '0');
    }
    return value.replace('0x', '').padStart(64, '0');
  }).join('');
  return packed as Hex;
}

export class WagmiSwapActionProvider extends ActionProvider<EvmWalletProvider> {
  private balanceChecker: BalanceCheckerActionProvider;

  constructor() {
    super("wagmi-swap", []);
    this.balanceChecker = new BalanceCheckerActionProvider();
  }

  private async checkTokenBalance(
    walletProvider: EvmWalletProvider, 
    tokenAddress: Address, 
    amountInWei: bigint,
    decimals: number
  ): Promise<boolean> {
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http()
    });

    const address = await walletProvider.getAddress() as Address;

    try {
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: [{
          name: "balanceOf",
          type: "function",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "balance", type: "uint256" }],
          stateMutability: "view"
        }] as const,
        functionName: "balanceOf",
        args: [address]
      });

      console.log(`Balance check for ${tokenAddress}:`);
      console.log(`Required: ${fromWei(amountInWei, decimals)} (${amountInWei})`);
      console.log(`Available: ${fromWei(balance, decimals)} (${balance})`);

      return balance >= amountInWei;
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  }

  private async checkNativeBalance(
    walletProvider: EvmWalletProvider,
    amount: bigint
  ): Promise<boolean> {
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http()
    });

    const address = await walletProvider.getAddress() as Address;
    const balance = await publicClient.getBalance({ address });
    return balance >= amount;
  }

  private async checkAllowance(
    walletProvider: EvmWalletProvider,
    tokenAddress: Address,
    spenderAddress: Address
  ): Promise<bigint> {
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http()
    });

    const address = await walletProvider.getAddress() as Address;

    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: [{
        name: "allowance",
        type: "function",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" }
        ],
        outputs: [{ name: "remaining", type: "uint256" }],
        stateMutability: "view"
      }] as const,
      functionName: "allowance",
      args: [address, spenderAddress]
    });

    return allowance;
  }

  async estimateGasAndGetParams(walletProvider: EvmWalletProvider, txParams: any) {
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http(),
    });

    const address = await walletProvider.getAddress();
    
    // Estimate gas with safe parameters
    const gasEstimate = await publicClient.estimateGas({
      ...txParams,
      account: address,
    });

    // Add 20% buffer to gas estimate
    const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

    return {
      ...txParams,
      gasLimit,
      maxFeePerGas: parseGwei('60'),      // 60 gwei
      maxPriorityFeePerGas: parseGwei('1') // 1 gwei
    };
  }

  private async approveTokenIfNeeded(
    walletProvider: EvmWalletProvider,
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint
  ): Promise<void> {
    const allowance = await this.checkAllowance(walletProvider, tokenAddress, spenderAddress);

    if (allowance < amount) {
      console.log(`Approving ${tokenAddress} for ${spenderAddress}`);
      
      const approveData = encodeFunctionData({
        abi: [{
          name: "approve",
          type: "function",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" }
          ],
          outputs: [{ name: "success", type: "bool" }],
          stateMutability: "nonpayable"
        }] as const,
        functionName: "approve",
        args: [spenderAddress, BigInt(MAX_UINT256)]
      });

      const txParams = await this.estimateGasAndGetParams(walletProvider, {
        to: tokenAddress,
        data: approveData,
      });

      const tx = await walletProvider.sendTransaction(txParams);
      await walletProvider.waitForTransactionReceipt(tx);
      await sleep(TX_DELAY);
    }
  }

  @CreateAction({
    name: "swap-for-usdc",
    description: "Swap S or wS tokens for USDC.e using Wagmi DEX",
    schema: SwapForUsdcSchema,
  })
  async swapForUsdc(
    walletProvider: EvmWalletProvider,
    args: SwapForUsdcInput
  ): Promise<string> {
    try {
      const amountIn = toWei(args.amount, 18); // Both S and wS use 18 decimals
      const isNativeS = args.token === "S";

      // Check initial balance with proper decimals
      if (isNativeS) {
        const hasSBalance = await this.checkNativeBalance(walletProvider, amountIn);
        if (!hasSBalance) {
          return `Insufficient S balance. You need at least ${args.amount} S`;
        }
      } else {
        const hasWSBalance = await this.checkTokenBalance(
          walletProvider, 
          WS_TOKEN_ADDRESS as Address, 
          amountIn,
          18 // wS uses 18 decimals
        );
        if (!hasWSBalance) {
          return `Insufficient wS balance. You need at least ${args.amount} wS`;
        }
      }

      let wrapTxHash: string | undefined;

      // If using native S, wrap it first
      if (isNativeS) {
        const wrapData = encodeFunctionData({
          abi: WS_TOKEN_ABI,
          functionName: "deposit",
          args: [] as const
        });

        const wrapTx = await walletProvider.sendTransaction({
          to: WS_TOKEN_ADDRESS as Address,
          value: amountIn,
          data: wrapData,
        });
        
        await walletProvider.waitForTransactionReceipt(wrapTx);
        wrapTxHash = wrapTx;
        await sleep(TX_DELAY);
      }

      // Approve wS for router if needed
      await this.approveTokenIfNeeded(
        walletProvider,
        WS_TOKEN_ADDRESS as Address,
        WAGMI_ROUTER_ADDRESS as Address,
        amountIn
      );

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
      const commands = new Uint8Array([0]);
      const commandsHex = `0x${Buffer.from(commands).toString('hex')}` as Hex;
      const path = `${WS_TOKEN_ADDRESS.slice(2)}0005dc${USDC_E_ADDRESS.slice(2)}`;

      const swapData = encodeFunctionData({
        abi: WAGMI_ROUTER_ABI,
        functionName: "execute",
        args: [
          commandsHex,
          [encodePath(path), encodeInputSingle(amountIn)],
          deadline
        ] as const
      });

      const swapTx = await walletProvider.sendTransaction({
        to: WAGMI_ROUTER_ADDRESS as Address,
        data: swapData,
      });

      await walletProvider.waitForTransactionReceipt(swapTx);

      let response = `Successfully swapped ${args.amount} ${args.token} for USDC.e\n`;
      if (wrapTxHash) {
        response += `Wrap Transaction: ${EXPLORER_BASE_URL}${wrapTxHash}\n`;
      }
      response += `Swap Transaction: ${EXPLORER_BASE_URL}${swapTx}`;

      return response;

    } catch (error) {
      if (error instanceof Error) {
        return `Swap failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "swap-usdc-for-s",
    description: "Swap USDC.e for native S tokens using Wagmi DEX",
    schema: SwapUsdcForSSchema,
  })
  async swapUsdcForS(
    walletProvider: EvmWalletProvider,
    args: SwapUsdcForSInput
  ): Promise<string> {
    try {
      const amountIn = toWei(args.amount, 6); // USDC.e uses 6 decimals

      // Check USDC.e balance first
      const hasUsdcBalance = await this.checkTokenBalance(
        walletProvider,
        USDC_E_ADDRESS as Address,
        amountIn,
        6 // USDC.e uses 6 decimals
      );

      if (!hasUsdcBalance) {
        return `Insufficient USDC.e balance. You need at least ${args.amount} USDC.e`;
      }

      await this.approveTokenIfNeeded(
        walletProvider,
        USDC_E_ADDRESS as Address,
        WAGMI_ROUTER_ADDRESS as Address,
        amountIn
      );

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
      const commands = new Uint8Array([0]);
      const commandsHex = `0x${Buffer.from(commands).toString('hex')}` as Hex;
      const path = `${USDC_E_ADDRESS.slice(2)}000bb8${WS_TOKEN_ADDRESS.slice(2)}`;

      const swapData = encodeFunctionData({
        abi: WAGMI_ROUTER_ABI,
        functionName: "execute",
        args: [
          commandsHex,
          [encodePath(path), encodeOutputSingle(amountIn)],
          deadline
        ] as const
      });

      const swapTx = await walletProvider.sendTransaction({
        to: WAGMI_ROUTER_ADDRESS as Address,
        data: swapData,
      });

      await walletProvider.waitForTransactionReceipt(swapTx);
      
      return `Successfully swapped ${args.amount} USDC.e for S\nTransaction: ${EXPLORER_BASE_URL}${swapTx}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Swap failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }
}