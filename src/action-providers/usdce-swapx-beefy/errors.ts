export class USDCeSwapXBeefyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "USDCeSwapXBeefyError";
  }
}

export class InsufficientBalanceError extends USDCeSwapXBeefyError {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}

export class InsufficientAllowanceError extends USDCeSwapXBeefyError {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientAllowanceError";
  }
} 