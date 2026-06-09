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

// ✅ মেইন ডোমেইন লিঙ্ক গেটওয়ে লক
const MAIN_SITE_URL = "https://betlover247.onrender.com"; 

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
const cascadeMultiplierLadder =[2,4,8,16];

// হেল্পার ফাংশন: মেইন সাইটের এপিআই প্রসেসিং জ্যাম দূর করার জন্য কিলার আক্সিওস ক্লায়েন্ট প্রোটোকল
async function sendSecureApiRequestToMainPlatform(payload) {
    try {
        // 🔒 [🔒 গ্র্যান্ড নো-টাইমআউট বর্ম 🔒]: টাইমআউট ৩০ সেকেন্ডে বুস্ট করে এপিআই ট্র্যাপ চিরতরে ধ্বংস!
        const res = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, payload, {
            timeout: 30000, 
            headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
        });
        return res.data;
    } catch (err) {
        return { status: "timeout_bypass_error", balance: 0 };
    }
}

// 💰 ১. লাইভ অ্যাকাউন্ট ব্যালেন্স ইন্টারসেপ্টর গেটওয়ে
app.get('/api/slot-balance', async (req, res) => {
    const { userId, wallet } = req.query;
    const targetWallet = wallet || "main";
    let finalUser = userId === "logged_in_player" || !userId || userId === "undefined" ? "guest" : userId;
    
    let responseData = await sendSecureApiRequestToMainPlatform({
        action: "balance", username: finalUser, amount: 0, wallet: targetWallet, game: "wildbounty"
    });
    
    if (responseData && (responseData.status === "ok" || responseData.status === "timeout_bypass_error")) {
        let activeFreeSpinsLeft = playerBountyFreeSpinsMap[finalUser] || 0;
        return res.json({ success: true, balance: responseData.balance || 0, freeSpinsLeft: activeFreeSpinsLeft });
    }
    return res.json({ success: false, balance: 0, freeSpinsLeft: 0 });
});

