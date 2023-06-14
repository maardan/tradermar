import crypto from 'crypto';
import request from 'request';
import CryptoJS from 'crypto-js';
import { coinbaseApiKey, coinbaseApiSecret } from '../../utils/constants.js';

/**
 * ******************************************************************************************
 */

//create a hexedecimal encoded SHA256 signature of the message
// let signature = '';
// const updateSignature = (message) => {
//     signature = crypto.createHmac('sha256', coinbaseApiSecret).update(message).digest('hex');
//     return signature;
// };
const getMessage = (timestamp, req) => {
    const message = timestamp + req.method + req.path + req.body;
    return message;
};

// Function to generate a signature using CryptoJS
const sign = (str) => {
    const hash = CryptoJS.HmacSHA256(str, coinbaseApiSecret);
    return hash.toString();
};

const uuidv4 = () => {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
    );
};

/**
 * ******************************************************************************************
 */

const getRequestOptions = (signature, req) => ({
    baseUrl: 'https://api.coinbase.com/',
    method: req.method,
    uri: req.uri,
    body: req.body,
    headers: {
        'Content-Type': 'application/json',
        'cb-access-key': coinbaseApiKey,
        'cb-access-passphrase': coinbaseApiSecret,
        'cb-access-timestamp': Math.floor(Date.now() / 1000),
        'cb-access-sign': signature,
        accept: 'application/json',
    },
});

/**
 * ******************************************************************************************
 */

const fetchAccounts = () => {
    const newRequest = {
        method: 'GET',
        path: `/api/v3/brokerage/accounts`,
        uri: `/api/v3/brokerage/accounts`,
        body: '',
    };

    const timeNow = Math.floor(Date.now() / 1000);
    const newMessage = getMessage(timeNow, newRequest);
    const newSignature = sign(newMessage);
    const newOptions = getRequestOptions(newSignature, newRequest);

    const quotePromise = new Promise((resolve, reject) => {
        request(newOptions, (err, response) => {
            if (err) {
                console.log('**** failed fetchAccounts *****', err);
                reject(err);
            }

            console.log('**** success fetchAccounts *****');

            resolve(response.body);
        });
    });

    return quotePromise;
};

const getAccounts = async () => {
    const accounts = await fetchAccounts();
    return JSON.parse(accounts);
};

/**
 * ******************************************************************************************
 */

const fetchAccount = (accountId) => {
    const newRequest = {
        method: 'GET',
        path: `/api/v3/brokerage/accounts/${accountId}`,
        uri: `/api/v3/brokerage/accounts/${accountId}`,
        body: '',
    };

    const timeNow = Math.floor(Date.now() / 1000);
    const newMessage = getMessage(timeNow, newRequest);
    const newSignature = sign(newMessage);
    const newOptions = getRequestOptions(newSignature, newRequest);

    const quotePromise = new Promise((resolve, reject) => {
        request(newOptions, (err, response) => {
            if (err) {
                console.log('**** failed fetchAccount *****', err);
                reject(err);
            }

            console.log('**** success fetchAccount *****');

            resolve(response.body);
        });
    });

    return quotePromise;
};

const getAccount = async (accountId) => {
    const account = await fetchAccount(accountId);

    try {
        return JSON.parse(account);
    } catch (e) {
        return account;
    }
};

/**
 * ******************************************************************************************
 */

const fetchQuote = (symbol, side) => {
    const newRequest = {
        method: 'GET',
        path: `/v2/prices/${symbol}/${side}`,
        uri: `/v2/prices/${symbol}/${side}`,
        body: '',
    };
    const timeNow = Math.floor(Date.now() / 1000);
    const newMessage = getMessage(timeNow, newRequest);
    const newSignature = sign(newMessage);
    const newOptions = getRequestOptions(newSignature, newRequest);
    const quotePromise = new Promise((resolve, reject) => {
        request(newOptions, (err, response) => {
            if (err) {
                console.log(err);
                reject(err);
            }

            resolve(response.body);
        });
    });

    return quotePromise;
};

const getQuote = async (symbol) => {
    let buyQuote = await fetchQuote(symbol, 'buy');
    let sellQuote = await fetchQuote(symbol, 'sell');
    buyQuote = JSON.parse(buyQuote);
    sellQuote = JSON.parse(sellQuote);

    const buyPrice = buyQuote?.data?.amount;
    const sellPrice = sellQuote?.data?.amount;
    const avg = (parseFloat(buyPrice) + parseFloat(sellPrice)) / 2;

    return Math.trunc(avg);
};

/**
 * ******************************************************************************************
 */

const createOrder = (amount) => {
    const order = {
        side: 'BUY',
        order_configuration: {
            market_market_ioc: {
                quote_size: amount.toString(),
            },
        },
        product_id: 'BTC-USD',
        client_order_id: uuidv4(),
    };

    const newRequest = {
        method: 'POST',
        path: '/api/v3/brokerage/orders',
        uri: '/api/v3/brokerage/orders',
        body: JSON.stringify(order),
    };

    const timeNow = Math.floor(Date.now() / 1000);
    const newMessage = getMessage(timeNow, newRequest);
    const newSignature = sign(newMessage);
    const newOptions = getRequestOptions(newSignature, newRequest);

    const quotePromise = new Promise((resolve, reject) => {
        request(newOptions, (err, response) => {
            if (err) {
                console.log(err);
                reject(err);
            }

            const res = response.body;
            console.log('@@@@@@@@@ success createOrder @@@@@@@@@');
            resolve(res);
        });
    });

    return quotePromise;
};

/**
 * ******************************************************************************************
 */

const sellOrder = (amount) => {
    const order = {
        side: 'SELL',
        order_configuration: {
            market_market_ioc: {
                base_size: amount.toString(),
            },
        },
        product_id: 'BTC-USD',
        client_order_id: uuidv4(),
    };

    const newRequest = {
        method: 'POST',
        path: '/api/v3/brokerage/orders',
        uri: '/api/v3/brokerage/orders',
        body: JSON.stringify(order),
    };

    const timeNow = Math.floor(Date.now() / 1000);
    const newMessage = getMessage(timeNow, newRequest);
    const newSignature = sign(newMessage);
    const newOptions = getRequestOptions(newSignature, newRequest);

    const quotePromise = new Promise((resolve, reject) => {
        request(newOptions, (err, response) => {
            if (err) {
                console.log(err);
                reject(err);
            }

            const res = response.body;
            console.log('@@@@@@@@@ success sellOrder @@@@@@@@@', { res });
            resolve(res);
        });
    });

    return quotePromise;
};

/**
 * ******************************************************************************************
 */

export { getQuote, getAccount, getAccounts, createOrder, sellOrder };