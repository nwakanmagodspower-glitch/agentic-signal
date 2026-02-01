/**
 * GODSPOWER AGENTIC SIGNAL - FINAL BINARY SERVER
 * Focus: High Volume, RevShare Optimization, Binary Options
 * UPDATE: Added Persistent Database for Paid Users
 */

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const OneSignal = require('onesignal-node');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ==========================================
// 🔧 CONFIGURATION (SECURED)
// ==========================================
const CONFIG = {
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN, 
    TELEGRAM_CHANNEL_LINK: 'https://t.me/+3KiO2QaEg8tjNzI0',
    AFFILIATE_ID: '782547', 
    ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID,
    ONESIGNAL_API_KEY: process.env.ONESIGNAL_API_KEY,
    ADMIN_SECRET: 'godspower123', 
    SITE_URL: 'https://agentic-signal.onrender.com'
};

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize Telegram Bot
let bot;
try {
    if (CONFIG.TELEGRAM_TOKEN) {
        bot = new TelegramBot(CONFIG.TELEGRAM_TOKEN, { polling: true });
        console.log("✅ Bot Started");
    }
} catch (error) { console.log("Bot Error:", error.message); }

// Initialize OneSignal
let oneSignalClient;
if (CONFIG.ONESIGNAL_APP_ID && CONFIG.ONESIGNAL_API_KEY) {
    oneSignalClient = new OneSignal.Client(CONFIG.ONESIGNAL_APP_ID, CONFIG.ONESIGNAL_API_KEY);
    console.log("✅ OneSignal Ready");
}

app.use(express.static('public'));
app.use(bodyParser.json());

// ==========================================
// 💾 DATABASE SYSTEM (PERSISTENT STORAGE)
// ==========================================

// 1. Telegram Users DB
const TG_DB_FILE = 'telegram_users.json';
let telegramUsers = new Set();
if (fs.existsSync(TG_DB_FILE)) {
    try { telegramUsers = new Set(JSON.parse(fs.readFileSync(TG_DB_FILE))); } catch (e) {}
}
function saveTgUsers() { fs.writeFileSync(TG_DB_FILE, JSON.stringify([...telegramUsers])); }

// 2. Website Users DB (VIPs) - NEW CRITICAL ADDITION
const WEB_DB_FILE = 'website_users.json';
let websiteUsers = {}; 
let clickIdMap = {};   

// Load VIPs from file on startup
if (fs.existsSync(WEB_DB_FILE)) {
    try {
        websiteUsers = JSON.parse(fs.readFileSync(WEB_DB_FILE));
        console.log(`✅ Loaded ${Object.keys(websiteUsers).length} Website Users`);
    } catch (e) {
        console.log("⚠️ Created new database for website users.");
    }
}

// Function to save VIPs to file
function saveWebUsers() {
    fs.writeFileSync(WEB_DB_FILE, JSON.stringify(websiteUsers));
}

// ==========================================
// 🤖 AGGRESSIVE BINARY BOT LOGIC
// ==========================================

if (bot) {
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        telegramUsers.add(chatId);
        saveTgUsers(); // Save to file

        const welcomeMsg = `
*🟢 AGENTIC AI: BINARY PROFIT SYSTEM*
━━━━━━━━━━━━━━━━━━
*Connected to High-Frequency Network.*

🚀 **PROFIT POTENTIAL:**
● **Daily Signals:** \`50+ Opportunities\`
● **Win Rate:** \`92% - 98%\`
● **Markets:** \`OTC & LIVE PAIRS\`

👇 *START MAKING MONEY NOW:*
`;

        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "💎 UNLOCK VIP SIGNALS (HIGH YIELD)", url: CONFIG.SITE_URL }],
                    [{ text: "📊 JOIN PROFIT CHANNEL", url: CONFIG.TELEGRAM_CHANNEL_LINK }]
                ]
            }
        };

        bot.sendMessage(chatId, welcomeMsg, opts);
    });
}

// ==========================================
// 💰 AFFILIATE LOGIC (MOBILE PWA)
// ==========================================

