import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, createPublicClient, http, isAddress, formatUnits, parseEther } from "viem";
import type { Hex } from "viem";
import { sonic } from 'viem/chains';
import "reflect-metadata";
import {
  WrapSSchema,
  UnwrapSSchema,
  TransferWSSchema,
  ApproveWSSchema,
  GetBalanceSchema,
} from "./schemas";
import { WS_TOKEN_ADDRESS, WS_TOKEN_ABI } from "./constants";
import {
  SWrapperError,
  InsufficientBalanceError,
  TransactionFailedError,
} from "./errors";

/**
 * SWrapperActionProvider provides actions for wrapping and unwrapping Sonic (S) tokens
 */
export class SWrapperActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("swrapper", []);
  }

  private getSonicScanLink(txHash: string): string {
    return `https://sonicscan.org/tx/${txHash}`;
  }

  private async checkNetwork(walletProvider: EvmWalletProvider): Promise<void> {
    const network = await walletProvider.getNetwork();
    
    // Safely check network ID, converting to string and handling potential undefined
    const networkId = network.networkId?.toString() || '';
    const chainId = network.chainId?.toString() || '';

    // Check if either networkId or chainId matches Sonic
    if (networkId !== "sonic" && chainId !== "146") {
      throw new SWrapperError(
        "This action provider only works on the Sonic blockchain. Please switch your network to Sonic."
      );
    }
  }

  private async getPublicClientForNetwork(walletProvider: EvmWalletProvider) {
    // Create a public client for Sonic chain
    return createPublicClient({
      chain: sonic,
      transport: http(sonic.rpcUrls.default.http[0])
    });
  }

  private async checkWSBalance(
    walletProvider: EvmWalletProvider,
    amount: string
  ): Promise<void> {
    // Ensure the address is a valid Hex address
    const address = await walletProvider.getAddress();
    if (!isAddress(address)) {
      throw new SWrapperError("Invalid wallet address");
    }

    const publicClient = await this.getPublicClientForNetwork(walletProvider);
    
    const balance = await publicClient.readContract({
      address: WS_TOKEN_ADDRESS as Hex,
      abi: WS_TOKEN_ABI,
      functionName: "balanceOf",
      args: [address as Hex],
    }) as bigint;

    if (balance < BigInt(amount)) {
      throw new InsufficientBalanceError(
        balance.toString(),
        amount
      );
    }
  }

  @CreateAction({
    name: "wrap-s",
    description: `
This tool will wrap native S (Sonic) tokens to wS tokens.
It takes an amount parameter that can be in decimal (like "1.5") or wei format.
When a user says something like "wrap 1.5 S to wS", convert the decimal to wei.

Example inputs:
- "wrap 0.1 S to wS" (converts 0.1 to wei automatically)
- "100000000000000000" (raw wei amount)
`,
    schema: WrapSSchema,
  })
  async wrapS(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof WrapSSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      
      // Check if the amount is already in wei format or a decimal string
      let amountInWei: bigint;
      let humanReadableAmount: string;
      
      if (args.amount.includes('.') || !args.amount.match(/^[0-9]+$/)) {
        // This is likely a decimal amount (e.g., "1.5")
        // Convert to wei assuming 18 decimals
        try {
          amountInWei = parseEther(args.amount);
          humanReadableAmount = args.amount;
        } catch (error) {
          return `❌ Invalid amount format: ${args.amount}. Please provide a valid number.`;
        }
      } else {
        // This is likely already a wei amount (e.g., "1000000000000000000")
        amountInWei = BigInt(args.amount);
        humanReadableAmount = parseFloat(formatUnits(amountInWei, 18)).toFixed(2);
      }
      
      // Wrap S to receive wS
      const tx = await walletProvider.sendTransaction({
        to: WS_TOKEN_ADDRESS as Hex,
        value: amountInWei,
        data: "0x", // Empty data for wrapping
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `🔄 Successfully wrapped ${humanReadableAmount} S to wS tokens\n\n📝 Transaction: ${this.getSonicScanLink(tx)}`;
    } catch (error) {
      if (error instanceof SWrapperError) {
        return `❌ Error: ${error.message}`;
      }
      if (error instanceof Error) {
        return `❌ Transaction failed: ${error.message}`;
      }
      return `❌ Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "unwrap-s",
    description: `
This tool will unwrap wS tokens back to native S tokens.
It takes an amount parameter that can be in decimal (like "1.5") or wei format.
When a user says something like "unwrap 1.5 wS to S", convert the decimal to wei.

Example inputs:
- "unwrap 0.1 wS to S" (converts 0.1 to wei automatically)
- "100000000000000000" (raw wei amount)
`,
    schema: UnwrapSSchema,
  })
  async unwrapS(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof UnwrapSSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      
      // Check if the amount is already in wei format or a decimal string
      let amountInWei: bigint;
      let humanReadableAmount: string;
      
      if (args.amount.includes('.') || !args.amount.match(/^[0-9]+$/)) {
        // This is likely a decimal amount (e.g., "1.5")
        // Convert to wei assuming 18 decimals
        try {
          amountInWei = parseEther(args.amount);
          humanReadableAmount = args.amount;
        } catch (error) {
          return `❌ Invalid amount format: ${args.amount}. Please provide a valid number.`;
        }
      } else {
        // This is likely already a wei amount (e.g., "1000000000000000000")
        amountInWei = BigInt(args.amount);
        humanReadableAmount = parseFloat(formatUnits(amountInWei, 18)).toFixed(2);
      }
      
      // Check wS balance before proceeding
      const address = await walletProvider.getAddress();
      const publicClient = await this.getPublicClientForNetwork(walletProvider);
      
      // Get actual wS balance
      const balance = await publicClient.readContract({
        address: WS_TOKEN_ADDRESS as Hex,
        abi: WS_TOKEN_ABI,
        functionName: "balanceOf",
        args: [address as Hex],
      }) as bigint;
      
      // Format the balance to user-friendly string
      const humanReadableBalance = parseFloat(formatUnits(balance, 18)).toFixed(2);
      
      // Check if user has enough wS
      if (balance < amountInWei) {
        return `❌ Insufficient balance. You have ${humanReadableBalance} wS but trying to unwrap ${humanReadableAmount} wS.`;
      }

      // Withdraw wS to receive S
      const tx = await walletProvider.sendTransaction({
        to: WS_TOKEN_ADDRESS as Hex,
        data: encodeFunctionData({
          abi: WS_TOKEN_ABI,
          functionName: "withdraw",
          args: [amountInWei],
        }),
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `🔄 Successfully unwrapped ${humanReadableAmount} wS back to S tokens\n\n📝 Transaction: ${this.getSonicScanLink(tx)}`;
    } catch (error) {
      if (error instanceof SWrapperError) {
        return `❌ Error: ${error.message}`;
      }
      if (error instanceof Error) {
        return `❌ Transaction failed: ${error.message}`;
      }
      return `❌ Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "transfer-ws",
    description: `
This tool will transfer wS tokens to another address.
It takes:
- to: The destination address that will receive the wS tokens
- amount: The amount of wS tokens to transfer (in wei)

Example: To transfer 0.01 wS, use amount: "10000000000000000"
`,
    schema: TransferWSSchema,
  })
  async transferWS(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof TransferWSSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);
      await this.checkWSBalance(walletProvider, args.amount);

      const tx = await walletProvider.sendTransaction({
        to: WS_TOKEN_ADDRESS as Hex,
        data: encodeFunctionData({
          abi: WS_TOKEN_ABI,
          functionName: "transfer",
          args: [args.to as Hex, BigInt(args.amount)],
        }),
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `💸 Successfully transferred ${args.amount} wS to ${args.to}\n\n📝 Transaction: ${this.getSonicScanLink(tx)}`;
    } catch (error) {
      if (error instanceof SWrapperError) {
        return `❌ Error: ${error.message}`;
      }
      if (error instanceof Error) {
        return `❌ Transaction failed: ${error.message}`;
      }
      return `❌ Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "approve-ws",
    description: `
This tool will approve another address to spend your wS tokens.
It takes:
- spender: The address to approve for spending wS tokens
- amount: The amount of wS tokens to approve (in wei)

Example: To approve 1 wS, use amount: "1000000000000000000"
`,
    schema: ApproveWSSchema,
  })
  async approveWS(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveWSSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);

      const tx = await walletProvider.sendTransaction({
        to: WS_TOKEN_ADDRESS as Hex,
        data: encodeFunctionData({
          abi: WS_TOKEN_ABI,
          functionName: "approve",
          args: [args.spender as Hex, BigInt(args.amount)],
        }),
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `✅ Successfully approved ${args.spender} to spend ${args.amount} wS\n\n📝 Transaction: ${this.getSonicScanLink(tx)}`;
    } catch (error) {
      if (error instanceof SWrapperError) {
        return `❌ Error: ${error.message}`;
      }
      if (error instanceof Error) {
        return `❌ Transaction failed: ${error.message}`;
      }
      return `❌ Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "get-ws-balance",
    description: `
This tool will check the wS token balance of an address.
It takes:
- address: The address to check the balance for

Returns the balance in wei.
`,
    schema: GetBalanceSchema,
  })
  async getWSBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetBalanceSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);

      // Validate the input address
      if (!isAddress(args.address)) {
        throw new SWrapperError("Invalid address provided");
      }

      const publicClient = await this.getPublicClientForNetwork(walletProvider);
      const balance = await publicClient.readContract({
        address: WS_TOKEN_ADDRESS as Hex,
        abi: WS_TOKEN_ABI,
        functionName: "balanceOf",
        args: [args.address as Hex],
      }) as bigint;

      const formattedBalance = formatUnits(balance, 18);
      const usdValue = Number(formattedBalance) * 0.57; // estimated wS price
      return `🌀 wS Balance for ${args.address}: ${formattedBalance} wS ($${usdValue.toFixed(2)})\n`;
    } catch (error) {
      if (error instanceof SWrapperError) {
        return `❌ Error: ${error.message}`;
      }
      if (error instanceof Error) {
        return `❌ Error getting balance: ${error.message}`;
      }
      return `❌ Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "get-s-balance",
    description: `
This tool will check the native S token balance of an address.
It takes:
- address: The address to check the balance for

Returns the balance in wei.
`,
    schema: GetBalanceSchema,
  })
  async getSBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetBalanceSchema>,
  ): Promise<string> {
    try {
      await this.checkNetwork(walletProvider);

      // Validate the input address
      if (!isAddress(args.address)) {
        throw new SWrapperError("Invalid address provided");
      }

      // Use the custom method to get public client
      const publicClient = await this.getPublicClientForNetwork(walletProvider);
      const balance = await publicClient.getBalance({ 
        address: args.address as Hex 
      });

      const formattedBalance = formatUnits(balance, 18);
      const usdValue = Number(formattedBalance) * 0.57; // estimated S price
      return `🪙 S Balance for ${args.address}: ${formattedBalance} S ($${usdValue.toFixed(2)})\n`;
    } catch (error) {
      if (error instanceof SWrapperError) {
        return `❌ Error: ${error.message}`;
      }
      if (error instanceof Error) {
        return `❌ Error getting balance: ${error.message}`;
      }
      return `❌ Unknown error occurred: ${error}`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const sWrapperActionProvider = () => new SWrapperActionProvider();