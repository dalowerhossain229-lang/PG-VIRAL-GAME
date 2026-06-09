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

let playerBountyFreeSpinsMap = {};
const gridRowsCountMap = { 0: 3, 1: 4, 2: 5, 3: 5, 4: 4, 5: 3 };

// 🎯 [🔒 ওরিজিনাল ৪-স্টেজ ক্যাস্কেড মাল্টিপ্লায়ার ল্যাডার চ্যাম ফিক্স লক ওস্তাদ! 🔒]: 
// রেন্ডারের এবং টার্মাক্সের সেই ৩৫ নম্বর লাইনের ফাঁকা ট্র্যাপ ওয়ান-শটে চিরতরে ধ্বংস! 
// ওরিজিনাল ২, ৪, ৮, ১৬ গুণের পিজি সফট অফিশিয়াল চেইন অ্যারে লকিং ইনজেকশন চ্যাম!
const cascadeMultiplierLadder = [2, 4, 8, 16];

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

// 🛫 ২. ওরিজিনাল ডাইনামিক চেইন ক্যাস্কেড এপিআই ইঞ্জিন রাউট লক ওস্তাদ! (১ম ৩ লাইনে মিললেই ঘন ঘন উইন মেকানিজম)
app.post('/api/slot-spin', async (req, res) => {
    const { userId, amount, wallet } = req.body; 
    const reqAmount = parseFloat(amount) || 1; // মিনিমাম ১ টাকা বাউন্টি বাজি সিঙ্ক
    const finalGameName = "wildbounty"; 
    const targetWallet = wallet || "main";

    let finalQueryUser = userId || "guest";
    if (finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") finalQueryUser = "guest";

    if (reqAmount < 1 || reqAmount > 5000) {
        return res.json({ success: false, message: "🚨 Invalid Bet Parameter! Max 5000৳" });
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
                return res.json({ success: false, message: "❌ আপনার অ্যাকাউন্ট ব্যালেন্স অপ্রতুল!" });
            }
            balResponseData = balResponse.data;
        } else {
            const checkBal = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, {
                action: "balance", username: finalQueryUser, amount: 0, wallet: targetWallet, game: finalGameName
            }, { timeout: 10000 });
            if (checkBal.data && checkBal.data.status === "ok") balResponseData.balance = checkBal.data.balance;
        }

        let currentDbBalance = parseFloat(balResponseData.balance) || 0;
        let finalStatus = "lose";
        let freeSpinsAwardedThisRound = 0;
        let totalWinAmount = 0;
        let winMultiplier = 0;

        // 🎁 [স্ক্যাটার ফ্রি স্পিন রাউন্ড চেকার]: ১৫% র্যান্ডম চান্সে বোনাস ট্রিগার
        if (Math.random() <= 0.15 && isCurrentSpinFree === false) {
            let scatterMatrix = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[] };
            for(let c=0; c<6; c++) {
                let maxRows = gridRowsCountMap[c];
                for(let r=0; r<maxRows; r++) scatterMatrix[c].push(c < 3 ? "GOLD_BAR_SCATTER" : "CARD_ACE");
            }
            freeSpinsAwardedThisRound = 10;
            playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + freeSpinsAwardedThisRound;
            
            const response = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, { action: "win", username: finalQueryUser, amount: 0, wallet: targetWallet, game: finalGameName }, { timeout: 15000 });
            return res.json({
                success: true,
                balance: response.data.balance || currentDbBalance,
                gameData: { finalReelsResultMatrix: scatterMatrix, winMultiplier: 0, status: "free_spin_triggered", winAmount: 0, freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] }
            });
        }

        // 🎰 [🔒 ওরিজিনাল চেইন ক্যাস্কেডিং মেটালিক লুপ ড্রাইভার 🔒]
        let cascadeChainSteps = [];
        let isCascadeContinuing = true;
        let currentCascadeIndex = 0; 
        
        let initialMatrix = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[] };

        while (isCascadeContinuing && currentCascadeIndex < cascadeMultiplierLadder.length) {
            let currentStepMatrix = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[] };
            
            for (let col = 0; col < 6; col++) {
                let maxRows = gridRowsCountMap[col];
                for (let r = 0; r < maxRows; r++) {
                    let randSym = bountySymbolsPool[Math.floor(Math.random() * bountySymbolsPool.length)];
                    currentStepMatrix[col].push(randSym);
                }
            }

            if (currentCascadeIndex === 0) initialMatrix = currentStepMatrix;

            // ১ম ৩ কলামের উইন সিকোয়েন্স চেকার
            let sym0 = currentStepMatrix;
            let sym1 = currentStepMatrix;
            let sym2 = currentStepMatrix;
            
            let baseSym = sym0 === "BANDIT_WILD" ? (sym1 === "BANDIT_WILD" ? sym2 : sym1) : sym0;
            
            let m1 = (sym0 === baseSym || sym0 === "BANDIT_WILD");
            let m2 = (sym1 === baseSym || sym1 === "BANDIT_WILD");
            let m3 = (sym2 === baseSym || sym2 === "BANDIT_WILD");

            let hitChancesRoll = Math.random();
            let forceWinThisStep = (currentCascadeIndex === 0) ? (hitChancesRoll <= 0.65) : (hitChancesRoll <= 0.40);

            if (m1 && m2 && m3 && baseSym !== "GOLD_BAR_SCATTER" && forceWinThisStep && baseSym !== undefined) {
                let stepBaseOdds = 1.00;
                if (baseSym === "MASKED_BANDIT") stepBaseOdds = 2.50;
                else if (baseSym === "COWBOY_HAT") stepBaseOdds = 2.00;
                else if (baseSym === "REVOLVER_PISTOL") stepBaseOdds = 1.50;

                let currentActiveMultiplier = cascadeMultiplierLadder[currentCascadeIndex]; 
                let stepFinalMultiplier = stepBaseOdds * currentActiveMultiplier;

                // ১ টাকা বা ২ টাকা বেটে সর্বোচ্চ ১২০০ গুণ জ্যাকপটের মেগা কিলার চান্স!
                if ((reqAmount === 1 || reqAmount === 2) && Math.random() <= 0.05) {
                    stepFinalMultiplier = parseFloat((Math.random() * (1200 - 300) + 300).toFixed(2));
                }

                // বাজি এмаউন্ট যত বাড়াবে উইন হওয়ার সম্ভাবনা তত কমবে ফিল্টারিং লক
                if (reqAmount > 100) {
                    let highBetBlockRoll = Math.random();
                    if (reqAmount >= 1000 && highBetBlockRoll > 0.10) { stepFinalMultiplier = 0; } 
                    else if (reqAmount > 100 && reqAmount < 1000 && highBetBlockRoll > 0.28) { stepFinalMultiplier = 0; }
                }

                if (stepFinalMultiplier > 0) {
                    let stepWinCash = Math.round(reqAmount * stepFinalMultiplier);
                    totalWinAmount += stepWinCash;
                    winMultiplier += stepFinalMultiplier;
                    finalStatus = "win";

                    cascadeChainSteps.push({
                        cascadeIndex: currentCascadeIndex,
                        multiplierLabel: "X" + currentActiveMultiplier,
                        matrix: currentStepMatrix,
                        stepWin: stepWinCash
                    });

                    currentCascadeIndex++; 
                } else {
                    isCascadeContinuing = false; 
                }
            } else {
                isCascadeContinuing = false; 
            }
        }

            if (isCurrentSpinFree === true && totalWinAmount > 0) {
        totalWinAmount = totalWinAmount * 2;
        winMultiplier = winMultiplier * 2;
    }

    let phpPayload = { 
        action: "win", 
        username: finalQueryUser, 
        amount: parseFloat(totalWinAmount), 
        wallet: targetWallet, 
        game: finalGameName 
    };
    phpPayload.status = (totalWinAmount === 0) ? "lose" : "win";
    phpPayload.bet_amount = isCurrentSpinFree ? 0 : reqAmount;

    // 🛫 ③ মেইন সাইটের সিকিউরড গেটওয়েতে রিয়েল-টাইম উইন-লস সেটেলমেন্ট এپیআই হিট (টাইমআউট ১৫ সেকেন্ড কড়া লক!)
    const response = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, phpPayload, { timeout: 15000 });

    if (response.data && response.data.status === "ok") {
        io.emit("balanceUpdate", { username: finalQueryUser, balance: response.data.balance });
        return res.json({
            success: true,
            balance: response.data.balance,
            gameData: {
                finalReelsResultMatrix: initialMatrix,
                winMultiplier: winMultiplier,
                status: phpPayload.status,
                winAmount: totalWinAmount,
                cascadeSteps: cascadeChainSteps, // ফ্রন্টএন্ডে ধামাধাম এক এক করে ব্লাস্ট এনিমেশন দেখানোর চেইন ডেটা!
                freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0,
                isFreeSpinRound: isCurrentSpinFree
            }
        });
    }
    return res.json({ success: false, balance: currentDbBalance, freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0 });
} catch (e) { 
    return res.json({ success: false, freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0, message: "⚠️ Timeout!" }); 
}
});

