/**
 * GODSPOWER AGENTIC ANALYZER - PROFESSIONAL EDITION
 * -------------------------------------------------
 * MODE: On-Demand Analysis (Click -> Scan -> Signal)
 * ASSETS: 5 Pairs (EUR, JPY, GBP, XAU, BTC)
 * TELEGRAM: Auto-Approve + Safe Welcome + 30m Teaser
 * FEATURES: User Memory, 3-Tier VIP, Self-Ping
 */

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// --- CONFIGURATION ---
const CONFIG = {
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
    TELEGRAM_CHANNEL_LINK: 'https://t.me/+3KiO2QaEg8tjNzI0',
    AFFILIATE_ID: '782547',
    ADMIN_SECRET: 'godspower123',
    SITE_URL: 'https://agentic-signal.onrender.com'
};

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- ASSET CONFIGURATION (5 PAIRS) ---
const ASSETS = {
    'EUR/USD-OTC': { tier: 1, name: 'EUR/USD' },
    'USD/JPY-OTC': { tier: 1, name: 'USD/JPY' },
    'GBP/USD-OTC': { tier: 2, name: 'GBP/USD' },
    'XAU/USD-OTC': { tier: 3, name: 'GOLD (XAU)' },
    'BTC/USD':     { tier: 3, name: 'BITCOIN' }
};

// --- DATABASE ---
const TG_DB_FILE = 'telegram_users.json';
const WEB_DB_FILE = 'website_users.json';
let telegramUsers = new Set();
let websiteUsers = {}; 
let clickIdMap = {};   

if (fs.existsSync(TG_DB_FILE)) try { telegramUsers = new Set(JSON.parse(fs.readFileSync(TG_DB_FILE))); } catch (e) {}
if (fs.existsSync(WEB_DB_FILE)) try { websiteUsers = JSON.parse(fs.readFileSync(WEB_DB_FILE)); } catch (e) {}

function saveTgUsers() { fs.writeFileSync(TG_DB_FILE, JSON.stringify([...telegramUsers])); }
function saveWebUsers() { fs.writeFileSync(WEB_DB_FILE, JSON.stringify(websiteUsers)); }

// --- BOT START ---
let bot;
try {
    if (CONFIG.TELEGRAM_TOKEN) {
        bot = new TelegramBot(CONFIG.TELEGRAM_TOKEN, { 
            polling: { params: { allowed_updates: ["message", "chat_join_request", "callback_query"] } } 
        });
        console.log("✅ ANALYZER BOT STARTED");
    }
} catch (e) { console.log("⚠️ Bot Error:", e.message); }

app.use(express.static('public'));
app.use(bodyParser.json());

// --- KEEP-ALIVE ---
setInterval(() => { axios.get(CONFIG.SITE_URL).catch(() => {}); }, 600000); 

// ==========================================
// 🔌 ON-DEMAND ANALYSIS LOGIC
// ==========================================
io.on('connection', (socket) => {
    
    // 1. Check Memory (Auto-Unlock)
    socket.on('check_user_status', (userId) => {
        if (websiteUsers[userId] && websiteUsers[userId].tier > 0) {
            socket.emit('account_unlocked', {
                tier: websiteUsers[userId].tier,
                message: "VIP ANALYZER RESTORED 🚀"
            });
        }
    });

    // 2. Analyze Request
    socket.on('analyze_market', (data) => {
        const { userId, asset } = data;
        
        // Validation
        if (!ASSETS[asset]) return;

        // Generate Analysis
        const rsi = Math.floor(Math.random() * (85 - 15) + 15);
        let decision = "HOLD";
        
        // Smart Logic
        if (rsi > 75) decision = "PUT (SELL) ⬇";
        else if (rsi < 25) decision = "CALL (BUY) ⬆";
        else decision = Math.random() > 0.5 ? "CALL (BUY) ⬆" : "PUT (SELL) ⬇";

        const result = {
            pair: asset, 
            price: (1.0000 + Math.random()).toFixed(4),
            rsi: rsi,
            decision: decision,
            expiry: 'M5', // Fixed M5
            tierRequired: ASSETS[asset].tier,
            timestamp: new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Lagos', hour: '2-digit', minute:'2-digit' })
        };

        // Artificial "Scanning" Delay (2 seconds)
        setTimeout(() => {
            socket.emit('analysis_result', result);
        }, 2000);
    });
});

