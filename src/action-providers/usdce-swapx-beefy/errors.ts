export class USDCeSwapXBeefyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'USDCeSwapXBeefyError';
  }
}

export class InsufficientBalanceError extends USDCeSwapXBeefyError {
  constructor(balance: string, required: string) {
    super(`Insufficient balance. You have ${balance} but need ${required}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class InsufficientAllowanceError extends USDCeSwapXBeefyError {
  constructor(allowance: string, required: string) {
    super(`Insufficient allowance. Current allowance is ${allowance} but need ${required}`);
    this.name = 'InsufficientAllowanceError';
  }
} 