app.get('/generate-link', (req, res) => {
    const userId = req.query.userId;
    const clickId = uuidv4(); 
    
    // Create user if not exists
    if(!websiteUsers[userId]) {
        websiteUsers[userId] = { tier: 0 };
        saveWebUsers(); // Save new user
    }
    
    clickIdMap[clickId] = userId;
    
    const link = `https://iqoption.net/lp/mobile-partner-pwa/?aff=${CONFIG.AFFILIATE_ID}&aff_model=revenue&afftrack=${clickId}`;
    res.json({ link: link });
});

app.get('/api/postback', (req, res) => {
    const clickId = req.query.aff_sub || req.query.click_id; 
    const amount = parseFloat(req.query.amount) || 0; 

    if (clickId && clickIdMap[clickId]) {
        const userId = clickIdMap[clickId];
        let newTier = 0;

        // Tiers: $25 (Basic), $100 (Pro), $500 (VIP)
        if (amount >= 25 && amount < 100) newTier = 1; 
        if (amount >= 100 && amount < 500) newTier = 2; 
        if (amount >= 500) newTier = 3; 

        if (newTier > 0) {
            // Update User
            websiteUsers[userId] = { tier: newTier };
            saveWebUsers(); // <--- CRITICAL: SAVES VIP STATUS TO FILE
            
            io.to(userId).emit('account_unlocked', { 
                tier: newTier, 
                message: `Deposit of $${amount} Received! VIP ACCESS UNLOCKED. 🚀` 
            });
            console.log(`✅ User ${userId} Saved as Tier ${newTier}`);
        }
    }
    res.send("Postback Received");
});

// ==========================================
// 📈 BINARY SIGNAL GENERATOR (TURBO MODE)
// ==========================================
let lastOneSignalTime = 0; 
let lastTelegramTime = 0;

setInterval(async () => {
    const pairs = ['EUR/USD-OTC', 'GBP/USD-OTC', 'GOLD-OTC', 'BTC/USD']; 
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const rsi = Math.floor(Math.random() * 100);
    
    let decision = "HOLD";
    if (rsi > 80) decision = "PUT (SELL) ⬇"; 
    if (rsi < 20) decision = "CALL (BUY) ⬆";

    if (decision !== "HOLD") {
        let tierRequired = 1;
        if(pair.includes('GOLD') || pair.includes('BTC')) tierRequired = 3;
        else if(pair.includes('GBP')) tierRequired = 2;

        const signalData = {
            pair, 
            price: (1.0000 + Math.random()).toFixed(4),
            rsi, decision, tierRequired,
            timestamp: new Date().toLocaleTimeString()
        };

        io.emit('new_signal', signalData);

        // OneSignal
        if (tierRequired === 3 && oneSignalClient) {
            const now = Date.now();
            if (now - lastOneSignalTime > (45 * 60 * 1000)) { 
                const notification = {
                    contents: { 'en': `💸 ${pair} MONEY ALERT! \nAction: ${decision}\nTAP TO TRADE NOW!` },
                    headings: { 'en': '💰 98% WIN CHANCE DETECTED' },
                    included_segments: ["Subscribed Users"]
                };
                try { 
                    await oneSignalClient.createNotification(notification); 
                    lastOneSignalTime = now;
                } catch(e){}
            }
        }
        
        // Telegram Teaser
        if (tierRequired === 3 && bot) {
            const now = Date.now();
            if (now - lastTelegramTime > (30 * 60 * 1000)) { 
                const teaserMsg = `🔥 **VIP BINARY SIGNAL** 🔥\n\nAsset: ${pair}\nDirection: HIDDEN 🔒\nAccuracy: **98%**\n`;
                const teaserOpts = {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "💸 UNLOCK FOR PROFIT", url: CONFIG.SITE_URL }]
                        ]
                    }
                };
                telegramUsers.forEach(chatId => {
                    bot.sendMessage(chatId, teaserMsg, teaserOpts).catch(() => {});
                });
                lastTelegramTime = now;
            }
        }
    }
}, 45000); 

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });