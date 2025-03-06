import { z } from "zod";

export const WrapSSchema = z
  .object({
    amount: z.string().describe("The amount of S to wrap (can be decimal like '1.5' or wei format)"),
  })
  .strip();

export const UnwrapSSchema = z
  .object({
    amount: z.string().describe("The amount of wS to unwrap (can be decimal like '1.5' or wei format)"),
  })
  .strip();

export const TransferWSSchema = z
  .object({
    to: z.string().describe("The destination address to receive wS tokens"),
    amount: z.string().describe("The amount of wS tokens to transfer (can be decimal like '1.5' or wei format)"),
  })
  .strip();

export const ApproveWSSchema = z
  .object({
    spender: z.string().describe("The address to approve spending wS tokens"),
    amount: z.string().describe("The amount of wS tokens to approve (can be decimal like '1.5' or wei format)"),
  })
  .strip();

export const GetBalanceSchema = z
  .object({
    address: z.string().describe("The address to check balance for"),
  })
  .strip();