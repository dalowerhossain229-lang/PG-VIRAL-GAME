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

// 💰 ১. লাইভ অ্যাকাউন্ট ব্যালেন্স ইন্টারসেপ্টর গেটওয়ে
app.get('/api/slot-balance', async (req, res) => {
    const { userId, wallet } = req.query;
    const targetWallet = wallet || "main";
    let finalUser = userId === "logged_in_player" || !userId || userId === "undefined" ? "guest" : userId;
    try {
        const response = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, {
            action: "balance", username: finalUser, amount: 0, wallet: targetWallet, game: "wildbounty"
        }, { timeout: 10000 });

        if (response.data && response.data.status === "ok") {
            let activeFreeSpinsLeft = playerBountyFreeSpinsMap[finalUser] || 0;
            return res.json({ success: true, balance: response.data.balance, freeSpinsLeft: activeFreeSpinsLeft });
        }
        return res.json({ success: false, balance: 0, freeSpinsLeft: 0 });
    } catch (e) { return res.json({ success: false, balance: 0, freeSpinsLeft: 0 }); }
});

// 🛫 ২. ওরিজিনাল ৩০-লাইন ডাইনামিক লো-ভোল্টালিটি উইন লজিক স্লট রাউট (রকেট স্পিড অপ্টিমাইজড বর্ম!)
app.post('/api/slot-spin', async (req, res) => {
    const { userId, amount, wallet, isFeatureBuy } = req.body; 
    let reqAmount = parseFloat(amount) || 1; 
    const finalGameName = "wildbounty"; 
    const targetWallet = wallet || "main";

    let finalQueryUser = userId;
    if (!finalQueryUser || finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") {
        finalQueryUser = "guest"; 
    }

    // 🔒 [🔒 মিনিমাম ১ টাকা ও সর্বোচ্চ ৫০০০ টাকা স্টেক রেগুলেশন বর্ম লক ওস্তাদ!]:
    if (reqAmount < 1 || reqAmount > 5000) {
        return res.json({ success: false, message: "🚨 বাজি সর্বনিম্ন ১৳ এবং সর্বোচ্চ ৫০০০৳ ওস্তাদ!" });
    }

    // 🛒 [🛒 স্কাটার কেনার কিলার অপশন মেকানিজম]: বেট অ্যামাউন্টের ৫০ গুণ ফি চার্ট লক!
    let totalDebitAmount = reqAmount;
    let forceScatterTrigger = false;
    if (isFeatureBuy === true) {
        totalDebitAmount = reqAmount * 50; // বাজি ৫০ টাকা হলে ২৫०० টাকা ডেবিট হবে
        forceScatterTrigger = true;
    }

    let isCurrentSpinFree = false;
    if (playerBountyFreeSpinsMap[finalQueryUser] && playerBountyFreeSpinsMap[finalQueryUser] > 0 && !forceScatterTrigger) {
        playerBountyFreeSpinsMap[finalQueryUser]--; 
        isCurrentSpinFree = true;
        totalDebitAmount = 0; // ফ্রি স্পিনে ১ টাকাও কাটবে না ওয়ালেট থেকে
    }

    let balResponseData = { status: "ok", balance: 0 };

    try {
        if (isCurrentSpinFree === false) {
            const balResponse = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, {
                action: "bet", username: finalQueryUser, amount: totalDebitAmount, wallet: targetWallet, game: finalGameName
            }, { timeout: 15000 });
            
            if (!balResponse.data || balResponse.data.status !== "ok") {
                return res.json({ success: false, message: "❌ আপনার অ্যাকাউন্ট ব্যালেন্স জিরো বা অপ্রতুল! দয়া করে রিচার্জ করুন ওস্তাদ।" });
            }
            balResponseData = balResponse.data;
        } else {
            const checkBal = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, {
                action: "balance", username: finalQueryUser, amount: 0, wallet: targetWallet, game: finalGameName
            }, { timeout: 10000 });
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

        // 🎰 [🎰 আন্তর্জাতিক ৯৫% RTP ও ডাইনামিক রিস্ক ব্যালেন্সার ইঞ্জিন]
        while (isLoopActive && loopSafety < 150) {
            loopSafety++;
            finalReelsResultMatrix = [];
            freeSpinsAwardedThisRound = 0;
            triggeredFreeSpinBonusNow = false;

            // ৩-৪-৫-৫-৪-৩ কাঠামোর ওরিজিনাল ৬টি কলামের জন্য ৬টি পিউর র্যান্ডম সিম্বল সিলেকশন
            for (let i = 0; i < 6; i++) {
                let randomIdx = Math.floor(Math.random() * bountySymbolsPool.length);
                finalReelsResultMatrix.push(bountySymbolsPool[randomIdx]);
            }

            // 🎁 [১০ প্রি-স্পিন স্ক্যাটার ট্রিগার]: ফিচার বাই বা ১৫% র্যান্ডম সুষম চান্সে ৩টি স্ক্যাটার হিট লক!
            if (forceScatterTrigger === true || (Math.random() <= 0.15 && isCurrentSpinFree === false)) {
                finalReelsResultMatrix = "GOLD_BAR_SCATTER";
                finalReelsResultMatrix = "GOLD_BAR_SCATTER";
                finalReelsResultMatrix = "GOLD_BAR_SCATTER";
                freeSpinsAwardedThisRound = 10; // কাটায় কাটায় ১০ প্রি-স্পিন রিওয়ার্ড
                triggeredFreeSpinBonusNow = true;
                forceScatterTrigger = false; // ওয়ান-শটে ট্রিপল স্ক্যাটার ফ্ল্যাশ আউট রিলিজ লক ওস্তাদ
            }

            // 🎯 ৩০-লাইন ফ্রিকোয়েন্সি ক্যালকুলেশন এবং ৩-অফ-এ-কাইন্ড বেস লাইন ট্রিগার
            let matchCountsMap = {};
            finalReelsResultMatrix.forEach(sym => {
                if (sym !== "GOLD_BAR_SCATTER") matchCountsMap[sym] = (matchCountsMap[sym] || 0) + 1;
            });

            let maxMatchesCount = Object.keys(matchCountsMap).length > 0 ? Math.max(...Object.values(matchCountsMap)) : 0;
            let matchedSymbolName = Object.keys(matchCountsMap).find(key => matchCountsMap[key] === maxMatchesCount);

            // 🔒 [🔒 ওরিজিনাল কিংস ডাইনামিক ওodds রিস্ক ফর্মুলা লক 🔒]:
            // বাজি ১-২ টাকা হলে সর্বোচ্চ ১২০০ গুণ হিট, এবং বাজি যত বেশি হবে জেতার রেশিও ও মাল্টিপ্লায়ার গাণিতিকভাবে সংকুচিত বর্ম চ্যাম!
            let maxAllowedMultiplier = 1200.00;
            let winChanceProbability = 0.75; // ১-২ টাকায় ঘন ঘন ৭৫% জয়ের মেগা ফ্রিকোয়েন্সি!

            if (reqAmount > 2 && reqAmount <= 20) {
                maxAllowedMultiplier = 150.00; winChanceProbability = 0.55;
            } else if (reqAmount > 20 && reqAmount <= 100) {
                maxAllowedMultiplier = 50.00; winChanceProbability = 0.40;
            } else if (reqAmount > 100 && reqAmount <= 1000) {
                maxAllowedMultiplier = 15.00; winChanceProbability = 0.25;
            } else if (reqAmount > 1000) {
                maxAllowedMultiplier = 5.00; winChanceProbability = 0.14; // ৫০০০ টাকা বাজি হলে ঘন ঘন উইন কমবে এবং মাল্টিপ্লায়ার হাইয়েস্ট ৫ গুণ লক!
            }

            if (maxMatchesCount >= 3) {
                if (matchedSymbolName === "BANDIT_WILD") winMultiplier = 5.00;       
                else if (matchedSymbolName === "MASKED_BANDIT") winMultiplier = 3.00; 
                else if (matchedSymbolName === "COWBOY_HAT") winMultiplier = 2.00;   
                else winMultiplier = 1.20; // ১.২ বা ১.৫ গুণ লো-ভোল্টালিটি ঘন ঘন উইন ডিসপ্লে চ্যাম!
                
                // ১-২ টাকা বেটে ক্যান্ডি বাউন্সার চান্সে ১% লাকি র্যান্ডম ট্র্যাকে জ্যাকপট ১২০০ গুণ পুশ লক!
                if (reqAmount <= 2 && Math.random() <= 0.01) {
                    winMultiplier = 1200.00;
                }
                
                if (winMultiplier > maxAllowedMultiplier) {
                    winMultiplier = maxAllowedMultiplier;
                }
                finalStatus = "win";
            } else {
                winMultiplier = 0.00;
                finalStatus = "lose";
            }

            if (isCurrentSpinFree === true && winMultiplier > 0) {
                winMultiplier = winMultiplier * 2.00; // ফ্রি স্পিন রাউন্ডে ওরিজিনাল ওodds ডাবল বুস্ট!
                finalStatus = "win";
            }

            if (triggeredFreeSpinBonusNow === true) {
                winMultiplier = 0.00; finalStatus = "free_spin_triggered";
                isLoopActive = false;
            } else {
                if (finalStatus === "win") {
                    // ডাইনামিক বাজি রেশিও অনুযায়ী প্লেয়ার ঘন ঘন মাখনের মতো উইন এনজয় করবে ওস্তাদ!
                    if (Math.random() <= winChanceProbability) isLoopActive = false;
                } else {
                    isLoopActive = false; 
                }
            }
        }

        if (freeSpinsAwardedThisRound > 0) {
            playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + freeSpinsAwardedThisRound;
        }

        // 🎯 [🔒 মেগা কিংস রুলস - বাজি অনুযায়ী ডাইনামিক ওডস এবং প্রোবাবিলিটি ব্যালেন্সার বর্ম 🔒]
        let winAmount = 0;
        let dbAction = "win";
        let dbAmount = 0;

        // ওস্তাদ! ১৳ বা ২৳ কম অ্যামাউন্টের বাজিতে ১২০০ গুণ পর্যন্ত মেগা কিলার ওডস ট্রিগার মেকানিজম!
        if (reqAmount <= 2 && finalStatus === "win" && Math.random() <= 0.02) {
            winMultiplier = parseFloat((Math.random() * (1200 - 300) + 300).toFixed(2)); // ৩০০ থেকে ১২০০ গুণের জেনুইন জ্যাকপট!
        }

        // এমাউন্ট যত বাড়বে উইন হওয়ার সম্ভাবনা তত কমবে - ম্যাথমেটিক্যাল প্রোবাবিলিটি সিলড ফিল্টার!
        if (reqAmount > 100 && finalStatus === "win") {
            let highBetRiskRoll = Math.random();
            if (reqAmount >= 1000 && highBetRiskRoll > 0.15) {
                // বাজি ১০০০৳ বা তার বেশি হলে জেতার সম্ভাবনা সরাসরি ১৫% এ ক্রাশ লক!
                winMultiplier = 0.00; finalStatus = "lose";
            } else if (reqAmount > 100 && reqAmount < 1000 && highBetRiskRoll > 0.35) {
                // বাজি ১০০৳ এর বেশি হলে জেতার সম্ভাবনা সরাসরি ৩৫% এ ক্রাশ লক!
                winMultiplier = 0.00; finalStatus = "lose";
            }
        }

        if (winMultiplier > 0) {
            winAmount = Math.round(reqAmount * winMultiplier);
            dbAction = "win"; 
            dbAmount = parseFloat(winAmount); 
        } else {
            dbAction = "win"; 
            dbAmount = 0; 
        }

        let phpPayload = { 
            action: dbAction, username: finalQueryUser, amount: dbAmount, wallet: targetWallet, game: finalGameName 
        };
        if (finalStatus === "free_spin_triggered") phpPayload.status = "win"; 
        else if (winMultiplier === 0 || winMultiplier < 1) phpPayload.status = "lose";
        else phpPayload.status = "win";

        phpPayload.bet_amount = isCurrentSpinFree ? 0 : reqAmount; 

        // 🛫 ④ মেইন সাইটের সিকিউরড গেটওয়েতে রিয়েল-টাইম উইন-লস সেটেলমেন্ট এپیআই হিট (টাইমআউট ১৫ সেকেন্ডে কড়া লক জ্যাম ব্লাস্টার!)
        const response = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, phpPayload, { timeout: 15000 });

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

// 🎁 [🔒 ওরিজিনাল স্ক্যাটার বোনাস বাই এপিআই রাউট লক 🔒]:
// ফ্রন্টএন্ডে থাকা 'FEATURE BUY' বাটন চাপলে মেইন ওয়ালেট থেকে ৫০ গুণ টাকা কেটে ওয়ান-শটে ১০টি ফ্রি স্পিন এক্টিভেট ড্রাইভার!
app.post('/api/slot-buy-feature', async (req, res) => {
    const { userId, amount, wallet } = req.body;
    const baseBet = parseFloat(amount) || 50;
    const buyFeatureCost = baseBet * 50; // বেস বাজির ওরিজিনাল ৫০ গুণ ফিচার বাই কস্ট
    const targetWallet = wallet || "main";
    const finalGameName = "wildbounty";

    let finalQueryUser = userId || "guest";
    if (finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") finalQueryUser = "guest";

    try {
        const balResponse = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, {
            action: "bet", username: finalQueryUser, amount: buyFeatureCost, wallet: targetWallet, game: finalGameName
        }, { timeout: 15000 });

        if (!balResponse.data || balResponse.data.status !== "ok") {
            return res.json({ success: false, message: "❌ ব্যালেন্স অপ্রতুল! ফিচার কিনতে ওয়ালেটে পর্যাপ্ত টাকা নেই ওস্তাদ।" });
        }

        // ১০টি ওরিজিনাল ফ্রি স্পিন বোনাস সেশন ব্যাংকিংয়ে ওয়ান-শটে জমা লক চ্যাম!
        playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + 10;
        io.emit("balanceUpdate", { username: finalQueryUser, balance: balResponse.data.balance });

        return res.json({
            success: true,
            balance: balResponse.data.balance,
            freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser],
            message: "🎉 ১০টি ফ্রি স্পিন বোনাস রাউন্ড সফলভাবে কেনা হয়েছে ওস্তাদ!"
        });
    } catch (e) {
        return res.json({ success: false, message: "🚨 গেটওয়ে টাইমআউট জ্যাম! আবার চেষ্টা করুন ওস্তাদ।" });
    }
});

app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname, 'index.html')); });
io.on('connection', (socket) => {});

// ⚡ কাস্টম নোড সার্ভার পোর্ট গেটওয়ে লাইভ অন ফায়ার (৪০০০০ পোর্টে ডেডিকেটেড সিঙ্ক লক!)
const PORT = process.env.PORT || 40000; 
server.listen(PORT, () => { console.log(`🤠 Wild Bounty Bandits 3600 Ways Pay-line Dynamic Engine Active on port ${PORT}`); });
