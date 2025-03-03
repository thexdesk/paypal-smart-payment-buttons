/* @flow */

import { $mockEndpoint, patchXmlHttpRequest } from 'sync-browser-mocks/src/xhr';
import { ZalgoPromise } from 'zalgo-promise';
import { values, destroyElement } from 'belter/src';
import { FUNDING } from '@paypal/sdk-constants';
import { INTENT, CURRENCY, CARD } from '@paypal/sdk-constants/src';

import { triggerKeyPress } from './util';

export function setupMocks() {
    const body = document.body;

    if (!body) {
        throw new Error(`No document.body found`);
    }

    body.innerHTML = '';

    window.config = {
        urls: {
            baseUrl: '/smart'
        }
    };

    window.meta = {
        headers: {
            'x-csrf-jwt': 'xxxxxxx'
        }
    };

    window.paypal = {
        config:  {
            locale: {
                country: 'US',
                lang:    'en'
            }
        },
        Checkout: (props) => {
            return {
                renderTo: () => {
                    return props.createOrder().then(orderID => {
                        return ZalgoPromise.delay(50).then(() => {
                            return props.onApprove({
                                orderID,
                                payerID: 'AAABBBCCC'
                            });
                        });
                    });
                },
                close: () => {
                    return ZalgoPromise.delay(50).then(() => {
                        if (props.onClose) {
                            return props.onClose();
                        }
                    });
                },
                onError: (err) => {
                    throw err;
                }
            };
        },
        CardFields: (props) => {
            return {
                render: () => {
                    return props.createOrder().then(orderID => {
                        return ZalgoPromise.delay(50).then(() => {
                            return props.onApprove({
                                orderID,
                                payerID: 'AAABBBCCC'
                            });
                        });
                    });
                },
                close: () => {
                    return ZalgoPromise.delay(50).then(() => {
                        if (props.onClose) {
                            return props.onClose();
                        }
                    });
                },
                onError: (err) => {
                    throw err;
                }
            };
        }
    };

    window.xprops = {
        intent:      INTENT.CAPTURE,
        currency:    CURRENCY.USD,
        createOrder: () => {
            return ZalgoPromise.resolve('XXXXXXXXXX');
        },
        style: {

        },
        locale: {
            country: 'US',
            lang:    'en'
        },
        onInit: () => {
            return ZalgoPromise.resolve();
        },
        onClick: () => {
            return ZalgoPromise.resolve();
        },
        onApprove: () => {
            return ZalgoPromise.resolve();
        },
        onCancel: () => {
            return ZalgoPromise.resolve();
        },
        onError: (err) => {
            throw err;
        },
        remember: () => {
            return ZalgoPromise.resolve();
        },
        getPrerenderDetails: () => ZalgoPromise.resolve(),
        getParent:           () => window,
        getParentDomain:     () => 'https://www.merchant.com'
    };

    window.Promise.try = (method) => {
        return window.Promise.resolve().then(method);
    };

    const buttonsContainer = document.querySelector('#buttons-container') || document.createElement('div');
    buttonsContainer.id = 'buttons-container';
    destroyElement(buttonsContainer);
    body.appendChild(buttonsContainer);

    const cardContainer = document.querySelector('#card-fields-container') || document.createElement('div');
    cardContainer.id = 'card-fields-container';
    destroyElement(cardContainer);
    body.appendChild(cardContainer);
}

setupMocks();
patchXmlHttpRequest();

export function mockFunction<T, A>(obj : mixed, prop : string, mock : ({ args : $ReadOnlyArray<A>, original : (...args: $ReadOnlyArray<A>) => T }) => T) : { cancel : () => void } {
    // $FlowFixMe
    const original = obj[prop];
    // $FlowFixMe
    obj[prop] = (...args) => {
        return mock({ args, original });
    };
    return {
        cancel: () => {
            // $FlowFixMe
            obj[prop] = original;
        }
    };
}

export async function clickButton(fundingSource? : string = FUNDING.PAYPAL, card? : string = CARD.VISA) : ZalgoPromise<void> {
    let selector = `button[data-funding-source=${ fundingSource }]`;
    if (fundingSource === FUNDING.CARD) {
        selector = `${ selector }[data-card=${ card }]`;
    }
    const button = window.document.querySelector(selector);
    button.click();
    await button.payPromise;
}

export function enterButton(fundingSource? : string = FUNDING.PAYPAL) {
    triggerKeyPress(window.document.querySelector(`button[data-funding-source=${ fundingSource }]`), 13);
}

export const DEFAULT_FUNDING_ELIGIBILITY = {
    [ FUNDING.PAYPAL ]: {
        eligible: true
    }
};

export function createButtonHTML(fundingEligibility? : Object = DEFAULT_FUNDING_ELIGIBILITY) {
    const buttons = [];

    // $FlowFixMe
    for (const fundingSource of values(FUNDING)) {
        const fundingConfig = fundingEligibility[fundingSource];

        if (!fundingConfig || !fundingConfig.eligible) {
            continue;
        }

        buttons.push(`<button data-funding-source="${ fundingSource }"></div>`);

        if (fundingConfig.vaultedInstruments) {
            for (const vaultedInstrument of fundingConfig.vaultedInstruments) {
                buttons.push(`<button data-funding-source="${ fundingSource }" data-payment-method-id="${ vaultedInstrument.id }"></div>`);
            }
        }

        if (fundingSource === FUNDING.CARD) {
            for (const card of values(CARD)) {
                const cardConfig = fundingConfig.vendors[card];

                if (!cardConfig || !cardConfig.eligible) {
                    continue;
                }

                buttons.push(`<button data-funding-source="${ fundingSource }" data-card="${ card }"></div>`);

                if (cardConfig.vaultedInstruments) {
                    for (const vaultedInstrument of cardConfig.vaultedInstruments) {
                        buttons.push(`<button data-funding-source="${ fundingSource }" data-card="${ card }" data-payment-method-id="${ vaultedInstrument.id }"></div>`);
                    }
                }
            }
        }
    }

    const body = document.body;

    if (!body) {
        throw new Error(`No document.body found`);
    }

    body.innerHTML += buttons.join('\n');
}

