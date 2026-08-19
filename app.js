// Initialize Charting Engine
const chartContainer = document.getElementById('chart');
const chart = LightweightCharts.createChart(chartContainer, {
  layout: { background: { color: '#131722' }, textColor: '#d1d4dc' },
  grid: { vertLines: { color: '#2b2f3a' }, horzLines: { color: '#2b2f3a' } },
  timeScale: { timeVisible: true, secondsVisible: false }
});

const candleSeries = chart.addCandlestickSeries({
  upColor: '#089981', downColor: '#f23645', borderVisible: false, wickUpColor: '#089981', wickDownColor: '#f23645'
});

let marketData = [];
let currentIndex = 0;

// Sample Crypto Data Generator (Realistic daily/hourly price action)
function generateData(count = 300) {
  let data = [];
  let time = new Date(Date.now() - count * 60 * 60 * 1000);
  let price = 65000; // Crypto baseline (e.g. BTC)
  for (let i = 0; i < count; i++) {
    let open = price + (Math.random() - 0.5) * 400;
    let high = open + Math.random() * 600;
    let low = open - Math.random() * 600;
    let close = (high + low) / 2;
    price = close;
    time.setHours(time.getHours() + 1);
    data.push({ time: Math.floor(time.getTime() / 1000), open, high, low, close });
  }
  return data;
}

// Custom Strategy Engine implementing your Martingale Recovery System
function runStrategy(data, initialCapital, config) {
  let capital = initialCapital;
  let trades = [];
  
  let currentLots = config.defaultLots;
  let direction = 'BUY'; // Start with BUY call
  let accumulatedLoss = 0;

  // We loop through the data simulating sequential execution bar-by-bar
  for (let i = 1; i < data.length; i++) {
    let bar = data[i];
    let entryPrice = bar.open;
    
    let targetPrice = direction === 'BUY' ? entryPrice + config.targetPoints : entryPrice - config.targetPoints;
    let stopLossPrice = direction === 'BUY' ? entryPrice - config.stopLossPoints : entryPrice + config.stopLossPoints;

    let tradeOutcome = 'PENDING';
    let exitPrice = entryPrice;

    // Simulate bar price movement to check if Target or Stop-Loss hit first
    for (let j = i; j < Math.min(i + 15, data.length); j++) {
      let b = data[j];
      if (direction === 'BUY') {
        if (b.low <= stopLossPrice) {
          tradeOutcome = 'LOSS';
          exitPrice = stopLossPrice;
          break;
        }
        if (b.high >= targetPrice) {
          tradeOutcome = 'WIN';
          exitPrice = targetPrice;
          break;
        }
      } else { // SELL
        if (b.high >= stopLossPrice) {
          tradeOutcome = 'LOSS';
          exitPrice = stopLossPrice;
          break;
        }
        if (b.low <= targetPrice) {
          tradeOutcome = 'WIN';
          exitPrice = targetPrice;
          break;
        }
      }
    }

    let pnl = direction === 'BUY' ? (exitPrice - entryPrice) * currentLots : (entryPrice - exitPrice) * currentLots;
    capital += pnl;

    trades.push({
      id: trades.length + 1,
      direction,
      lots: currentLots,
      entry: entryPrice,
      exit: exitPrice,
      outcome: tradeOutcome,
      pnl
    });

    if (tradeOutcome === 'LOSS') {
      // Calculate loss amount and determine required lot size for next recovery trade
      let lossAmount = Math.abs(pnl);
      accumulatedLoss += lossAmount;
      
      // Lot size calculation: Recover accumulated loss + target recovery profit using recovery points
      let requiredLots = (accumulatedLoss + (config.recoveryTargetPoints * currentLots)) / config.recoveryTargetPoints;
      currentLots = Math.max(config.defaultLots, Math.ceil(currentLots + requiredLots));
      
      // Flip direction
      direction = direction === 'BUY' ? 'SELL' : 'BUY';
    } else {
      // Target achieved: Reset everything back to default lot size and flip direction
      accumulatedLoss = 0;
      currentLots = config.defaultLots;
      direction = direction === 'BUY' ? 'SELL' : 'BUY';
    }

    // Skip ahead a few bars after trade closes to avoid overlapping entries
    i += 3;
  }

  return { finalCapital: capital, trades };
}

function updateUI() {
  marketData = generateData(400);
  currentIndex = marketData.length - 80;
  candleSeries.setData(marketData.slice(0, currentIndex));

  let capital = parseFloat(document.getElementById('capital').value) || 100000;
  
  // Strategy configurations from user rules
  let config = {
    defaultLots: 1,
    targetPoints: 500,
    stopLossPoints: 250,
    recoveryTargetPoints: 400
  };

  let results = runStrategy(marketData.slice(0, currentIndex), capital, config);

  document.getElementById('resInitial').innerText = `$${capital.toLocaleString()}`;
  document.getElementById('resEquity').innerText = `$${results.finalCapital.toFixed(2)}`;
  let ret = ((results.finalCapital - capital) / capital) * 100;
  document.getElementById('resReturn').innerText = `${ret.toFixed(2)}%`;
  document.getElementById('resReturnclassName'] = ret >= 0 ? 'metric-value green' : 'metric-value red';
  document.getElementById('resTrades').innerText = results.trades.length;
  
  let wins = results.trades.filter(t => t.outcome === 'WIN').length;
  let winRate = results.trades.length > 0 ? (wins / results.trades.length) * 100 : 0;
  document.getElementById('resWinRate').innerText = `${winRate.toFixed(1)}%`;

  // Render Trade Log
  let logHtml = '';
  results.trades.forEach(t => {
    let color = t.outcome === 'WIN' ? '#089981' : '#f23645';
    logHtml += `<div style="border-bottom:1px solid #2a2e39; padding:4px 0; color:${color}">
      [#${t.id}] ${t.direction} | Lots: ${t.lots} | Entry: ${t.entry.toFixed(0)} | Exit: ${t.exit.toFixed(0)} | PnL: $${t.pnl.toFixed(2)} (${t.outcome})
    </div>`;
  });
  document.getElementById('tradeLog').innerHTML = logHtml;
}

document.getElementById('runBtn').addEventListener('click', updateUI);

// Step Forward 1 Bar (Future Playback Mode)
document.getElementById('stepBtn').addEventListener('click', () => {
  if (currentIndex < marketData.length) {
    currentIndex++;
    candleSeries.setData(marketData.slice(0, currentIndex));
  }
});

updateUI();
