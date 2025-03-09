import { z } from "zod";

// Schema for swapping S to USDC.e
export const SwapSToUSDCeSchema = z
  .object({
    amount: z.string()
      .transform(val => !val.includes('.') ? val + '.0' : val)
      .describe("The amount of S to swap (e.g., '2.0' for 2 S)"),
    minAmountOut: z.string().optional()
      .describe("Minimum amount of USDC.e to receive (optional, defaults to 0.1% slippage)")
  })
  .strip();

// Schema for swapping USDC.e to S
export const SwapUSDCeToSSchema = z
  .object({
    amount: z.string()
      .transform(val => !val.includes('.') ? val + '.0' : val)
      .describe("The amount of USDC.e to swap (e.g., '1.0' for 1 USDC.e)"),
    minAmountOut: z.string().optional()
      .describe("Minimum amount of S to receive (optional, defaults to 0.1% slippage)")
  })
  .strip();

// Generic swap schema
export const SwapSchema = z
  .object({
    tokenIn: z.enum(["S", "USDC_E"]),
    tokenOut: z.enum(["S", "USDC_E"]),
    amount: z.string()
      .transform(val => !val.includes('.') ? val + '.0' : val)
      .describe("The amount to swap"),
    minAmountOut: z.string().optional()
      .describe("Minimum amount to receive (optional, defaults to 0.1% slippage)")
  })
  .strip(); 