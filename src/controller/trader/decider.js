export const isUpward = (alert, alertType, t) => {
    const isBaseUp = alert[t][alertType].value === true;

    if (isBaseUp) {
        return true;
    }

    return false;
};

export const isDownward = (alert, alertType, t) => {
    const isBaseDown = alert[t][alertType].value === false;

    if (isBaseDown) {
        return true;
    }

    return false;
};

export const hasUpwardTrend = (alert, alertType, t1, t2) => {
    const isUpwardT1 = isUpward(alert, alertType, t1);
    const isUpwardT2 = isUpward(alert, alertType, t2);

    if (isUpwardT1 && isUpwardT2) {
        return true;
    }

    return false;
};

export const hasDownwardTrend = (alert, alertType, t1, t2) => {
    const isDownwardT1 = isDownward(alert, alertType, t1);
    const isDownwardT2 = isDownward(alert, alertType, t2);

    if (isDownwardT1 && isDownwardT2) {
        return true;
    }

    return false;
};

export const decideShort = (newBias, timeFrame) => {
    const currPrice = newBias[timeFrame].price;
    const lastPrice = newBias[timeFrame].lastPrice;
    const percentChange = (parseFloat(currPrice) - parseFloat(lastPrice)) / 100;

    if (percentChange >= 1) {
        console.log('SHORT SELL', { percentChange });
        return true;
    }

    return false;
};

// if (shortTermTrend === 'sell') {
//     const shouldShort = decideShort(newBias, 'fiveMin');

//     if (shouldShort) {
//         // If not have short position, start short position
//         if (!newBias.shortedPrice) {
//             // start short
//             bias.update(symbol, 'shortedPrice', currPrice);
//             bias.update(symbol, 'stopShortPrice', 0);
//             console.log('********** SHORT BTC at **********', currPrice);
//         }
//     }
// } else {
//     if (shortTermTrend === 'buy' || shortTermTrend === 'hold') {
//         // if have short position
//         if (newBias.shortedPrice) {
//             // stop short
//             bias.update(symbol, 'shortedPrice', 0);
//             bias.update(symbol, 'stopShortPrice', currPrice);
//             console.log('********** BOUGHT BACK SHORT SELL BTC at **********', currPrice);
//         }
//     } else if (shortTermTrend === 'hold') {
//         console.log('********** shortTermTrend decision HOLD **********', currPrice);
//     }
// }

// trend decisions
// let shortTermTrend = decider(newBias, 'fifteenMin', 'fiveMin', 'threeMin');
// let midTermTrend = decider(newBias, 'oneHr', 'thirtyMin', 'fifteenMin');
// let longTermTrend = decider(newBias, 'weekly', 'daily', 'twoHr');

// const shortTermTrend = decider(bias, 'fifteenMin', 'fiveMin', 'threeMin');

// // const midTermTrend = decider(bias, 'oneHr', 'thirtyMin', 'fifteenMin');

// const midTermTrend = decider(bias, 'twoHr', 'oneHr', 'fourtyFiveMin');

// const longTermTrend = decider(bias, 'weekly', 'daily', 'fourHr');

// const diff = Math.trunc(amount) - Math.trunc(newBias.myCashBalance);
// theBias.update(symbol, 'profit', newBias.profit + diff);

// if (diff >= 0) {
//     theBias.update(symbol, 'gain', newBias.gain + diff);

//     if (theBias.loss < 0) {
//         theBias.update(symbol, 'loss', newBias.loss - diff);
//     }
// } else if (diff < 0) {
//     theBias.update(symbol, 'loss', newBias.loss + diff);

//     if (theBias.gain > 0) {
//         theBias.update(symbol, 'gain', newBias.gain + diff);
//     }
// }
