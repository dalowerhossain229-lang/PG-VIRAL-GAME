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

// 🎯 ওরিজিনাল ক্যাস্কেড মাল্টিপ্লায়ার ল্যাডার চ্যাম (X2 -> X4 -> X8 -> X16)
const cascadeMultiplierLadder = [2, 4, 8, 16];

// ৩০টি ক্যাসিনো পে-লাইন ইনডেক্স কোঅর্ডিনেট ম্যাট্রিক্স সুতো (Row Maps for Columns 0 to 5)
const officialPaylines = [
    [0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 2], // Straight lines
    [0, 1, 2, 2, 1, 0], [2, 1, 0, 0, 1, 2], [1, 2, 3, 3, 2, 1], // V & Inverted V
    [0, 0, 1, 1, 0, 0], [2, 2, 3, 3, 2, 2], [1, 1, 2, 2, 1, 1], // Center tracks
    [0, 1, 0, 1, 0, 1], [2, 1, 2, 1, 2, 1], [1, 0, 1, 0, 1, 1], // Zig-zag lines
    [0, 2, 4, 4, 2, 0], [2, 3, 4, 4, 3, 2], [1, 2, 4, 4, 2, 1], // Deep slopes
    [0, 0, 2, 2, 0, 0], [1, 1, 3, 3, 1, 1], [2, 2, 1, 1, 2, 2], // Level steps
    [0, 1, 1, 1, 1, 0], [2, 2, 2, 2, 2, 2], [1, 2, 2, 2, 2, 1], // Platform lines
    [0, 1, 3, 3, 1, 0], [2, 1, 4, 4, 1, 2], [1, 0, 4, 4, 0, 1], // Cross curves
    [0, 3, 3, 3, 3, 0], [1, 3, 3, 3, 3, 1], [2, 0, 0, 0, 0, 2], // Boundary tracks
    [0, 2, 2, 2, 2, 0], [2, 0, 2, 2, 0, 2], [1, 3, 1, 1, 3, 1]  // Random offsets
];

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

            let stepLineWinFound = false;
            let stepMultiplierSum = 0;

            // ৩০টি পে-লাইন ট্র্যাকিং ক্যালকুলেটর ইঞ্জিন (ঘন ঘন উইন প্রোসেসর)
            for (let line of officialPaylines) {
                let sym0 = currentStepMatrix[0][line[0]];
                let sym1 = currentStepMatrix[1][line[1]];
                let sym2 = currentStepMatrix[2][line[2]];
                let sym3 = currentStepMatrix[3][line[3]];
                let sym4 = currentStepMatrix[4][line[4]];
                let sym5 = currentStepMatrix[5][line[5]];

                let baseSym = sym0 === "BANDIT_WILD" ? (sym1 === "BANDIT_WILD" ? sym2 : sym1) : sym0;
                if (baseSym === "GOLD_BAR_SCATTER" || !baseSym) continue;

                let m1 = (sym0 === baseSym || sym0 === "BANDIT_WILD");
                let m2 = (sym1 === baseSym || sym1 === "BANDIT_WILD");
                let m3 = (sym2 === baseSym || sym2 === "BANDIT_WILD");

                if (m1 && m2 && m3) {
                    stepLineWinFound = true;
                    let lineMult = 1.00;
                    if (baseSym === "MASKED_BANDIT") lineMult = 2.50;
                    else if (baseSym === "COWBOY_HAT") lineMult = 2.00;
                    else if (baseSym === "REVOLVER_PISTOL") lineMult = 1.50;

                    if (sym3 === baseSym || sym3 === "BANDIT_WILD") lineMult += 1.00;
                    if (sym4 === baseSym || sym4 === "BANDIT_WILD") lineMult += 1.50;
                    if (sym5 === baseSym || sym5 === "BANDIT_WILD") lineMult += 2.00;

                    stepMultiplierSum += lineMult;
                }
            }

            let hitChancesRoll = Math.random();
            let forceWinThisStep = (currentCascadeIndex === 0) ? (hitChancesRoll <= 0.65) : (hitChancesRoll <= 0.40);

            if (stepLineWinFound && forceWinThisStep) {
                let currentActiveMultiplier = cascadeMultiplierLadder[currentCascadeIndex]; 
                let stepFinalMultiplier = stepMultiplierSum * currentActiveMultiplier;

                // 👑 [🔒 আপনার কড়া কিংস রুলস ইনজেকশন লক 🔒]: ১৳ বা ২৳ বেটে ১২০০ গুণ পর্যন্ত জ্যাকপট!
                if ((reqAmount === 1 || reqAmount === 2) && Math.random() <= 0.05) {
                    stepFinalMultiplier = parseFloat((Math.random() * (1200 - 300) + 300).toFixed(2));
                }

                // বাজি এমাউন্ট যত বাড়াবে উইন হওয়ার সম্ভাবনা তত কমবে ফিল্টারিং লক
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

                currentCascadeIndex++; // চেইন সাকসেস! পরবর্তী ক্যাসকেড গুণিতক ল্যাডারে প্রমোশন!
            } else {
                isCascadeContinuing = false; // বাজি ফিল্টারে লস হলে চেইন এখানেই শেষ!
            }
        } else {
            isCascadeContinuing = false; // যেখানে উইন হবে না ঐ রাউন্ড ওখানেই শেষ! খাতার নিয়ম লক!
        }
    }

    // ফ্রি স্পিন বোনাসে থাকলে টোটাল উইন ডাবল বুস্ট প্রোটোকল
    if (isCurrentSpinFree === true && totalWinAmount > 0) {
        totalWinAmount = totalWinAmount * 2;
        winMultiplier = winMultiplier * 2;
    }

    let phpPayload = { 
        action: "win", username: finalQueryUser, amount: parseFloat(totalWinAmount), wallet: targetWallet, game: finalGameName 
    };
    phpPayload.status = (totalWinAmount === 0) ? "lose" : "win";
    phpPayload.bet_amount = isCurrentSpinFree ? 0 : reqAmount;

    // 🛫 ④ মেইন সাইটের সিকিউরড গেটওয়েতে রিয়েল-টাইম উইন-লস সেটেলমেন্ট এپیআই হিট (টাইমআউট ১৫ সেকেন্ড লক)
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
} catch (e) { return res.json({ success: false, freeSpinsLeft: playerBountyFreeSpinsMap[finalQueryUser] || 0, message: "⚠️ Timeout!" }); }
});

// 🎁 [🔒 ওরিজিনাল স্ক্যাটার বোনাস বাই এপিআই রাউট লক 🔒]:
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
server.listen(PORT, () => { console.log(`🤠 Wild Bounty Bandits Official 3600 Ways Pay-line Multi-Cascade Active on port ${PORT}`); });
