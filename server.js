const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 🌐 Socket.IO কনফিগারেশন এবং CORS পলিসি
const io = socketIo(server, { 
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"] 
    } 
});

// 📁 মিডলওয়্যার এবং স্ট্যাটিক ফাইল পাথ সেটআপ
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// 🔒 সিকিউরিটি হেডার এবং গ্লোবাল CORS পলিসি মিডলওয়্যার
app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

// ✅ মেইন প্ল্যাটফর্ম এপিআই ডোমেইন লিঙ্ক গেটওয়ে লক
const MAIN_SITE_URL = "https://betlover247.onrender.com"; 

// 🎰 গেমের সিম্বল এবং গ্রিড লেআউট কনফিগারেশন
const bountySymbolsPool = [
    "BANDIT_WILD", "GOLD_BAR_SCATTER", "MASKED_BANDIT", 
    "COWBOY_HAT", "REVOLVER_PISTOL", "CARD_ACE", 
    "CARD_KING", "CARD_JACK", "CARD_Q"
];

let playerBountyFreeSpinsMap = {};
const gridRowsCountMap = { 0: 3, 1: 4, 2: 5, 3: 5, 4: 4, 5: 3 };

// 🎯 ৪-স্টেজ ওরিজিনাল ক্যাস্কেড মাল্টিপ্লায়ার ল্যাডার চ্যাম লক
const cascadeMultiplierLadder =[2,4,8,16];

/**
 * 🛠 হেল্পার ফাংশন: মেইন সাইটের এপিআই প্রসেসিংয়ের জন্য সিকিউর আক্সিওস ক্লায়েন্ট প্রোটোকল
 */
async function sendSecureApiRequestToMainPlatform(payload) {
    try {
        const res = await axios.post(`${MAIN_SITE_URL}/api_callback.php`, payload, {
            timeout: 30000, 
            headers: { 
                'Content-Type': 'application/json', 
                'Connection': 'keep-alive' 
            }
        });
        return res.data;
    } catch (err) {
        return { status: "timeout_bypass_error", balance: 0 };
    }
}

/**
 * 💰 ১. লাইভ অ্যাকাউন্ট ব্যালেন্স ইন্টারসেপ্টর গেটওয়ে রাউট
 */
app.get('/api/slot-balance', async (req, res) => {
    const { userId, wallet } = req.query;
    const targetWallet = wallet || "main";
    let finalUser = userId === "logged_in_player" || !userId || userId === "undefined" ? "guest" : userId;
    
    let responseData = await sendSecureApiRequestToMainPlatform({
        action: "balance", 
        username: finalUser, 
        amount: 0, 
        wallet: targetWallet, 
        game: "wildbounty"
    });
    
    if (responseData && (responseData.status === "ok" || responseData.status === "timeout_bypass_error")) {
        let activeFreeSpinsLeft = playerBountyFreeSpinsMap[finalUser] || 0;
        return res.json({ 
            success: true, 
            balance: responseData.balance || 0, 
            freeSpinsLeft: activeFreeSpinsLeft 
        });
    }
    return res.json({ success: false, balance: 0, freeSpinsLeft: 0 });
});

/**
 * 🛫 ২. ওরিজিনাল ডাইনামিক কলাম এবং মেগা-বুস্ট এপিআই রাউট
 */
