import { getQuote, getAccount, getAccounts, createOrder, sellOrder } from './services.js';

const sendOrder = (type, symbol, amount, timeNow) => {
    if (type === 'buy') {
        // first, get cash account balance
        return coinbase.getAccount(coinbaseCashAcctId).then((cashAccount) => {
            const cashBalance = cashAccount?.account?.available_balance?.value;
            console.log({ cashBalance });

            if (cashAccount && cashBalance) {
                return coinbase.createOrder(amount).then((createdOrder) => {
                    if (createdOrder) {
                        theBias.update(symbol, 'havePosition', true);
                        theBias.update(symbol, 'lastTransactionTime', timeNow);
                        return createdOrder;
                    } else {
                        return '********** UNABLE TO CREATE createOrder **********';
                    }
                });
            }
        });
    } else if (type === 'sell') {
        // first, get btc account balance
        return coinbase.getAccount(coinbaseBtcAcctId).then((btcAccount) => {
            const btcBalance = btcAccount?.account?.available_balance?.value;
            console.log({ btcBalance });

            if (btcAccount && btcBalance) {
                const sellAmount = amount === 'ALL' ? parseFloat(btcBalance).toFixed(4) : amount;

                return coinbase.sellOrder(sellAmount).then((createdOrder) => {
                    if (createdOrder) {
                        theBias.update(symbol, 'havePosition', false);
                        theBias.update(symbol, 'lastTransactionTime', timeNow);
                        return createdOrder;
                    } else {
                        return '********** UNABLE TO CREATE sellOrder **********';
                    }
                });
            }
        });
    }
};

export { getQuote, getAccount, getAccounts, createOrder, sellOrder, sendOrder };