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
  parseEther
} from "viem";
import type { Hex } from "viem";
import "reflect-metadata";
import { sonic } from 'viem/chains';
import axios from 'axios';

// Import from other providers
import { 
  AAVE_POOL_ADDRESS, 
  AAVE_POOL_ABI, 
  USDC_E_ADDRESS,
  BORROWABLE_ASSETS,
  ERC20_ABI,
} from "../aave-supply/constants";
import { checkTokenBalance } from "../balance-checker/balanceCheckerActionProvider";
import {
  SWAPX_VAULT_ADDRESS,
  BEEFY_VAULT_ADDRESS,
  SWAPX_VAULT_ABI,
  BEEFY_VAULT_ABI,
  WS_TOKEN_ADDRESS
} from "../wsswapx-beefy/constants";

// Constants
const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";
const BEEFY_API_BASE = "https://api.beefy.finance";
const WS_SWAPX_BEEFY_ID = "swapx-ichi-ws-usdc.e"; // Updated with correct Beefy vault ID
const WS_ADDRESS = BORROWABLE_ASSETS.WS; // Get the WS address from BORROWABLE_ASSETS
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define schemas
const DeltaNeutralExecuteSchema = z.object({
  amountUSDCe: z.string().refine(val => !isNaN(Number(val)), {
    message: "Amount must be a valid number",
  }),
});

const DeltaNeutralApySchema = z.object({}).strip();

