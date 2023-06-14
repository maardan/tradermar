import fetch from 'node-fetch';
import * as utils from '../../utils/generic.js';
import { tdAccountId, tdRefreshToken, tdClientID, tdEndPoint } from '../../utils/constants.js';
let headers = {};

/**
 * ******************************************************************************************
 */

// Start function (Access token valid for 30 minutes, Refresh token valid for 90 days)
const loginFetchToken = async () => {
    try {
        let res = await fetch(`${tdEndPoint}oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: utils.encodeForm({
                grant_type: 'refresh_token',
                refresh_token: tdRefreshToken,
                client_id: tdClientID,
                // redirect_uri: process.env.redirect_uri
            }),
        });

        res = await res.json();

        if (res?.access_token) {
            headers = {
                Authorization: 'Bearer ' + res.access_token,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            };
            return true;
        }

        console.log(`***** NO ACCESS TOKEN *****`, { res });
        return false;
    } catch (error) {
        console.log(error);
        debugger;
    }
};

const loginTd = async () => {
    const login = await loginFetchToken();
    return login;
};
/**
 * ******************************************************************************************
 */

const fetchAccountInfo = async () => {
    try {
        let res = await fetch(`${tdEndPoint}accounts/${tdAccountId}?fields=positions`, {
            method: 'GET',
            headers,
        });

        res = await res.json();
        return res;
    } catch (error) {
        console.log(error);
        debugger;
    }
};

/**
 * ******************************************************************************************
 */

const fetchMyPositionSymbols = async () => {
    const accountInfo = await fetchAccountInfo();
    const positions = accountInfo?.securitiesAccount?.positions;
    let symbols = [];

    if (positions) {
        for (let i = positions.length - 1; i >= 0; i--) {
            if (positions[i]?.instrument?.underlyingSymbol) {
                symbols.push(positions[i].instrument.underlyingSymbol);
            } else if (positions[i]?.instrument?.symbol) {
                symbols.push(positions[i].instrument.symbol);
            }
        }
    }

    symbols = utils.getUniqueValues(symbols);

    return symbols;
};

/**
 * ******************************************************************************************
 */

const fetchOrders = async (status) => {
    let url = `${tdEndPoint}accounts/${tdAccountId}/orders`;

    if (status) {
        url = `${tdEndPoint}accounts/${tdAccountId}/orders?status=${status}`;
    }

    try {
        let res = await fetch(url, {
            method: 'GET',
            headers,
        });

        res = await res.json();
        return res;
    } catch (error) {
        console.log(error);
        debugger;
    }
};

/**
 * ******************************************************************************************
 */

const cancelOrder = async (orderId) => {
    try {
        let res = await fetch(`${tdEndPoint}accounts/${tdAccountId}/orders/${orderId}`, {
            method: 'DELETE',
            headers,
        });

        return res;
    } catch (error) {
        console.log(error);
        debugger;
    }
};

/**
 * ******************************************************************************************
 */

const fetchQuote = async (symbol) => {
    try {
        let res = await fetch(`${tdEndPoint}marketdata/${symbol}/quotes`, {
            method: 'GET',
            headers,
        });

        res = await res.json();

        return res;
    } catch (error) {
        console.log(error);
        debugger;
    }
};

/**
 * ******************************************************************************************
 */

const fetchOptionChain = async (symbol) => {
    // let qs = {
    // 	'symbol': symbol,
    // 	'expiration': expiration,
    // 	'greeks': 'true'
    // }

    try {
        let res = await fetch(`${tdEndPoint}marketdata/chains?symbol=${symbol}&range=ITM&daysToExpiration=100`, {
            method: 'GET',
            headers,
        });

        res = await res.json();

        return res;
    } catch (error) {
        console.log(error);
        debugger;
    }
};

const getOptionChainData = async (symbol) => {
    const optionsChain = await fetchOptionChain(symbol);
    return optionsChain;
};

/**
 * ******************************************************************************************
 */

const postReplaceOrder = async (newOrder, orderId) => {
    try {
        let res = await fetch(`${tdEndPoint}accounts/${tdAccountId}/orders/${orderId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(newOrder),
        });

        console.log(`***** postReplaceOrder SUCCESS (td) *****`);
        return res.Response;
    } catch (error) {
        console.log(error);
        debugger;
    }
};

const replaceOrder = async (newOrder, orderId) => {
    const order = await postReplaceOrder(newOrder, orderId);
    return order;
};

/**
 * ******************************************************************************************
 */

const postOrder = async (newOrder) => {
    try {
        let res = await fetch(`${tdEndPoint}accounts/${tdAccountId}/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify(newOrder),
        });

        console.log(`***** postOrder SUCCESS (td) *****`);
        return res;
    } catch (error) {
        console.log(error);
        debugger;
    }
};

const createOrder = async (newOrder) => {
    const order = await postOrder(newOrder);
    return order;
};

/**
 * ******************************************************************************************
 */

export {
    loginTd,
    fetchAccountInfo,
    fetchMyPositionSymbols,
    fetchQuote,
    fetchOptionChain,
    fetchOrders,
    getOptionChainData,
    cancelOrder,
    createOrder,
    replaceOrder,
};

/**
 * ******************************************************************************************
 */

// Serve the trader html file
// app.get('/get_data', (req, res) => {
// 	// Start function
// 	const getUserPrinciples = async function(accessToken) {
// 		let res = await fetch('${tdEndPoint}userprincipals?fields=streamerSubscriptionKeys,streamerConnectionInfo', {
// 		    method: "GET",
// 		    headers
// 		});

// 		return res.json();
// 	};

// 		// Get user token (from /v1/oauth2/token) to get user principles (used in streaming)
//         if (response1.access_token){

//             const accessTokenObj = {
//                 token: response1.access_token,
//                 refresh_token: response1.refresh_token,
//                 expires: new Date(Date.now() + 9999999)
//             };

//             // res.cookie('token', response1.access_token, { expires: new Date(Date.now() + 9999999) });

//             const userPrinciples = await getUserPrinciples(response1.access_token);

//             return res.json({ userPrinciples: userPrinciples });
//         }

//         return res.json({ status: 'failed' });

// });
