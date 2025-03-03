import { z } from "zod";

export const DepositWSUSDCSchema = z
  .object({
    amount: z.string().describe("The amount of USDC.e to deposit (in wei)"),
  })
  .strip();