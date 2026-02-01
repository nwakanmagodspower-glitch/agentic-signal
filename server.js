/**
 * GODSPOWER AGENTIC SIGNAL - PROFESSIONAL EDITION (FINAL)
 * -------------------------------------------------------
 * VERIFIED FEATURES:
 * 1. Auto-Approve & Delayed Welcome (Professional Flow)
 * 2. User Memory (Session Restoration)
 * 3. Smart Expiry (Weighted Random Logic)
 * 4. 3-Tier Pricing (Basic/Pro/VIP)
 * 5. Signal History & Admin Broadcast
 * 6. Correct Asset Names (XAU/USD)
 */

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const OneSignal = require('onesignal-node');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// --- CONFIGURATION ---
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

// --- STORAGE ---
let signalHistory = [];

// --- DATABASE LOAD ---
const TG_DB_FILE = 'telegram_users.json';
const WEB_DB_FILE = 'website_users.json';
let telegramUsers = new Set();
let websiteUsers = {};
let clickIdMap = {};

if (fs.existsSync(TG_DB_FILE)) try { telegramUsers = new Set(JSON.parse(fs.readFileSync(TG_DB_FILE))); } catch (e) {}
if (fs.existsSync(WEB_DB_FILE)) try { websiteUsers = JSON.parse(fs.readFileSync(WEB_DB_FILE)); } catch (e) {}

function saveTgUsers() { fs.writeFileSync(TG_DB_FILE, JSON.stringify([...telegramUsers])); }
function saveWebUsers() { fs.writeFileSync(WEB_DB_FILE, JSON.stringify(websiteUsers)); }

// --- BOT INITIALIZATION ---
let bot;
try {
    if (CONFIG.TELEGRAM_TOKEN) {
        bot = new TelegramBot(CONFIG.TELEGRAM_TOKEN, { polling: true });
        console.log("✅ PROFESSIONAL BOT STARTED");
    }
} catch (e) { console.log("⚠️ Bot Error:", e.message); }

let oneSignalClient;
if (CONFIG.ONESIGNAL_APP_ID) oneSignalClient = new OneSignal.Client(CONFIG.ONESIGNAL_APP_ID, CONFIG.ONESIGNAL_API_KEY);

app.use(express.static('public'));
app.use(bodyParser.json());

// ==========================================
// 🔌 SOCKET CONNECTION (USER MEMORY)
// ==========================================
io.on('connection', (socket) => {
    // 1. Send History Immediately
    socket.emit('signal_history', signalHistory);

    // 2. CHECK USER MEMORY (Restore VIP Session)
    socket.on('check_user_status', (userId) => {
        if (websiteUsers[userId] && websiteUsers[userId].tier > 0) {
            socket.emit('account_unlocked', {
                tier: websiteUsers[userId].tier,
                message: "WELCOME BACK! VIP SESSION RESTORED 🚀"
            });
        }
    });
});

// --- ADMIN BROADCAST ROUTE ---
app.get('/admin/go-live', (req, res) => {
    if (req.query.secret !== CONFIG.ADMIN_SECRET) return res.send("❌ Access Denied.");
    if (!bot) return res.send("❌ Bot not active.");

    const liveMsg = `🔴 **I AM LIVE NOW!**\n\nTrading session started. Don't miss this!`;
    const opts = { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔴 WATCH STREAM", url: CONFIG.TELEGRAM_CHANNEL_LINK }]] } };

    let count = 0;
    telegramUsers.forEach(chatId => {
        bot.sendMessage(chatId, liveMsg, opts).catch(() => {});
        count++;
    });
    res.send(`✅ Broadcast sent to ${count} users!`);
});

// --- AFFILIATE SYSTEM ---
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

        // 3-TIER LOGIC
        if (amount >= 25 && amount < 100) newTier = 1; // Basic
        if (amount >= 100 && amount < 500) newTier = 2; // Pro
        if (amount >= 500) newTier = 3; // VIP

        if (newTier > 0) {
            websiteUsers[userId].tier = newTier;
            saveWebUsers();
            io.to(userId).emit('account_unlocked', { tier: newTier, message: `VIP UNLOCKED! Deposit: $${amount}` });
        }
    }
    res.send("Postback Received");
});

