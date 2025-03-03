import { createPublicClient, http, Hex, type Address } from 'viem';
import { sonic } from 'viem/chains';
import { ERC20_APPROVAL_ABI as ERC20_ABI } from '../action-providers/shadow-swap/constants';

/**
 * Utility for estimating gas parameters for transactions
 */
export async function estimateGasParameters(to: Address, data: Hex, value: bigint = BigInt(0)) {
  try {
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http()
    });

    // Estimate max priority fee per gas (tip)
    const maxPriorityFeePerGas = await publicClient.estimateMaxPriorityFeePerGas();

    // Estimate fees per gas (base fee + priority fee)
    const { maxFeePerGas } = await publicClient.estimateFeesPerGas();

    // Estimate gas limit for this specific transaction
    const gasLimit = await publicClient.estimateGas({
      to,
      data,
      value
    });

    // Add 10% buffer to the gas limit for safety
    const gasLimitWithBuffer = (gasLimit * BigInt(110)) / BigInt(100);

    return {
      maxFeePerGas,
      maxPriorityFeePerGas,
      gas: gasLimitWithBuffer
    };
  } catch (error) {
    console.error('Error estimating gas parameters:', error);
    // Return default values if estimation fails
    return {
      gas: BigInt(600000) // Fallback gas limit
    };
  }
}

/**
 * Estimate gas for contract interactions
 */
export async function estimateContractGas({
  contractAddress,
  abi,
  functionName,
  args,
  value = BigInt(0)
}: {
  contractAddress: Address;
  abi: readonly any[] | any[]; // Support both readonly and mutable arrays
  functionName: string;
  args: any[];
  value?: bigint;
}) {
  try {
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http()
    });

    // Estimate gas for this specific contract call
    const gasLimit = await publicClient.estimateContractGas({
      address: contractAddress,
      abi,
      functionName,
      args,
      value
    });

    // Add 10% buffer to the gas limit for safety
    const gasLimitWithBuffer = (gasLimit * BigInt(110)) / BigInt(100);

    // Get other gas parameters
    const maxPriorityFeePerGas = await publicClient.estimateMaxPriorityFeePerGas();
    const { maxFeePerGas } = await publicClient.estimateFeesPerGas();

    return {
      maxFeePerGas,
      maxPriorityFeePerGas,
      gas: gasLimitWithBuffer
    };
  } catch (error) {
    console.error('Error estimating contract gas:', error);
    // Return default values if estimation fails
    return {
      gas: BigInt(600000) // Fallback gas limit
    };
  }
}