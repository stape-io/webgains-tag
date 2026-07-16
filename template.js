const getAllEventData = require('getAllEventData');
const getCookieValues = require('getCookieValues');
const getRequestHeader = require('getRequestHeader');
const getType = require('getType');
const JSON = require('JSON');
const makeTableMap = require('makeTableMap');
const parseUrl = require('parseUrl');
const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();

if (!isConsentGivenOrNotRequired(data, eventData)) {
  return data.gtmOnSuccess();
}

switch (data.type) {
  case 'page_view':
    handlePageViewEvent(data, eventData);
    break;
  case 'conversion':
    handleConversionEvent(data, eventData);
    break;
  default:
    data.gtmOnSuccess();
}

/*==============================================================================
  Vendor related functions
==============================================================================*/

function handlePageViewEvent(data, eventData) {
  const httpOnly = data.cookieHttpOnly;
  const url = eventData.page_location || getRequestHeader('referer');
  if (url) {
    const searchParams = parseUrl(url).searchParams;
    const cidParamName = data.cidQueryParameterName || 'cid';
    if (searchParams[cidParamName]) {
      const options = {
        domain: 'auto',
        path: '/',
        secure: true,
        httpOnly: httpOnly,
        'max-age': 7776000 // 90 days
      };
      setCookie('wg_cid', searchParams[cidParamName], options, false);
    }
  }
  data.gtmOnSuccess();
}

function handleConversionEvent(data, eventData) {
  const commonCookie = eventData.common_cookie || {};
  const clickId = data.clickId || getCookieValues('wg_cid')[0] || commonCookie.wg_cid;

  if (!clickId) return data.gtmOnSuccess();

  const payload = getRequestPayload(data, clickId);
  const requestUrl = 'https://api.webgains.io/queue-conversion';
  sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      if (statusCode >= 200 && statusCode < 300) {
        data.gtmOnSuccess();
      } else {
        data.gtmOnFailure();
      }
    },
    { method: 'POST', headers: { 'content-type': 'application/json' } },
    JSON.stringify(payload)
  );
}

function getRequestPayload(data, clickId) {
  const items = getItems();
  const payload = {
    ids: [
      {
        name: 's2s',
        value: clickId
      }
    ],
    value: getValueFromItems(items),
    items: items,
    programId: data.programId
  };

  const location = data.location || eventData.page_location;
  if (location) payload.location = location;

  const orderReference = data.orderReference || eventData.transaction_id;
  if (orderReference) payload.orderReference = orderReference;

  const eventId = data.eventId || eventData.event_id;
  if (eventId) payload.eventId = eventId;

  const currency = data.currency || eventData.currency;
  if (currency) payload.currency = currency;

  const voucherId = data.voucherId || eventData.coupon;
  if (voucherId) payload.voucherId = voucherId;

  if (data.customerId) payload.customerId = data.customerId;
  if (data.comment) payload.comment = data.comment;

  const customDataArray = data.addOrderLevelCustomData ? data.orderLevelCustomData || [] : [];
  const customData = makeTableMap(customDataArray, 'key', 'value');
  if (getType(customData) === 'object') {
    payload.customData = customData;
  }
  return payload;
}

function getItems() {
  const items = data.items || eventData.items;
  if (getType(items) !== 'array') return [];
  const itemFields = makeTableMap(data.itemFields || [], 'key', 'value') || {};

  return items.map((item) => {
    return {
      event: item[itemFields.event || 'event'] || '',
      price: item[itemFields.price || 'price'] || 0,
      name: item[itemFields.name || 'item_name'] || '',
      code: item[itemFields.code || 'item_id'] || '',
      voucher: item[itemFields.voucher || 'voucher'] || '',
      customData: item[itemFields.customData || 'customData']
    };
  });
}

function getValueFromItems(items) {
  return items.reduce((acc, item) => acc + item.price, 0);
}

/*==============================================================================
  Helpers
==============================================================================*/

function isConsentGivenOrNotRequired(data, eventData) {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}