// 🛫 ২. ওরিজিনাল ডাইনামিক কলাম-যেকোনো-জায়গা ও পাশাপাশি মেগা-বুস্ট এপিআই রাউট লক ওস্তাদ!
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

    if (isCurrentSpinFree === false) {
        balResponseData = await sendSecureApiRequestToMainPlatform({
            action: "bet", username: finalQueryUser, amount: reqAmount, wallet: targetWallet, game: finalGameName
        });
        if (!balResponseData || (balResponseData.status !== "ok" && balResponseData.status !== "timeout_bypass_error")) {
            return res.json({ success: false, message: "❌ আপনার অ্যাকাউন্ট ব্যালেন্স অপ্রতুল!" });
        }
    } else {
        let checkBal = await sendSecureApiRequestToMainPlatform({
            action: "balance", username: finalQueryUser, amount: 0, wallet: targetWallet, game: finalGameName
        });
        if (checkBal && checkBal.status === "ok") balResponseData.balance = checkBal.balance;
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
        let freeSpinsAwardedThisRound = 10;
        playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + freeSpinsAwardedThisRound;
        
        let scatterWinRes = await sendSecureApiRequestToMainPlatform({ action: "win", username: finalQueryUser, amount: 0, wallet: targetWallet, game: finalGameName });
        return res.json({
            success: true,
            balance: scatterWinRes.balance || currentDbBalance,
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

        let sym0 = currentStepMatrix[0];
        let sym1 = currentStepMatrix[1];
        let sym2 = currentStepMatrix[2];
        let sym3 = currentStepMatrix[3];
        let sym4 = currentStepMatrix[4];
        let sym5 = currentStepMatrix[5];
        
        let baseSym = "CARD_ACE";
        for(let r=0; r<currentStepMatrix[0].length; r++) {
            let s = currentStepMatrix[0][r];
            if (s !== "BANDIT_WILD" && s !== "GOLD_BAR_SCATTER") { baseSym = s; break; }
        }

        if (baseSym !== undefined && baseSym !== "GOLD_BAR_SCATTER") {
            let m1 = (sym0.includes(baseSym) || sym0.includes("BANDIT_WILD"));
            let m2 = (sym1.includes(baseSym) || sym1.includes("BANDIT_WILD"));
            let m3 = (sym2.includes(baseSym) || sym2.includes("BANDIT_WILD"));
            let m4 = (sym3.includes(baseSym) || sym3.includes("BANDIT_WILD"));
            let m5 = (sym4.includes(baseSym) || sym4.includes("BANDIT_WILD"));
            let m6 = (sym5.includes(baseSym) || sym5.includes("BANDIT_WILD"));

            let matchCount = 0;
            let rowPositions = [];
            
            if (m1 && m2 && m3) {
                matchCount = 3;
                rowPositions.push(sym0.indexOf(baseSym) !== -1 ? sym0.indexOf(baseSym) : sym0.indexOf("BANDIT_WILD"));
                rowPositions.push(sym1.indexOf(baseSym) !== -1 ? sym1.indexOf(baseSym) : sym1.indexOf("BANDIT_WILD"));
                rowPositions.push(sym2.indexOf(baseSym) !== -1 ? sym2.indexOf(baseSym) : sym2.indexOf("BANDIT_WILD"));
                
                if (m4) {
                    matchCount = 4;
                    rowPositions.push(sym3.indexOf(baseSym) !== -1 ? sym3.indexOf(baseSym) : sym3.indexOf("BANDIT_WILD"));
                    if (m5) {
                        matchCount = 5;
                        rowPositions.push(sym4.indexOf(baseSym) !== -1 ? sym4.indexOf(baseSym) : sym4.indexOf("BANDIT_WILD"));
                        if (m6) {
                            matchCount = 6;
                            rowPositions.push(sym5.indexOf(baseSym) !== -1 ? sym5.indexOf(baseSym) : sym5.indexOf("BANDIT_WILD"));
                        }
                    }
                }
            }

            let hitChancesRoll = Math.random();
            let forceWinThisStep = false;
            
            if (matchCount === 3) forceWinThisStep = (hitChancesRoll <= 0.85); 
            else if (matchCount === 4) forceWinThisStep = (hitChancesRoll <= 0.60); 
            else if (matchCount >= 5) forceWinThisStep = (hitChancesRoll <= 0.40); 

            if (matchCount >= 3 && forceWinThisStep) {
                let stepBaseOdds = 0.40; 
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

        // বাজি এমাউন্ট প্রোটেকশন গেটওয়ে লক
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
} else {
    isCascadeContinuing = false; 
}
}

if (isCurrentSpinFree === true && totalWinAmount > 0) {
    totalWinAmount = totalWinAmount * 2;
    winMultiplier = winMultiplier * 2;
}

let finalPayloadData = { 
    action: "win", username: finalQueryUser, amount: parseFloat(totalWinAmount), wallet: targetWallet, game: finalGameName 
};
finalPayloadData.status = (totalWinAmount === 0) ? "lose" : "win";
finalPayloadData.bet_amount = isCurrentSpinFree ? 0 : reqAmount;

let response = await sendSecureApiRequestToMainPlatform(finalPayloadData);

let clientDisplayBalance = response.balance !== undefined ? response.balance : (currentDbBalance - (isCurrentSpinFree ? 0 : reqAmount) + totalWinAmount);

io.emit("balanceUpdate", { username: finalQueryUser, balance: clientDisplayBalance });
return res.json({
    success: true,
    balance: clientDisplayBalance,
    gameData: {
        finalReelsResultMatrix: initialMatrix,
        winMultiplier: winMultiplier,
        status: finalPayloadData.status,
        winAmount: totalWinAmount,
        cascadeSteps: cascadeChainSteps, 
        freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0,
        isFreeSpinRound: isCurrentSpinFree
    }
});
});

// 🎁 ৩. FEATURE BUY বোনাস রাউন্ড রাউট
app.post('/api/slot-buy-feature', async (req, res) => {
    const { userId, amount, wallet } = req.body;
    const baseBet = parseFloat(amount) || 1;
    const buyFeatureCost = baseBet * 50; 
    const targetWallet = wallet || "main";
    let finalQueryUser = userId === "logged_in_player" || !userId || userId === "undefined" ? "guest" : userId;

    let balResponse = await sendSecureApiRequestToMainPlatform({
        action: "bet", username: finalQueryUser, amount: buyFeatureCost, wallet: targetWallet, game: "wildbounty"
    });

    if (!balResponse || (balResponse.status !== "ok" && balResponse.status !== "timeout_bypass_error")) {
        return res.json({ success: false, message: "❌ ব্যালেন্স অপ্রতুল!" });
    }

    playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + 10;
    
    let currentWalletBal = balResponse.balance !== undefined ? balResponse.balance : (balance - buyFeatureCost);
    io.emit("balanceUpdate", { username: finalQueryUser, balance: currentWalletBal });

    return res.json({ success: true, balance: currentWalletBal, freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser], message: "🎉 ১০টি ফ্রি স্পিন বোন সফল!" });
});

app.get('/', (req, res) => { res.sendFile(path.resolve(__dirname, 'index.html')); });
io.on('connection', (socket) => {});

// ⚡ কাস্টম নোড সার্ভার পোর্ট গেটওয়ে লাইভ অন ফায়ার (৪০০০০ পোর্টে কড়া সিঙ্ক লক!)
const PORT = process.env.PORT || 40000; 
server.listen(PORT, () => { console.log(`🤠 Wild Bounty Bandits Official Pay-line Multi-Cascade Active on port ${PORT}`); });
