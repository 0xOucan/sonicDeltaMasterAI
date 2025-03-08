import { z } from "zod";

export const SonicSwapSchema = z
  .object({
    tokenIn: z.string().describe("The input token address"),
    tokenOut: z.string().describe("The output token address"),
    amountIn: z.string().describe("The input amount in wei"),
    slippage: z.number().optional().describe("Slippage tolerance percentage (default: 0.5)"),
    useOdos: z.boolean().optional().describe("Whether to use ODOS routing (default: false)")
  })
  .strip();