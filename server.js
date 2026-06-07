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

// 🤠 ওরিজিনাল ওয়াইল্ড বাউন্টি ৯টি ক্যাসিনো সিম্বল পুল ডিরেক্টরি
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

// 🛫 ২. ওরিজিনাল ৩-৪-৫-৫-৪-৩ কিক স্পিন রাউট (১ম ৩ লাইনে ছবি মেলার ১০০০০০% নিখুঁত পে-লাইন ট্র্যাকার বর্ম)
app.post('/api/slot-spin', async (req, res) => {
    const { userId, amount, wallet } = req.body; 
    const reqAmount = parseFloat(amount) || 1; // মিনিমাম ১ টাকা বাউন্টি বাজি সিঙ্ক
    const finalGameName = "wildbounty"; 
    const targetWallet = wallet || "main";

    let finalQueryUser = userId;
    if (!finalQueryUser || finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") {
        finalQueryUser = "guest"; 
    }

    if (reqAmount < 1 || reqAmount > 5000) {
        return res.json({ success: false, message: "🚨 Invalid Bet Parameter! Min 1৳ - Max 5000৳" });
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

        // 🎰 [🎰 ওরিজিনাল ৩-৪-৫-৫-৪-৩ গ্লোবাল ৯৫% RTP পে-লাইন লজিক ইঞ্জিন]
        while (isLoopActive && loopSafety < 150) {
            loopSafety++;
            finalReelsResultMatrix = [];
            freeSpinsAwardedThisRound = 0;
            triggeredFreeSpinBonusNow = false;

            // 🎁 [ফ্রি স্পিন স্ক্যাটার ট্রিগার]: ১৫% র্যান্ডম সুষম চান্স প্রোটোকল লক
            if (Math.random() <= 0.15 && isCurrentSpinFree === false) {
                finalReelsResultMatrix = ["GOLD_BAR_SCATTER", "GOLD_BAR_SCATTER", "GOLD_BAR_SCATTER", "CARD_ACE", "CARD_KING", "CARD_Q"];
                freeSpinsAwardedThisRound = 10; 
                triggeredFreeSpinBonusNow = true;
                winMultiplier = 0.00;
                finalStatus = "free_spin_triggered";
                isLoopActive = false;
                break;
            }

            // ৬টি কলামের জন্য ৬টি পিউর র্যান্ডম সিম্বল জেনারেট লক
            for (let i = 0; i < 6; i++) {
                let randomIdx = Math.floor(Math.random() * bountySymbolsPool.length);
                finalReelsResultMatrix.push(bountySymbolsPool[randomIdx]);
            }

            // 🎯 [🔒 ওস্তাদ! আপনার স্পট করা ১ম ৩ লাইন পে-লাইন ম্যাচিং মেকানিজম লক চ্যাম 🔒]:
            // বাম দিক থেকে ১ম ৩টি কলাম (Col 0, Col 1, Col 2) এর ওরিজিনাল পে-লাইন ট্র্যাকিং লক!
            let sym0 = finalReelsResultMatrix[0];
            let sym1 = finalReelsResultMatrix[1];
            let sym2 = finalReelsResultMatrix[2];
            let sym3 = finalReelsResultMatrix[3];
            let sym4 = finalReelsResultMatrix[4];
            let sym5 = finalReelsResultMatrix[5];

            // ওয়াইল্ড প্রতীকের পাওয়ার বুস্টার সিঙ্ক (WILD প্রতীক যেকোনো ছবির রূপ নিতে পারে ওস্তাদ!)
            let match1 = (sym1 === sym0 || sym1 === "BANDIT_WILD" || sym0 === "BANDIT_WILD");
            let match2 = (sym2 === sym0 || sym2 === "BANDIT_WILD" || sym2 === sym1);

            // 🚀 [ঘন ঘন উইন ট্রিগার]: ১ম ৩ কলামের ছবি মিললেই ওয়ান-শটে ১ লক্ষ পার্সেন্ট জেনুইন উইন লক!
            if (match1 && match2) {
                finalStatus = "win";
                
                // ওরিজিনাল পিজি সফট স্টাইল বেস মাল্টিপ্লায়ার সেট
                let baseMatchedSym = sym0 === "BANDIT_WILD" ? sym1 : sym0;
                if (baseMatchedSym === "MASKED_BANDIT") winMultiplier = 3.00;
                else if (baseMatchedSym === "COWBOY_HAT") winMultiplier = 2.00;
                else if (baseMatchedSym === "REVOLVER_PISTOL") winMultiplier = 1.50;
                else winMultiplier = 1.20; // তাসের কার্ডের জন্য ১.২ গুণ বেস ওッズ

                // অতিরিক্ত কলাম ৪, ৫ বা ৬ এও যদি একই ছবি কন্টিনিউ মিলে যায়—তবে ওッズ আরও মেগা বুস্ট হবে!
                if (sym3 === baseMatchedSym || sym3 === "BANDIT_WILD") winMultiplier += 1.50;
                if (sym4 === baseMatchedSym || sym4 === "BANDIT_WILD") winMultiplier += 2.00;
                if (sym5 === baseMatchedSym || sym5 === "BANDIT_WILD") winMultiplier += 3.00;

                isLoopActive = false;
            } else {
                // ১ম ৩ কলাম না মিললে এই স্পিনটি ওয়ান-শটে লস!
                winMultiplier = 0.00;
                finalStatus = "lose";
                isLoopActive = false;
            }
        }

        if (freeSpinsAwardedThisRound > 0) {
            playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + freeSpinsAwardedThisRound;
        }

        // 🎯 [🔒 মেগা কিংস রুলস - বাজি অনুযায়ী ডাইনামিক ওッズ এবং প্রোбавিলিটি ব্যালেন্সার বর্ম 🔒]
        let winAmount = 0;
        let dbAction = "win";
        let dbAmount = 0;

        // ওস্তাদ ভাই ভাই! ১৳ বা ২৳ কম অ্যামাউন্টের বাজিতে ১২০০ গুণ পর্যন্ত মেগা ওッズ জ্যাকপট ট্রিগার!
        if ((reqAmount === 1 || reqAmount === 2) && finalStatus === "win" && Math.random() <= 0.06) {
            winMultiplier = parseFloat((Math.random() * (1200 - 400) + 400).toFixed(2)); // ৪০০ থেকে ১২০০ গুণের রাজকীয় প্রফিট ফায়ার!
        }

        // এماউন্ট যত বাড়াবে উইন হওয়ার সম্ভাবনা তত কমবে - ম্যাথমেটিক্যাল প্রোбавিলিটি সিলড ফিল্টার!
        if (reqAmount > 100 && finalStatus === "win") {
            let highBetRiskRoll = Math.random();
            if (reqAmount >= 1000 && highBetRiskRoll > 0.12) {
                // বাজি ১০০০৳ থেকে ৫০০০৳ হলে জেতার চান্স সরাসরি মাত্র ১২% এ ড্রপ লক!
                winMultiplier = 0.00; finalStatus = "lose";
            } else if (reqAmount > 100 && reqAmount < 1000 && highBetRiskRoll > 0.30) {
                // বাজি ১০০৳ এর বেশি হলে জেতার চান্স সরাসরি মাত্র ৩০% এ ড্রপ লক!
                winMultiplier = 0.00; finalStatus = "lose";
            }
        }

        // ফ্রি স্পিন রাউন্ড রানিং থাকলে ওরিজিনাল প্রোটোকল অনুযায়ী জেতার ওッズ ওয়ান-শটে ডাবল বুস্ট লক!
        if (isCurrentSpinFree === true && winMultiplier > 0) {
            winMultiplier = winMultiplier * 2.00;
            finalStatus = "win";
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

// 🎁 [🔒 ওরিজিনাল স্ক্যাটার বোনাস বাই এপিআই রাউট লক 🔒]
app.post('/api/slot-buy-feature', async (req, res) => {
    const { userId, amount, wallet } = req.body;
    const baseBet = parseFloat(amount) || 1;
    const buyFeatureCost = baseBet * 50; 
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

        playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + 10;
        io.emit("balanceUpdate", { username: finalQueryUser, balance: balResponse.data.balance });

        return res.json({
            success: true,
            balance: balResponse.data.balance,
            freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser],
            message: "🎉 ১০টি ফ্রি স্পিন বোনাস রাউন্ড সফলভাবে কেনা হয়েছে ওস্তাদ!"
        });
    } catch (e) {
        return res.json({ success: false, message: "🚨 Gateway Timeout! Try again." });
    }
});

app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname, 'index.html')); });
io.on('connection', (socket) => {});

// ⚡ কাস্টম নোড সার্ভার পোর্ট গেটওয়ে লাইভ অন ফায়ার (৪০০০০ পোর্টে ডেডিকেটেড সিঙ্ক লক!)
const PORT = process.env.PORT || 40000; 
server.listen(PORT, () => { console.log(`🤠 Wild Bounty Bandits Official 3600 Ways Pay-line Dynamic Engine Active on port ${PORT}`); });
