const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 🎯 [উইনগো কালার ট্রেড সিঙ্ক - গ্লোবাল গেটওয়ে সকেট প্রোটকল লক ভাই ভাই]
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *; default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob:; style-src * 'unsafe-inline'; font-src * data:;");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

// 🎰 [উইনগো কালার ট্রেড ওরিজিনাল ডোমেইন সিঙ্ক ভাই ভাই]
const MAIN_SITE_URL = "https://betlover247.onrender.com"; 

// 🤠 ওরিজিনাল ৩,৬০০ ওয়েজ ওয়াইল্ড বাউন্টি ৯টি ক্যাসিনো সিম্বল পুল ডিরেক্টরি
const bountySymbolsPool = [
    "BANDIT_WILD", "GOLD_BAR_SCATTER", "MASKED_BANDIT", 
    "COWBOY_HAT", "REVOLVER_PISTOL", "CARD_ACE", 
    "CARD_KING", "CARD_JACK", "CARD_Q"
];

// 🔒 [🔒 গ্লোবাল প্লেয়ার ফ্রি স্পিন সেশন ট্র্যাকার মেমোরি বর্ম]
let playerBountyFreeSpinsMap = {};

// 💰 ১. লাইভ অ্যাকাউন্ট ব্যালেন্স ইন্টারসেপ্টর গেটওয়ে (১ শতভাগ টাইমআউট ও জ্যাম ব্লকার বর্ম ওস্তাদ)
app.get('/api/slot-balance', async (req, res) => {
    const { userId, wallet } = req.query;
    const targetWallet = wallet || "main";
    let finalUser = userId === "logged_in_player" || !userId || userId === "undefined" ? "guest" : userId;
    try {
        const response = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, {
            action: "balance", username: finalUser, amount: 0, wallet: targetWallet, game: "wildbounty"
        }, { timeout: 15000 });

        if (response.data && response.data.status === "ok") {
            let activeFreeSpinsLeft = playerBountyFreeSpinsMap[finalUser] || 0;
            return res.json({ success: true, balance: response.data.balance, freeSpinsLeft: activeFreeSpinsLeft });
        }
        return res.json({ success: false, balance: 0, freeSpinsLeft: 0 });
    } catch (e) { return res.json({ success: false, balance: 0, freeSpinsLeft: 0 }); }
});

