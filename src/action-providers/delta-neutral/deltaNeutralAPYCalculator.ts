import { createPublicClient, http, formatUnits } from "viem";
import { sonic } from 'viem/chains';
import { CTOKEN_ABI, MACHFI_ADDRESSES } from "../machfi/constants";

// Define types for API responses
interface BeefyApiResponse {
  [vaultKey: string]: number;
}

export async function calculateDeltaNeutralAPY() {
  try {
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http(),
    });

    // Fetch Beefy APY for the wS-SwapX vault
    const beefyApiUrl = "https://api.beefy.finance/apy";
    const beefyResponse = await fetch(beefyApiUrl);
    const beefyData = await beefyResponse.json() as BeefyApiResponse;
    
    // Key for the specific vault we're interested in
    const vaultKey = "swapx-ichi-ws-usdc.e";
    const beefyAPY = beefyData[vaultKey] * 100; // Convert to percentage
    console.log(`Fetched Beefy APY for ${vaultKey}: ${beefyAPY}%`);

    // MachFi borrow APY - Handle with proper error checking
    let borrowAPY = 0;
    try {
      // Make sure we're calling the right contract with the right method
      const borrowRatePerTimestamp = await publicClient.readContract({
        address: MACHFI_ADDRESSES.CSONIC,
        abi: CTOKEN_ABI,
        functionName: "borrowRatePerTimestamp",
      });
      
      // Calculate APY from timestamp rate
      // SECONDS_PER_YEAR = 31536000 (365 days * 24 hours * 60 minutes * 60 seconds)
      const ratePerYear = Number(borrowRatePerTimestamp) * 31536000;
      borrowAPY = (ratePerYear / 1e18) * 100; // Convert to percentage
    } catch (error) {
      console.error("Error fetching MachFi borrow APY:", error);
      // Use a fallback value since we can't get the actual rate
      borrowAPY = 4; // 4% as a fallback value
    }

    // MachFi supply APY for USDC.e - Also handle with error checking
    let supplyAPY = 0;
    try {
      const supplyRatePerTimestamp = await publicClient.readContract({
        address: MACHFI_ADDRESSES.CUSDC,
        abi: CTOKEN_ABI,
        functionName: "supplyRatePerTimestamp",
      });
      
      // Calculate APY from timestamp rate
      const ratePerYear = Number(supplyRatePerTimestamp) * 31536000;
      supplyAPY = (ratePerYear / 1e18) * 100; // Convert to percentage
    } catch (error) {
      console.error("Error fetching MachFi supply APY:", error);
      // Use a fallback value
      supplyAPY = 3; // 3% as a fallback
    }

    // Calculate effective rates based on 50% LTV
    const effectiveBorrowingCost = borrowAPY * 0.5;
    const effectiveSupplyYield = supplyAPY * 0.5;
    
    // Final net strategy APY
    const netStrategyAPY = beefyAPY - effectiveBorrowingCost + effectiveSupplyYield;
    
    // Aave strategy (estimated values for comparison)
    const aaveBorrowAPY = 2; // Example value
    const aaveSupplyAPY = 2; // Example value
    const aaveEffectiveBorrowingCost = aaveBorrowAPY * 0.5;
    const aaveEffectiveSupplyYield = aaveSupplyAPY * 0.5;
    const aaveNetStrategyAPY = beefyAPY - aaveEffectiveBorrowingCost + aaveEffectiveSupplyYield;

    return {
      beefyAPY,
      machfiBorrowAPY: borrowAPY,
      machfiSupplyAPY: supplyAPY,
      effectiveBorrowingCost,
      effectiveSupplyYield,
      netStrategyAPY,
      aaveBorrowAPY,
      aaveSupplyAPY,
      aaveEffectiveBorrowingCost,
      aaveEffectiveSupplyYield,
      aaveNetStrategyAPY,
    };
  } catch (error: unknown) {
    console.error("Error calculating delta neutral APY:", error);
    // Safe error handling for unknown type
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to calculate delta neutral APY: ${errorMessage}`);
  }
} 