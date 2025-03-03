export class SWrapperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SWrapperError';
  }
}

export class InsufficientBalanceError extends SWrapperError {
  constructor(balance: string, required: string, tokenSymbol: string = 'wS') {
    super(`Insufficient ${tokenSymbol} balance. You have ${balance} but need ${required}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class InsufficientAllowanceError extends SWrapperError {
  constructor(allowance: string, required: string) {
    super(`Insufficient allowance. Current allowance is ${allowance} but need ${required}`);
    this.name = 'InsufficientAllowanceError';
  }
}

export class TransactionFailedError extends SWrapperError {
  constructor(message: string) {
    super(`Transaction failed: ${message}`);
    this.name = 'TransactionFailedError';
  }
}