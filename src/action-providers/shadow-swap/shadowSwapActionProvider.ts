import { ActionProvider, CreateAction, Network, EvmWalletProvider } from "@coinbase/agentkit";
import { 
  formatEther, 
  formatUnits, 
  parseEther, 
  parseUnits, 
  encodeFunctionData, 
  createPublicClient, 
  http,
  type Address
} from "viem";
import { sonic } from 'viem/chains';
import { z } from "zod";
import {
  UNIVERSAL_ROUTER_ADDRESS,
  USDC_E_TOKEN_ADDRESS,
  WS_TOKEN_ADDRESS,
  ERC20_APPROVAL_ABI,
  UNIVERSAL_ROUTER_ABI,
  DEFAULT_SLIPPAGE_TOLERANCE,
  DEFAULT_DEADLINE_SECONDS,
  SWAP_COMMAND,
  SWAP_USDC_E_TO_WS_PATH,
  SWAP_WS_TO_USDC_E_PATH,
  USDC_E_TO_WS_RATE,
  WS_TO_USDC_E_RATE
} from "./constants";
import {
  InsufficientAllowanceError,
  InsufficientBalanceError,
  SwapExecutionError
} from "./errors";
import {
  ApproveTokenSchema,
  CheckAllowanceSchema,
  SwapUsdcEToWsSchema,
  SwapWsToUsdcESchema
} from "./schemas";
import { estimateGasParameters, estimateContractGas } from "../../utils/gas-utils";

// Helper function to add a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ERC20 ABI for balance and allowance checking
const ERC20_READ_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view"
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view"
  }
] as const;

/**
 * Action provider for swapping tokens on Shadow Exchange
 * Supports swapping USDC.e to wS and wS to USDC.e
 */
