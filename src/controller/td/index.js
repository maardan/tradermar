import * as td from './services.js';
import * as utils from '../../utils/generic.js';

/**
 * ******************************************************************************************
 */

export const generateOrder = (symbol, assetType, orderType, instruction, duration, quantity, price) => {
    const order = {
        complexOrderStrategyType: 'NONE',
        orderType,
        session: 'NORMAL',
        duration,
        orderStrategyType: 'SINGLE',
        orderLegCollection: [
            {
                instruction,
                quantity,
                instrument: {
                    symbol,
                    assetType,
                },
            },
        ],
    };

    if (orderType === 'LIMIT' && price) {
        order.price = price;
    }

    return order;
};

/**
 * ******************************************************************************************
 */

const alreadyHasOrder = (orders, symbol) => {
    for (let i = 0; i < orders.length; i++) {
        const orderLegCollection = orders[i].orderLegCollection;

        for (let j = 0; j < orderLegCollection.length; j++) {
            const currSymbol = orderLegCollection[j].instrument.symbol;

            if (currSymbol === symbol) {
                return orders[i].orderId;
            }
        }
    }

    return false;
};

export const doesOrderAlreadyExist = async (orderSymbol) => {
    const currOrders = await td.fetchOrders();
    const orderNumber = alreadyHasOrder(currOrders, orderSymbol);

    if (orderNumber) {
        return orderNumber;
    }

    return false;
};

/**
 * ******************************************************************************************
 */

const flattenOptionChains = (optionChains) => {
    let result = [];

    if (optionChains) {
        for (const expDate in optionChains) {
            const strikeObj = optionChains[expDate];

            for (const strike in strikeObj) {
                const strikeArr = strikeObj[strike];

                for (let i = 0; i < strikeArr.length; i++) {
                    result.push(strikeArr[i]);
                }
            }
        }
    }

    return result;
};

/**
 * ******************************************************************************************
 */

const findGoodLongOptions = (optionChains, stockPrice, spread, forPut) => {
    let goodBuys = [];

    for (let i = 0; i < optionChains.length; i++) {
        const option = optionChains[i];
        const { strikePrice, bid, ask, mark, totalVolume, openInterest } = option;
        const wing = Math.round(Math.abs(strikePrice - stockPrice) * 2) / 2;
        const isITM = forPut ? strikePrice >= stockPrice : strikePrice <= stockPrice;

        let theoretical = forPut ? strikePrice - mark : strikePrice + mark;
        theoretical = Math.abs(theoretical * 2) / 2;

        const markWingDiff = Math.abs(mark - wing).toFixed(2);

        const optionData = {
            isITM,
            theoretical,
            stockPrice,
            wing,
            markWingDiff,
            ...option,
        };

        const cheapPrice = ask <= 5 && bid <= 5;
        const reasonableBidAsk = ask >= 0.05 && bid >= 0.05 && Math.abs(bid - ask) <= spread;
        const fairPriceOption = bid - spread <= wing && wing <= ask + spread;
        const enoughInterest = totalVolume >= 30 || openInterest >= 30;

        // findGoodBuys
        if (cheapPrice && reasonableBidAsk && fairPriceOption && enoughInterest) {
            goodBuys.push(optionData);
        }
    }

    if (goodBuys.length > 0 || spread > 3) {
        return utils.sortByProperty(goodBuys, 'markWingDiff').reverse();
    } else {
        const newSpread = (Math.round(spread * 10) / 10) * 2;
        return findGoodLongOptions(optionChains, stockPrice, newSpread, forPut);
    }
};

/**
 * ******************************************************************************************
 */

export const findGoodShortOptions = (optionChains, stockPrice, spread, forPut) => {
    let goodSells = [];

    for (let i = 0; i < optionChains.length; i++) {
        const option = optionChains[i];
        const { strikePrice, bid, ask, mark, totalVolume, openInterest, volatility } = option;
        const wing = Math.round(Math.abs(strikePrice - stockPrice) * 2) / 2;
        const isITM = forPut ? strikePrice > stockPrice : strikePrice < stockPrice;

        let theoretical = forPut ? strikePrice - mark : strikePrice + mark;
        theoretical = Math.abs(theoretical * 2) / 2;

        const markWingDiff = Math.abs(mark - wing).toFixed(2);
        const optionData = {
            isITM,
            theoretical,
            stockPrice,
            wing,
            markWingDiff,
            ...option,
        };

        const enoughInterest = totalVolume >= 30 || openInterest >= 30;
        const reasonableBidAsk = ask >= 0.05 && bid >= 0.05 && Math.abs(bid - ask) <= spread;
        // const fairPriceOption = bid - spread <= wing && wing <= ask + spread;

        if (reasonableBidAsk && enoughInterest) {
            // const ratio = (wing * 100) / (bid * 100);

            if (!isITM && volatility > 75) {
                goodSells.push(optionData);
            }
            // else if (ratio > 9 && wing >= 1) {
            //     goodSells.push(optionData);
            // }
        }
    }

    return utils.sortByProperty(goodSells, 'bid');
};

/**
 * ******************************************************************************************
 */

