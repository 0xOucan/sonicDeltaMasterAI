export class SonicSwapError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SonicSwapError';
    }
}

export class InsufficientLiquidityError extends SonicSwapError {
    constructor(message: string) {
        super(`Insufficient liquidity: ${message}`);
        this.name = 'InsufficientLiquidityError';
    }
}

export class SlippageError extends SonicSwapError {
    constructor(expected: string, received: string) {
        super(`Slippage error: Expected minimum ${expected}, but received ${received}`);
        this.name = 'SlippageError';
    }
}