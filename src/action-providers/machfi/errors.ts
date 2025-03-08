export class MachFiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MachFiError";
  }
}

export class InsufficientBalanceError extends MachFiError {
  constructor(token: string, required: string, actual: string) {
    super(`Insufficient ${token} balance. Required: ${required}, Available: ${actual}`);
    this.name = "InsufficientBalanceError";
  }
}

export class InsufficientAllowanceError extends MachFiError {
  constructor(token: string) {
    super(`Insufficient ${token} allowance for MachFi protocol`);
    this.name = "InsufficientAllowanceError";
  }
}

export class InsufficientLiquidityError extends MachFiError {
  constructor(message: string) {
    super(`Insufficient liquidity: ${message}`);
    this.name = "InsufficientLiquidityError";
  }
} 