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