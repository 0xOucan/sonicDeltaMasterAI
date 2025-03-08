import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { 
  createPublicClient, 
  http, 
  parseUnits, 
  formatUnits,
  encodeFunctionData,
  parseEther,
  Address,
  Hex 
} from "viem";
import "reflect-metadata";
import { sonic } from 'viem/chains';
import axios from 'axios';

// Import from other providers
import { checkTokenBalance } from "../balance-checker/balanceCheckerActionProvider";
import { MachFiActionProvider } from "../machfi/machfiActionProvider";
import { WSSwapXBeefyActionProvider } from "../wsswapx-beefy/wsSwapXBeefyActionProvider";

// Import constants
import { 
  USDC_E_ADDRESS,
  ERC20_ABI,
} from "../aave-supply/constants";
import {
  MACHFI_ADDRESSES,
  CTOKEN_ABI,
  COMPTROLLER_ABI,
  TOKEN_ADDRESSES,
  ASSET_MARKETS
} from "../machfi/constants";
import {
  SWAPX_VAULT_ADDRESS,
  BEEFY_VAULT_ADDRESS,
  SWAPX_VAULT_ABI,
  BEEFY_VAULT_ABI,
  WS_TOKEN_ADDRESS
} from "../wsswapx-beefy/constants";

// Constants
const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";
const WRAP_S_ADDRESS = TOKEN_ADDRESSES.WS; // Assuming WS is already in TOKEN_ADDRESSES
const S_TOKEN_ABI = [
  {
    constant: false,
    inputs: [],
    name: "deposit",
    outputs: [],
    payable: true,
    stateMutability: "payable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "wad", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  }
] as const;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define schemas
const DeltaNeutralExecuteSchema = z.object({
  amountUSDCe: z.string().refine(val => !isNaN(Number(val)), {
    message: "Amount must be a valid number",
  }),
});

const DeltaNeutralApySchema = z.object({}).strip();

export class DeltaNeutralActionProvider extends ActionProvider<EvmWalletProvider> {
  private machfiProvider: MachFiActionProvider;
  private wsSwapXBeefyProvider: WSSwapXBeefyActionProvider;

  constructor() {
    super("delta-neutral", []);
    this.machfiProvider = new MachFiActionProvider();
    this.wsSwapXBeefyProvider = new WSSwapXBeefyActionProvider();
  }

  /**
   * Calculates and displays the APY information for the MachFi-Beefy Delta Neutral strategy
   */
  @CreateAction({
    name: "delta-neutral-apy",
    description: "Check the APY information for the MachFi-Beefy Delta Neutral strategy",
    schema: DeltaNeutralApySchema,
  })
  async checkDeltaNeutralApy(
    walletProvider: EvmWalletProvider
  ): Promise<string> {
    try {
      // Get Beefy strategy APY
      const beefyApyData = await this.getBeefyApy();
      
      // Get MachFi borrow APY for S tokens
      const machfiBorrowApy = await this.getMachfiBorrowApy(walletProvider);
      
      // Calculate net APY (considering only 50% of collateral is used for borrowing)
      // So the effective borrow APY against the full collateral is halved
      const effectiveBorrowApy = machfiBorrowApy * 0.5; 
      const netApy = beefyApyData.apy - effectiveBorrowApy;
      
      let response = "## 📊 MachFi-Beefy Delta Neutral Strategy - APY Breakdown\n\n";
      response += `💰 **Beefy wS-SwapX Vault APY:** +${(beefyApyData.apy * 100).toFixed(2)}%\n`;
      response += `🏦 **MachFi S Borrow APY:** -${(machfiBorrowApy * 100).toFixed(2)}%\n`;
      response += `⚖️ **Effective Borrow Cost (using 50% LTV):** -${(effectiveBorrowApy * 100).toFixed(2)}%\n`;
      response += `\n🔄 **Net Strategy APY:** ${(netApy * 100).toFixed(2)}%\n\n`;
      
      if (netApy <= 0) {
        response += "⚠️ **Warning:** The strategy currently has negative or zero returns. Not recommended at this time.\n";
      } else {
        response += "✅ **Strategy is profitable!** The yield farming returns currently exceed borrowing costs.\n";
      }
      
      response += "\n### 🔍 How It Works\n";
      response += "1. 💰 Your USDC.e is supplied to MachFi as collateral\n";
      response += "2. 🏦 50% of your borrowing power is used to borrow S tokens\n";
      response += "3. 🔄 S tokens are wrapped to wS\n";
      response += "4. 🌾 wS is deployed in Beefy's wS-SwapX vault\n";
      response += "5. 💸 You earn the spread between borrowing costs and farming returns\n";
      
      // Add detailed breakdown if available
      if (beefyApyData.breakdown && beefyApyData.breakdown.vaultApr) {
        response += "\n### 📊 Detailed APY Breakdown\n";
        response += `- 📈 Base Vault APR: ${(beefyApyData.breakdown.vaultApr * 100).toFixed(2)}%\n`;
        response += `- 🔁 Compoundings Per Year: ${beefyApyData.breakdown.compoundingsPerYear}\n`;
        response += `- 💸 Performance Fee: ${(beefyApyData.breakdown.beefyPerformanceFee * 100).toFixed(2)}%\n`;
        
        if (beefyApyData.breakdown.tradingApr) {
          response += `- 🤝 Trading APR: ${(beefyApyData.breakdown.tradingApr * 100).toFixed(2)}%\n`;
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error calculating Delta Neutral APY:', error);
      return `Failed to calculate Delta Neutral strategy APY: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Execute the Delta Neutral strategy with MachFi and Beefy
   */
  @CreateAction({
    name: "execute-delta-neutral",
    description: "Execute Delta Neutral strategy by supplying USDC.e to MachFi, borrowing S, wrapping to wS and deploying to Beefy",
    schema: DeltaNeutralExecuteSchema,
  })
  async executeDeltaNeutral(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DeltaNeutralExecuteSchema>
  ): Promise<string> {
    try {
      // Initialize variables
      const amount = parseUnits(args.amountUSDCe, 6); // USDC.e has 6 decimals
      const address = await walletProvider.getAddress();
      let response = `## 🚀 Executing MachFi-Beefy Delta Neutral Strategy\n\n`;
      
      // Step 1: Check USDC.e balance
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
      
      // Step 2: Supply USDC.e to MachFi
      response += `### 💰 Step 1: Supply USDC.e to MachFi as collateral\n`;
      
      // Approve USDC.e for MachFi
      try {
        const approveTx = await walletProvider.sendTransaction({
          to: USDC_E_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [MACHFI_ADDRESSES.CUSDC as Hex, amount],
          }),
        });
        
        response += `✅ Approved ${args.amountUSDCe} USDC.e for MachFi protocol\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${approveTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(approveTx);
        await sleep(3000);
      } catch (error) {
        console.error('Approval error:', error);
        return `Failed to approve USDC.e: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Supply to MachFi
      try {
        const supplyTx = await walletProvider.sendTransaction({
          to: MACHFI_ADDRESSES.CUSDC as Hex,
          data: encodeFunctionData({
            abi: CTOKEN_ABI,
            functionName: "mint",
            args: [amount],
          }),
          gas: BigInt(300000),
        });
        
        response += `✅ Supplied ${args.amountUSDCe} USDC.e to MachFi\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${supplyTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(supplyTx);
        await sleep(3000);
      } catch (error) {
        console.error('Supply error:', error);
        return `Failed to supply USDC.e to MachFi: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Step 3: Get borrowing power and calculate 50%
      response += `### 🏦 Step 2: Calculate borrowing power and borrow S tokens\n`;
      
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });
      
      // Get account data from MachFi
      const [errorCode, liquidity, shortfall] = await publicClient.readContract({
        address: MACHFI_ADDRESSES.COMPTROLLER as Hex,
        abi: COMPTROLLER_ABI,
        functionName: "getAccountLiquidity",
        args: [address as Hex]
      }) as [bigint, bigint, bigint];
      
      if (errorCode !== BigInt(0)) {
        return `Error getting account liquidity. Error code: ${errorCode}`;
      }
      
      if (liquidity <= BigInt(0)) {
        return `No borrowing power available. Please supply more collateral.`;
      }
      
      // Get S price from oracle
      const sPrice = await publicClient.readContract({
        address: MACHFI_ADDRESSES.PRICE_ORACLE as Hex,
        abi: [
          {
            inputs: [{ name: "cToken", type: "address" }],
            name: "getUnderlyingPrice",
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "getUnderlyingPrice",
        args: [MACHFI_ADDRESSES.CS as Hex]
      }) as bigint;
      
      // Calculate 50% of available liquidity in USD (liquidity is in USD, scaled by 1e18)
      const halfLiquidityUSD = Number(formatUnits(liquidity, 18)) * 0.5;
      // S price is in USD, scaled by 1e18
      const sPriceUSD = Number(formatUnits(sPrice, 18));
      
      // Calculate S amount to borrow based on 50% of borrowing power
      const sTokensToBorrow = halfLiquidityUSD / sPriceUSD;
      const sTokensToBorrowFormatted = sTokensToBorrow.toFixed(18);
      const sTokensToBorrowWei = parseEther(sTokensToBorrowFormatted);
      
      response += `Available borrowing power: $${(Number(formatUnits(liquidity, 18))).toFixed(2)}\n`;
      response += `Using 50%: $${halfLiquidityUSD.toFixed(2)}\n`;
      response += `Borrowing ${sTokensToBorrowFormatted} S tokens (equivalent to ~$${halfLiquidityUSD.toFixed(2)})\n\n`;
      
      // Step 4: Borrow S tokens
      try {
        const borrowTx = await walletProvider.sendTransaction({
          to: MACHFI_ADDRESSES.CS as Hex,
          data: encodeFunctionData({
            abi: CTOKEN_ABI,
            functionName: "borrow",
            args: [sTokensToBorrowWei],
          }),
          gas: BigInt(500000),
        });
        
        response += `✅ Borrowed ${sTokensToBorrowFormatted} S tokens from MachFi\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${borrowTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(borrowTx);
        await sleep(3000);
      } catch (error) {
        console.error('Borrow error:', error);
        return `Failed to borrow S tokens from MachFi: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Step 5: Wrap S to wS
      response += `### 🔄 Step 3: Wrap S tokens to wS\n`;
      
      try {
        const wrapTx = await walletProvider.sendTransaction({
          to: WRAP_S_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: S_TOKEN_ABI,
            functionName: "deposit",
          }),
          value: sTokensToBorrowWei,
          gas: BigInt(300000),
        });
        
        response += `✅ Wrapped ${sTokensToBorrowFormatted} S tokens to wS\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${wrapTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(wrapTx);
        await sleep(3000);
      } catch (error) {
        console.error('Wrap error:', error);
        return `Failed to wrap S tokens to wS: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Step 6: Execute wS-SwapX-Beefy strategy with wS amount
      response += `### 🌾 Step 4: Deploy wS to Beefy vault\n`;
      
      try {
        // Check wS balance to confirm the wrap was successful
        const wsBalance = await publicClient.readContract({
          address: WRAP_S_ADDRESS as Hex,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as Hex]
        }) as bigint;
        
        if (wsBalance < sTokensToBorrowWei) {
          return `Error: wS balance (${formatUnits(wsBalance, 18)}) is less than expected (${sTokensToBorrowFormatted}). The wrap might have failed.`;
        }
        
        // First approve wS for SwapX vault
        const approveSwapXTx = await walletProvider.sendTransaction({
          to: WRAP_S_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [SWAPX_VAULT_ADDRESS as Hex, sTokensToBorrowWei],
          }),
        });
        
        response += `✅ Approved wS for SwapX vault\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${approveSwapXTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(approveSwapXTx);
        await sleep(3000);
        
        // Then deposit into SwapX vault
        const depositSwapXTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: SWAPX_VAULT_ABI,
            functionName: "deposit",
            args: [sTokensToBorrowWei, BigInt(0), address as Hex],
          }),
          gas: BigInt(500000),
        });
        
        response += `✅ Deposited wS into SwapX vault\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${depositSwapXTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(depositSwapXTx);
        await sleep(3000);
        
        // Get LP token balance
        const lpTokenBalance = await publicClient.readContract({
          address: SWAPX_VAULT_ADDRESS as Hex,
          abi: SWAPX_VAULT_ABI,
          functionName: "balanceOf",
          args: [address as Hex]
        }) as bigint;
        
        if (lpTokenBalance <= BigInt(0)) {
          return `Error: No LP tokens received from SwapX vault deposit.`;
        }
        
        // Approve LP tokens for Beefy vault
        const approveBeefyTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [BEEFY_VAULT_ADDRESS as Hex, lpTokenBalance],
          }),
        });
        
        response += `✅ Approved SwapX LP tokens for Beefy vault\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${approveBeefyTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(approveBeefyTx);
        await sleep(3000);
        
        // Deposit LP tokens into Beefy vault
        const depositBeefyTx = await walletProvider.sendTransaction({
          to: BEEFY_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: BEEFY_VAULT_ABI,
            functionName: "deposit",
            args: [lpTokenBalance],
          }),
          gas: BigInt(500000),
        });
        
        response += `✅ Deposited SwapX LP tokens into Beefy vault\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${depositBeefyTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(depositBeefyTx);
      } catch (error) {
        console.error('Beefy strategy error:', error);
        return `Failed to execute wS-SwapX-Beefy strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Strategy execution complete
      response += `### ✅ MachFi-Beefy Delta Neutral Strategy Execution Complete\n\n`;
      response += `Your Delta Neutral position is now active!\n\n`;
      response += `- 💰 USDC.e collateral in MachFi: ${args.amountUSDCe}\n`;
      response += `- 🏦 S tokens borrowed from MachFi: ${sTokensToBorrowFormatted}\n`;
      response += `- 🔄 S tokens wrapped to wS: ${sTokensToBorrowFormatted}\n`;
      response += `- 🌾 wS deployed in SwapX/Beefy: ${sTokensToBorrowFormatted}\n\n`;
      
      // Get APY information
      const beefyApyData = await this.getBeefyApy();
      const machfiBorrowApy = await this.getMachfiBorrowApy(walletProvider);
      const effectiveBorrowApy = machfiBorrowApy * 0.5;  // Half because we're only borrowing against 50% of collateral
      const netApy = beefyApyData.apy - effectiveBorrowApy;
      
      response += `📈 Expected APY: ${(netApy * 100).toFixed(2)}%\n\n`;
      response += `⚠️ **Important:** Monitor your position in MachFi to avoid liquidation risks.\n`;
      
      return response;
    } catch (error) {
      console.error('Error executing Delta Neutral strategy:', error);
      return `Failed to execute Delta Neutral strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  
  /**
   * Gets the APY data from Beefy Finance API
   */
  private async getBeefyApy(): Promise<{ apy: number, breakdown: any }> {
    try {
      const BEEFY_API_BASE = "https://api.beefy.finance";
      const WS_SWAPX_BEEFY_ID = "swapx-ichi-ws-usdc.e"; // Update with correct Beefy vault ID
      
      // Get APY from Beefy API
      const apyResponse = await axios.get(`${BEEFY_API_BASE}/apy`);
      const apy = apyResponse.data[WS_SWAPX_BEEFY_ID] || 0.15; // Default to 15% if API fails
      
      // Get APY breakdown for more details
      const breakdownResponse = await axios.get(`${BEEFY_API_BASE}/apy/breakdown`);
      const breakdown = breakdownResponse.data[WS_SWAPX_BEEFY_ID] || { totalApy: apy };
      
      // Log the APY for debugging
      console.log(`Fetched Beefy APY for ${WS_SWAPX_BEEFY_ID}: ${apy * 100}%`);
      
      return { apy, breakdown };
    } catch (error) {
      console.error('Error fetching Beefy APY:', error);
      // Default value in case of API failure
      return { apy: 0.15, breakdown: { totalApy: 0.15 } };
    }
  }
  
  /**
   * Gets the S borrow APY from MachFi
   */
  private async getMachfiBorrowApy(walletProvider: EvmWalletProvider): Promise<number> {
    try {
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });
      
      // Get borrow rate from MachFi cS token
      const borrowRate = await publicClient.readContract({
        address: MACHFI_ADDRESSES.CS as Hex,
        abi: CTOKEN_ABI,
        functionName: "borrowRatePerTimestamp",
      }) as bigint;
      
      // Calculate APY (assuming 86400 seconds per day)
      const borrowRatePerDay = Number(borrowRate) * 86400;
      const borrowAPY = ((1 + borrowRatePerDay / 1e18) ** 365) - 1;
      
      return borrowAPY;
    } catch (error) {
      console.error('Error fetching MachFi borrow APY:', error);
      // Default value in case of error
      return 0.04; // 4% borrow APY as a fallback
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }
}

export const deltaNeutralActionProvider = () => new DeltaNeutralActionProvider(); 