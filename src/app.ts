import express from 'express';
import { json, urlencoded } from 'body-parser';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(express.static('public'));

// Mock Data
let trades: any[] = [];
let users: any[] = [];
let orders: any[] = [];
let alerts: any[] = [];
let watchlist: any[] = [];
let pricesCache: { [key: string]: any } = {};

// Функция для получения реальных цен с CoinGecko API
async function fetchRealPrices() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,cardano&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true');
        const data: any = await response.json();
        
        pricesCache = {
            BTC: {
                pair: 'BTC/USDT',
                price: data.bitcoin.usd,
                change: data.bitcoin.usd_24h_change,
                volume: data.bitcoin.usd_24h_vol,
                marketCap: data.bitcoin.usd_market_cap
            },
            ETH: {
                pair: 'ETH/USDT',
                price: data.ethereum.usd,
                change: data.ethereum.usd_24h_change,
                volume: data.ethereum.usd_24h_vol,
                marketCap: data.ethereum.usd_market_cap
            },
            SOL: {
                pair: 'SOL/USDT',
                price: data.solana.usd,
                change: data.solana.usd_24h_change,
                volume: data.solana.usd_24h_vol,
                marketCap: data.solana.usd_market_cap
            },
            XRP: {
                pair: 'XRP/USDT',
                price: data.ripple.usd,
                change: data.ripple.usd_24h_change,
                volume: data.ripple.usd_24h_vol,
                marketCap: data.ripple.usd_market_cap
            },
            ADA: {
                pair: 'ADA/USDT',
                price: data.cardano.usd,
                change: data.cardano.usd_24h_change,
                volume: data.cardano.usd_24h_vol,
                marketCap: data.cardano.usd_market_cap
            }
        };
    } catch (error) {
        console.error('Ошибка получения цен:', error);
    }
}

// Обновляем цены каждые 30 секунд
setInterval(fetchRealPrices, 30000);
fetchRealPrices();

// ...existing code... (все API routes остаются без изменений)

// УДАЛИТЬ эти строки (WebSocket не нужен):
// const WebSocket = require('ws');
// const wss = new WebSocket.Server({ noServer: true });

// УДАЛИТЬ этот маршрут:
// app.get('/api/prices/stream', ...)

// ...остальной код остается без изменений...
// API Routes - Trades
app.get('/api/trades', (_req, res) => {
    res.json(trades);
});

app.post('/api/trades', (req, res) => {
    const { cryptocurrency, amount, price, type } = req.body;
    const trade = { id: Date.now(), cryptocurrency, amount, price, type, date: new Date() };
    trades.push(trade);
    res.json(trade);
});

app.delete('/api/trades/:id', (req, res) => {
    trades = trades.filter(t => t.id != req.params.id);
    res.json({ success: true });
});

// API Routes - Orders
app.get('/api/orders', (_req, res) => {
    res.json(orders);
});

app.post('/api/orders', (req, res) => {
    const { cryptocurrency, amount, priceLimit, type } = req.body;
    const order = { id: Date.now(), cryptocurrency, amount, priceLimit, type, status: 'pending', date: new Date() };
    orders.push(order);
    res.json(order);
});

app.patch('/api/orders/:id', (req, res) => {
    const order = orders.find(o => o.id == req.params.id);
    if (order) {
        order.status = req.body.status;
        res.json(order);
    }
});

// API Routes - Portfolio
app.get('/api/portfolio', (_req, res) => {
    const balance = trades.reduce((sum, t) => sum + (t.amount * t.price), 0);
    const byAsset: { [key: string]: number } = {};
    trades.forEach(t => {
        byAsset[t.cryptocurrency] = (byAsset[t.cryptocurrency] || 0) + (t.amount * t.price);
    });
    res.json({ balance, trades: trades.length, assets: Object.keys(byAsset).length, breakdown: byAsset });
});

// API Routes - Users
app.post('/api/users', (req, res) => {
    const { username, email, password } = req.body;
    const user = { id: Date.now(), username, email, password, createdAt: new Date() };
    users.push(user);
    res.json(user);
});

app.get('/api/users', (_req, res) => {
    res.json(users);
});

app.get('/api/users/:id', (req, res) => {
    const user = users.find(u => u.id == req.params.id);
    res.json(user || {});
});

