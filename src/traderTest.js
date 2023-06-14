'use strict';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { isUpward, hasUpwardTrend, hasDownwardTrend } from './controller/trader/decider.js';
import * as coinbase from './controller/coinbase/index.js';
import * as theBias from './controller/trader/bias.js';
import * as utils from './utils/generic.js';
import { coinbaseCashAcctId, coinbaseBtcAcctId } from './utils/constants.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static assets
app.use(express.static(path.resolve(__dirname, '..', 'assets')));

app.get('/ui.js', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'public', 'ui.js'));
});

app.get('/getBtcQuote', async (req, res) => {
    const currPrice = await coinbase.getQuote('BTC-USD');
    console.log({ currPrice });

    if (currPrice) {
        return res.json(currPrice);
    }
});

app.get('/coinbase/getAccount', (req, res) => {
    return coinbase.getAccount(coinbaseCashAcctId).then((cashAccount) => {
        const cashBalance = cashAccount?.account?.available_balance?.value;
        console.log({ cashBalance });
    });
    // return coinbase.getAccount(coinbaseBtcAcctId).then((btcAccount) => {
    //     const btcBalance = btcAccount?.account?.available_balance?.value;
    //     console.log({ btcBalance });
    // });
});

app.get('/trade/:symbol/:alert/:bias/:timeFrame', async (req, res) => {
    const symbol = req?.params?.symbol.toUpperCase();
    const alertType = req?.params?.alert;
    const newDirection = req?.params?.bias;
    const timeFrame = req?.params?.timeFrame;

    const currPrice = await coinbase.getQuote('BTC-USD');
    const oldBias = theBias.get(symbol);
    let lastUpdateTime = new Date();
    lastUpdateTime = lastUpdateTime.toString();
    console.log('************************************************************************************************************************');
    console.log(`\n\n\n*** ${lastUpdateTime} ${symbol} ${alertType} ${timeFrame} ${newDirection} at $${currPrice} ***\n`);

    if (currPrice) {
        const newBias = theBias.updateAlert(symbol, timeFrame, alertType, {
            lastUpdateTime,
            price: currPrice,
            lastPrice: oldBias[timeFrame][alertType].price,
            value: newDirection === 'buy',
        });

        const isBaseUp = isUpward(newBias, 'indicatorA', 'fiveMin');
        const isChildTrendUp = hasUpwardTrend(newBias, 'indicatorB', 'threeMin', 'oneMin');
        const isChildTrendDown = hasDownwardTrend(newBias, 'indicatorB', 'threeMin', 'oneMin');

        console.log({ symbol, currPrice, isBaseUp, isChildTrendUp, isChildTrendDown }, newBias);

        if (isBaseUp) {
            if (isChildTrendUp && !newBias.havePosition) {
                // BUY crypto, if none present
                theBias.update(symbol, 'havePosition', true);
                theBias.update(symbol, 'myCashBalance', currPrice);
                theBias.update(symbol, 'lastTransactionTime', timeNow);
            } else if (isChildTrendDown && newBias.havePosition) {
                theBias.update(symbol, 'havePosition', true);
                theBias.update(symbol, 'myCashBalance', 0);
                theBias.update(symbol, 'profit', currPrice - newBias.myCashBalance);
                theBias.update(symbol, 'lastTransactionTime', timeNow);
            }
        } else {
            if (newBias.havePosition) {
                // Sell crypto, if present
                return coinbase.sendOrder('sell', symbol, 'ALL', lastUpdateTime);
            }
        }
    } else {
        console.log('********** BTC CURRENT PRICE DATA UNAVAILABLE **********');
        return res.json(false);
    }
});

// app.get('/test/btc/:bias/:timeFrame', async (req, res) => {});

app.get('/getBias/:symbol', (req, res) => {
    const symbol = req?.params?.symbol.toUpperCase();
    const bias = theBias.get(symbol);
    res.json(bias);
});


app.get('/', async (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}!`);
});

theBias.init('BTC');

export default app;
