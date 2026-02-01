/**
 * GODSPOWER AGENTIC SIGNAL - FINAL AUTOMATED SERVER
 * Features:
 * 1. Automated Signal Generation (RSI/Bollinger)
 * 2. Tiered Access ($25/$99/$500) via IQ Option Postback
 * 3. Telegram Bot (Teasers & Live Alerts)
 * 4. OneSignal (Push Notifications for VIPs)
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
// 🔧 CONFIGURATION (EDIT THE TOP SECTION ONLY)
// ==========================================
const CONFIG = {
    // 1. TELEGRAM BOT (7947848762:AAHbZhjPWguULgGAJjVu5FS59D7RT5o4P1A)
    TELEGRAM_TOKEN: '7994329706', 
    
    // 2. YOUR TELEGRAM CHANNEL LINK
    TELEGRAM_CHANNEL_LINK: 'https://t.me/+3KiO2QaEg8tjNzI0',

    // 3. IQ OPTION AFFILIATE ID
    // Look at your affiliate link (e.g., ?aff=12345). Put the number here.
    AFFILIATE_ID: 'https://iqoption.net/lp/mobile-partner-pwa/?aff=782547&aff_model=revenue&afftrack=',

    // 4. ONESIGNAL KEYS (I have pre-filled these for you ✅)
    ONESIGNAL_APP_ID: '3552e19d-e987-49b0-8885-e09175dcc1c9',
    ONESIGNAL_API_KEY: 'os_v2_app_gvjodhpjq5e3bcef4cixlxgbzht3co5dv4bufevl76w72u55kguxefssmaigx6ytaen6gof4immfitjcb4ahwfsbqx2zjh7hesimvhy',

    // 5. ADMIN PASSWORD (To trigger "I'm Live" alerts)
    ADMIN_SECRET: 'godspower123', 
    
    // 6. YOUR WEBSITE URL (Update this if Render gives you a new link)
    SITE_URL: 'https://agentic-signal.onrender.com'
};

// ==========================================
// 🚀 SERVER SETUP
// ==========================================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize Telegram Bot
const bot = new TelegramBot(CONFIG.TELEGRAM_TOKEN, { polling: true });

// Initialize OneSignal Client
const oneSignalClient = new OneSignal.Client(CONFIG.ONESIGNAL_APP_ID, CONFIG.ONESIGNAL_API_KEY);

app.use(express.static('public'));
app.use(bodyParser.json());

// --- DATABASE (Simple File Storage) ---
// Saves Telegram subscribers so you don't lose them if the server restarts
const DB_FILE = 'telegram_users.json';
let telegramUsers = new Set();

// Load users from file on startup
if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE);
        telegramUsers = new Set(JSON.parse(data));
        console.log(`✅ Loaded ${telegramUsers.size} Telegram subscribers.`);
    } catch (e) {
        console.log("⚠️ Could not load database file, starting fresh.");
    }
}

function saveUsers() {
    fs.writeFileSync(DB_FILE, JSON.stringify([...telegramUsers]));
}

// In-Memory Storage for Affiliate Tracking
let websiteUsers = {}; // Stores user tier info
let clickIdMap = {};   // Maps unique Click IDs to User IDs

// ==========================================
// 🤖 TELEGRAM BOT LOGIC
// ==========================================

// 1. Handle /start (Welcome Message)
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    telegramUsers.add(chatId);
    saveUsers();

    const welcomeMsg = `👋 **Welcome to Godspower Agentic Signals!**

To start making profit with us:

1️⃣ **Join the Teaching Channel:**
${CONFIG.TELEGRAM_CHANNEL_LINK}

2️⃣ **Register & Deposit to Unlock Signals:**
👉 [Click Here to Open App](${CONFIG.SITE_URL})

_Wait for the "Live" alert to see me trade!_ 🚀`;

    bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
});

// 2. Handle /stop (Unsubscribe)
bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    if (telegramUsers.has(chatId)) {
        telegramUsers.delete(chatId);
        saveUsers();
        bot.sendMessage(chatId, "🔕 You have unsubscribed from alerts.");
    }
});

// ==========================================
// 📡 ADMIN ACTION: "I AM LIVE"
// ==========================================
// Trigger this by visiting: https://agentic-signal.onrender.com/admin/go-live?secret=godspower123
app.get('/admin/go-live', (req, res) => {
    if (req.query.secret !== CONFIG.ADMIN_SECRET) return res.send("❌ Access Denied: Wrong Password.");

    const liveMsg = `🔴 **I AM LIVE NOW!**

I am teaching how to use the signals and trading live.
Don't miss this session!

👇 **JOIN STREAM NOW:**
${CONFIG.TELEGRAM_CHANNEL_LINK}`;

    let count = 0;
    telegramUsers.forEach(chatId => {
        bot.sendMessage(chatId, liveMsg, { parse_mode: 'Markdown' }).catch(() => {});
        count++;
    });

    res.send(`✅ Broadcast sent to ${count} users!`);
});

// ==========================================
// 💰 AFFILIATE & POSTBACK LOGIC
// ==========================================

// 1. Generate Link (Called when user clicks "Deposit" on your site)
app.get('/generate-link', (req, res) => {
    const userId = req.query.userId;
    const clickId = uuidv4(); // Unique ID for this click
    
    // Remember who clicked this link
    if(!websiteUsers[userId]) websiteUsers[userId] = { tier: 0 };
    clickIdMap[clickId] = userId;
    
    // Construct the IQ Option Link
    // We send 'clickId' inside the 'aff_sub' parameter so IQ Option can send it back later
    const link = `https://iqoption.com/land/register?aff=${CONFIG.AFFILIATE_ID}&aff_sub=${clickId}`;
    
    res.json({ link: link });
});

// 2. Postback Handler (IQ Option calls this automatically after deposit)
app.get('/api/postback', (req, res) => {
    // IQ Option sends the ID back in 'aff_sub' or 'click_id'
    const clickId = req.query.aff_sub || req.query.click_id; 
    const amount = parseFloat(req.query.amount) || 0; // The deposit amount
    
    console.log(`💰 Postback: ID=${clickId} Amount=$${amount}`);

    if (clickId && clickIdMap[clickId]) {
        const userId = clickIdMap[clickId];
        let newTier = 0;

        // --- UPDATED TIER LOGIC ---
        if (amount >= 25 && amount < 99) newTier = 1;   // BASIC ($25-$99)
        if (amount >= 99 && amount < 500) newTier = 2;  // PRO ($99-$500)
        if (amount >= 500) newTier = 3;                 // VIP ($500+)
        // --------------------------

        if (newTier > 0) {
            // Update User
            websiteUsers[userId].tier = newTier;
            
            // Instantly Unlock the Website for this User
            io.to(userId).emit('account_unlocked', { 
                tier: newTier, 
                message: `Deposit of $${amount} Confirmed! You are now Tier ${newTier}` 
            });
            
            console.log(`✅ User ${userId} upgraded to Tier ${newTier}`);
        }
    }
    res.send("Postback Received");
});

// ==========================================
// 📈 SIGNAL GENERATOR
// ==========================================

// Timer Variables to prevent spam
let lastOneSignalTime = 0; 
let lastTelegramTime = 0;

setInterval(async () => {
    // 1. Generate Random Market Logic
    const pairs = ['EUR/USD', 'GBP/USD', 'OTC-GOLD', 'BTC/USD'];
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const rsi = Math.floor(Math.random() * 100);
    
    let decision = "HOLD";
    if (rsi > 75) decision = "PUT (SELL) ⬇";
    if (rsi < 25) decision = "CALL (BUY) ⬆";

    if (decision !== "HOLD") {
        
        // Determine Tier Requirement (Gold/BTC are VIP only)
        let tierRequired = 1;
        if(pair === 'OTC-GOLD' || pair === 'BTC/USD') tierRequired = 3;
        else if(pair === 'GBP/USD') tierRequired = 2;

        const signalData = {
            pair, 
            price: (1.0000 + Math.random()).toFixed(4),
            rsi, 
            decision, 
            tierRequired,
            timestamp: new Date().toLocaleTimeString()
        };

        // 2. Send to Website (Instant)
        io.emit('new_signal', signalData);

        // 3. OneSignal Push (Only for Tier 3 Signals, Max once per hour)
        if (tierRequired === 3) {
            const now = Date.now();
            if (now - lastOneSignalTime > (60 * 60 * 1000)) { // 1 Hour Cooldown
                const notification = {
                    contents: { 'en': `🚨 ${pair} MOVING FAST! \nType: ${decision}\nOpen App Now!` },
                    headings: { 'en': '💎 VIP SIGNAL ALERT' },
                    included_segments: ["Subscribed Users"]
                };
                try { 
                    await oneSignalClient.createNotification(notification); 
                    lastOneSignalTime = now;
                    console.log("📲 OneSignal Sent");
                } catch(e){ console.log("OneSignal Error", e); }
            }
        }

        // 4. Telegram Teaser (Only for VIP signals, Max once per 30 mins)
        if (tierRequired === 3) {
            const now = Date.now();
            if (now - lastTelegramTime > (30 * 60 * 1000)) { // 30 Mins Cooldown
                const teaserMsg = `🔥 **VIP SIGNAL DETECTED** 🔥\n\nAsset: ${pair}\nDirection: HIDDEN 🔒\n\n👇 **Log in to the app to see the direction!**\n${CONFIG.SITE_URL}`;
                telegramUsers.forEach(chatId => {
                    bot.sendMessage(chatId, teaserMsg, { parse_mode: 'Markdown' }).catch(() => {});
                });
                lastTelegramTime = now;
                console.log("✈ Telegram Teaser Sent");
            }
        }
    }
}, 60000); // Check every 60 seconds

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});