// API Routes - Alerts
app.post('/api/alerts', (req, res) => {
    const { cryptocurrency, price, type } = req.body;
    const alert = { id: Date.now(), cryptocurrency, price, type, active: true, date: new Date() };
    alerts.push(alert);
    res.json(alert);
});

app.get('/api/alerts', (_req, res) => {
    res.json(alerts);
});

app.delete('/api/alerts/:id', (req, res) => {
    alerts = alerts.filter(a => a.id != req.params.id);
    res.json({ success: true });
});

// API Routes - Watchlist
app.post('/api/watchlist', (req, res) => {
    const { cryptocurrency } = req.body;
    if (!watchlist.includes(cryptocurrency)) {
        watchlist.push(cryptocurrency);
    }
    res.json(watchlist);
});

app.get('/api/watchlist', (_req, res) => {
    res.json(watchlist);
});

app.delete('/api/watchlist/:crypto', (req, res) => {
    watchlist = watchlist.filter(w => w !== req.params.crypto);
    res.json(watchlist);
});

// API Routes - Market Data (РЕАЛЬНЫЕ ЦЕНЫ)
app.get('/api/market', (_req, res) => {
    const market = [
        pricesCache.BTC || { pair: 'BTC/USDT', price: 0, change: 0, volume: 0, marketCap: 0 },
        pricesCache.ETH || { pair: 'ETH/USDT', price: 0, change: 0, volume: 0, marketCap: 0 },
        pricesCache.SOL || { pair: 'SOL/USDT', price: 0, change: 0, volume: 0, marketCap: 0 },
        pricesCache.XRP || { pair: 'XRP/USDT', price: 0, change: 0, volume: 0, marketCap: 0 },
        pricesCache.ADA || { pair: 'ADA/USDT', price: 0, change: 0, volume: 0, marketCap: 0 }
    ];
    res.json(market);
});

app.get('/api/market/:crypto', (req, res) => {
    const crypto = req.params.crypto.toUpperCase();
    const data = pricesCache[crypto];
    if (data) {
        res.json(data);
    } else {
        res.json({ error: 'Актив не найден' });
    }
});

// WebSocket для real-time обновлений цен
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

app.get('/api/prices/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendPrices = () => {
        res.write(`data: ${JSON.stringify(pricesCache)}\n\n`);
    };

    sendPrices();
    const interval = setInterval(sendPrices, 10000);

    req.on('close', () => {
        clearInterval(interval);
    });
});

