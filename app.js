window.addEventListener('DOMContentLoaded', () => {
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

  function generateData(count = 300) {
    let data = [];
    let time = new Date(Date.now() - count * 60 * 60 * 1000);
    let price = 65000;
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

  function runStrategy(data, initialCapital, config) {
    let capital = initialCapital;
    let trades = [];
    let currentLots = config.defaultLots;
    let direction = 'BUY';
    let accumulatedLoss = 0;

    for (let i = 1; i < data.length; i++) {
      let bar = data[i];
      let entryPrice = bar.open;
      
      let targetPrice = direction === 'BUY' ? entryPrice + config.targetPoints : entryPrice - config.targetPoints;
      let stopLossPrice = direction === 'BUY' ? entryPrice - config.stopLossPoints : entryPrice + config.stopLossPoints;

      let tradeOutcome = 'PENDING';
      let exitPrice = entryPrice;

      for (let j = i; j < Math.min(i + 15, data.length); j++) {
        let b = data[j];
        if (direction === 'BUY') {
          if (b.low <= stopLossPrice) { tradeOutcome = 'LOSS'; exitPrice = stopLossPrice; break; }
          if (b.high >= targetPrice) { tradeOutcome = 'WIN'; exitPrice = targetPrice; break; }
        } else {
          if (b.high >= stopLossPrice) { tradeOutcome = 'LOSS'; exitPrice = stopLossPrice; break; }
          if (b.low <= targetPrice) { tradeOutcome = 'WIN'; exitPrice = targetPrice; break; }
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
        let lossAmount = Math.abs(pnl);
        accumulatedLoss += lossAmount;
        let requiredLots = (accumulatedLoss + (400 * currentLots)) / 400; // Recovery Target 400 pts
        currentLots = Math.max(config.defaultLots, Math.ceil(currentLots + requiredLots));
        direction = direction === 'BUY' ? 'SELL' : 'BUY';
      } else {
        accumulatedLoss = 0;
        currentLots = config.defaultLots;
        direction = direction === 'BUY' ? 'SELL' : 'BUY';
      }
      i += 3;
    }
    return { finalCapital: capital, trades };
  }

  function updateUI() {
    marketData = generateData(400);
    currentIndex = marketData.length - 80;
    candleSeries.setData(marketData.slice(0, currentIndex));

    let capital = parseFloat(document.getElementById('capital').value) || 100000;
    let config = {
      defaultLots: parseInt(document.getElementById('defaultLots').value) || 1,
      targetPoints: parseFloat(document.getElementById('targetPts').value) || 500,
      stopLossPoints: parseFloat(document.getElementById('slPts').value) || 250
    };

    let results = runStrategy(marketData.slice(0, currentIndex), capital, config);

    document.getElementById('resInitial').innerText = `$${capital.toLocaleString()}`;
    document.getElementById('resEquity').innerText = `$${results.finalCapital.toFixed(2)}`;
    
    let ret = ((results.finalCapital - capital) / capital) * 100;
    let retElement = document.getElementById('resReturn');
    retElement.innerText = `${ret.toFixed(2)}%`;
    retElement.className = ret >= 0 ? 'metric-value green' : 'metric-value red';

    document.getElementById('resTrades').innerText = results.trades.length;
    
    let wins = results.trades.filter(t => t.outcome === 'WIN').length;
    let winRate = results.trades.length > 0 ? (wins / results.trades.length) * 100 : 0;
    document.getElementById('resWinRate').innerText = `${winRate.toFixed(1)}%`;

    let logHtml = '';
    results.trades.forEach(t => {
      let color = t.outcome === 'WIN' ? '#089981' : '#f23645';
      logHtml += `<div style="border-bottom:1px solid #2a2e39; padding:3px 0; color:${color}">
        [#${t.id}] ${t.direction} (Lots: ${t.lots}) | PnL: $${t.pnl.toFixed(2)} (${t.outcome})
      </div>`;
    });
    document.getElementById('tradeLog').innerHTML = logHtml;
  }

  document.getElementById('runBtn').addEventListener('click', updateUI);
  document.getElementById('stepBtn').addEventListener('click', () => {
    if (currentIndex < marketData.length) {
      currentIndex++;
      candleSeries.setData(marketData.slice(0, currentIndex));
    }
  });

  updateUI();
});
