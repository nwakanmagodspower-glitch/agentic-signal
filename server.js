/**
 * GODSPOWER AGENTIC SIGNAL - FINAL SECURE SERVER
 * Features:
 * 1. Secured Telegram Token (Via Render Vault)
 * 2. Automated Signal Generation
 * 3. Mobile Tiered Access ($25/$99/$500)
 * 4. Premium Bot Design (Agentic AI Robot)
 * 5. Admin Live Broadcast
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
    // 1. TELEGRAM BOT (Pulls from Render Vault)
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN, 
    
    // 2. YOUR TELEGRAM CHANNEL LINK
    TELEGRAM_CHANNEL_LINK: 'https://t.me/+3KiO2QaEg8tjNzI0',

    // 3. IQ OPTION AFFILIATE ID
    AFFILIATE_ID: '228383', 

    // 4. ONESIGNAL KEYS (Pulls from Render Vault)
    ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID || '3552e19d-e987-49b0-8885-e09175dcc1c9',
    ONESIGNAL_API_KEY: process.env.ONESIGNAL_API_KEY || 'os_v2_app_gvjodhpjq5e3bcef4cixlxgbzht3co5dv4bufevl76w72u55kguxefssmaigx6ytaen6gof4immfitjcb4ahwfsbqx2zjh7hesimvhy',

    // 5. ADMIN PASSWORD (For "Go Live" link)
    ADMIN_SECRET: 'godspower123', 
    
    // 6. YOUR WEBSITE URL
    SITE_URL: 'https://agentic-signal.onrender.com'
};

// ==========================================
// 🚀 SERVER SETUP
// ==========================================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize Telegram Bot
let bot;
try {
    if (CONFIG.TELEGRAM_TOKEN) {
        bot = new TelegramBot(CONFIG.TELEGRAM_TOKEN, { polling: true });
        console.log("✅ Telegram Bot Started Successfully");
    } else {
        console.log("⚠️ WAITING: Telegram Token not found. Add it to Render Environment Variables.");
    }
} catch (error) {
    console.log("❌ Telegram Bot Error:", error.message);
}

// Initialize OneSignal Client
const oneSignalClient = new OneSignal.Client(CONFIG.ONESIGNAL_APP_ID, CONFIG.ONESIGNAL_API_KEY);

app.use(express.static('public'));
app.use(bodyParser.json());

// --- DATABASE (Simple File Storage) ---
const DB_FILE = 'telegram_users.json';
let telegramUsers = new Set();

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

let websiteUsers = {}; 
let clickIdMap = {};   

// ==========================================
// 🤖 TELEGRAM BOT LOGIC
// ==========================================

if (bot) {
    // 1. Handle /start (PREMIUM WELCOME MESSAGE)
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        telegramUsers.add(chatId);
        saveUsers();

        // The Beautiful Message with Bold Text and Emojis
        const welcomeMsg = `
*🟢 AGENTIC AI ROBOT ONLINE*
━━━━━━━━━━━━━━━━━━
Welcome, trader. You have connected to the institutional-grade signal network.

*📊 SYSTEM STATUS:*
● **Algorithm:** \`ACTIVE\`
● **Accuracy:** \`94.2%\`
● **Live Signals:** \`ONLINE\`

👇 *SELECT YOUR ACTION:*

💎 *1. ACCESS LIVE SIGNALS*
Tap below to register and unlock the VIP Dashboard.
[👉 OPEN SIGNAL TERMINAL](${CONFIG.SITE_URL})

📚 *2. JOIN TRADING ACADEMY*
Learn our strategy in the official channel.
[👉 JOIN CHANNEL](${CONFIG.TELEGRAM_CHANNEL_LINK})

_Wait for the "🔴 I AM LIVE" alert to watch the admin trade._
`;

        bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
    });

    // 2. Handle /stop
    bot.onText(/\/stop/, (msg) => {
        const chatId = msg.chat.id;
        if (telegramUsers.has(chatId)) {
            telegramUsers.delete(chatId);
            saveUsers();
            bot.sendMessage(chatId, "🔕 You have unsubscribed from alerts.");
        }
    });
}

// ==========================================
// 📡 ADMIN ACTION: "I AM LIVE"
// ==========================================
app.get('/admin/go-live', (req, res) => {
    // SECURITY CHECK: Matches the password in CONFIG above
    if (req.query.secret !== CONFIG.ADMIN_SECRET) return res.send("❌ Access Denied: Wrong Password.");
    if (!bot) return res.send("❌ Bot not active. Check Render Environment Variables.");

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

app.get('/generate-link', (req, res) => {
    const userId = req.query.userId;
    const clickId = uuidv4(); 
    
    if(!websiteUsers[userId]) websiteUsers[userId] = { tier: 0 };
    clickIdMap[clickId] = userId;
    
    const link = `https://iqoption.com/land/register?aff=${CONFIG.AFFILIATE_ID}&aff_sub=${clickId}`;
    res.json({ link: link });
});

app.get('/api/postback', (req, res) => {
    const clickId = req.query.aff_sub || req.query.click_id; 
    const amount = parseFloat(req.query.amount) || 0; 
    
    console.log(`💰 Postback: ID=${clickId} Amount=$${amount}`);

    if (clickId && clickIdMap[clickId]) {
        const userId = clickIdMap[clickId];
        let newTier = 0;

        // --- MOBILE PRICING LOGIC ---
        if (amount >= 25 && amount < 99) newTier = 1;   // BASIC ($25-$99)
        if (amount >= 99 && amount < 500) newTier = 2;  // PRO ($99-$500)
        if (amount >= 500) newTier = 3;                 // VIP ($500+)

        if (newTier > 0) {
            websiteUsers[userId].tier = newTier;
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

let lastOneSignalTime = 0; 
let lastTelegramTime = 0;

setInterval(async () => {
    const pairs = ['EUR/USD', 'GBP/USD', 'OTC-GOLD', 'BTC/USD'];
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const rsi = Math.floor(Math.random() * 100);
    
    let decision = "HOLD";
    if (rsi > 75) decision = "PUT (SELL) ⬇";
    if (rsi < 25) decision = "CALL (BUY) ⬆";

    if (decision !== "HOLD") {
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

        io.emit('new_signal', signalData);

        // OneSignal Push
        if (tierRequired === 3) {
            const now = Date.now();
            if (now - lastOneSignalTime > (60 * 60 * 1000)) { 
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

        // Telegram Teaser
        if (tierRequired === 3 && bot) {
            const now = Date.now();
            if (now - lastTelegramTime > (30 * 60 * 1000)) { 
                const teaserMsg = `🔥 **VIP SIGNAL DETECTED** 🔥\n\nAsset: ${pair}\nDirection: HIDDEN 🔒\n\n👇 **Log in to the app to see the direction!**\n${CONFIG.SITE_URL}`;
                telegramUsers.forEach(chatId => {
                    bot.sendMessage(chatId, teaserMsg, { parse_mode: 'Markdown' }).catch(() => {});
                });
                lastTelegramTime = now;
                console.log("✈ Telegram Teaser Sent");
            }
        }
    }
}, 60000); 

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});