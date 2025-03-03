export class WSUSDCBeefyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WSUSDCBeefyError';
  }
}

export class InsufficientBalanceError extends WSUSDCBeefyError {
  constructor(balance: string, required: string) {
    super(`Insufficient USDC.e balance. You have ${balance} but need ${required}`);
    this.name = 'InsufficientBalanceError';
  }
}