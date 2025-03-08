// Export specific types and implementations to avoid naming conflicts
// Each action provider should be imported from its specific file
import { DeltaNeutralActionProvider } from './delta-neutral/deltaNeutralActionProvider';
import { WSSwapXBeefyActionProvider } from './wsswapx-beefy/wsSwapXBeefyActionProvider';
import { BeefyPortfolioActionProvider } from './beefy-portfolio/beefyPortfolioActionProvider';
import { USDCeSwapXBeefyActionProvider } from './usdce-swapx-beefy/usdceSwapXBeefyActionProvider';
import { StrategyManagerActionProvider } from './strategy-manager/strategyManagerActionProvider';
import { SWrapperActionProvider } from './swrapper/sWrapperActionProvider';
import { BalanceCheckerActionProvider } from './balance-checker/balanceCheckerActionProvider';
import { AaveSupplyActionProvider } from './aave-supply/aaveSupplyActionProvider';
import { MachFiActionProvider } from './machfi/machfiActionProvider';

// Re-export factory functions where available
export { wsSwapXBeefyActionProvider } from './wsswapx-beefy/wsSwapXBeefyActionProvider';
export { deltaNeutralActionProvider } from './delta-neutral/deltaNeutralActionProvider';
export { usdceSwapXBeefyActionProvider } from './usdce-swapx-beefy/usdceSwapXBeefyActionProvider';

// Export class definitions for those that need direct access
export { DeltaNeutralActionProvider };
export { WSSwapXBeefyActionProvider };
export { BeefyPortfolioActionProvider };
export { USDCeSwapXBeefyActionProvider };
export { StrategyManagerActionProvider };
export { SWrapperActionProvider };
export { BalanceCheckerActionProvider };
export { AaveSupplyActionProvider };
export { MachFiActionProvider };

// Export types selectively
export type { ActionProvider } from '@coinbase/agentkit';