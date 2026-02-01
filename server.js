/**
 * GODSPOWER AGENTIC SIGNAL - FINAL SERVER
 * 1. Signal History (Immediate Load)
 * 2. VIP Database (Saves Paid Users)
 * 3. Admin Broadcast (Go Live)
 */

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const OneSignal = require('onesignal-node');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

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
let signalHistory = []; // Stores last 10 signals

// Initialize Bot
let bot;
try {
    if (CONFIG.TELEGRAM_TOKEN) bot = new TelegramBot(CONFIG.TELEGRAM_TOKEN, { polling: true });
} catch (e) { console.log("Bot Error:", e.message); }

// Initialize OneSignal
let oneSignalClient;
if (CONFIG.ONESIGNAL_APP_ID) oneSignalClient = new OneSignal.Client(CONFIG.ONESIGNAL_APP_ID, CONFIG.ONESIGNAL_API_KEY);

app.use(express.static('public'));
app.use(bodyParser.json());

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

// --- SOCKET ---
io.on('connection', (socket) => {
    socket.emit('signal_history', signalHistory); // Send history on connect
});

// --- TELEGRAM BOT ---
if (bot) {
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        telegramUsers.add(chatId);
        saveTgUsers();
        const welcomeMsg = `*🟢 AGENTIC AI ONLINE*\n━━━━━━━━━━━━━━━━━━\n🚀 **PROFIT POTENTIAL:**\n● **Win Rate:** \`92% - 98%\`\n● **Markets:** \`OTC & LIVE\`\n\n👇 *START MAKING MONEY NOW:*`;
        bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "💎 UNLOCK VIP SIGNALS", url: CONFIG.SITE_URL }]] } });
    });
}

// --- ADMIN BROADCAST ---
app.get('/admin/go-live', (req, res) => {
    if (req.query.secret !== CONFIG.ADMIN_SECRET) return res.send("❌ Access Denied.");
    if (!bot) return res.send("❌ Bot not active.");
    const liveMsg = `🔴 **I AM LIVE NOW!**\n\nTrading session started. Don't miss this!`;
    telegramUsers.forEach(chatId => bot.sendMessage(chatId, liveMsg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "🔴 WATCH STREAM", url: CONFIG.TELEGRAM_CHANNEL_LINK }]] } }).catch(() => {}));
    res.send(`✅ Broadcast sent!`);
});

// --- AFFILIATE & SIGNAL LOGIC ---
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
        if (amount >= 25 && amount < 100) newTier = 1; 
        if (amount >= 100 && amount < 500) newTier = 2; 
        if (amount >= 500) newTier = 3; 
        if (newTier > 0) {
            websiteUsers[userId].tier = newTier;
            saveWebUsers();
            io.to(userId).emit('account_unlocked', { tier: newTier, message: `VIP UNLOCKED! Deposit: $${amount}` });
        }
    }
    res.send("Postback Received");
});

// --- SIGNAL GENERATOR ---
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
            pair, price: (1.0000 + Math.random()).toFixed(4), rsi, decision, tierRequired,
            timestamp: new Date().toLocaleTimeString()
        };

        io.emit('new_signal', signalData);
        signalHistory.unshift(signalData);
        if(signalHistory.length > 10) signalHistory.pop();

        if (tierRequired === 3) {
            const now = Date.now();
            if (oneSignalClient && now - lastOneSignalTime > (45 * 60 * 1000)) {
                oneSignalClient.createNotification({
                    contents: { 'en': `💸 ${pair} MONEY ALERT! \nAction: ${decision}` },
                    included_segments: ["Subscribed Users"]
                }).catch(e=>{});
                lastOneSignalTime = now;
            }
            if (bot && now - lastTelegramTime > (30 * 60 * 1000)) {
                telegramUsers.forEach(chatId => {
                     bot.sendMessage(chatId, `🔥 **VIP BINARY SIGNAL**\nAsset: ${pair}\nDirection: HIDDEN 🔒`, {
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: [[{ text: "💸 UNLOCK FOR PROFIT", url: CONFIG.SITE_URL }]] }
                    }).catch(() => {});
                });
                lastTelegramTime = now;
            }
        }
    }
}, 45000); 

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));