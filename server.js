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

// 🎯 ওরিজিনাল ক্যাস্কেড মাল্টিপ্লায়ার ল্যাডার চ্যাম (খাতার তক্তার ওপরের সিকোয়েন্স)
const cascadeMultiplierLadder = [2, 4, 8, 16, 32, 64, 128, 256];

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

// 🛫 ওরিজিনাল ডাইনামিক চেইন ক্যাস্কেড এপিআই ইঞ্জিন রাউট লক ওস্তাদ!
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

        // 🎰 [🔒 ওস্তাদ! আপনার নিয়মের ওরিজিনাল চেইন ক্যাস্কেডিং মেটালিক লুপ ড্রাইভার 🔒]
        let cascadeChainSteps = [];
        let isCascadeContinuing = true;
        let currentCascadeIndex = 0; // ০ মানে ১ম ক্যাসকেড (X2), ১ মানে ২য় ক্যাসকেড (X4)...
        
        let initialMatrix = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[] };

        while (isCascadeContinuing && currentCascadeIndex < cascadeMultiplierLadder.length) {
            let currentStepMatrix = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[] };
            
            // নতুন সিম্বল ম্যাট্রিক্স জেনারেশন
            for (let col = 0; col < 6; col++) {
                let maxRows = gridRowsCountMap[col];
                for (let r = 0; r < maxRows; r++) {
                    let randSym = bountySymbolsPool[Math.floor(Math.random() * bountySymbolsPool.length)];
                    currentStepMatrix[col].push(randSym);
                }
            }

            if (currentCascadeIndex === 0) initialMatrix = currentStepMatrix;

            // ১ম ৩ কলামের উইন সিকোয়েন্স চেকার
            let sym0 = currentStepMatrix[0][0], sym1 = currentStepMatrix[1][0], sym2 = currentStepMatrix[2][0];
            let baseSym = sym0 === "BANDIT_WILD" ? (sym1 === "BANDIT_WILD" ? sym2 : sym1) : sym0;
            
            let m1 = (sym0 === baseSym || sym0 === "BANDIT_WILD");
            let m2 = (sym1 === baseSym || sym1 === "BANDIT_WILD");
            let m3 = (sym2 === baseSym || sym2 === "BANDIT_WILD");

            // ক্যাসিনো আরটিপি মড্যুলেশন ও ফ্রিকোয়েন্সি ব্যালেন্সার ফিল্টার
            let hitChancesRoll = Math.random();
            let forceWinThisStep = (currentCascadeIndex === 0) ? (hitChancesRoll <= 0.65) : (hitChancesRoll <= 0.40);

            if (m1 && m2 && m3 && baseSym !== "GOLD_BAR_SCATTER" && forceWinThisStep) {
                // 🎯 [পয়েন্ট ১ ও ২]: সুনির্দিষ্ট ক্যাসিনো পে-লাইন ওডস ক্যালকুলেটর
                let stepBaseOdds = 1.00;
                if (baseSym === "MASKED_BANDIT") stepBaseOdds = 2.50;
                else if (baseSym === "COWBOY_HAT") stepBaseOdds = 2.00;
                else if (baseSym === "REVOLVER_PISTOL") stepBaseOdds = 1.50;

                // 👑 [🔒 আপনার কড়া কিংস রুলস ইনজেকশন লক ওস্তাদ! 🔒]:
                // ১ম ক্যাসকেডে গুণিতক হবে ওরিজিনাল X2! ২য় ক্যাসকেডে গুণিতক হবে সরাসরি X4! ৩য় এ X8!
                let currentActiveMultiplier = cascadeMultiplierLadder[currentCascadeIndex]; 
                let stepFinalMultiplier = stepBaseOdds * currentActiveMultiplier;

                // ১ টাকা বা ২ টাকা বেটে সর্বোচ্চ ১২০০ গুণ জ্যাকপট চান্স ফায়ার!
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
server.listen(PORT, () => { console.log(`🤠 Wild Bounty Bandits 3600 Ways Pay-line Multi-Cascade Active on port ${PORT}`); });
 
