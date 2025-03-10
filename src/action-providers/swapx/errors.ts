export class SwapXError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SwapXError";
  }
}

export class InsufficientBalanceError extends SwapXError {
  constructor(token: string, required: string, actual: string) {
    super(`Insufficient ${token} balance. Required: ${required}, Available: ${actual}`);
    this.name = "InsufficientBalanceError";
  }
}

export class InsufficientAllowanceError extends SwapXError {
  constructor(token: string) {
    super(`Insufficient ${token} allowance for SwapX protocol`);
    this.name = "InsufficientAllowanceError";
  }
}

export class SwapFailedError extends SwapXError {
  constructor(message: string) {
    super(`Swap failed: ${message}`);
    this.name = "SwapFailedError";
  }
}

export class PriceImpactError extends SwapXError {
  constructor(expected: string, received: string) {
    super(`High price impact detected. Expected: ${expected}, Received: ${received}`);
    this.name = "PriceImpactError";
  }
}

export class SlippageExceededError extends SwapXError {
  constructor(tokenAmount: string, tokenSymbol: string) {
    super(`Swap failed due to price impact or slippage. The market conditions for ${tokenAmount} ${tokenSymbol} are not favorable right now.`);
    this.name = "SlippageExceededError";
  }

  static fromError(error: Error, tokenAmount: string, tokenSymbol: string): SlippageExceededError | null {
    // Check if the error message contains indicators of slippage issues
    if (
      error.message.includes('Too little received') || 
      error.message.includes('INSUFFICIENT_OUTPUT_AMOUNT') ||
      error.message.includes('price impact too high')
    ) {
      return new SlippageExceededError(tokenAmount, tokenSymbol);
    }
    return null;
  }

  getUserFriendlyMessage(): string {
    return `❌ **${this.message}**\n\nYou can try:\n\n1. Swapping a smaller amount\n2. Waiting for better market conditions\n3. Setting a custom minimum output amount using the \`minAmountOut\` parameter`;
  }
} 