app.post('/api/slot-spin', async (req, res) => {
    const { userId, amount, wallet } = req.body; 
    const reqAmount = parseFloat(amount) || 1; 
    const finalGameName = "wildbounty"; 
    const targetWallet = wallet || "main";

    let finalQueryUser = userId || "guest";
    if (finalQueryUser === "logged_in_player" || finalQueryUser === "undefined") {
        finalQueryUser = "guest";
    }

    // 🚨 বেট অ্যামাউন্ট ভ্যালিডেশন
    if (reqAmount < 1 || reqAmount > 5000) {
        return res.json({ success: false, message: "🚨 Invalid Bet Parameter! Max 5000৳" });
    }

    // 🔄 ফ্রি স্পিন ও ব্যালেন্স ডিডাকশন মেকানিজম চেক
    let isCurrentSpinFree = false;
    if (playerBountyFreeSpinsMap[finalQueryUser] && playerBountyFreeSpinsMap[finalQueryUser] > 0) {
        playerBountyFreeSpinsMap[finalQueryUser]--; 
        isCurrentSpinFree = true;
    }

    let balResponseData = { status: "ok", balance: 0 };

    // 💸 ব্যালেন্স ডিডাকশন প্রোটেকশন হ্যান্ডলিং
    if (isCurrentSpinFree === false) {
        balResponseData = await sendSecureApiRequestToMainPlatform({
            action: "bet", 
            username: finalQueryUser, 
            amount: reqAmount, 
            wallet: targetWallet, 
            game: finalGameName
        });
        
        if (!balResponseData || (balResponseData.status !== "ok" && balResponseData.status !== "timeout_bypass_error")) {
            return res.json({ success: false, message: "❌ আপনার অ্যাকাউন্ট ব্যালেন্স অপ্রতুল!" });
        }
    } else {
        let checkBal = await sendSecureApiRequestToMainPlatform({
            action: "balance", 
            username: finalQueryUser, 
            amount: 0, 
            wallet: targetWallet, 
            game: finalGameName
        });
        if (checkBal && checkBal.status === "ok") {
            balResponseData.balance = checkBal.balance;
        }
    }

    let currentDbBalance = parseFloat(balResponseData.balance) || 0;
    let finalStatus = "lose";
    let totalWinAmount = 0;
    let winMultiplier = 0;

    // 🎰 [🔒 ওরিজিনাল ৩,৬০০ WAYS স্ক্যাটার-পে ও ওয়াইল্ড সাবস্টিটিউশন মেকানিজম লুপ ড্রাইভার 🔒]
    let cascadeChainSteps = [];
    let isCascadeContinuing = true;
    let currentCascadeIndex = 0; 
    let initialMatrix = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };

    // 🔄 ক্যাস্কেড মাল্টিপ্লায়ার লুপ প্রসেসিং
    while (isCascadeContinuing && currentCascadeIndex < cascadeMultiplierLadder.length) {
        let currentStepMatrix = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
        
        // 🎲 র্যান্ডম গ্রিড জেনারেটর (ন্যাচারাল ড্রপ)
        for (let col = 0; col < 6; col++) {
            let maxRows = gridRowsCountMap[col];
            for (let r = 0; r < maxRows; r++) {
                let randSym = bountySymbolsPool[Math.floor(Math.random() * bountySymbolsPool.length)];
                currentStepMatrix[col].push(randSym);
            }
        }

        if (currentCascadeIndex === 0) {
            initialMatrix = currentStepMatrix;
        }

        // ✅ ডিপ ক্লোনিং মেমোরি ফিক্স (আগের রাউন্ডের মেমোরি ক্যাশ বা বাগ সম্পূর্ণ ভ্যানিশ)
        let sym = [];
        for (let i = 0; i < 6; i++) {
            sym.push([...currentStepMatrix[i]]);
        }
        
        // 🚀 [🔒 কঠোর এবং নিখুঁত লিনিয়ার চেইন এনালাইজার লক 🔒]
        let maxStepMultiplier = 0;
        let stepBestMatchCount = 0;
        let stepWinningSymbol = null;
        let stepWinningRows = [];

        // ১ম কলামের অনন্য ছবিগুলো দিয়ে লুপ চালানো হবে
        let col0UniqueSymbols = [...new Set(sym[0])];

        for (let baseSym of col0UniqueSymbols) {
            if (baseSym === "GOLD_BAR_SCATTER" || baseSym === "BANDIT_WILD") continue;

            let matchCount = 1;
            let rowPositions = [];
            
            // ১ম কলামের সঠিক পজিশন ট্র্যাকিং
            let firstIdx = sym[0].indexOf(baseSym) !== -1 ? sym[0].indexOf(baseSym) : sym[0].indexOf("BANDIT_WILD");
            rowPositions.push(firstIdx);

            // 🔍 ২য় থেকে ৬ষ্ঠ কলাম স্ট্রিক্ট লিনিয়ার সিকোয়েন্সিয়াল চেক
            for (let colIdx = 1; colIdx < 6; colIdx++) {
                let hasBase = sym[colIdx].includes(baseSym);
                let hasWild = sym[colIdx].includes("BANDIT_WILD");

                if (hasBase || hasWild) {
                    matchCount++;
                    let targetIdx = hasBase ? sym[colIdx].indexOf(baseSym) : sym[colIdx].indexOf("BANDIT_WILD");
                    rowPositions.push(targetIdx);
                } else {
                    break; // 🔒 মাঝখানে কোনো কলামে গ্যাপ বা ব্রেক পড়লে চেইন এখানে সাথে সাথে কেটে যাবে!
                }
            }

            // প্রথম ৩টি কলামে ব্যাক-টু-ব্যাক মিললেই কেবল উইন ভ্যালিড হবে
            if (matchCount >= 3) {
                let stepBaseOdds = 0.30; 
                if (baseSym === "MASKED_BANDIT") stepBaseOdds = 2.50; 
                else if (baseSym === "COWBOY_HAT") stepBaseOdds = 1.80;
                else if (baseSym === "REVOLVER_PISTOL") stepBaseOdds = 1.20;
                else if (baseSym === "CARD_ACE") stepBaseOdds = 0.60;
                else if (baseSym === "CARD_KING") stepBaseOdds = 0.50;

                // 🎯 পাশাপাশি একই সারিতে মিললে ৪ গুণ বিগউইন বুস্টার (ইনডেক্স বাগ ফিক্সড)
                let isPerfectHorizontalLine = true;
                for (let i = 1; i < rowPositions.length; i++) {
                    if (rowPositions[i] !== rowPositions[0]) {
                        isPerfectHorizontalLine = false;
                        break;
                    }
                }
                if (isPerfectHorizontalLine) {
                    stepBaseOdds = stepBaseOdds * 4.0;
                }

                // কলাম স্কেলিং মাল্টিপ্লায়ার 
                if (matchCount === 4) stepBaseOdds = stepBaseOdds * 1.5; 
                else if (matchCount === 5) stepBaseOdds = stepBaseOdds * 3.0;
                else if (matchCount === 6) stepBaseOdds = stepBaseOdds * 6.0;

                let currentActiveMultiplier = cascadeMultiplierLadder[currentCascadeIndex]; 
                let currentFinalMultiplier = stepBaseOdds * currentActiveMultiplier;

                if (currentFinalMultiplier > maxStepMultiplier) {
                    maxStepMultiplier = currentFinalMultiplier;
                    stepBestMatchCount = matchCount;
                    stepWinningSymbol = baseSym;
                    stepWinningRows = rowPositions;
                }
            }
        }

                // 💸 উইন ক্যালকুলেশন এবং স্টেট আপডেট
        if (maxStepMultiplier > 0) {
            // ১-২ টাকার ছোট বেটে জ্যাকপট মেগা লাক চান্স
            if ((reqAmount === 1 || reqAmount === 2) && Math.random() <= 0.05) {
                maxStepMultiplier = parseFloat((Math.random() * (1200 - 300) + 300).toFixed(2));
            }

            // হাই বেট ব্যালেন্স সেফগার্ড প্রোটেকশন
            if (reqAmount > 100) {
                let highBetBlockRoll = Math.random();
                if (reqAmount >= 1000 && highBetBlockRoll > 0.10) { 
                    maxStepMultiplier = 0.5; 
                } else if (reqAmount > 100 && reqAmount < 1000 && highBetBlockRoll > 0.30) { 
                    maxStepMultiplier = 0.8; 
                }
            }

            let stepWinCash = Math.round(reqAmount * maxStepMultiplier);
            totalWinAmount += stepWinCash;
            winMultiplier += maxStepMultiplier;
            finalStatus = "win";

            cascadeChainSteps.push({
                cascadeIndex: currentCascadeIndex,
                multiplierLabel: "X" + cascadeMultiplierLadder[currentCascadeIndex],
                matrix: currentStepMatrix,
                stepWin: stepWinCash
            });

            currentCascadeIndex++; 
        } else {
            isCascadeContinuing = false; // কোনো উইন না থাকলে ক্যাস্কেড লুপ চিরতরে বন্ধ
        }
    }

    // 🎯 [🔒 ১০০% নিখুঁত এনিহোয়্যার স্ক্যাটার ফ্রি স্পিন চেকার 🔒]
    let totalScatterCountOnBoard = 0;
    for (let c = 0; c < 6; c++) {
        for (let r = 0; r < initialMatrix[c].length; r++) {
            if (initialMatrix[c][r] === "GOLD_BAR_SCATTER") {
                totalScatterCountOnBoard++;
            }
        }
    }
    
    if (totalScatterCountOnBoard >= 3 && isCurrentSpinFree === false) {
        playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + 10;
        finalStatus = "free_spin_triggered";
    }

    if (isCurrentSpinFree === true && totalWinAmount > 0) {
        totalWinAmount = totalWinAmount * 2;
        winMultiplier = winMultiplier * 2;
    }

    // 📤 মেইন প্ল্যাটফর্মে ডেটা সিংক্রোনাইজেশন এবং রেসপন্স
    let finalPayloadData = { 
        action: "win", 
        username: finalQueryUser, 
        amount: parseFloat(totalWinAmount), 
        wallet: targetWallet, 
        game: finalGameName 
    };
    finalPayloadData.status = finalStatus;
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

/**
 * 🛒 FEATURE BUY বোনাস রাউন্ড রাউট
 */
app.post('/api/slot-buy-feature', async (req, res) => {
    const { userId, amount, wallet } = req.body;
    const baseBet = parseFloat(amount) || 1;
    const buyFeatureCost = baseBet * 50; 
    const targetWallet = wallet || "main";
    let finalQueryUser = userId === "logged_in_player" || !userId || userId === "undefined" ? "guest" : userId;

    let balResponse = await sendSecureApiRequestToMainPlatform({
        action: "bet", 
        username: finalQueryUser, 
        amount: buyFeatureCost, 
        wallet: targetWallet, 
        game: "wildbounty"
    });

    if (!balResponse || (balResponse.status !== "ok" && balResponse.status !== "timeout_bypass_error")) {
        return res.json({ success: false, message: "❌ ব্যালেন্স অপ্রতুল!" });
    }

    playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + 10;
    
    let currentWalletBal = balResponse.balance !== undefined ? balResponse.balance : (balResponse.balance - buyFeatureCost);
    io.emit("balanceUpdate", { username: finalQueryUser, balance: currentWalletBal });

    return res.json({ 
        success: true, 
        balance: currentWalletBal, 
        freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser], 
        message: "🎉 ১০টি ফ্রি স্পিন বোন সফল!" 
    });
});

/**
 * 🏠 রুট রাউট এবং সকেট কানেকশন হ্যান্ডলার
 */
app.get('/', (req, res) => { 
    res.sendFile(path.resolve(__dirname, 'index.html')); 
});

io.on('connection', (socket) => {});

// ⚡ কাস্টম নোড সার্ভার পোর্ট গেটওয়ে
const PORT = process.env.PORT || 40000; 
server.listen(PORT, () => { 
    console.log(`🤠 Wild Bounty Bandits Official Pay-line Multi-Cascade Active on port ${PORT}`); 
});

