export class WSSwapXBeefyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WSSwapXBeefyError';
  }
}

export class InsufficientBalanceError extends WSSwapXBeefyError {
  constructor(balance: string, required: string) {
    super(`Insufficient balance. You have ${balance} but need ${required}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class InsufficientAllowanceError extends WSSwapXBeefyError {
  constructor(allowance: string, required: string) {
    super(`Insufficient allowance. Current allowance is ${allowance} but need ${required}`);
    this.name = 'InsufficientAllowanceError';
  }
} 