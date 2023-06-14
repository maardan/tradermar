const bias = {
    BTC: {
        myCashBalance: 300,
        profit: 0,
        havePosition: false,
        lastTransactionTime: 'Sat Jun 10 2023 13:42:03 GMT-0700 (Pacific Daylight Time)',
        fiveMin: {
            indicatorA: {
                lastUpdateTime: 'Sat Jun 10 2023 12:45:02 GMT-0700 (Pacific Daylight Time)',
                price: 25681,
                lastPrice: 25555,
                value: true,
            },
        },
        threeMin: {
            indicatorB: {
                lastUpdateTime: 'Sat Jun 10 2023 13:42:03 GMT-0700 (Pacific Daylight Time)',
                price: 25824,
                lastPrice: 25840,
                value: false,
            },
        },
        oneMin: {
            indicatorB: {
                lastUpdateTime: 'Sat Jun 10 2023 13:48:03 GMT-0700 (Pacific Daylight Time)',
                price: 25818,
                lastPrice: 25813,
                value: true,
            },
        },
    },
    TSLA: {
        myCashBalance: 0,
        profit: 0,
        longCallSymbol: '',
        longPutSymbol: '',
        lastTransactionTime: '',
        fiveMin: {
            indicatorA: {
                lastUpdateTime: '2023-06-09T19:55:00.426Z',
                price: '245.00',
                lastPrice: '244.99',
                value: true,
            },
        },
        threeMin: {
            indicatorB: {
                lastUpdateTime: '2023-06-09T19:09:00.713Z',
                price: '243.87',
                lastPrice: '244.74',
                value: false,
            },
        },
        oneMin: {
            indicatorB: {
                lastUpdateTime: '2023-06-09T20:01:04.430Z',
                price: '244.78',
                lastPrice: '244.44',
                value: true,
            },
        },
    },
};

const updateAlert = (symbol, timeFrame, alertType, alertData) => {
    bias[symbol][timeFrame][alertType] = alertData;
    return bias[symbol];
};

const update = (symbol, property, val) => {
    bias[symbol][property] = val;
    return bias[symbol];
};

const get = (symbol) => bias[symbol];

const init = (symbol, val) => {
    if (val) {
        bias[symbol] = val;
    } else {
        bias[symbol] = bias[symbol];
    }
};

export { init, get, update, updateAlert };