// --- ADMIN & AFFILIATE ---
app.get('/admin/go-live', (req, res) => {
    if (req.query.secret !== CONFIG.ADMIN_SECRET) return res.send("❌ Access Denied.");
    if (!bot) return res.send("❌ Bot not active.");
    const liveMsg = `🔴 **I AM LIVE NOW!**\n\nTrading session started. Don't miss this!`;
    const opts = { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔴 WATCH STREAM", url: CONFIG.TELEGRAM_CHANNEL_LINK }]] } };
    telegramUsers.forEach(chatId => bot.sendMessage(chatId, liveMsg, opts).catch(() => {}));
    res.send(`✅ Broadcast sent!`);
});

app.get('/generate-link', (req, res) => {
    const userId = req.query.userId;
    const clickId = uuidv4();
    if(!websiteUsers[userId]) { websiteUsers[userId] = { tier: 0 }; saveWebUsers(); }
    clickIdMap[clickId] = userId;
    res.json({ link: `https://iqoption.net/lp/mobile-partner-pwa/?aff=${CONFIG.AFFILIATE_ID}&aff_model=revenue&afftrack=${clickId}` });
});

app.get('/api/postback', (req, res) => {
    const clickId = req.query.aff_sub || req.query.click_id;
    const amount = parseFloat(req.query.amount) || 0;
    if (clickId && clickIdMap[clickId]) {
        const userId = clickIdMap[clickId];
        let newTier = 0;
        if (amount >= 25) newTier = 1; 
        if (amount >= 100) newTier = 2; 
        if (amount >= 500) newTier = 3; 
        if (newTier > 0) {
            websiteUsers[userId].tier = newTier;
            saveWebUsers();
            io.to(userId).emit('account_unlocked', { tier: newTier, message: `VIP UNLOCKED! Deposit: $${amount}` });
        }
    }
    res.send("Postback Received");
});

// --- BACKGROUND TELEGRAM ALERTS (30 Min Teaser) ---
let lastTelegramTime = 0;
setInterval(() => {
    const now = Date.now();
    // 30-Minute Interval
    if (bot && now - lastTelegramTime > (30 * 60 * 1000)) {
        // Tease XAU or BTC
        const target = Math.random() > 0.5 ? 'XAU/USD-OTC' : 'BTC/USD';
        
        telegramUsers.forEach(chatId => {
                bot.sendMessage(chatId, `🔥 **VIP OPPORTUNITY DETECTED**\nAsset: ${target}\nDirection: HIDDEN 🔒\n\n👇 *Click to Analyze Now:*`, { 
                    parse_mode: 'Markdown', 
                    reply_markup: { inline_keyboard: [[{ text: "⚡ ANALYZE MARKET", url: CONFIG.SITE_URL }]] } 
                }).catch(() => {});
        });
        lastTelegramTime = now;
    }
}, 60000); 

// --- BOT JOIN & WELCOME ---
if (bot) {
    bot.onText(/\/start/, (msg) => sendWelcome(msg.chat.id, msg.from.first_name));
    
    bot.on('chat_join_request', async (msg) => {
        try { await bot.approveChatJoinRequest(msg.chat.id, msg.from.id); } catch(e){}
        setTimeout(() => sendWelcome(msg.from.id, msg.from.first_name), 5000);
    });

    function sendWelcome(chatId, firstName) {
        firstName = firstName || "Trader";
        telegramUsers.add(chatId);
        saveTgUsers();
        
        const welcomeMsg = `
*👋 Hello ${firstName}, Welcome to AGENTIC ANALYZER*
━━━━━━━━━━━━━━━━━━
Our AI is ready to scan the market for you.

🚀 **AVAILABLE ASSETS:**
● XAU/USD (Gold)
● BTC/USD
● EUR/USD & GBP/USD

👇 *LAUNCH THE APP TO SCAN:*
`;
        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "⚡ LAUNCH ANALYZER", url: CONFIG.SITE_URL }],
                    [{ text: "📊 JOIN COMMUNITY", url: CONFIG.TELEGRAM_CHANNEL_LINK }]
                ]
            }
        };
        bot.sendMessage(chatId, welcomeMsg, opts).catch(()=>{});
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));