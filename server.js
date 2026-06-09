const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);

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

const MAIN_SITE_URL = "https://betlover247.onrender.com"; 

const bountySymbolsPool = [
    "BANDIT_WILD", "GOLD_BAR_SCATTER", "MASKED_BANDIT", 
    "COWBOY_HAT", "REVOLVER_PISTOL", "CARD_ACE", 
    "CARD_KING", "CARD_JACK", "CARD_Q"
];

let playerBountyFreeSpinsMap = {};
const gridRowsCountMap = { 0: 3, 1: 4, 2: 5, 3: 5, 4: 4, 5: 3 };

// 🎯 [🔒 ওরিজিনাল ৪-স্টেজ ক্যাস্কেড মাল্টিপ্লায়ার ল্যাডার চ্যাম লক 🔒]
const cascadeMultiplierLadder =[2, 4, 8, 16];

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

// 🛫 ওরিজিনাল ডাইনামিক কলাম-যেকোনো-জায়গা ও পাশাপাশি মেগা-বুস্ট এপিআই রাউট লক ওস্তাদ!
app.post('/api/slot-spin', async (req, res) => {
    const { userId, amount, wallet } = req.body; 
    const reqAmount = parseFloat(amount) || 1; 
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

        // 🎰 [🔒 ওরিজিনাল ৩,৬০০ WAYS স্ক্যাটার-পে মেকানিজম লুপ ড্রাইভার 🔒]
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

            // 🚀 [🔒 ওস্তাদ! কলাম-যেকোনো-জায়গা ট্র্যাকার অ্যালগরিদম লক 🔒]:
            // প্রতি কলামের সব ঘর স্ক্যান করে কোন ছবি কোন কোন কলামে আছে তা ডাইনামিক ফিল্টার করে!
            let colContainsSymbols = [];
            for (let c = 0; col < 6; col++) {
                colContainsSymbols[c] = currentStepMatrix[c] || [];
            }

            // বেস ছবি নির্ধারণ (১ম কলামের ১ম অ-ওয়াইল্ড ছবি ট্র্যাক)
            let baseSym = "CARD_ACE";
            for(let r=0; r<currentStepMatrix[0].length; r++) {
                let s = currentStepMatrix[0][r];
                if (s !== "BANDIT_WILD" && s !== "GOLD_BAR_SCATTER") { baseSym = s; break; }
            }

            // প্রতিটি কলামে বেস ছবি অথবা WILD কার্ড আছে কিনা এবং কোন সারিতে আছে তার পজিশন ট্র্যাক!
            let matchCount = 0;
            let rowPositions = []; // পাশাপাশি সোজা লাইন ম্যাচ চেকার

            for (let c = 0; c < 6; c++) {
                let foundInCol = false;
                let matchedRowIdx = -1;
                for (let r = 0; r < currentStepMatrix[c].length; r++) {
                    let s = currentStepMatrix[c][r];
                    if (s === baseSym || s === "BANDIT_WILD") {
                        foundInCol = true;
                        matchedRowIdx = r; // সোজা জোড়া চেক করতে ইনডেক্স মেমোরি হোল্ড
                        break;
                    }
                }
                if (foundInCol) {
                    matchCount++;
                    rowPositions.push(matchedRowIdx);
                } else {
                    break; // চেইন পাশাপাশি কলামে মিস হলেই ব্রেক! ওরিজিনাল রুলস!
                }
            }

            let hitChancesRoll = Math.random();
            let forceWinThisStep = false;
            
            // ৮৫% কিলার জেনুইন হিট রেট একটিভ চ্যাম!
            if (matchCount === 3) forceWinThisStep = (hitChancesRoll <= 0.85); 
            else if (matchCount === 4) forceWinThisStep = (hitChancesRoll <= 0.60); 
            else if (matchCount >= 5) forceWinThisStep = (hitChancesRoll <= 0.40); 

            if (matchCount >= 3 && forceWinThisStep && baseSym !== "GOLD_BAR_SCATTER") {
                // ওরিজিনাল সিম্বল বেস ওডস ডিরেক্টরি
                let stepBaseOdds = 0.40; // মিনিমাম অ্যামাউন্ট উইন বুস্টার ওস্তাদ!
                if (baseSym === "MASKED_BANDIT") stepBaseOdds = 2.00;
                else if (baseSym === "COWBOY_HAT") stepBaseOdds = 1.50;
                else if (baseSym === "REVOLVER_PISTOL") stepBaseOdds = 1.00;

                // 🎯 [🔒 ওস্তাদ! পাশাপাশি সোজা লাইন মেগা-বুস্ট মেকানিজম লক 🔒]:
                // যদি ১ম ৩টি বা তার বেশি ছবির রো-ইনডেক্স হুবহু এক হয় (অর্থাৎ পাশাপাশি সোজা একই সারিতে পড়ে),
                // তবে উইন অ্যামাউন্ট সরাসরি ৪ গুণ (X4.0) মেগা মাল্টিপ্লাই ট্র্যাকে হিট করবে ওস্তাদ ভাই ভাই!
                let isPerfectHorizontalLine = true;
                for (let i = 1; i < rowPositions.length; i++) {
                    if (rowPositions[i] !== rowPositions[0]) {
                        isPerfectHorizontalLine = false;
                        break;
                    }
                }

                if (isPerfectHorizontalLine) {
                    stepBaseOdds = stepBaseOdds * 4.0; // ⚡ পাশাপাশি সোজা জোড়ায় ৪ গুণ মেগা বোনাস ওডস বুস্ট!
                }

                        // কলাম সংখ্যার মেগা কম্বো মাল্টিপ্লায়ার
        if (matchCount === 4) stepBaseOdds = stepBaseOdds * 1.5; 
        else if (matchCount === 5) stepBaseOdds = stepBaseOdds * 3.0;
        else if (matchCount === 6) stepBaseOdds = stepBaseOdds * 6.0;

        let currentActiveMultiplier = cascadeMultiplierLadder[currentCascadeIndex]; 
        let stepFinalMultiplier = stepBaseOdds * currentActiveMultiplier;

        // ১ টাকা বা ২ টাকা বেটে সর্বোচ্চ ১২০০ গুণ জ্যাকপটের মেগা কিলার চান্স!
        if ((reqAmount === 1 || reqAmount === 2) && Math.random() <= 0.05) {
            stepFinalMultiplier = parseFloat((Math.random() * (1200 - 300) + 300).toFixed(2));
        }

        // বাজি এماউন্ট প্রোটেকশন গেটওয়ে লক
        if (reqAmount > 100) {
            let highBetBlockRoll = Math.random();
            if (reqAmount >= 1000 && highBetBlockRoll > 0.10) { stepFinalMultiplier = 0.5; } 
            else if (reqAmount > 100 && reqAmount < 1000 && highBetBlockRoll > 0.30) { stepFinalMultiplier = 0.8; }
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
    action: "win", username: finalQueryUser, amount: parseFloat(totalWinAmount), wallet: targetWallet, game: finalGameName 
};
phpPayload.status = (totalWinAmount === 0) ? "lose" : "win";
phpPayload.bet_amount = isCurrentSpinFree ? 0 : reqAmount;

// 🛫 ③ মেইন সাইটের সিকিউরড গেটওয়েতে রিয়েল-টাইম উইন-লস সেটেলমেন্ট এপিআই হিট (টাইমআউট ১৫ সেকেন্ড কড়া লক!)
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
            cascadeSteps: cascadeChainSteps, 
            freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0,
            isFreeSpinRound: isCurrentSpinFree
        }
    });
}
return res.json({ success: false, balance: currentDbBalance, freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0 });
} catch (e) { return res.json({ success: false, freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0, message: "⚠️ Timeout!" }); }
});

// FEATURE BUY বোনাস রাউন্ড রাউট
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

        if (!balResponse.data || balResponse.data.status !== "ok") return res.json({ success: false, message: "❌ ব্যালেন্স অপ্রতুল!" });

        playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + 10;
        io.emit("balanceUpdate", { username: finalQueryUser, balance: balResponse.data.balance });

        return res.json({ success: true, balance: balResponse.data.balance, freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser], message: "🎉 ১০টি ফ্রি স্পিন বোনাস সফল!" });
    } catch (e) { return res.json({ success: false, message: "🚨 টাইমআউট!" }); }
});

app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname, 'index.html')); });
const PORT = process.env.PORT || 40000; 
server.listen(PORT, () => { console.log(`🤠 Wild Bounty Bandits Official Pay-line Multi-Cascade Active on port ${PORT}`); });

