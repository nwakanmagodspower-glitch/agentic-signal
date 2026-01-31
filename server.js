const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const OneSignal = require('onesignal-node');
const { RSI, MACD, BollingerBands } = require('technicalindicators');
const cors = require('cors');

// --- CONFIGURATION ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// 1. TELEGRAM SETUP
// ⚠️ PASTE YOUR TELEGRAM BOT TOKEN BELOW INSIDE THE QUOTES
const token = 'PASTE_YOUR_TELEGRAM_BOT_TOKEN_HERE'; 
const bot = new TelegramBot(token, { polling: true });

// 2. ONESIGNAL SETUP (SECURE - PULLS FROM RENDER VAULT)
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

// Check if keys are loaded correctly
if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.log("⚠️ WARNING: OneSignal Keys are missing from Environment Variables!");
}

const oneSignalClient = new OneSignal.Client(ONESIGNAL_APP_ID, ONESIGNAL_API_KEY);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// --- TRADING LOGIC VARIABLES ---
let marketData = [];
const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'];
const TIMEFRAME = '1m';

// --- FUNCTIONS ---

// 1. GENERATE MOCK DATA (Simulates market prices)
function generateData() {
    const lastPrice = marketData.length > 0 ? marketData[marketData.length - 1].close : 1.1000;
    const volatility = 0.0005;
    const change = (Math.random() - 0.5) * volatility;
    const newPrice = lastPrice + change;

    const candle = {
        time: new Date().toLocaleTimeString(),
        open: lastPrice,
        high: newPrice + 0.0002,
        low: newPrice - 0.0002,
        close: newPrice
    };

    marketData.push(candle);
    if (marketData.length > 100) marketData.shift(); // Keep last 100 candles
    return candle;
}

// 2. CALCULATE INDICATORS
function analyzeMarket() {
    if (marketData.length < 20) return null;

    const closes = marketData.map(d => d.close);

    // RSI
    const rsiInput = { values: closes, period: 14 };
    const rsiValues = RSI.calculate(rsiInput);
    const currentRSI = rsiValues[rsiValues.length - 1];

    // MACD
    const macdInput = { values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false };
    const macdValues = MACD.calculate(macdInput);
    const currentMACD = macdValues[macdValues.length - 1];

    // BOLLINGER BANDS
    const bbInput = { period: 20, values: closes, stdDev: 2 };
    const bbValues = BollingerBands.calculate(bbInput);
    const currentBB = bbValues[bbValues.length - 1];

    return { rsi: currentRSI, macd: currentMACD, bb: currentBB, price: closes[closes.length - 1] };
}

// 3. GENERATE SIGNALS
function checkSignals(analysis) {
    if (!analysis) return;

    let signal = null;

    // BUY LOGIC: RSI < 30 (Oversold) + Price below Lower BB
    if (analysis.rsi < 30 && analysis.price < analysis.bb.lower) {
        signal = "CALL (BUY) 🟢";
    }
    // SELL LOGIC: RSI > 70 (Overbought) + Price above Upper BB
    else if (analysis.rsi > 70 && analysis.price > analysis.bb.upper) {
        signal = "PUT (SELL) 🔴";
    }

    if (signal) {
        console.log(`🚀 SIGNAL DETECTED: ${signal}`);
        sendNotifications(signal, analysis.price);
        io.emit('new-signal', { type: signal, price: analysis.price, time: new Date().toLocaleTimeString() });
    }
}

// 4. SEND NOTIFICATIONS (TELEGRAM + ONESIGNAL)
async function sendNotifications(signal, price) {
    const message = `🔥 AGENTIC SIGNAL 🔥\n\nType: ${signal}\nPrice: ${price.toFixed(5)}\nTime: ${new Date().toLocaleTimeString()}`;

    // Send to OneSignal (Mobile Push)
    if (ONESIGNAL_APP_ID && ONESIGNAL_API_KEY) {
        try {
            const notification = {
                contents: { 'en': message },
                included_segments: ['All']
            };
            await oneSignalClient.createNotification(notification);
            console.log("✅ OneSignal Sent");
        } catch (e) {
            console.log("❌ OneSignal Error:", e.statusCode);
        }
    }

    // Send to Telegram (if Chat ID is known - typically user starts bot first)
    // Note: To broadcast, you'd need to store user IDs. This replies to whoever is active.
}

// --- SERVER LOOPS ---

// Run Analysis Every 5 Seconds
setInterval(() => {
    const candle = generateData();
    const analysis = analyzeMarket();
    
    io.emit('market-update', { candle, analysis }); // Send data to website
    checkSignals(analysis); // Check for buy/sell

}, 5000);

// --- ROUTES ---
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// IQ Option Postback Endpoint (Optional)
app.get('/postback', (req, res) => {
    console.log("💰 Postback Received:", req.query);
    res.status(200).send('OK');
});

// Telegram Bot Listener
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🤖 Agentic Bot Connected! Waiting for signals...");
});

// Start Server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});