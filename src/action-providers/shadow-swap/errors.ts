export class ShadowSwapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShadowSwapError';
  }
}

export class InsufficientBalanceError extends ShadowSwapError {
  constructor(balance: string, required: string, token: string) {
    super(`Insufficient ${token} balance. You have ${balance} but need ${required}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class InsufficientAllowanceError extends ShadowSwapError {
  constructor(allowance: string, required: string, token: string) {
    super(`Insufficient ${token} allowance. Current allowance is ${allowance} but need ${required}`);
    this.name = 'InsufficientAllowanceError';
  }
}

export class SwapExecutionError extends ShadowSwapError {
  constructor(message: string) {
    super(`Swap execution failed: ${message}`);
    this.name = 'SwapExecutionError';
  }
}