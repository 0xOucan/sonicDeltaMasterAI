export class AaveSupplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AaveSupplyError";
  }
}

export class InsufficientBalanceError extends AaveSupplyError {
  constructor(token: string, required: string, actual: string) {
    super(`Insufficient ${token} balance. Required: ${required}, Available: ${actual}`);
    this.name = "InsufficientBalanceError";
  }
}

export class InsufficientAllowanceError extends AaveSupplyError {
  constructor(token: string) {
    super(`Insufficient ${token} allowance for Aave protocol`);
    this.name = "InsufficientAllowanceError";
  }
}