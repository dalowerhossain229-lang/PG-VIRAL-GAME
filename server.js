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

    // 🔄 ফ্রি概念 স্পিন ও ব্যালেন্স ডিডাকশন মেকানিজম চেক
    let isCurrentSpinFree = false;
    if (playerBountyFreeSpinsMap[finalQueryUser] && playerBountyFreeSpinsMap[finalQueryUser] > 0) {
        playerBountyFreeSpinsMap[finalQueryUser]--; 
        isCurrentSpinFree = true;
    }

    let balResponseData = { status: "ok", balance: 0 };

    // 💸 নরমাল স্পিন হলে ব্যালেন্স কাটা হবে, ফ্রি স্পিন হলে শুধু ব্যালেন্স চেক হবে
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

        // ✅ কলাম অবজেক্ট ইনডেক্সিং ম্যাপিং (ফিক্সড)
        let sym0 = currentStepMatrix[0] || [];
        let sym1 = currentStepMatrix[1] || [];
        let sym2 = currentStepMatrix[2] || [];
        let sym3 = currentStepMatrix[3] || [];
        let sym4 = currentStepMatrix[4] || [];
        let sym5 = currentStepMatrix[5] || [];
        
        // 🚀 [🔒 অল-সিম্বল স্ক্যানার ও পারфেক্ট গ্যাপ ফিলার ওয়াইল্ড সাবস্টিটিউশন 🔒]
        let stepFinalMultiplier = 0;
        let bestMatchCount = 0;
        let winningRowPositions = [];
        let finalWinningSymbol = null;

        // ১ম কলামের প্রতিটি ইউনিক সিম্বল লুপ করে চেক করা হবে যেন কোনো উইন মিস না হয়
        let uniqueSymbolsInCol0 = [...new Set(sym0)];

        for (let baseSym of uniqueSymbolsInCol0) {
            if (baseSym === "GOLD_BAR_SCATTER" || baseSym === "BANDIT_WILD") continue;

            // 🔍 কলামের যেকোনো জায়গায় বেস ছবি অথবা WILD কার্ড আছে কি না চেক (গ্যাপ ফিলার মেকানিজম)
            let m1 = (sym0.includes(baseSym) || sym0.includes("BANDIT_WILD"));
            let m2 = (sym1.includes(baseSym) || sym1.includes("BANDIT_WILD"));
            let m3 = (sym2.includes(baseSym) || sym2.includes("BANDIT_WILD"));
            let m4 = (sym3.includes(baseSym) || sym3.includes("BANDIT_WILD"));
            let m5 = (sym4.includes(baseSym) || sym4.includes("BANDIT_WILD"));
            let m6 = (sym5.includes(baseSym) || sym5.includes("BANDIT_WILD"));

            let currentMatchCount = 0;
            let currentRowPositions = [];

            // 📊 প্রথম ৩ কলামের যেকোনো জায়গায় মিললে উইন শুরু (৪র্থ, ৫ম ও ৬ষ্ঠ কলাম পর্যন্ত চেইন বাড়তে পারে)
            if (m1 && m2 && m3) {
                currentMatchCount = 3;
                currentRowPositions.push(sym0.indexOf(baseSym) !== -1 ? sym0.indexOf(baseSym) : sym0.indexOf("BANDIT_WILD"));
                currentRowPositions.push(sym1.indexOf(baseSym) !== -1 ? sym1.indexOf(baseSym) : sym1.indexOf("BANDIT_WILD"));
                currentRowPositions.push(sym2.indexOf(baseSym) !== -1 ? sym2.indexOf(baseSym) : sym2.indexOf("BANDIT_WILD"));

                if (m4) {
                    currentMatchCount = 4;
                    currentRowPositions.push(sym3.indexOf(baseSym) !== -1 ? sym3.indexOf(baseSym) : sym3.indexOf("BANDIT_WILD"));
                    if (m5) {
                        currentMatchCount = 5;
                        currentRowPositions.push(sym4.indexOf(baseSym) !== -1 ? sym4.indexOf(baseSym) : sym4.indexOf("BANDIT_WILD"));
                        if (m6) {
                            currentMatchCount = 6;
                            currentRowPositions.push(sym5.indexOf(baseSym) !== -1 ? sym5.indexOf(baseSym) : sym5.indexOf("BANDIT_WILD"));
                        }
                    }
                }
            }

            // যদি এই কার্ডের ম্যাচ কাউন্ট আগের কার্ডের চেয়ে বেশি হয়, তবে এটিকে বেস্ট উইন ম্যাচ ধরা হবে
            if (currentMatchCount >= 3 && currentMatchCount > bestMatchCount) {
                bestMatchCount = currentMatchCount;
                winningRowPositions = currentRowPositions;
                finalWinningSymbol = baseSym;
            }
        }

        // যদি ১ম ৩টি কলামের সবগুলোতে শুধুমাত্র ওয়াইল্ড কার্ড পড়ে
        if (bestMatchCount === 0 && sym0.includes("BANDIT_WILD") && sym1.includes("BANDIT_WILD") && sym2.includes("BANDIT_WILD")) {
            bestMatchCount = 3;
            finalWinningSymbol = "CARD_ACE"; // ফলব্যাক স্ট্যান্ডার্ড সিম্বল
            winningRowPositions = [sym0.indexOf("BANDIT_WILD"), sym1.indexOf("BANDIT_WILD"), sym2.indexOf("BANDIT_WILD")];
        }
        // 🎲 উইন ক্যালকুলেটর এক্সিকিউশন ব্লক (১০০% নিখুঁত উইন নিশ্চয়তা)
        if (bestMatchCount >= 3) {
            // 💰 ছবিগুলোর নির্দিষ্ট ওডস (Odds) ভ্যালু কনফিগারেশন
            let stepBaseOdds = 0.30; 
            if (finalWinningSymbol === "MASKED_BANDIT") stepBaseOdds = 2.50; 
            else if (finalWinningSymbol === "COWBOY_HAT") stepBaseOdds = 1.80;
            else if (finalWinningSymbol === "REVOLVER_PISTOL") stepBaseOdds = 1.20;
            else if (finalWinningSymbol === "CARD_ACE") stepBaseOdds = 0.60;
            else if (finalWinningSymbol === "CARD_KING") stepBaseOdds = 0.50;

            // 🎯 [🔒 একই সারিতে মিললে বিগউইন মেকানিজম লক 🔒]
            // ছবির রো-ইনডেক্স যদি হুবху এক হয় (অর্থাৎ পাশাপাশি একই সোজা লাইনে বসে), তবে ওডস ৪ গুণ বুস্ট হবে!
            let isPerfectHorizontalLine = true;
            for (let i = 1; i < winningRowPositions.length; i++) {
                if (winningRowPositions[i] !== winningRowPositions[0]) {
                    isPerfectHorizontalLine = false;
                    break;
                }
            }

            if (isPerfectHorizontalLine) {
                stepBaseOdds = stepBaseOdds * 4.0; // ⚡ পাশাপাশি সোজা জোড়ায় ৪ গুণ মেগা বিগউইন বোনাস!
            }

            // 📈 কলাম সংখ্যার মেগা কম্বো মাল্টিপ্লায়ার স্কেলিং
            if (bestMatchCount === 4) stepBaseOdds = stepBaseOdds * 1.5; 
            else if (bestMatchCount === 5) stepBaseOdds = stepBaseOdds * 3.0;
            else if (bestMatchCount === 6) stepBaseOdds = stepBaseOdds * 6.0;

            let currentActiveMultiplier = cascadeMultiplierLadder[currentCascadeIndex]; 
            let stepFinalMultiplier = stepBaseOdds * currentActiveMultiplier;

            // 💰 ১-২ টাকার ছোট বেটে সর্বোচ্চ ১২০০ গুণ জ্যাকপট চান্স (৫% প্রোব্যাবিলিটি)
            if ((reqAmount === 1 || reqAmount === 2) && Math.random() <= 0.05) {
                stepFinalMultiplier = parseFloat((Math.random() * (1200 - 300) + 300).toFixed(2));
            }

            // 🛡️ বড় বাজি প্রোটেকশন গেটওয়ে লক (হাই বেট কন্ট্রোল)
            if (reqAmount > 100) {
                let highBetBlockRoll = Math.random();
                if (reqAmount >= 1000 && highBetBlockRoll > 0.10) { 
                    stepFinalMultiplier = 0.5; 
                } else if (reqAmount > 100 && reqAmount < 1000 && highBetBlockRoll > 0.30) { 
                    stepFinalMultiplier = 0.8; 
                }
            }

            // 💸 ফাইনাল হিসাব এবং ক্যাস্কেড স্টেপস পুশ
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

    // 🎯 [🔒 অফিশিয়াল ১০০% র্যান্ডম স্ক্যাটার ফ্রি স্পিন চেকার 🔒]
    // পুরো বোর্ডের যেকোনো ৩টি বা তার বেশি জায়গায় GOLD_BAR_SCATTER পড়লে ১০টি ফ্রি স্পিন বোনাস!
    let totalScatterCountOnBoard = 0;
    for (let c = 0; c < 6; c++) {
        for (let r = 0; r < initialMatrix[c].length; r++) {
            if (initialMatrix[c][r] === "GOLD_BAR_SCATTER") {
                totalScatterCountOnBoard++;
            }
        }
    }
    
    // ৩ বা তার বেশি স্ক্যাটার পড়লে এবং এটি নরমাল স্পিন হলে ১০টি ফ্রি স্পিন অ্যাড হবে
    if (totalScatterCountOnBoard >= 3 && isCurrentSpinFree === false) {
        playerBountyFreeSpinsMap[finalQueryUser] = (playerBountyFreeSpinsMap[finalQueryUser] || 0) + 10;
        finalStatus = "free_spin_triggered";
    }

    // ⚡ ফ্রি স্পিন মোডে উইন অ্যামাউন্ট ডাবল (X2) করার লজিক
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
 * 🛒 FEATURE BUY বোনাস রাউন্ড রাউট (৫০ গুণ মূল্যে ফ্রি স্পিন ক্রয়)
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

                              