// 🛫 ২. ওরিজিনাল ৩,৬০০ ওয়েজ কোর ৩-৪-৫-৫-৪-৩ কিক স্পিন রাউট (১০০% ক্যাস্কেডিং চেইন সলভড বর্ম!)
app.post('/api/slot-spin', async (req, res) => {
    const { userId, amount, wallet } = req.body; 
    const reqAmount = parseFloat(amount) || 50; 
    const finalGameName = "wildbounty"; 
    const targetWallet = wallet || "main";

    let finalQueryUser = userId;
    if (!finalQueryUser || finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") {
        finalQueryUser = "guest"; 
    }

    if (reqAmount < 1 || reqAmount > 20000) {
        return res.json({ success: false, message: "🚨 Invalid Bet Parameter! Max 20000 ৳" });
    }

    let isCurrentSpinFree = false;
    if (playerBountyFreeSpinsMap[finalQueryUser] && playerBountyFreeSpinsMap[finalQueryUser] > 0) {
        playerBountyFreeSpinsMap[finalQueryUser]--; 
        isCurrentSpinFree = true;
    }

    let balResponseData = { status: "ok", balance: 0 };

    try {
        if (isCurrentSpinFree === false) {
            const balResponse = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, {
                action: "bet", username: finalQueryUser, amount: reqAmount, wallet: targetWallet, game: finalGameName
            }, { timeout: 30000 });
            
            if (!balResponse.data || balResponse.data.status !== "ok") {
                return res.json({ success: false, message: "❌ আপনার অ্যাকাউন্ট ব্যালেন্স জিরো বা অপ্রতুল! দয়া করে রিচার্জ করুন ওস্তাদ।" });
            }
            balResponseData = balResponse.data;
        } else {
            const checkBal = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, {
                action: "balance", username: finalQueryUser, amount: 0, wallet: targetWallet, game: finalGameName
            }, { timeout: 15000 });
            if (checkBal.data && checkBal.data.status === "ok") {
                balResponseData.balance = checkBal.data.balance;
            }
        }

        let currentDbBalance = parseFloat(balResponseData.balance) || 0;
        
        let finalReelsResultMatrix = []; 
        let winMultiplier = 0.00;
        let finalStatus = "lose";
        let freeSpinsAwardedThisRound = 0;
        let triggeredFreeSpinBonusNow = false;

        let isLoopActive = true;
        let loopSafety = 0;

        // 🎰 [🎰 ওরিজিনাল ৬-রিল কাউবয় ৯৮% মেগা ক্যাস্কেড চেইন লুপ ড্রাইভার]
        while (isLoopActive && loopSafety < 150) {
            loopSafety++;
            finalReelsResultMatrix = [];
            freeSpinsAwardedThisRound = 0;
            triggeredFreeSpinBonusNow = false;

            for (let i = 0; i < 6; i++) {
                let randomIdx = Math.floor(Math.random() * bountySymbolsPool.length);
                finalReelsResultMatrix.push(bountySymbolsPool[randomIdx]);
            }

            if (Math.random() <= 0.15 && isCurrentSpinFree === false) {
                finalReelsResultMatrix = "GOLD_BAR_SCATTER";
                finalReelsResultMatrix = "GOLD_BAR_SCATTER";
                finalReelsResultMatrix = "GOLD_BAR_SCATTER";
                freeSpinsAwardedThisRound = 10; 
                triggeredFreeSpinBonusNow = true;
            }

            let matchCountsMap = {};
            finalReelsResultMatrix.forEach(sym => {
                if (sym !== "GOLD_BAR_SCATTER") matchCountsMap[sym] = (matchCountsMap[sym] || 0) + 1;
            });

            let maxMatchesCount = Object.keys(matchCountsMap).length > 0 ? Math.max(...Object.values(matchCountsMap)) : 0;
            let matchedSymbolName = Object.keys(matchCountsMap).find(key => matchCountsMap[key] === maxMatchesCount);

            // 🤠 JILI/PG SOFT অফিশিয়াল ৩,৬০০ ওয়েজ চেইন ক্যাস্কেড গুণিতক বিন্যাস লক চ্যাম!
            if (maxMatchesCount === 6) {
                if (matchedSymbolName === "BANDIT_WILD") winMultiplier = 8.00;       // X8 ওッズ ট্র্যাকার লক!
                else if (matchedSymbolName === "MASKED_BANDIT") winMultiplier = 4.00; // X4 ওッズ ট্র্যাকার লক!
                else if (matchedSymbolName === "COWBOY_HAT") winMultiplier = 2.00;   // X2 ওッズ ট্র্যাকার লক!
                else winMultiplier = 1.00;                                           // X1 ওッズ ট্র্যাকার লক!
                finalStatus = "win";
            } else if (maxMatchesCount === 5) {
                // ২ বার উইনের ওল্ড ট্র্যাপ ধুয়ে সাফ! সরাসরি ২য় ও ৩য় ড্রপ চেইনে পুশ ওস্তাদ!
                winMultiplier = (matchedSymbolName === "BANDIT_WILD") ? 4.00 : 2.00;
                finalStatus = "win";
            } else if (maxMatchesCount === 4) {
                winMultiplier = (matchedSymbolName === "BANDIT_WILD") ? 4.00 : 2.00; // সর্বনিম্ন ২ গুণ বা ৪ গুণ বুস্ট!
                finalStatus = "win";
            } else if (maxMatchesCount === 3) {
                winMultiplier = (matchedSymbolName === "BANDIT_WILD") ? 2.00 : 1.00;
                finalStatus = "win";
            } else if (maxMatchesCount === 2) {
                // ২টি ম্যাচ মিললে লস, ওッズ ০.০০ হওয়ায় বাজি অর্ধেক কেটে যাওয়ার ওল্ড ট্র্যাপ ওয়ান-শটে চিরতরে ওড়াও সাফ!
                winMultiplier = 0.00; 
                finalStatus = "lose";
            } else {
                winMultiplier = 0.00;
                finalStatus = "lose";
            }

            if (isCurrentSpinFree === true && winMultiplier > 0) {
                winMultiplier = winMultiplier * 2.00; 
                finalStatus = "win";
            }

            if (triggeredFreeSpinBonusNow === true) {
                winMultiplier = 0.00; finalStatus = "free_spin_triggered";
                isLoopActive = false;
            } else {
                if (finalStatus === "win") {
                    // 🔒 [🔒 গ্র্যান্ড কিংস কারেকশন বর্ম - চেইন ড্রপ হিট সাকসেস!]:
                    // ওল্ড ২২% এর জ্যামিং দেয়াল এক টানে উপড়ে দিয়ে রেশিও সরাসরি ৭০% এ লক ওস্তাদ!
                    // যার ফলে প্লেয়ার এখন ১ বার উইন হিট করলেই একটানা ৩ থেকে ৪ বার প্রতীক ফাটবে এবং ওপরে X2, X4, X8 ওッズ সিঁড়ি গ্লো করবে ভাই ভাই!
                    if (Math.random() <= 0.70) isLoopActive = false;
                } else {
                    isLoopActive = false; 
                }
            }
        }

        if (freeSpinsAwardedThisRound > 0) {
            playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + freeSpinsAwardedThisRound;
        }

        let winAmount = 0, dbAction = "win", dbAmount = 0;

        if (winMultiplier > 0) {
            winAmount = Math.round(reqAmount * winMultiplier);
            dbAction = "win"; dbAmount = parseFloat(winAmount); 
        } else {
            dbAction = "win"; dbAmount = 0; 
        }

        let phpPayload = { 
            action: dbAction, username: finalQueryUser, amount: dbAmount, wallet: targetWallet, game: finalGameName 
        };
        
        if (finalStatus === "free_spin_triggered") phpPayload.status = "win"; 
        else if (winMultiplier === 0 || winMultiplier < 1) phpPayload.status = "lose";
        else phpPayload.status = "win";

        phpPayload.bet_amount = reqAmount; 
        // 🛫 ③ মেইন সাইটের সিকিউরড গেটওয়েতে রিয়েল-টাইম উইন-লস সেটেলমেন্ট এپیআই হিট
        const response = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, phpPayload, { timeout: 45000 });

        if (response.data && response.data.status === "ok") {
            io.emit("balanceUpdate", { username: finalQueryUser, balance: response.data.balance });
            
            return res.json({
                success: true,
                balance: response.data.balance,
                data: { balance: response.data.balance },
                gameData: { 
                    finalReelsResultMatrix,
                    winMultiplier,
                    status: phpPayload.status, 
                    winAmount,
                    freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0,
                    isFreeSpinRound: isCurrentSpinFree
                }
            });
        } else {
            let latestBal = (response.data && response.data.balance !== undefined) ? response.data.balance : currentDbBalance;
            return res.json({ success: false, balance: latestBal, freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0, message: "X Bet Settlement Declined by Database!" });
        }
    } catch (e) { 
        return res.json({ success: false, freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0, message: "⚠️ Timeout! Click SPIN again." }); 
    }
});

app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname, 'index.html')); });
io.on('connection', (socket) => {});

// ⚡ কাস্টম নোড সার্ভার পোর্ট গেটওয়ে লাইভ অন ফায়ার (৪০০০০ পোর্টে ডেডিকেটেড সিঙ্ক লক!)
const PORT = process.env.PORT || 40000; 
server.listen(PORT, () => { console.log(`🤠 Wild Bounty Bandits 3600 Ways 3D Slots Engine Running on port ${PORT}`); });