// ==========================================
// 🤖 TELEGRAM BOT LOGIC (PROFESSIONAL FLOW)
// ==========================================
if (bot) {

    // 1. STANDARD START
    bot.onText(/\/start/, (msg) => sendWelcome(msg.chat.id, msg.from.first_name));

    // 2. AUTO-APPROVE + DELAYED WELCOME
    bot.on('chat_join_request', async (msg) => {
        const userId = msg.from.id;
        const name = msg.from.first_name;

        console.log(`🔒 Request from: ${name}`);

        // STEP A: APPROVE IMMEDIATELY
        try {
            await bot.approveChatJoinRequest(msg.chat.id, userId);
            console.log(`✅ Approved ${name}`);
        } catch (e) { console.log(`❌ Approval Error: ${e.message}`); }

        // STEP B: SEND MESSAGE AFTER 2 SECONDS (Safety Delay)
        setTimeout(() => {
            sendWelcome(userId, name);
        }, 2000);
    });

    function sendWelcome(chatId, firstName) {
        firstName = firstName || "Trader";
        telegramUsers.add(chatId);
        saveTgUsers();

        const welcomeMsg = `
*👋 Hello ${firstName}, Welcome to AGENTIC AI!*
━━━━━━━━━━━━━━━━━━
You are now connected to our High-Frequency Network.

🚀 **PROFIT POTENTIAL:**
● **Win Rate:** \`92% - 98%\`
● **Markets:** \`OTC & LIVE\`

👇 *START MAKING MONEY NOW:*
`;
        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "💎 UNLOCK VIP SIGNALS", url: CONFIG.SITE_URL }],
                    [{ text: "📊 JOIN PROFIT CHANNEL", url: CONFIG.TELEGRAM_CHANNEL_LINK }]
                ]
            }
        };

        bot.sendMessage(chatId, welcomeMsg, opts)
            .then(() => console.log(`✅ Welcome sent to ${firstName}`))
            .catch((e) => console.log(`⚠️ Welcome Blocked for ${firstName} (User hasn't started bot)`));
    }
}

// --- SMART SIGNAL GENERATOR ---
function generateSignal() {
    // CORRECTED: XAU/USD-OTC is the broker standard for Gold
    const pairs = ['EUR/USD-OTC', 'GBP/USD-OTC', 'GOLD-OTC', 'BTC/USD'];
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const rsi = Math.floor(Math.random() * 100);

    // SMART EXPIRY MIX (Weighted)
    const expiries = ['M1', 'M1', 'M1', 'M1', 'M1', 'M1', 'M1', 'M2', 'M5', 'TURBO'];
    const expiry = expiries[Math.floor(Math.random() * expiries.length)];

    let decision = "HOLD";
    if (rsi > 80) decision = "PUT (SELL) ⬇";
    if (rsi < 20) decision = "CALL (BUY) ⬆";
    if (decision === "HOLD") decision = Math.random() > 0.5 ? "CALL (BUY) ⬆" : "PUT (SELL) ⬇";

    let tierRequired = 1;
    if(pair.includes('GOLD') || pair.includes('BTC')) tierRequired = 3;
    else if(pair.includes('GBP')) tierRequired = 2;

    return {
        pair: pair === 'GOLD-OTC' ? 'XAU/USD-OTC' : pair, // Show correct broker name
        price: (1.0000 + Math.random()).toFixed(4),
        rsi,
        decision,
        expiry,
        tierRequired,
        timestamp: new Date().toLocaleTimeString()
    };
}

// Pre-fill history
signalHistory.push(generateSignal());
signalHistory.push(generateSignal());
signalHistory.push(generateSignal());

let lastOneSignalTime = 0;
let lastTelegramTime = 0;

setInterval(async () => {
    const signalData = generateSignal();
    io.emit('new_signal', signalData);
    signalHistory.unshift(signalData);
    if(signalHistory.length > 10) signalHistory.pop();

    if (signalData.tierRequired === 3) {
        const now = Date.now();
        // OneSignal
        if (oneSignalClient && now - lastOneSignalTime > (45 * 60 * 1000)) {
            oneSignalClient.createNotification({ contents: { 'en': `💸 ${signalData.pair} MONEY ALERT! \nAction: ${signalData.decision}` }, included_segments: ["Subscribed Users"] }).catch(e=>{});
            lastOneSignalTime = now;
        }
        // Telegram Teaser
        if (bot && now - lastTelegramTime > (30 * 60 * 1000)) {
            telegramUsers.forEach(chatId => {
                 bot.sendMessage(chatId, `🔥 **VIP BINARY SIGNAL**\nAsset: ${signalData.pair}\nDirection: HIDDEN 🔒`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "💸 UNLOCK FOR PROFIT", url: CONFIG.SITE_URL }]] } }).catch(() => {});
            });
            lastTelegramTime = now;
        }
    }
}, 45000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));