// 🎁 ৪. [🔒 ওরিজিনাল স্ক্যাটার বোনাস বাই এপিআই রাউট লক 🔒]:
app.post('/api/slot-buy-feature', async (req, res) => {
    const { userId, amount, wallet } = req.body;
    const baseBet = parseFloat(amount) || 1;
    const buyFeatureCost = baseBet * 50; 
    const targetWallet = wallet || "main";
    let finalQueryUser = userId === "logged_in_player" || !userId || userId === "undefined" ? "guest" : userId;

    try {
        const balResponse = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, {
            action: "bet", username: finalQueryUser, amount: buyFeatureCost, wallet: targetWallet, game: "wildbounty"
        }, { timeout: 15000 });

        if (!balResponse.data || balResponse.data.status !== "ok") {
            return res.json({ success: false, message: "❌ ব্যালেন্স অপ্রতুল!" });
        }

        playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + 10;
        io.emit("balanceUpdate", { username: finalQueryUser, balance: balResponse.data.balance });

        return res.json({ 
            success: true, 
            balance: balResponse.data.balance, 
            freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser], 
            message: "🎉 ১০টি ফ্রি স্পিন বোনাস সফল!" 
        });
    } catch (e) { 
        return res.json({ success: false, message: "🚨 টাইমআউট!" }); 
    }
});

app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname, 'index.html')); });
io.on('connection', (socket) => {});

// ⚡ কাস্টম நோড সার্ভার পোর্ট গেটওয়ে লাইভ অন ফায়ার (৪০০০০ পোর্টে কড়া সিঙ্ক লক!)
const PORT = process.env.PORT || 40000; 
server.listen(PORT, () => { 
    console.log(`🤠 Wild Bounty Bandits Official Pay-line Multi-Cascade Active on port ${PORT}`); 
});
