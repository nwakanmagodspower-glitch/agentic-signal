/**
 * GODSPOWER AGENTIC SIGNAL - FINAL PRODUCTION BUILD
 * Features: Martingale Logic, WAT Timezone, Affiliate Tracking, Push Notifications
 */

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const OneSignal = require('onesignal-node');
const { RSI, MACD, BollingerBands } = require('technicalindicators');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// ==========================================
// 🔧 CONFIGURATION (YOUR SPECIFIC KEYS)
// ==========================================
const CONFIG = {
    // 1. Telegram
    TELEGRAM_TOKEN: '7947848762:AAHbZhjPWguULgGAJjVu5FS59D7RT5o4P1A', 
    TELEGRAM_CHANNEL: 'https://t.me/+3KiO2QaEg8tjNzI0',

    // 2. OneSignal (App ID + REST API Key)
    ONESIGNAL_APP_ID: '3552e19d-e987-49b0-8885-e09175dcc1c9',
    ONESIGNAL_API_KEY: 'os_v2_app_gvjodhpjq5e3bcef4cixlxgbzfh7r2shym6edeux45dwdzue5mvzjgpjhk7lnwqz6cps43auop67g6ubcfmyekp6jacevogclgi3pfy',

    // 3. Admin & Affiliate
    ADMIN_SECRET: 'mypassword123',
    // Your Link Base
    AFFILIATE_BASE: 'https://iqoption.net/lp/mobile-partner-pwa/?aff=782547&aff_model=revenue',
    
    // 4. Render URL
    SITE_URL: 'https://agentic-signal.onrender.com'
};

// ==========================================
// 🚀 SERVER SETUP
// ==========================================
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const bot = new TelegramBot(CONFIG.TELEGRAM_TOKEN, { polling: true });

// Initialize OneSignal
let oneSignalClient;
try {
    oneSignalClient = new OneSignal.Client(CONFIG.ONESIGNAL_APP_ID, CONFIG.ONESIGNAL_API_KEY);
} catch (e) { console.error("OneSignal Init Error:", e.message); }

app.use(express.static('public'));
app.use(bodyParser.json());

// --- DATABASE & MEMORY ---
let users = {};          
let clickIdMap = {};     
let telegramUsers = new Set();
if (fs.existsSync('tg_users.json')) {
    try { telegramUsers = new Set(JSON.parse(fs.readFileSync('tg_users.json'))); } catch(e){}
}
function saveTgUsers() {
    fs.writeFileSync('tg_users.json', JSON.stringify([...telegramUsers]));
}

// Market History (Mock Data for Analysis)
let marketHistory = { 'EUR/USD': [], 'GBP/USD': [], 'USD/JPY': [], 'OTC-GOLD': [], 'BTC/USD': [] };
Object.keys(marketHistory).forEach(p => {
    let price = p.includes('JPY') ? 140.00 : (p.includes('GOLD') ? 2000 : 1.0800);
    for(let i=0; i<60; i++) marketHistory[p].push(price + (Math.random()-0.5));
});

// ==========================================
// 🤖 TELEGRAM BOT LOGIC
// ==========================================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    telegramUsers.add(chatId);
    saveTgUsers();
    bot.sendMessage(chatId, `👁‍🗨 **GODSPOWER AGENTIC SYSTEM**\n\nI am the AI Agent.\n\n1️⃣ **Join Teaching Channel:**\n${CONFIG.TELEGRAM_CHANNEL}\n\n2️⃣ **Access Dashboard:**\n${CONFIG.SITE_URL}`, { parse_mode: 'Markdown' });
});

// Broadcast Feature
app.get('/admin/go-live', (req, res) => {
    if (req.query.secret !== CONFIG.ADMIN_SECRET) return res.send("Access Denied");
    const msg = `🔴 **MASTER IS LIVE**\n\nTeaching the Agentic Strategy now.\n👇 **JOIN STREAM:**\n${CONFIG.TELEGRAM_CHANNEL}`;
    telegramUsers.forEach(id => bot.sendMessage(id, msg, { parse_mode: 'Markdown' }).catch(()=>{}));
    res.send("Broadcast Sent.");
});

// ==========================================
// 💰 AFFILIATE SYSTEM (Using 'afftrack')
// ==========================================
app.get('/generate-link', (req, res) => {
    const userId = req.query.userId;
    const clickId = uuidv4(); 
    clickIdMap[clickId] = userId;
    if (!users[userId]) users[userId] = { tier: 0 };
    
    // Using 'afftrack' parameter as requested
    const link = `${CONFIG.AFFILIATE_BASE}&afftrack=${clickId}`;
    res.json({ link });
});

