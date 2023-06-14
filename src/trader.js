'use strict';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { isUpward, hasUpwardTrend, hasDownwardTrend, decideShort } from './controller/trader/decider.js';
import { generateOrder, getCallPutSuggestions, negotiate } from './controller/td/index.js';
import * as coinbase from './controller/coinbase/index.js';
import * as td from './controller/td/services.js';
import * as theBias from './controller/trader/bias.js';
import * as utils from './utils/generic.js';
import { coinbaseCashAcctId, coinbaseBtcAcctId } from './utils/constants.js';

const app = express();
const PORT = process.env.PORT || 9000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



app.post('/trade/:symbol/:alert/:bias/:timeFrame', async (req, res) => {
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
                return coinbase.sendOrder('buy', symbol, 300, lastUpdateTime);
            } else if (isChildTrendDown && newBias.havePosition) {
                // Sell crypto, if present // const sellAmount = parseFloat(btcBalance) - 1;
                return coinbase.sendOrder('sell', symbol, 'ALL', lastUpdateTime);
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

app.post('/optionsTrade/:symbol/:alert/:bias/:timeFrame', async (req, res) => {
    const symbol = req?.params?.symbol.toUpperCase();
    // const symbol = 'TSLA';
    const alertType = req?.params?.alert;
    const newDirection = req?.params?.bias;
    const timeFrame = req?.params?.timeFrame;
    const lastUpdateTime = new Date();
    const oldBias = theBias.get(symbol);
    const login = await td.loginTd();
    console.log(`\n\n\n********* ${lastUpdateTime} ${symbol} ${alertType} ${timeFrame} ${newDirection} *********\n`);

    if (login) {
        const optionsChain = await td.getOptionChainData(symbol);
        const currStockPrice = utils.twoDecimal(optionsChain.underlyingPrice);
        const newBias = theBias.updateAlert(symbol, timeFrame, alertType, {
            lastUpdateTime,
            price: currStockPrice,
            lastPrice: oldBias[timeFrame][alertType].price,
            value: newDirection === 'buy',
        });

        const isBaseUp = isUpward(newBias, 'indicatorA', 'fiveMin');
        const isChildTrendUp = hasUpwardTrend(newBias, 'indicatorB', 'threeMin', 'oneMin');
        const isChildTrendDown = hasDownwardTrend(newBias, 'indicatorB', 'threeMin', 'oneMin');
        console.log({ symbol, currStockPrice, isBaseUp, isChildTrendUp, isChildTrendDown }, newBias);
        console.log('************************************************************************************************************************');

        if (isBaseUp) {
            if (newBias.longPutSymbol) {
                // sell put, if present
                let bid;
                let ask;
                const deal = negotiate(newBias.longPutSymbol, 'SELL_TO_CLOSE', bid, ask);

                if (deal) {
                    theBias.update(symbol, 'longPutSymbol', '');
                    console.log(`********** SELL PUT ORDER for ${newBias.longPutSymbol} **********`, deal);
                }
            }

            if (isChildTrendUp) {
                if (!newBias.longCallSymbol) {
                    // BUY call, if no call
                    const optionsChainSuggestions = getCallPutSuggestions(optionsChain);
                    const longCallSuggestion = optionsChainSuggestions?.longCallSuggestions[0];

                    if (longCallSuggestion) {
                        const { bid, ask, symbol: optionSymbol } = longCallSuggestion;
                        const deal = negotiate(orderSymbol, 'BUY_TO_OPEN', bid, ask);

                        if (deal) {
                            theBias.update(symbol, 'longCallSymbol', optionSymbol);
                        }
                    }
                }
            } else if (isChildTrendDown) {
                if (newBias.longCallSymbol) {
                    // sell call, if present
                    let bid;
                    let ask;
                    const deal = negotiate(newBias.longCallSymbol, 'SELL_TO_CLOSE', bid, ask);

                    if (deal) {
                        theBias.update(symbol, 'longCallSymbol', '');
                        console.log(`********** SELL CALL ORDER for ${newBias.longCallSymbol} **********`, deal);
                    }
                }
            }
        } else {
            if (newBias.longCallSymbol) {
                // sell call, if present
                let bid;
                let ask;
                const deal = negotiate(newBias.longCallSymbol, 'SELL_TO_CLOSE', bid, ask);

                if (deal) {
                    theBias.update(symbol, 'longCallSymbol', '');
                    console.log(`********** SELL CALL ORDER for ${newBias.longCallSymbol} **********`, deal);
                }
            }

            if (isChildTrendUp) {
                if (newBias.longPutSymbol) {
                    // sell put, if present
                    let bid;
                    let ask;
                    const deal = negotiate(newBias.longPutSymbol, 'SELL_TO_CLOSE', bid, ask);

                    if (deal) {
                        theBias.update(symbol, 'longPutSymbol', '');
                        console.log(`********** SELL PUT ORDER for ${newBias.longPutSymbol} **********`, deal);
                    }
                }
            } else if (isChildTrendDown && decideShort(newBias, 'fiveMin')) {
                if (!newBias.longPutSymbol) {
                    // BUY put, if no put
                    const optionsChainSuggestions = getCallPutSuggestions(optionsChain);
                    const longPutSuggestion = optionsChainSuggestions?.longPutSuggestions[0];

                    if (longPutSuggestion) {
                        const { bid, ask, symbol: optionSymbol } = longPutSuggestion;
                        const deal = negotiate(orderSymbol, 'BUY_TO_OPEN', bid, ask);

                        if (deal) {
                            theBias.update(symbol, 'longPutSymbol', optionSymbol);
                        }
                    }
                }
            }
        }
    } else {
        console.log('********** UNABLE TO LOGIN (TD) **********');
        return res.json(false);
    }
});

app.get('/optionsTest', async (req, res) => {
    const login = await td.loginTd();

    if (login) {
        const currOrders = await td.fetchOrders('QUEUED');
        console.log(currOrders);
        res.sendFile(path.resolve(__dirname, '..', 'public', 'options.html'));
    }
});

app.get('/buy_tasty_option/:symbol/:bid/:ask', async (req, res) => {
    const login = await td.loginTd();

    if (login) {
        const orderSymbol = req.params.symbol;
        const bid = req.params.bid;
        const ask = req.params.ask;
        // const deal = negotiate(orderSymbol, bid, ask);

        const deal = negotiate(orderSymbol, 'BUY_TO_OPEN', bid, ask);

        return res.json(deal);
    } else {
        return res.json('UNABLE TO LOGIN (TD)');
    }
});

app.get('/get_tasty_options/:symbol', async (req, res) => {
    const login = await td.loginTd();

    if (login) {
        const symbol = req.params.symbol;
        const bias = theBias.get(symbol);
        const optionsChain = await td.getOptionChainData(symbol);

        if (optionsChain) {
            const optionsChainSuggestions = getCallPutSuggestions(optionsChain);
            const response = { ...optionsChainSuggestions, bias };
            return res.json(response);
        }
    }
});

app.get('/options', async (req, res) => {
    const login = await td.loginTd();

    if (login) {
        // const newOrder = generateOrder('TSLA_060923C242.5', 'OPTION', 'LIMIT', 'SELL_TO_CLOSE', 'DAY', 1, 4.8);
        // const tdOrder = await td.createOrder(newOrder);
        // theBias.update('TSLA_060923C242.5', 'longPutSymbol', optionSymbol);
        // console.log(tdOrder);

        res.sendFile(path.resolve(__dirname, '..', 'public', 'options.html'));
    }
});

app.get('/uptime', (req, res) => {
    res.json({ status: 200 });
});

app.get('/getBias/:symbol', (req, res) => {
    const symbol = req?.params?.symbol.toUpperCase();
    const bias = theBias.get(symbol);
    res.json(bias);
});

app.get('/ui.js', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'public', 'ui.js'));
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}!`);
});

theBias.init('BTC');
theBias.init('TSLA');

export default app;