// HTML Routes
app.get('/', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Business Crypto Trading</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: Arial, sans-serif; background:#0b0f17; color:#e6e8ee; }
    header { padding:28px 24px; border-bottom:1px solid #1f2633; background:#0f1420; position:sticky; top:0; display:flex; justify-content:space-between; align-items:center; }
    nav a { margin-left:20px; color:#3b82f6; text-decoration:none; }
    .container { max-width:1200px; margin:0 auto; padding:24px; }
    .hero { display:grid; gap:16px; grid-template-columns:1.2fr .8fr; align-items:center; }
    .card { background:#121a2a; border:1px solid #1f2633; border-radius:12px; padding:18px; }
    .grid { display:grid; gap:16px; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); }
    .kpi { font-size:28px; font-weight:700; }
    .muted { color:#9aa4b2; }
    .btn { display:inline-block; background:#3b82f6; color:#fff; padding:10px 14px; border-radius:8px; text-decoration:none; cursor:pointer; border:none; margin-right:8px; }
    .btn:hover { background:#2563eb; }
    footer { border-top:1px solid #1f2633; padding:20px; text-align:center; color:#7f8a9a; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:10px; border-bottom:1px solid #1f2633; text-align:left; }
    tr:hover { background:#0f1420; }
    .positive { color:#22c55e; }
    .negative { color:#ef4444; }
    .updating { animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity:1; } 50% { opacity:0.6; } }
  </style>
</head>
<body>
  <header>
    <div><strong>💰 Business Crypto Trading</strong></div>
    <nav>
      <a href="/">Главная</a>
      <a href="/dashboard">Дашборд</a>
      <a href="/trade">Торговля</a>
      <a href="/orders">Ордера</a>
      <a href="/alerts">Уведомления</a>
      <a href="/watchlist">Мой список</a>
    </nav>
  </header>

  <main class="container">
    <section class="hero">
      <div>
        <h1>Платформа для бизнес‑трейдинга криптовалют</h1>
        <p class="muted">Аналитика, ордера, отчеты, уведомления и управление рисками в одном месте.</p>
        <a class="btn" href="/dashboard">📊 Дашборд</a>
        <a class="btn" href="/trade">💹 Торговля</a>
      </div>
      <div class="card">
        <div class="muted">Баланс портфеля</div>
        <div class="kpi">$1,284,560</div>
        <div class="muted positive">День: +2.14%</div>
      </div>
    </section>

    <section style="margin-top:24px;">
      <h2>Ключевые показатели</h2>
      <div class="grid">
        <div class="card"><div class="muted">Оборот 24ч</div><div class="kpi">$28.4M</div></div>
        <div class="card"><div class="muted">Активные ордера</div><div class="kpi" id="orderCount">0</div></div>
        <div class="card"><div class="muted">Активы</div><div class="kpi" id="assetCount">0</div></div>
        <div class="card"><div class="muted">Пользователи</div><div class="kpi" id="userCount">0</div></div>
      </div>
    </section>

    <section style="margin-top:24px;">
      <h2>💹 Топ криптовалюты (Реальные курсы)</h2>
      <div class="card">
        <table>
          <thead><tr><th>Пара</th><th>Цена</th><th>Изменение 24ч</th><th>Объем</th><th>Market Cap</th></tr></thead>
          <tbody id="markets"></tbody>
        </table>
      </div>
    </section>

    <section style="margin-top:24px;">
      <h2>Наши тарифы</h2>
      <div class="grid">
        <div class="card">
          <h3>Start</h3>
          <p class="muted">Для малого бизнеса</p>
          <div class="kpi">$49/мес</div>
          <p class="muted">✓ До 10 ордеров/день<br>✓ Базовая аналитика</p>
        </div>
        <div class="card">
          <h3>Pro</h3>
          <p class="muted">Для команд</p>
          <div class="kpi">$149/мес</div>
          <p class="muted">✓ Неограниченно ордеров<br>✓ Продвинутая аналитика</p>
        </div>
        <div class="card">
          <h3>Enterprise</h3>
          <p class="muted">Для корпораций</p>
          <div class="kpi">Индивидуально</div>
          <p class="muted">✓ API доступ<br>✓ 24/7 поддержка</p>
        </div>
      </div>
    </section>
  </main>

  <footer>© 2026 Business Crypto Trading | Все права защищены</footer>
  <script>
    function updateMarkets() {
      fetch('/api/market').then(r => r.json()).then(data => {
        const html = data.map(m => {
          const vol = m.volume ? (m.volume / 1e9).toFixed(2) + 'B' : 'N/A';
          const cap = m.marketCap ? (m.marketCap / 1e9).toFixed(2) + 'B' : 'N/A';
          return \`<tr class="updating">
            <td><strong>\${m.pair}</strong></td>
            <td>$\${m.price ? m.price.toLocaleString('en-US', {maximumFractionDigits: 2}) : 'N/A'}</td>
            <td class="\${m.change > 0 ? 'positive' : 'negative'}">\${m.change > 0 ? '+' : ''}\${m.change ? m.change.toFixed(2) : 'N/A'}%</td>
            <td>\${vol}</td>
            <td>\${cap}</td>
          </tr>\`;
        }).join('');
        document.getElementById('markets').innerHTML = html;
      });
    }

    updateMarkets();
    setInterval(updateMarkets, 30000);

    fetch('/api/orders').then(r => r.json()).then(data => document.getElementById('orderCount').textContent = data.length);
    fetch('/api/portfolio').then(r => r.json()).then(data => document.getElementById('assetCount').textContent = data.assets);
    fetch('/api/users').then(r => r.json()).then(data => document.getElementById('userCount').textContent = data.length);
  </script>
</body>
</html>`);
});

// ... остальные маршруты остаются прежними ...

app.get('/dashboard', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Дашборд</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: Arial, sans-serif; background:#0b0f17; color:#e6e8ee; }
    header { padding:20px 24px; border-bottom:1px solid #1f2633; background:#0f1420; }
    .container { max-width:1200px; margin:0 auto; padding:24px; }
    .card { background:#121a2a; border:1px solid #1f2633; border-radius:12px; padding:18px; margin-bottom:16px; }
    .grid { display:grid; gap:16px; grid-template-columns: repeat(auto-fit,minmax(250px,1fr)); }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:10px; border-bottom:1px solid #1f2633; text-align:left; }
    tr:hover { background:#0f1420; }
    a { color:#3b82f6; text-decoration:none; }
    .btn-small { background:#3b82f6; color:#fff; padding:6px 12px; border-radius:4px; border:none; cursor:pointer; }
    h2 { margin-top:0; }
  </style>
</head>
<body>
  <header><h1>📊 Дашборд</h1></header>
  <div class="container">
    <div class="grid">
      <div class="card">
        <div style="color:#9aa4b2; font-size:14px;">Общий баланс</div>
        <div style="font-size:28px; font-weight:700;">$1,284,560</div>
      </div>
      <div class="card">
        <div style="color:#9aa4b2; font-size:14px;">Активные ордера</div>
        <div style="font-size:28px; font-weight:700;" id="ordersCount">0</div>
      </div>
      <div class="card">
        <div style="color:#9aa4b2; font-size:14px;">Сделок выполнено</div>
        <div style="font-size:28px; font-weight:700;" id="tradesCount">0</div>
      </div>
      <div class="card">
        <div style="color:#9aa4b2; font-size:14px;">Прибыль день</div>
        <div style="font-size:28px; font-weight:700; color:#22c55e;">+$28,450</div>
      </div>
    </div>

    <div class="card">
      <h2>Разбор портфеля по активам</h2>
      <table id="portfolio">
        <thead><tr><th>Актив</th><th>Сумма</th><th>% от портфеля</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>

    <div class="card">
      <h2>Последние сделки</h2>
      <table>
        <thead><tr><th>Криптовалюта</th><th>Тип</th><th>Количество</th><th>Цена</th><th>Дата</th><th>Действие</th></tr></thead>
        <tbody id="trades"></tbody>
      </table>
    </div>

    <a href="/">← Назад на главную</a>
  </div>

  <script>
    Promise.all([
      fetch('/api/trades').then(r => r.json()),
      fetch('/api/portfolio').then(r => r.json()),
      fetch('/api/orders').then(r => r.json())
    ]).then(([trades, portfolio, orders]) => {
      document.getElementById('tradesCount').textContent = trades.length;
      document.getElementById('ordersCount').textContent = orders.length;
      
      const tradesHtml = trades.map(t => \`<tr><td>\${t.cryptocurrency}</td><td>\${t.type}</td><td>\${t.amount}</td><td>$\${t.price}</td><td>\${new Date(t.date).toLocaleDateString()}</td><td><button class="btn-small" onclick="deleteTrade(\${t.id})">Удалить</button></td></tr>\`).join('');
      document.getElementById('trades').innerHTML = tradesHtml || '<tr><td colspan="6">Нет сделок</td></tr>';

      const portfolioHtml = Object.entries(portfolio.breakdown || {}).map(([asset, sum]: [string, any]) => \`<tr><td>\${asset}</td><td>$\${(sum as number).toFixed(2)}</td><td>\${(((sum as number) / portfolio.balance) * 100).toFixed(1)}%</td></tr>\`).join('');
      document.getElementById('portfolio').querySelector('tbody').innerHTML = portfolioHtml;
    });

    function deleteTrade(id) {
      fetch(\`/api/trades/\${id}\`, { method: 'DELETE' }).then(() => location.reload());
    }
  </script>
</body>
</html>`);
});

app.get('/trade', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Торговля</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: Arial, sans-serif; background:#0b0f17; color:#e6e8ee; }
    .container { max-width:900px; margin:0 auto; padding:24px; }
    .grid { display:grid; gap:24px; grid-template-columns: 1fr 1fr; }
    .form { background:#121a2a; border:1px solid #1f2633; border-radius:12px; padding:24px; }
    input, select { width:100%; padding:10px; margin:10px 0; background:#0b0f17; border:1px solid #1f2633; color:#e6e8ee; border-radius:4px; box-sizing:border-box; }
    button { width:100%; padding:12px; background:#3b82f6; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold; margin-top:10px; }
    button:hover { background:#2563eb; }
    a { color:#3b82f6; display:inline-block; margin-top:16px; }
    label { display:block; margin-top:12px; color:#9aa4b2; font-size:14px; }
    .preview { background:#0b0f17; padding:12px; border-radius:4px; margin-top:10px; }
    h2 { margin-top:0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>💹 Создать торговую сделку</h1>
    <div class="grid">
      <div class="form">
        <h2>BUY сделка (Покупка)</h2>
        <form id="buyForm">
          <label>Криптовалюта</label>
          <select name="cryptocurrency" required>
            <option>Выберите актив</option>
            <option>BTC</option>
            <option>ETH</option>
            <option>SOL</option>
            <option>XRP</option>
            <option>ADA</option>
          </select>
          <label>Количество</label>
          <input type="number" step="0.01" name="amount" placeholder="0.00" required>
          <label>Цена за единицу ($)</label>
          <input type="number" step="0.01" name="price" placeholder="0.00" required>
          <div class="preview">Сумма: <strong id="buyTotal">0</strong></div>
          <button type="submit">✓ Купить</button>
        </form>
      </div>

      <div class="form">
        <h2>SELL сделка (Продажа)</h2>
        <form id="sellForm">
          <label>Криптовалюта</label>
          <select name="cryptocurrency" required>
            <option>Выберите актив</option>
            <option>BTC</option>
            <option>ETH</option>
            <option>SOL</option>
            <option>XRP</option>
            <option>ADA</option>
          </select>
          <label>Количество</label>
          <input type="number" step="0.01" name="amount" placeholder="0.00" required>
          <label>Цена за единицу ($)</label>
          <input type="number" step="0.01" name="price" placeholder="0.00" required>
          <div class="preview">Сумма: <strong id="sellTotal">0</strong></div>
          <button type="submit">✓ Продать</button>
        </form>
      </div>
    </div>

    <a href="/dashboard">← Назад к дашборду</a>
  </div>

  <script>
    function setupForm(formId, totalId, type) {
      const form = document.getElementById(formId);
      form.addEventListener('input', () => {
        const amount = parseFloat(form.amount.value) || 0;
        const price = parseFloat(form.price.value) || 0;
        document.getElementById(totalId).textContent = '$' + (amount * price).toFixed(2);
      });
      form.onsubmit = async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const res = await fetch('/api/trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({...Object.fromEntries(data), type})
        });
        if(res.ok) { alert('Сделка создана!'); form.reset(); }
      };
    }
    setupForm('buyForm', 'buyTotal', 'BUY');
    setupForm('sellForm', 'sellTotal', 'SELL');
  </script>
</body>
</html>`);
});

app.get('/orders', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Ордера</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: Arial, sans-serif; background:#0b0f17; color:#e6e8ee; }
    .container { max-width:1200px; margin:0 auto; padding:24px; }
    .form { background:#121a2a; border:1px solid #1f2633; border-radius:12px; padding:24px; margin-bottom:24px; }
    input, select { padding:10px; margin:5px 5px 5px 0; background:#0b0f17; border:1px solid #1f2633; color:#e6e8ee; border-radius:4px; }
    button { padding:10px 20px; background:#3b82f6; color:#fff; border:none; border-radius:4px; cursor:pointer; }
    table { width:100%; border-collapse:collapse; background:#121a2a; border:1px solid #1f2633; border-radius:12px; overflow:hidden; }
    th, td { padding:12px; border-bottom:1px solid #1f2633; text-align:left; }
    .pending { background:#854d0e; padding:4px 8px; border-radius:4px; }
    .completed { background:#065f46; padding:4px 8px; border-radius:4px; }
    a { color:#3b82f6; display:inline-block; margin-top:16px; }
    h2 { margin-top:0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 Управление ордерами</h1>
    
    <div class="form">
      <h2>Создать новый ордер</h2>
      <form id="orderForm" style="display:flex; gap:10px; flex-wrap:wrap;">
        <select name="cryptocurrency" required>
          <option>Выберите актив</option>
          <option>BTC</option>
          <option>ETH</option>
          <option>SOL</option>
        </select>
        <input type="number" step="0.01" name="amount" placeholder="Количество" required>
        <input type="number" step="0.01" name="priceLimit" placeholder="Предельная цена" required>
        <select name="type" required>
          <option>BUY</option>
          <option>SELL</option>
        </select>
        <button type="submit">Создать ордер</button>
      </form>
    </div>

    <div style="background:#121a2a; border:1px solid #1f2633; border-radius:12px; overflow:hidden;">
      <table>
        <thead><tr><th>ID</th><th>Актив</th><th>Кол-во</th><th>Цена</th><th>Тип</th><th>Статус</th><th>Дата</th><th>Действие</th></tr></thead>
        <tbody id="ordersList"></tbody>
      </table>
    </div>

    <a href="/dashboard">← Назад к дашборду</a>
  </div>

  <script>
    function loadOrders() {
      fetch('/api/orders').then(r => r.json()).then(orders => {
        const html = orders.map(o => \`<tr>
          <td>#\${o.id}</td>
          <td>\${o.cryptocurrency}</td>
          <td>\${o.amount}</td>
          <td>$\${o.priceLimit}</td>
          <td>\${o.type}</td>
          <td><span class="\${o.status}">\${o.status}</span></td>
          <td>\${new Date(o.date).toLocaleDateString()}</td>
          <td><button onclick="cancelOrder(\${o.id})">Отменить</button></td>
        </tr>\`).join('');
        document.getElementById('ordersList').innerHTML = html || '<tr><td colspan="8">Нет ордеров</td></tr>';
      });
    }

    function cancelOrder(id) {
      fetch(\`/api/orders/\${id}\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }).then(() => loadOrders());
    }

    document.getElementById('orderForm').onsubmit = async (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data)) });
      if(res.ok) { e.target.reset(); loadOrders(); }
    };

    loadOrders();
  </script>
</body>
</html>`);
});

app.get('/alerts', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Уведомления</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: Arial, sans-serif; background:#0b0f17; color:#e6e8ee; }
    .container { max-width:1000px; margin:0 auto; padding:24px; }
    .form { background:#121a2a; border:1px solid #1f2633; border-radius:12px; padding:24px; margin-bottom:24px; }
    input, select { padding:10px; margin:5px 5px 5px 0; background:#0b0f17; border:1px solid #1f2633; color:#e6e8ee; border-radius:4px; }
    button { padding:10px 20px; background:#3b82f6; color:#fff; border:none; border-radius:4px; cursor:pointer; }
    .alert-item { background:#121a2a; border:1px solid #1f2633; border-radius:12px; padding:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; }
    .alert-info { flex:1; }
    .alert-type { background:#3b82f6; color:#fff; padding:4px 8px; border-radius:4px; font-size:12px; margin-right:12px; }
    a { color:#3b82f6; display:inline-block; margin-top:16px; }
    h2 { margin-top:0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔔 Уведомления о цене</h1>
    
    <div class="form">
      <h2>Установить новое уведомление</h2>
      <form id="alertForm" style="display:flex; gap:10px; flex-wrap:wrap;">
        <select name="cryptocurrency" required>
          <option>Выберите актив</option>
          <option>BTC</option>
          <option>ETH</option>
          <option>SOL</option>
        </select>
        <input type="number" step="0.01" name="price" placeholder="Цена для уведомления ($)" required>
        <select name="type" required>
          <option>ABOVE (Выше)</option>
          <option>BELOW (Ниже)</option>
        </select>
        <button type="submit">Добавить уведомление</button>
      </form>
    </div>

    <h2>Активные уведомления</h2>
    <div id="alertsList"></div>

    <a href="/dashboard">← Назад к дашборду</a>
  </div>

  <script>
    function loadAlerts() {
      fetch('/api/alerts').then(r => r.json()).then(alerts => {
        const html = alerts.map(a => \`
          <div class="alert-item">
            <div class="alert-info">
              <span class="alert-type">\${a.type}</span>
              <strong>\${a.cryptocurrency}</strong> при цене <strong>$\${a.price}</strong>
              <br><small style="color:#9aa4b2;">Создано: \${new Date(a.date).toLocaleDateString()}</small>
            </div>
            <button onclick="deleteAlert(\${a.id})">✕ Удалить</button>
          </div>
        \`).join('');
        document.getElementById('alertsList').innerHTML = html || '<p style="color:#9aa4b2;">Нет активных уведомлений</p>';
      });
    }

    function deleteAlert(id) {
      fetch(\`/api/alerts/\${id}\`, { method: 'DELETE' }).then(() => loadAlerts());
    }

    document.getElementById('alertForm').onsubmit = async (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      const res = await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data)) });
      if(res.ok) { e.target.reset(); loadAlerts(); }
    };

    loadAlerts();
  </script>
</body>
</html>`);
});

app.get('/watchlist', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Мой список</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: Arial, sans-serif; background:#0b0f17; color:#e6e8ee; }
    .container { max-width:1200px; margin:0 auto; padding:24px; }
    .card { background:#121a2a; border:1px solid #1f2633; border-radius:12px; padding:18px; }
    .grid { display:grid; gap:16px; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); }
    .crypto-card { background:#0b0f17; border:1px solid #1f2633; border-radius:8px; padding:16px; }
    .price { font-size:24px; font-weight:700; margin:10px 0; }
    .positive { color:#22c55e; }
    .negative { color:#ef4444; }
    button { padding:8px 16px; background:#3b82f6; color:#fff; border:none; border-radius:4px; cursor:pointer; }
    .add-form { display:flex; gap:10px; margin-bottom:24px; }
    input, select { padding:10px; background:#0b0f17; border:1px solid #1f2633; color:#e6e8ee; border-radius:4px; }
    a { color:#3b82f6; display:inline-block; margin-top:16px; }
    h2 { margin-top:0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⭐ Мой список наблюдения</h1>
    
    <div class="add-form">
      <select id="cryptoSelect">
        <option>Добавить в список</option>
        <option>BTC</option>
        <option>ETH</option>
        <option>SOL</option>
        <option>XRP</option>
        <option>ADA</option>
      </select>
      <button onclick="addToWatchlist()">+ Добавить</button>
    </div>

    <div class="grid" id="watchlistGrid"></div>

    <a href="/dashboard">← Назад к дашборду</a>
  </div>

  <script>
    function loadWatchlist() {
      Promise.all([
        fetch('/api/watchlist').then(r => r.json()),
        fetch('/api/market').then(r => r.json())
      ]).then(([assets, marketData]) => {
        const pricesMap = {};
        marketData.forEach(m => {
          const symbol = m.pair.split('/')[0];
          pricesMap[symbol] = m;
        });

        const html = assets.map(a => {
          const data = pricesMap[a];
          return \`
            <div class="crypto-card">
              <h3>\${a}</h3>
              <div class="price">$\${data ? data.price.toLocaleString('en-US', {maximumFractionDigits: 2}) : 'N/A'}</div>
              <div class="\${data && data.change > 0 ? 'positive' : 'negative'}">\${data ? (data.change > 0 ? '+' : '') + data.change.toFixed(2) : 'N/A'}%</div>
              <button onclick="removeFromWatchlist('\${a}')">✕ Удалить</button>
            </div>
          \`;
        }).join('');
        document.getElementById('watchlistGrid').innerHTML = html || '<p style="color:#9aa4b2;">Добавьте активы в список наблюдения</p>';
      });
    }

    function addToWatchlist() {
      const crypto = document.getElementById('cryptoSelect').value;
      if(crypto === 'Добавить в список') return;
      fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cryptocurrency: crypto }) }).then(() => { document.getElementById('cryptoSelect').value = 'Добавить в список'; loadWatchlist(); });
    }

    function removeFromWatchlist(crypto) {
      fetch(\`/api/watchlist/\${crypto}\`, { method: 'DELETE' }).then(() => loadWatchlist());
    }

    loadWatchlist();
    setInterval(loadWatchlist, 30000);
  </script>
</body>
</html>`);
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n✓ Server running on http://localhost:${PORT}\n`);
    console.log('Routes:');
    console.log('  / - Главная страница');
    console.log('  /dashboard - Дашборд с портфелем');
    console.log('  /trade - Создание сделок (BUY/SELL)');
    console.log('  /orders - Управление лимит-ордерами');
    console.log('  /alerts - Уведомления о цене');
    console.log('  /watchlist - Список наблюдения\n');
});