app.get('/api/postback', (req, res) => {
    const clickId = req.query.afftrack || req.query.aff_sub || req.query.click_id; 
    const amount = parseFloat(req.query.amount) || 0;
    
    if (clickId && clickIdMap[clickId]) {
        const userId = clickIdMap[clickId];
        let newTier = 0;
        if (amount >= 20) newTier = 1;
        if (amount >= 99) newTier = 2;
        if (amount >= 500) newTier = 3;

        if (newTier > users[userId].tier) {
            users[userId].tier = newTier;
            io.to(userId).emit('tier_update', { tier: newTier });
            console.log(`User ${userId} upgraded to Tier ${newTier}`);
        }
    }
    res.send("OK");
});

// ==========================================
// 🧠 AGENTIC BRAIN (Analysis Logic)
// ==========================================
function analyzeMarket(prices) {
    const rsi = RSI.calculate({ values: prices, period: 14 });
    const bb = BollingerBands.calculate({ values: prices, period: 20, stdDev: 2 });
    const macd = MACD.calculate({ values: prices, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
    
    const lastRSI = rsi[rsi.length - 1];
    const price = prices[prices.length - 1];
    const lastMACD = macd[macd.length - 1];

    let decision = "HOLD";
    let score = 0; 
    let confidence = 0;

    // SIGNAL STRATEGY
    const lowerBand = bb[bb.length-1].lower;
    const upperBand = bb[bb.length-1].upper;

    if (lastRSI < 35 && price < lowerBand) {
        decision = "HIGHER 🟩"; 
        score = 2;
        confidence = 85 + Math.floor(Math.random() * 8); 
    }
    if (lastRSI > 65 && price > upperBand) {
        decision = "LOWER 🟥";
        score = 2;
        confidence = 85 + Math.floor(Math.random() * 8);
    }

    // MACD Filter
    if ((decision.includes("HIGHER") && lastMACD.MACD > lastMACD.signal) || 
        (decision.includes("LOWER") && lastMACD.MACD < lastMACD.signal)) {
        score = 3;
        confidence += 4; 
    }

    let tierRequired = 1;
    if (score === 3) tierRequired = 3; 
    else if (score === 2) tierRequired = 2;

    return { decision, tierRequired, confidence, price };
}

// ==========================================
// ⏱ MAIN SIGNAL LOOP
// ==========================================
let lastOneSignalTime = 0;
const PUSH_COOLDOWN = 60 * 60 * 1000; // 1 Hour

setInterval(async () => {
    // 1. Update Mock Prices
    const pairs = Object.keys(marketHistory);
    pairs.forEach(p => {
        let last = marketHistory[p][marketHistory[p].length-1];
        marketHistory[p].push(last + (Math.random()-0.5)*(last*0.002));
        if(marketHistory[p].length > 70) marketHistory[p].shift();
    });

    // 2. Analyze Random Pair
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const result = analyzeMarket(marketHistory[pair]);

    if (result.decision !== "HOLD") {
        
        // --- TIME CALCULATION (WAT Fix) ---
        // Render uses UTC. WAT is UTC+1.
        const now = new Date();
        const watOffset = 1 * 60 * 60 * 1000; 
        const watTime = new Date(now.getTime() + watOffset);

        const entryTime = watTime.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: true});
        // Martingale Times (+2, +4, +6 mins)
        const m1 = new Date(watTime.getTime() + 2*60000).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: true});
        const m2 = new Date(watTime.getTime() + 4*60000).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: true});
        const m3 = new Date(watTime.getTime() + 6*60000).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', hour12: true});

        // Force High Tier for Gold/BTC
        if (pair === 'OTC-GOLD' || pair === 'BTC/USD') result.tierRequired = Math.max(result.tierRequired, 2);

        const signalData = {
            pair, 
            price: result.price.toFixed(4),
            decision: result.decision, 
            tierRequired: result.tierRequired,
            confidence: result.confidence,
            entryTime: entryTime,
            martingale: [m1, m2, m3], 
            timestamp: Date.now()
        };

        io.emit('new_signal', signalData);

        // 3. Send OneSignal (VIP Only)
        const timeNow = Date.now();
        if (result.tierRequired === 3 && (timeNow - lastOneSignalTime > PUSH_COOLDOWN)) {
            try {
                if(oneSignalClient) {
                    await oneSignalClient.createNotification({
                        contents: { 'en': `🚨 AGENTIC ALERT: ${pair}\nConf: ${result.confidence}%\nEntry: ${entryTime}` },
                        headings: { 'en': '💎 Godspower Agentic Signal' },
                        included_segments: ["Subscribed Users"]
                    });
                    lastOneSignalTime = timeNow;
                    console.log("OneSignal Sent");
                }
            } catch(e) { console.log("OneSignal Error:", e.message); }
        }
    }
}, 15000); // Run every 15 seconds

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Agentic Server Running on Port ${PORT}`));