export class ShadowSwapActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("shadow-swap", []);
  }

  /**
   * Get a Viem public client for the Sonic network
   */
  private getPublicClient() {
    return createPublicClient({
      chain: sonic,
      transport: http()
    });
  }

  /**
   * Swap USDC.e to wS using Shadow Exchange
   * @param walletProvider - EVM wallet provider
   * @param args - Swap arguments including amount and slippage tolerance
   * @returns Transaction hash and summary
   */
  @CreateAction({
    name: "swap-usdc-e-to-ws",
    description: "Swap USDC.e to wS on Shadow Exchange",
    schema: SwapUsdcEToWsSchema,
  })
  async swapUsdcEToWs(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapUsdcEToWsSchema>
  ): Promise<string> {
    const { amount, slippageTolerancePercent = DEFAULT_SLIPPAGE_TOLERANCE } = args;
    
    // Convert amount to smallest unit (6 decimals for USDC.e)
    const amountInSmallestUnit = parseUnits(amount, 6);
    
    // Check balance
    const balance = await this.checkUsdcEBalance(walletProvider);
    const balanceInSmallestUnit = parseUnits(balance, 6);
    
    if (balanceInSmallestUnit < amountInSmallestUnit) {
      throw new InsufficientBalanceError(
        balance,
        amount,
        "USDC.e"
      );
    }
    
    // Check and handle allowance
    await this.ensureUsdcEAllowance(walletProvider, amount);
    
    // Calculate deadline (30 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS;
    
    // Execute the swap
    try {
      // The data structure for the swap is based on the transaction data provided
      const commands = "0x00"; // The command for a swap
      const inputs = [
        // This input format is based on the provided transaction data
        this.encodeSwapUsdcEToWsInput(amount, slippageTolerancePercent)
      ];
      
      const data = encodeFunctionData({
        abi: UNIVERSAL_ROUTER_ABI,
        functionName: "execute",
        args: [commands, inputs, BigInt(deadline)]
      });
      
      // Estimate gas parameters for this transaction
      const gasParams = await estimateGasParameters(
        UNIVERSAL_ROUTER_ADDRESS as Address, 
        data, 
        BigInt(0)
      );
      
      const hash = await walletProvider.sendTransaction({
        to: UNIVERSAL_ROUTER_ADDRESS,
        data,
        value: BigInt(0),
        ...gasParams // Add gas parameters
      });
      
      // Wait for the transaction to be mined
      await sleep(2000);
      
      return `Successfully swapped ${amount} USDC.e to wS. Transaction hash: ${hash}`;
    } catch (error: any) {
      console.error("Error swapping USDC.e to wS:", error);
      throw new SwapExecutionError(error.message || "Unknown error occurred during swap");
    }
  }
  
  /**
   * Swap wS to USDC.e using Shadow Exchange
   * @param walletProvider - EVM wallet provider
   * @param args - Swap arguments including amount and slippage tolerance
   * @returns Transaction hash and summary
   */
  @CreateAction({
    name: "swap-ws-to-usdc-e",
    description: "Swap wS to USDC.e on Shadow Exchange",
    schema: SwapWsToUsdcESchema,
  })
  async swapWsToUsdcE(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapWsToUsdcESchema>
  ): Promise<string> {
    const { amount, slippageTolerancePercent = DEFAULT_SLIPPAGE_TOLERANCE } = args;
    
    // Convert amount to smallest unit (18 decimals for wS)
    const amountInSmallestUnit = parseEther(amount);
    
    // Check balance
    const balance = await this.checkWsBalance(walletProvider);
    const balanceInSmallestUnit = parseEther(balance);
    
    if (balanceInSmallestUnit < amountInSmallestUnit) {
      throw new InsufficientBalanceError(
        balance,
        amount,
        "wS"
      );
    }
    
    // Check and handle allowance
    await this.ensureWsAllowance(walletProvider, amount);
    
    // Calculate deadline (30 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS;
    
    // Execute the swap
    try {
      // The data structure for the swap is based on the transaction data provided
      const commands = "0x00"; // The command for a swap
      const inputs = [
        // This input format is based on the provided transaction data
        this.encodeSwapWsToUsdcEInput(amount, slippageTolerancePercent)
      ];
      
      const data = encodeFunctionData({
        abi: UNIVERSAL_ROUTER_ABI,
        functionName: "execute",
        args: [commands, inputs, BigInt(deadline)]
      });
      
      // Estimate gas parameters for this transaction
      const gasParams = await estimateGasParameters(
        UNIVERSAL_ROUTER_ADDRESS as Address, 
        data, 
        BigInt(0)
      );
      
      const hash = await walletProvider.sendTransaction({
        to: UNIVERSAL_ROUTER_ADDRESS,
        data,
        value: BigInt(0),
        ...gasParams // Add gas parameters
      });
      
      // Wait for the transaction to be mined
      await sleep(2000);
      
      return `Successfully swapped ${amount} wS to USDC.e. Transaction hash: ${hash}`;
    } catch (error: any) {
      console.error("Error swapping wS to USDC.e:", error);
      throw new SwapExecutionError(error.message || "Unknown error occurred during swap");
    }
  }
  
  /**
   * Approve token spending for the Universal Router
   * @param walletProvider - EVM wallet provider
   * @param args - Token approval arguments
   * @returns Transaction hash and summary
   */
  @CreateAction({
    name: "approve-token-for-shadow-swap",
    description: "Approve token spending for the Shadow Exchange",
    schema: ApproveTokenSchema,
  })
  async approveToken(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveTokenSchema>
  ): Promise<string> {
    const { token, amount } = args;
    
    try {
      if (token === "USDC.e") {
        const amountInSmallestUnit = parseUnits(amount, 6);
        const tokenAddress = USDC_E_TOKEN_ADDRESS;
        
        const data = encodeFunctionData({
          abi: ERC20_APPROVAL_ABI,
          functionName: "approve",
          args: [UNIVERSAL_ROUTER_ADDRESS, amountInSmallestUnit]
        });
        
        // Estimate gas parameters
        const gasParams = await estimateGasParameters(
          tokenAddress as Address, 
          data, 
          BigInt(0)
        );
        
        const hash = await walletProvider.sendTransaction({
          to: tokenAddress,
          data,
          value: BigInt(0),
          ...gasParams // Add gas parameters
        });
        
        return `Successfully approved ${amount} USDC.e for Shadow Exchange. Transaction hash: ${hash}`;
      } else if (token === "wS") {
        const amountInSmallestUnit = parseEther(amount);
        const tokenAddress = WS_TOKEN_ADDRESS;
        
        const data = encodeFunctionData({
          abi: ERC20_APPROVAL_ABI,
          functionName: "approve",
          args: [UNIVERSAL_ROUTER_ADDRESS, amountInSmallestUnit]
        });
        
        // Estimate gas parameters
        const gasParams = await estimateGasParameters(
          tokenAddress as Address, 
          data, 
          BigInt(0)
        );
        
        const hash = await walletProvider.sendTransaction({
          to: tokenAddress,
          data,
          value: BigInt(0),
          ...gasParams // Add gas parameters
        });
        
        return `Successfully approved ${amount} wS for Shadow Exchange. Transaction hash: ${hash}`;
      } else {
        throw new Error(`Unsupported token: ${token}`);
      }
    } catch (error: any) {
      console.error(`Error approving ${token}:`, error);
      throw new Error(`Failed to approve ${token}: ${error.message || "Unknown error"}`);
    }
  }
  
  /**
   * Check USDC.e balance
   * @param walletProvider - EVM wallet provider
   * @returns USDC.e balance as string
   */
  async checkUsdcEBalance(walletProvider: EvmWalletProvider): Promise<string> {
    const publicClient = this.getPublicClient();
    const userAddress = await walletProvider.getAddress();
    
    const balance = await publicClient.readContract({
      address: USDC_E_TOKEN_ADDRESS as Address,
      abi: ERC20_READ_ABI,
      functionName: "balanceOf",
      args: [userAddress as Address]
    });
    
    return formatUnits(balance, 6);
  }
  
  /**
   * Check wS balance
   * @param walletProvider - EVM wallet provider
   * @returns wS balance as string
   */
  async checkWsBalance(walletProvider: EvmWalletProvider): Promise<string> {
    const publicClient = this.getPublicClient();
    const userAddress = await walletProvider.getAddress();
    
    const balance = await publicClient.readContract({
      address: WS_TOKEN_ADDRESS as Address,
      abi: ERC20_READ_ABI,
      functionName: "balanceOf",
      args: [userAddress as Address]
    });
    
    return formatEther(balance);
  }
  
  /**
   * Check USDC.e allowance for the Universal Router
   * @param walletProvider - EVM wallet provider
   * @returns Allowance as string
   */
  async checkUsdcEAllowance(walletProvider: EvmWalletProvider): Promise<string> {
    const publicClient = this.getPublicClient();
    const userAddress = await walletProvider.getAddress();
    
    const allowance = await publicClient.readContract({
      address: USDC_E_TOKEN_ADDRESS as Address,
      abi: ERC20_READ_ABI,
      functionName: "allowance",
      args: [userAddress as Address, UNIVERSAL_ROUTER_ADDRESS as Address]
    });
    
    return formatUnits(allowance, 6);
  }
  
  /**
   * Check wS allowance for the Universal Router
   * @param walletProvider - EVM wallet provider
   * @returns Allowance as string
   */
  async checkWsAllowance(walletProvider: EvmWalletProvider): Promise<string> {
    const publicClient = this.getPublicClient();
    const userAddress = await walletProvider.getAddress();
    
    const allowance = await publicClient.readContract({
      address: WS_TOKEN_ADDRESS as Address,
      abi: ERC20_READ_ABI,
      functionName: "allowance",
      args: [userAddress as Address, UNIVERSAL_ROUTER_ADDRESS as Address]
    });
    
    return formatEther(allowance);
  }
  
  /**
   * Ensure USDC.e has sufficient allowance for the swap
   * @param walletProvider - EVM wallet provider
   * @param amount - Amount to approve
   */
  async ensureUsdcEAllowance(walletProvider: EvmWalletProvider, amount: string): Promise<void> {
    const currentAllowance = await this.checkUsdcEAllowance(walletProvider);
    const requiredAmount = amount;
    
    if (parseUnits(currentAllowance, 6) < parseUnits(requiredAmount, 6)) {
      await this.approveToken(walletProvider, { token: "USDC.e", amount });
      // Wait for the approval transaction to be processed
      await sleep(2000);
    }
  }
  
  /**
   * Ensure wS has sufficient allowance for the swap
   * @param walletProvider - EVM wallet provider
   * @param amount - Amount to approve
   */
  async ensureWsAllowance(walletProvider: EvmWalletProvider, amount: string): Promise<void> {
    const currentAllowance = await this.checkWsAllowance(walletProvider);
    const requiredAmount = amount;
    
    if (parseEther(currentAllowance) < parseEther(requiredAmount)) {
      await this.approveToken(walletProvider, { token: "wS", amount });
      // Wait for the approval transaction to be processed
      await sleep(2000);
    }
  }
  
  /**
   * Encode the input data for USDC.e to wS swap
   * Based on the provided transaction data
   * @param amount - Amount to swap
   * @param slippageTolerancePercent - Slippage tolerance percentage
   * @returns Encoded input data
   */
  private encodeSwapUsdcEToWsInput(amount: string, slippageTolerancePercent: number): string {
    // Convert amount to smallest unit (6 decimals for USDC.e)
    const amountInSmallestUnit = parseUnits(amount, 6);
    
    // Calculate minimum amount out with slippage
    const estimatedOutputWs = parseEther((Number(amount) * USDC_E_TO_WS_RATE).toString());
    const minAmountOut = estimatedOutputWs * BigInt(Math.floor((100 - slippageTolerancePercent) * 100)) / BigInt(10000);
    
    // Convert BigInts to hex strings properly with leading 0x removed and padded
    const amountHex = amountInSmallestUnit.toString(16).padStart(64, '0');
    const minAmountOutHex = minAmountOut.toString(16).padStart(64, '0');
    
    // Format similar to the provided transaction data
    return `0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000${amountHex}00000000000000000000000000000000000000000000000000000000${minAmountOutHex}00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b${SWAP_USDC_E_TO_WS_PATH}`;
  }
  
  /**
   * Encode the input data for wS to USDC.e swap
   * Based on the provided transaction data
   * @param amount - Amount to swap
   * @param slippageTolerancePercent - Slippage tolerance percentage
   * @returns Encoded input data
   */
  private encodeSwapWsToUsdcEInput(amount: string, slippageTolerancePercent: number): string {
    // Convert amount to smallest unit (18 decimals for wS)
    const amountInSmallestUnit = parseEther(amount);
    
    // Calculate minimum amount out with slippage
    const estimatedOutputUsdcE = parseUnits((Number(amount) * WS_TO_USDC_E_RATE).toString(), 6);
    const minAmountOut = estimatedOutputUsdcE * BigInt(Math.floor((100 - slippageTolerancePercent) * 100)) / BigInt(10000);
    
    // Convert BigInts to hex strings properly with leading 0x removed and padded
    const amountHex = amountInSmallestUnit.toString(16).padStart(64, '0');
    const minAmountOutHex = minAmountOut.toString(16).padStart(64, '0');
    
    const swapPathLength = (SWAP_WS_TO_USDC_E_PATH.length / 2).toString(16).padStart(2, '0');
    
    // Format similar to the provided transaction data
    return `00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000${amountHex}00000000000000000000000000000000000000000000000000000000${minAmountOutHex}00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000${swapPathLength}${SWAP_WS_TO_USDC_E_PATH}`;
  }
  
  /**
   * Check if this action provider supports the given network
   * @param network - Network to check
   * @returns Whether the network is supported
   */
  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const shadowSwapActionProvider = () => new ShadowSwapActionProvider();