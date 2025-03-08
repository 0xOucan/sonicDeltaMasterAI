export function formatDashboard(borrowedAssets: any[], totalDebt: number, weightedBorrowAPY: number) {
  return `
#### 🏦 BORROWED ASSETS
- 💸 **Total Debt:** -$${totalDebt.toFixed(2)} (APY: ${weightedBorrowAPY.toFixed(2)}%)
  ${borrowedAssets.map(asset => 
    `- ${asset.icon} **${asset.symbol}:** -${asset.amount} (-$${asset.valueUSD.toFixed(2)}) - APY: ${Math.abs(asset.apy).toFixed(2)}%`
  ).join('\n')}
`;
} 