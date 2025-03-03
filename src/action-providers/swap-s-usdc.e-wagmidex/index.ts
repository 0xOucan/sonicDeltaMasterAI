import { WagmiSwapActionProvider } from "./wagmiSwapActionProvider";

export * from "./wagmiSwapActionProvider";

// Add factory function
export const wagmiSwapActionProvider = () => new WagmiSwapActionProvider();