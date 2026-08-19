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

// Sample Data Generator (Simulates historical OHLCV data directly)
function generateData(count = 200) {
  let data = [];
  let time = new Date(Date.now() - count * 24 * 60 * 60 * 1000);
  let price = 40000;
  for (let i = 0; i < count; i++) {
    let open = price + (Math.random() - 0.5) * 200;
    let high = open + Math.random() * 300;
    let low = open - Math.random() * 300;
    let close = (high + low) / 2;
    price = close;
    time.setDate(time.getDate() + 1);
    data.push({ time: time.toISOString().split('T')[0], open, high, low, close });
  }
  return data;
}

// Custom Strategy Engine Placeholder
function runStrategy(data, initialCapital) {
  let capital = initialCapital;
  let position = null;
  let trades = [];

  // Example Strategy: Simple Moving Average Crossover placeholder
  for (let i = 10; i < data.length; i++) {
    let currentBar = data[i];
    let prevBar = data[i - 1];

    // BUY Signal (e.g., Close > Previous High)
    if (!position && currentBar.close > prevBar.high) {
      position = { type: 'BUY', entryPrice: currentBar.close, index: i };
    } 
    // SELL / Exit Signal (e.g., Close < Previous Low)
    else if (position && currentBar.close < prevBar.low) {
      let pnl = (currentBar.close - position.entryPrice) / position.entryPrice * capital;
      capital += pnl;
      trades.push({ type: position.type, entry: position.entryPrice, exit: currentBar.close, pnl });
      position = null;
    }
  }

  return { finalCapital: capital, trades };
}

function updateUI() {
  marketData = generateData(300);
  currentIndex = marketData.length - 50; // Keep 50 bars hidden for step-by-step future testing
  candleSeries.setData(marketData.slice(0, currentIndex));

  let capital = parseFloat(document.getElementById('capital').value);
  let results = runStrategy(marketData.slice(0, currentIndex), capital);

  document.getElementById('resInitial').innerText = `$${capital.toLocaleString()}`;
  document.getElementById('resEquity').innerText = `$${results.finalCapital.toFixed(2)}`;
  let ret = ((results.finalCapital - capital) / capital) * 100;
  document.getElementById('resReturn').innerText = `${ret.toFixed(2)}%`;
  document.getElementById('resReturn').className = ret >= 0 ? 'metric-value green' : 'metric-value red';
  document.getElementById('resTrades').innerText = results.trades.length;
  
  let wins = results.trades.filter(t => t.pnl > 0).length;
  let winRate = results.trades.length > 0 ? (wins / results.trades.length) * 100 : 0;
  document.getElementById('resWinRate').innerText = `${winRate.toFixed(1)}%`;
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
