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
const MAIN_SITE_URL = "https://onrender.com"; 

// 🤠 ওরিজিনাল ৩,৬০০ ওয়েজ ওয়াইল্ড বাউন্টি ৯টি ক্যাসিনো সিম্বল পুল ডিরেক্টরি (Card_Q সহ একুরেট লক!)
const bountySymbolsPool = [
    "BANDIT_WILD", "GOLD_BAR_SCATTER", "MASKED_BANDIT", 
    "COWBOY_HAT", "REVOLVER_PISTOL", "CARD_ACE", 
    "CARD_KING", "CARD_JACK", "CARD_Q"
];

// 🔒 [🔒 গলোবাল প্লেয়ার ফ্রি স্পিন সেশন ট্র্যাকার মেমোরি বর্ম]
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

// 🛫 ২. ওরিজিনাল ৩,৬০০ ওয়েজ কোর কম্বো ও ফ্রি স্পিন রাউট (মানি ট্রি ও ফ্যান-টানের মতো ১০০% সিকিউরড সিঙ্গেল পাইপলাইন প্রোটোকল)
app.post('/api/slot-spin', async (req, res) => {
    const { userId, amount, wallet } = req.body; 
    const reqAmount = parseFloat(amount) || 50; // ডিফল্ট ৫০ টাকা বেস বাজি
    const finalGameName = "wildbounty"; 
    const targetWallet = wallet || "main";

    let finalQueryUser = userId;
    if (!finalQueryUser || finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") {
        finalQueryUser = "guest"; 
    }

    if (reqAmount < 1 || reqAmount > 20000) {
        return res.json({ success: false, message: "🚨 Invalid Bet Parameter! Max 20000 ৳" });
    }

    // 🔒 [🔒 ফ্রি স্পিন চেকিং বর্ম]: প্লেয়ারের অ্যাকাউন্টে ফ্রি স্পিন বাকি থাকলে মেইন ওয়ালেট থেকে ১ টাকাও কাটবে না!
    let isCurrentSpinFree = false;
    if (playerBountyFreeSpinsMap[finalQueryUser] && playerBountyFreeSpinsMap[finalQueryUser] > 0) {
        playerBountyFreeSpinsMap[finalQueryUser]--; // ১টি ফ্রি স্পিন খরচ কমলো চ্যাম
        isCurrentSpinFree = true;
    }

    let balResponseData = { status: "ok", balance: 0 };

    try {
        if (isCurrentSpinFree === false) {
            // যদি রেগুলার নরমাল স্পিন হয়, তবেই মেইন ওয়ালেট থেকে টাকা কাটবে ওস্তাদ!
            const balResponse = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, {
                action: "bet", username: finalQueryUser, amount: reqAmount, wallet: targetWallet, game: finalGameName
            }, { timeout: 30000 });
            
            if (!balResponse.data || balResponse.data.status !== "ok") {
                return res.json({ success: false, message: "❌ আপনার অ্যাকাউন্ট ব্যালেন্স জিরো বা অপ্রতুল! দয়া করে রিচার্জ করুন ওস্তাদ।" });
            }
            balResponseData = balResponse.data;
        } else {
            // যদি ফ্রি স্পিন মোড রানিং থাকে, ডাটাবেজ থেকে ওরিজিনাল কারেন্ট ব্যালেন্স তুলে আনা লক চ্যাম
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

        // 🎰 [🎰 ওরিজিনাল ৬-রিল কাউবয় ৯৫% RTP ক্যাস্কেডিং লুপ ড্রাইভার]
        while (isLoopActive && loopSafety < 150) {
            loopSafety++;
            finalReelsResultMatrix = [];
            freeSpinsAwardedThisRound = 0;
            triggeredFreeSpinBonusNow = false;

            // ৬টি কলামের জন্য ৬টি পিউর র্যান্ডম ওয়াইল্ড বাউন্টি সিম্বল সিলেকশন
            for (let i = 0; i < 6; i++) {
                let randomIdx = Math.floor(Math.random() * bountySymbolsPool.length);
                finalReelsResultMatrix.push(bountySymbolsPool[randomIdx]);
            }

            // 🎁 [🎁 JILI/PG ওরিজিনাল ফ্রি স্পিন স্ক্যাটার ট্রিগার নব]:
            // ক্যাসিনো স্ট্যান্ডার্ড অনুযায়ী রাউন্ডে ১৫% চান্সে ৩টি 'GOLD_BAR_SCATTER' লোগো এক শটে পে-লাইনে পুш লক চ্যাম!
            if (Math.random() <= 0.15 && isCurrentSpinFree === false) {
                finalReelsResultMatrix[1] = "GOLD_BAR_SCATTER";
                finalReelsResultMatrix[2] = "GOLD_BAR_SCATTER";
                finalReelsResultMatrix[3] = "GOLD_BAR_SCATTER";
                freeSpinsAwardedThisRound = 10; // ওরিজিনাল ১০ রাউন্ড গ্র্যান্ড ফ্রি স্পিন বোনাস গিফট ওস্তাদ!
                triggeredFreeSpinBonusNow = true;
            }

            // 🎯 [৬-রিল ওOdds ম্যাচিং স্কোর ক্যালকুলেটর ইঞ্জিন]
            let matchCountsMap = {};
            finalReelsResultMatrix.forEach(sym => {
                if (sym !== "GOLD_BAR_SCATTER") matchCountsMap[sym] = (matchCountsMap[sym] || 0) + 1;
            });

            let maxMatchesCount = Object.keys(matchCountsMap).length > 0 ? Math.max(...Object.values(matchCountsMap)) : 0;
            let matchedSymbolName = Object.keys(matchCountsMap).find(key => matchCountsMap[key] === maxMatchesCount);

            // ৬-রিল স্লট আন্তর্জাতিক পে-আউট ওッズ বিন্যাস সিঙ্ক ওস্তাদ
            if (maxMatchesCount === 6) {
                if (matchedSymbolName === "BANDIT_WILD") winMultiplier = 50.00;       
                else if (matchedSymbolName === "MASKED_BANDIT") winMultiplier = 25.00; 
                else if (matchedSymbolName === "COWBOY_HAT") winMultiplier = 20.00; 
                else if (matchedSymbolName === "REVOLVER_PISTOL") winMultiplier = 15.00; 
                else winMultiplier = 12.00;                          
                finalStatus = "win";
            } else if (maxMatchesCount === 5) {
                winMultiplier = (matchedSymbolName === "BANDIT_WILD") ? 8.00 : 4.00;
                finalStatus = "win";
            } else if (maxMatchesCount === 4) {
                winMultiplier = (matchedSymbolName === "BANDIT_WILD") ? 4.00 : 2.00;
                finalStatus = "win";
            } else if (maxMatchesCount === 3) {
                winMultiplier = (matchedSymbolName === "BANDIT_WILD") ? 2.00 : 1.00;
                finalStatus = "win";
            } else if (maxMatchesCount === 2) {
                // ২-ম্যাচ লুপ ওরিজিনাল কারেকশন জিরো ওッズ লক ভাই ভাই!
                winMultiplier = 0.00; 
                finalStatus = "lose";
            } else {
                winMultiplier = 0.00;
                finalStatus = "lose";
            }

            // 🔥 [🔥 JILI/PG ওরিজিনাল ফ্রি স্পিন ডাবল মাল্টিপ্লায়ার সুপ্রীম বুস্টার]:
            // যদি এটি অলরেডি ফ্রি স্পিন রাউন্ডের ভেতরের শট হয়, তবে ওরিজিনাল প্রোটোকল অনুযায়ী জেতার ওッズ ডাবল হয়ে যাবে!
            // রেগুলার (x1->x2->x4->x8) থেকে ফ্রি স্পিনে হয়ে যাবে আল্ট্রা মেগা (x2->x4->x8->x16) গুণিতক!
            if (isCurrentSpinFree === true && winMultiplier > 0) {
                winMultiplier = winMultiplier * 2.00; // ওরিজিনাল ডাবল গুণিতক ইনজেকশন লক চ্যাম ভাই ভাই!
                finalStatus = "win";
            }

            if (triggeredFreeSpinBonusNow === true) {
                winMultiplier = 0.00; finalStatus = "free_spin_triggered";
                isLoopActive = false;
            } else {
                if (finalStatus === "win") {
                    // আন্তর্জাতিক স্লট সুষম ফিল্টারিং ট্র্যাকে ২২% এ টাইট ব্যালেন্সড লক ভাই ভাই!
                    if (Math.random() <= 0.22) isLoopActive = false;
                } else {
                    isLoopActive = false; // লস হলে ওয়ান-শটে লুপ ব্রেক বর্ম! ওল্ড ইনফিনিটি জ্যাম চিরতরে সাফ!
                }
            }
        }

                // প্লেয়ার ফিনাল ফ্রি স্পিন ব্যাংকিং ট্র্যাকার সিঙ্ক
        if (freeSpinsAwardedThisRound > 0) {
            playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + freeSpinsAwardedThisRound;
        }

        // 🎯 [মেগা কিলার জিরো-ডাবল-ডেবিট স্টেক ব্যালেন্সার বর্ম ভাই ভাই]
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
        
        if (finalStatus === "free_spin_triggered") phpPayload.status = "win"; // স্ক্যাটার এন্ট্রি সাকসেস লক
        else if (winMultiplier === 0 || winMultiplier < 1) phpPayload.status = "lose";
        else phpPayload.status = "win";

        phpPayload.bet_amount = isCurrentSpinFree ? 0 : reqAmount; // ফ্রি স্পিন হলে bet_logs হিস্ট্রিতে বাজি ধরা টাকা ০ এন্ট্রি হবে ওস্তাদ!

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
                    status: finalStatus, 
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
server.listen(PORT, () => { console.log(`🤠 Wild Bounty Bandits 3600 Ways Slots Engine Running on port ${PORT}`); });

