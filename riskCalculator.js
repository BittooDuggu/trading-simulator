// riskCalculator.js - Handles lot sizing and increment logic cleanly
window.RiskCalculator = {
  calculateNextLots(currentLots, pnl, recPts) {
    let lossAmount = Math.abs(pnl);
    let exactIncrement = lossAmount / recPts;
    let roundedIncrement = Math.ceil(exactIncrement * 100) / 100;
    
    let nextLots = currentLots + roundedIncrement;
    return Math.round(nextLots * 100) / 100;
  }
};