type MockEndpoint = {|
    listen : () => MockEndpoint,
    expectCalls : () => MockEndpoint,
    done : () => MockEndpoint,
    enable : () => MockEndpoint,
    disable : () => MockEndpoint
|};

export function getCreateAccessTokenMock(options : Object = {}) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    '/v1/oauth2/token',
        data:   {
            access_token: 'abc123'
        },
        ...options
    });
}

export function getCreateOrderApiMock(options : Object = {}) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    new RegExp('/v2/checkout/orders'),
        data:   {
            id: 'ABCDEFG0123456789'
        },
        ...options
    });
}

export function getGetOrderApiMock(options : Object = {}) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'GET',
        uri:    new RegExp('/smart/api/order/[^/]+'),
        data:   {
            ack:  'success',
            data: {

            }
        },
        ...options
    });
}

export function getCaptureOrderApiMock(options : Object = {}) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    new RegExp('/smart/api/order/[^/]+/capture'),
        data:   {
            ack:  'success',
            data: {

            }
        },
        ...options
    });
}

export function getAuthorizeOrderApiMock(options : Object = {}) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    new RegExp('/smart/api/order/[^/]+/authorize'),
        data:   {
            ack:  'success',
            data: {

            }
        },
        ...options
    });
}

export function getMapBillingTokenApiMock(options : Object = {}) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    new RegExp('/smart/api/payment/[^/]+/ectoken'),
        data:   {
            ack:  'success',
            data: {
                token: 'ABCDEFG12345'
            }
        },
        ...options
    });
}
export function getPatchOrderApiMock(options : Object = {}) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    new RegExp('/smart/api/order/[^/]+/patch'),
        data:   {
            ack:  'success',
            data: {}
        },
        ...options
    });
}

export function getSubscriptionIdToCartIdApiMock(options : Object = {}, subscriptionID : string = 'I-SUBSCRIPTIONID', cartId : string = 'CARTIDOFSUBSCRIPTIONS') : MockEndpoint {

    return $mockEndpoint.register({
        method: 'POST',
        uri:    `/smart/api/billagmt/subscriptions/${ subscriptionID }/cartid`,
        data:   {
            ack:  'success',
            data: {
                token: cartId
            }
        },
        ...options
    });
}

export function getGetSubscriptionApiMock(options : Object = {}, subscriptionID : string) : MockEndpoint {

    return $mockEndpoint.register({
        method: 'GET',
        uri:    `/smart/api/billagmt/subscriptions/${ subscriptionID }`,
        data:   {
            ack:  'success',
            data: {
                'status':      'APPROVAL_PENDING',
                'id':          subscriptionID,
                'create_time': '2019-05-13T13:50:17Z'
            }
        },
        ...options
    });
}

export function getCreateSubscriptionIdApiMock(options : Object, subscriptionID : string) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    'v1/billing/subscriptions',
        data:   {
            'status':      'APPROVAL_PENDING',
            'id':          subscriptionID,
            'create_time': '2019-05-10T13:50:17Z'
        },
        ...options
    });
}

export function getReviseSubscriptionIdApiMock(options : Object, subscriptionID : string) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    `v1/billing/subscriptions/${ subscriptionID }/revise`,
        data:   {
            'status':      'APPROVAL_PENDING',
            'id':          subscriptionID,
            'create_time': '2019-05-10T13:50:17Z'
        },
        ...options
    });
}

export function getActivateSubscriptionIdApiMock(options : Object = {}, subscriptionID : string) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    `/smart/api/billagmt/subscriptions/${ subscriptionID }/activate`,
        data:   {
            ack:  'success',
            data: {}
        },
        ...options
    });
}

export function getGraphQLApiMock(options : Object = {}) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    '/graphql',
        data:   {
            data: {
                checkoutSession: {
                    cart: {
                        intent:  'capture',
                        amounts: {
                            total: {
                                currencyCode: 'USD'
                            }
                        }
                    }
                }
            }
        },
        ...options
    });
}

export function getLoggerApiMock(options : Object = {}) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    '/xoplatform/logger/api/logger',
        data:   {

        },
        ...options
    });
}

export function getValidatePaymentMethodApiMock(options : Object = {}) : MockEndpoint {
    return $mockEndpoint.register({
        method: 'POST',
        uri:    new RegExp('/v2/checkout/orders/[^/]+/validate-payment-method'),
        data:   {
        
        },
        ...options
    });
}

getCreateAccessTokenMock().listen();
getCreateOrderApiMock().listen();
getGetOrderApiMock().listen();
getCaptureOrderApiMock().listen();
getAuthorizeOrderApiMock().listen();
getMapBillingTokenApiMock().listen();
getPatchOrderApiMock().listen();
getSubscriptionIdToCartIdApiMock().listen();
getGraphQLApiMock().listen();
getLoggerApiMock().listen();
getValidatePaymentMethodApiMock().listen();
