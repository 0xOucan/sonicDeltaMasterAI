export class WagmiSwapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WagmiSwapError";
  }
}

export class InsufficientBalanceError extends WagmiSwapError {
  constructor(token: string) {
    super(`Insufficient ${token} balance`);
    this.name = "InsufficientBalanceError";
  }
}

export class SwapFailedError extends WagmiSwapError {
  constructor(message: string) {
    super(`Swap failed: ${message}`);
    this.name = "SwapFailedError";
  }
}