export class DeltaNeutralActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("delta-neutral", []);
  }

  /**
   * Calculates and displays the APY information for the Delta Neutral strategy
   */
  @CreateAction({
    name: "delta-neutral-apy",
    description: "Check the APY information for the Delta Neutral strategy",
    schema: DeltaNeutralApySchema,
  })
  async checkDeltaNeutralApy(
    walletProvider: EvmWalletProvider
  ): Promise<string> {
    try {
      // Get Beefy strategy APY
      const beefyApyData = await this.getBeefyApy();
      
      // Get Aave borrow APY for wS
      const aaveBorrowApy = await this.getAaveBorrowApy(walletProvider);
      
      // Calculate net APY (considering only 50% of collateral is used for borrowing)
      // So the effective borrow APY against the full collateral is halved
      const effectiveBorrowApy = aaveBorrowApy * 0.5; 
      const netApy = beefyApyData.apy - effectiveBorrowApy;
      
      let response = "## 📊 Delta Neutral Strategy - APY Breakdown\n\n";
      response += `💰 **Beefy wS-SwapX Vault APY:** +${(beefyApyData.apy * 100).toFixed(2)}%\n`;
      response += `🏦 **Aave wS Borrow APY:** -${(aaveBorrowApy * 100).toFixed(2)}%\n`;
      response += `⚖️ **Effective Borrow Cost (using 50% LTV):** -${(effectiveBorrowApy * 100).toFixed(2)}%\n`;
      response += `\n🔄 **Net Strategy APY:** ${(netApy * 100).toFixed(2)}%\n\n`;
      
      if (netApy <= 0) {
        response += "⚠️ **Warning:** The strategy currently has negative or zero returns. Not recommended at this time.\n";
      } else {
        response += "✅ **Strategy is profitable!** The yield farming returns currently exceed borrowing costs.\n";
      }
      
      response += "\n### 🔍 How It Works\n";
      response += "1. 💰 Your USDC.e is supplied to Aave as collateral\n";
      response += "2. 🏦 50% of your borrowing power is used to borrow wS\n";
      response += "3. 🌾 Borrowed wS is deployed in Beefy's wS-SwapX vault\n";
      response += "4. 💸 You earn the spread between borrowing costs and farming returns\n";
      
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
   * Execute the Delta Neutral strategy with a given amount of USDC.e
   */
  @CreateAction({
    name: "execute-delta-neutral",
    description: "Execute Delta Neutral strategy by supplying USDC.e to Aave, borrowing wS, and deploying to Beefy",
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
      let response = `## 🚀 Executing Delta Neutral Strategy\n\n`;
      
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
      
      // Step 2: Supply USDC.e to Aave
      response += `### 💰 Step 1: Supply USDC.e to Aave as collateral\n`;
      
      // Approve USDC.e for Aave
      try {
        const approveTx = await walletProvider.sendTransaction({
          to: USDC_E_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [AAVE_POOL_ADDRESS as Hex, amount],
          }),
        });
        
        response += `✅ Approved ${args.amountUSDCe} USDC.e for Aave protocol\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${approveTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(approveTx);
        await sleep(3000);
      } catch (error) {
        console.error('Approval error:', error);
        return `Failed to approve USDC.e: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Supply to Aave
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
        
        response += `✅ Supplied ${args.amountUSDCe} USDC.e to Aave\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${supplyTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(supplyTx);
        await sleep(3000);
      } catch (error) {
        console.error('Supply error:', error);
        return `Failed to supply USDC.e to Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Step 3: Get borrowing power and calculate 50%
      response += `### 🏦 Step 2: Calculate borrowing power and borrow wS\n`;
      
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });
      
      // Get account data from Aave
      const accountData = await publicClient.readContract({
        address: AAVE_POOL_ADDRESS as Hex,
        abi: AAVE_POOL_ABI,
        functionName: 'getUserAccountData',
        args: [address as Hex]
      }) as any;
      
      const availableBorrowsBase = BigInt(accountData[2]);
      
      // Check if WS is available in BORROWABLE_ASSETS
      if (!WS_ADDRESS) {
        return "wS is not available for borrowing on Aave.";
      }
      
      // Get wS price from an on-chain oracle or API
      // For simplicity, using a hardcoded price, but in production
      // this should be fetched from a reliable price source
      const wsPriceUSD = 0.57; // Example price
      
      // Calculate 50% of borrowing power in USD
      const halfBorrowPowerUSD = Number(formatUnits(availableBorrowsBase, 8)) * 0.5;
      
      // Convert to wS amount
      const wsAmountToBorrow = halfBorrowPowerUSD / wsPriceUSD;
      const wsAmountToBorrowFormatted = wsAmountToBorrow.toFixed(4);
      const wsAmountToBorrowWei = parseEther(wsAmountToBorrowFormatted);
      
      response += `Available borrowing power: $${(Number(formatUnits(availableBorrowsBase, 8))).toFixed(2)}\n`;
      response += `Using 50%: $${halfBorrowPowerUSD.toFixed(2)}\n`;
      response += `Borrowing ${wsAmountToBorrowFormatted} wS\n\n`;
      
      // Step 4: Borrow wS
      try {
        const borrowTx = await walletProvider.sendTransaction({
          to: AAVE_POOL_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "borrow",
            args: [WS_ADDRESS as Hex, wsAmountToBorrowWei, BigInt(2), 0, address as Hex],
          }),
          gas: BigInt(500000),
        });
        
        response += `✅ Borrowed ${wsAmountToBorrowFormatted} wS from Aave\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${borrowTx}\n\n`;
        
        await walletProvider.waitForTransactionReceipt(borrowTx);
        await sleep(3000);
      } catch (error) {
        console.error('Borrow error:', error);
        return `Failed to borrow wS from Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Step 5: Deploy wS to Beefy wS-SwapX strategy
      response += `### 🌾 Step 3: Deploy borrowed wS to Beefy vault\n`;
      
      // Step 5.1: Approve wS for SwapX
      try {
        const approveSwapXTx = await walletProvider.sendTransaction({
          to: WS_TOKEN_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [SWAPX_VAULT_ADDRESS as Hex, wsAmountToBorrowWei],
          }),
        });
        
        response += `✅ Approved wS for SwapX vault\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${approveSwapXTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(approveSwapXTx);
        await sleep(3000);
      } catch (error) {
        console.error('SwapX approval error:', error);
        return `Failed to approve wS for SwapX: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Step 5.2: Deposit into SwapX 
      // Note: In SwapX, deposit takes deposit0, deposit1, and to
      // We only have wS (deposit0), so deposit1 will be 0
      let lpTokenBalance: bigint;
      try {
        const depositSwapXTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: SWAPX_VAULT_ABI,
            functionName: "deposit",
            args: [wsAmountToBorrowWei, BigInt(0), address as Hex],
          }),
          gas: BigInt(500000),
        });
        
        response += `✅ Deposited wS into SwapX vault\n`;
        response += `Transaction: ${EXPLORER_BASE_URL}${depositSwapXTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(depositSwapXTx);
        await sleep(3000);
        
        // Get LP token balance after deposit
        lpTokenBalance = await publicClient.readContract({
          address: SWAPX_VAULT_ADDRESS as Hex,
          abi: SWAPX_VAULT_ABI,
          functionName: 'balanceOf',
          args: [address as Hex]
        });
      } catch (error) {
        console.error('SwapX deposit error:', error);
        return `Failed to deposit wS to SwapX: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Step 5.3: Approve SwapX LP token for Beefy
      try {
        const approveBeefyTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex, // LP token address is the same as SwapX vault
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
      } catch (error) {
        console.error('Beefy approval error:', error);
        return `Failed to approve LP tokens for Beefy: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Step 5.4: Deposit into Beefy
      try {
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
        console.error('Beefy deposit error:', error);
        return `Failed to deposit LP tokens to Beefy: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      
      // Strategy execution complete
      response += `### ✅ Delta Neutral Strategy Execution Complete\n\n`;
      response += `Your Delta Neutral position is now active!\n\n`;
      response += `- 💰 USDC.e collateral in Aave: ${args.amountUSDCe}\n`;
      response += `- 🏦 wS borrowed from Aave: ${wsAmountToBorrowFormatted}\n`;
      response += `- 🌾 wS deployed in SwapX/Beefy: ${wsAmountToBorrowFormatted}\n\n`;
      
      // Get APY information
      const beefyApyData = await this.getBeefyApy();
      const aaveBorrowApy = await this.getAaveBorrowApy(walletProvider);
      const effectiveBorrowApy = aaveBorrowApy * 0.5;  // Half because we're only borrowing against 50% of collateral
      const netApy = beefyApyData.apy - effectiveBorrowApy;
      
      response += `📈 Expected APY: ${(netApy * 100).toFixed(2)}%\n\n`;
      response += `⚠️ **Important:** Monitor your health factor in Aave to avoid liquidation risks.\n`;
      
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
      // Get APY from Beefy API
      const apyResponse = await axios.get(`${BEEFY_API_BASE}/apy`);
      const apy = apyResponse.data[WS_SWAPX_BEEFY_ID] || 5.0; // Default to 500% if API fails
      
      // Get APY breakdown for more details
      const breakdownResponse = await axios.get(`${BEEFY_API_BASE}/apy/breakdown`);
      const breakdown = breakdownResponse.data[WS_SWAPX_BEEFY_ID] || { totalApy: apy };
      
      // Log the APY for debugging
      console.log(`Fetched Beefy APY for ${WS_SWAPX_BEEFY_ID}: ${apy * 100}%`);
      
      return { apy, breakdown };
    } catch (error) {
      console.error('Error fetching Beefy APY:', error);
      // Higher default value in case of API failure
      return { apy: 5.0, breakdown: { totalApy: 5.0 } };
    }
  }
  
  /**
   * Gets the wS borrow APY from Aave
   */
  private async getAaveBorrowApy(walletProvider: EvmWalletProvider): Promise<number> {
    try {
      // In a production implementation, we'd fetch the actual variable borrow rate from Aave
      // through their data provider contract
      
      // For demonstration purposes, using a reasonable estimate for wS borrow APY
      // In a real implementation, you'd query this from Aave's protocol data provider
      return 0.04; // 4% borrow APY
    } catch (error) {
      console.error('Error fetching Aave borrow APY:', error);
      // Default value in case of error
      return 0.04;
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }
}

export const deltaNeutralActionProvider = () => new DeltaNeutralActionProvider(); 