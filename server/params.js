/* @flow */

import { ENV, COUNTRY, LANG, CURRENCY, INTENT, COMMIT, VAULT, CARD, FUNDING, DEFAULT_COUNTRY, COUNTRY_LANGS } from '@paypal/sdk-constants';

import type { ExpressRequest, ExpressResponse } from './types';

type FundingEligibility = {|
    paypal : {
    eligible : boolean
},
venmo : {
    eligible : boolean
}
|};

function getFundingEligibility(req : ExpressRequest) : FundingEligibility {
    const encodedFundingEligibility = req.query.fundingEligibility;

    let fundingEligibility;

    if (!encodedFundingEligibility || typeof encodedFundingEligibility !== 'string') {
        // $FlowFixMe
        fundingEligibility = {
            [FUNDING.PAYPAL]: {
                eligible: true
            }
        };
    } else {
        fundingEligibility = JSON.parse(
            Buffer.from(encodedFundingEligibility, 'base64').toString('utf8')
        );
    }

    const cookies = req.get('cookie');
    if (cookies && cookies.indexOf('pwv') !== -1) {
        fundingEligibility[FUNDING.VENMO] = fundingEligibility[FUNDING.VENMO] || {};
        fundingEligibility[FUNDING.VENMO].eligible = true;
    }

    return fundingEligibility;
}

function getNonce(res : ExpressResponse) : string {
    let nonce = res.locals && res.locals.nonce;

    if (!nonce || typeof nonce !== 'string') {
        nonce = '';
    }

    return nonce;
}

type ParamsType = {|
    env : $Values<typeof ENV>,
    clientID : string,
    locale? : {
        country : $Values<typeof COUNTRY>,
        lang : $Values<typeof LANG>
    },
    buyerCountry : ?$Values<typeof COUNTRY>,
    currency : $Values<typeof CURRENCY>,
    intent : $Values<typeof INTENT>,
    commit : $Values<typeof COMMIT>,
    vault : $Values<typeof VAULT>,
    disableFunding : $ReadOnlyArray<?$Values<typeof FUNDING>>,
    disableCard : $ReadOnlyArray<?$Values<typeof CARD>>,
    merchantID? : string,
    buttonSessionID : string,
    clientAccessToken? : string,
    debug? : boolean
|};

type RequestParams = {|
    env : $Values<typeof ENV>,
    clientID : ?string,
    country : $Values<typeof COUNTRY>,
    buyerCountry : ?$Values<typeof COUNTRY>,
    lang : $Values<typeof LANG>,
    currency : $Values<typeof CURRENCY>,
    intent : $Values<typeof INTENT>,
    commit : $Values<typeof COMMIT>,
    vault : $Values<typeof VAULT>,
    disableFunding : $ReadOnlyArray<?$Values<typeof FUNDING>>,
    disableCard : $ReadOnlyArray<?$Values<typeof CARD>>,
    merchantID : ?string,
    buttonSessionID : string,
    clientAccessToken : ?string,
    cspNonce : string,
    fundingEligibility : FundingEligibility,
    debug : boolean
|};

export function getParams(params : ParamsType, req : ExpressRequest, res : ExpressResponse) : RequestParams {
    const {
        env,
        clientID,
        locale = {},
        buyerCountry,
        currency,
        intent,
        commit,
        vault,
        disableFunding,
        disableCard,
        merchantID,
        buttonSessionID,
        clientAccessToken,
        debug = false
    } = params;

    const {
        country = DEFAULT_COUNTRY,
        lang = COUNTRY_LANGS[country][0]
    } = locale;

    const cspNonce = getNonce(res);

    const fundingEligibility = getFundingEligibility(req);

    return {
        env,
        clientID,
        // $FlowFixMe
        lang,
        country,
        buyerCountry,
        currency,
        intent,
        commit,
        vault,
        disableFunding,
        disableCard,
        merchantID,
        buttonSessionID,
        clientAccessToken,
        fundingEligibility,
        cspNonce,
        debug
    };
}
