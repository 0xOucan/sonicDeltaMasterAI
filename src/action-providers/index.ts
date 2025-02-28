import { BalanceCheckerActionProvider } from "./balance-checker";
import { sWrapperActionProvider } from "./swrapper";
import { wsSwapXBeefyActionProvider } from "./wsswapx-beefy";
import { wagmiSwapActionProvider } from "./swap-s-usdc.e-wagmidex";

// Export all providers
export const actionProviders = [
  new BalanceCheckerActionProvider(),
  sWrapperActionProvider(),
  wsSwapXBeefyActionProvider(),
  wagmiSwapActionProvider(),
]; 