export const getCallPutSuggestions = (optionsChain) => {
    const stockPrice = utils.twoDecimal(optionsChain.underlyingPrice);
    const callChains = flattenOptionChains(optionsChain?.callExpDateMap);
    const putChains = flattenOptionChains(optionsChain?.putExpDateMap);
    const longCallSuggestions = findGoodLongOptions(callChains, stockPrice, 1, false);
    const longPutSuggestions = findGoodLongOptions(putChains, stockPrice, 1, true);

    const shortPutSuggestions = findGoodShortOptions(putChains, stockPrice, 1, true);
    const shortCallSuggestions = findGoodShortOptions(callChains, stockPrice, 1, false);

    // console.log({ longCallSuggestions, longPutSuggestions, shortPutSuggestions, shortCallSuggestions });

    return {
        longCallSuggestions,
        longPutSuggestions,
        shortPutSuggestions,
        shortCallSuggestions,
    };
};

/**
 * ******************************************************************************************
 */


export const negotiate = (orderSymbol, orderType, bid, ask) => {
    const minPrice = parseFloat(utils.twoDecimal(bid));
    const maxPrice = parseFloat(utils.twoDecimal(ask));
    const myOfferPrice = orderType === 'SELL_TO_CLOSE' ? maxPrice : minPrice;
    const newOrder = generateOrder(orderSymbol, 'OPTION', 'LIMIT', orderType, 'DAY', 1, myOfferPrice);

    return td.createOrder(newOrder).then((createdOrder) => {
        if (createdOrder) {
            const negotiateAgain = setTimeout(async () => {
                const currOrders = await td.fetchOrders();
                const incompleteOrder = currOrders.filter((order) => order.status === 'WORKING' || order.status === 'QUEUED')[0];
                const orderId = incompleteOrder?.orderId;

                console.log({ incompleteOrder, orderSymbol, minPrice, maxPrice });

                if (incompleteOrder && orderId) {
                    return td.cancelOrder(orderId).then((orderCancelled) => {
                        if (orderCancelled) {
                            console.log({ orderCancelled });

                            if (orderType === 'SELL_TO_CLOSE') {
                                return negotiate(orderSymbol, orderType, minPrice, maxPrice - 0.05);
                            } else {
                                return negotiate(orderSymbol, orderType, minPrice + 0.05, maxPrice);
                            }
                        } else {
                            console.log(`********** UNABLE TO REPLACE ORDER for ${orderSymbol} **********`);
                            return createdOrder;
                        }
                    });
                } else {
                    console.log(`********** UNABLE TO GET currOrders ${orderSymbol} **********`, currOrders);
                    return createdOrder;
                }
            }, 1000);

            if (minPrice <= maxPrice) {
                return negotiateAgain;
            } else {
                clearTimeout(negotiateAgain);
                return createdOrder;
            }
        }
    });
};

/**
 * ******************************************************************************************
 */


// const getNewQuantityArray = (longQuantity) => {
//     const newArr = [];
//     let remainder = 0;
//     let element = longQuantity * 0.2;
//     let length = () => {
//         let l = longQuantity / element;

//         if (longQuantity > 5) {
//             if (Number.isInteger(element)) {
//                 l = Math.floor(l);
//             } else {
//                 element = Math.floor(element);
//                 l = Math.floor(l);
//                 remainder = longQuantity % l;
//             }
//         } else {
//             l = Number.isInteger(l) ? length : longQuantity;
//             element = Number.isInteger(element) ? element : 1;
//         }

//         return l;
//     };

//     // Generate array of new puchase quantity sequence i.e. [2, 2, 1]
//     for (let i = 0; i < length(); i++) {
//         newArr.push(element);
//     }

//     // For odd length
//     if (remainder) {
//         newArr.push(remainder);
//     }

//     // Final sanity check
//     if (newArr.length && sumOfArray(newArr) === longQuantity) {
//         return newArr;
//     }

//     return false;
// };

// const getPureLongPositions = (longPositions, shortPositions) => {
//     const shortSymbols = shortPositions.map((el) => el.instrument.symbol.split('_')[0]);
//     const pureLongPositions = [];

//     for (let i = 0; i < longPositions.length; i++) {
//         const longPosition = longPositions[i];
//         const longSymbol = longPosition?.instrument?.symbol;
//         const longOption = longSymbol.split('_').length ? longSymbol.split('_')[0] : '';

//         if (longOption) {
//             if (shortSymbols.indexOf(longOption) === -1) {
//                 pureLongPositions.push(longPosition);
//             }
//         }
//     }

//     return pureLongPositions;
// };

// const generateNewOrder = async (positions) => {
//     if (positions.length) {
//         const newOrder = [];

//         for (let i = 0; i < positions.length; i++) {
//             const position = positions?.[i];
//             const symbol = position?.instrument?.symbol;

//             if (symbol) {
//                 const quote = await td.fetchQuote(symbol);
//                 const currentPrice = quote[symbol].askPrice;
//                 const averagePrice = position?.averagePrice;
//                 const longQuantity = position?.longQuantity;
//                 const profitLoss = currentPrice / averagePrice;

//                 // If profit && long stock/options only
//                 if (profitLoss > 1 && longQuantity) {
//                     const orderQuantities = getNewQuantityArray(longQuantity);

//                     if (orderQuantities) {
//                         newOrder.push({
//                             symbol,
//                             orderQuantities,
//                             currentPrice,
//                             ...position,
//                         });
//                     } else {
//                         console.log('Error generating order quantities ', symbol);
//                     }
//                 }
//             } else {
//                 console.log('No symbol');
//             }
//         }

//         return newOrder;
//     }
// };
