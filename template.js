const setCookie = require('setCookie');
const parseUrl = require('parseUrl');
const getRequestHeader = require('getRequestHeader');
const getCookieValues = require('getCookieValues');
const getType = require('getType');
const makeTableMap = require('makeTableMap');
const JSON = require('JSON');
const logToConsole = require('logToConsole');
const sendHttpRequest = require('sendHttpRequest');
const getContainerVersion = require('getContainerVersion');
const getAllEventData = require('getAllEventData');

const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');

const eventData = getAllEventData();

switch (data.type) {
  case 'page_view':
    handlePageViewEvent();
    break;
  case 'conversion':
    handleConversionEvent();
    break;
  default:
    data.gtmOnSuccess();
}

function handlePageViewEvent() {
  const url = eventData.page_location || getRequestHeader('referer');
  if (url) {
    const searchParams = parseUrl(url).searchParams;
    const cidParamName = data.cidQueryParameterName || 'cid';
    if (searchParams[cidParamName]) {
      const options = {
        domain: 'auto',
        path: '/',
        secure: true,
        httpOnly: true,
        'max-age': 7776000 // 90 days
      };
      setCookie('wg_cid', searchParams[cidParamName], options, false);
    }
  }
  data.gtmOnSuccess();
}

function handleConversionEvent() {
  const clickId = data.clickId || getCookieValues('wg_cid')[0];
  if (!clickId) return data.gtmOnSuccess();
  const payload = getRequestPayload(clickId);
  const requestUrl = 'https://api.webgains.io/queue-conversion';
  if (isLoggingEnabled) {
    logToConsole(
      JSON.stringify({
        Name: 'Webgains',
        Type: 'Request',
        TraceId: traceId,
        EventName: 'Conversion',
        RequestMethod: 'POST',
        RequestUrl: requestUrl,
        RequestBody: payload
      })
    );
  }
  sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      if (isLoggingEnabled) {
        logToConsole(
          JSON.stringify({
            Name: 'Webgains',
            Type: 'Response',
            TraceId: traceId,
            EventName: 'Conversion',
            ResponseStatusCode: statusCode,
            ResponseHeaders: headers,
            ResponseBody: body
          })
        );
      }

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

function getRequestPayload(clickId) {
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

  return payload;
}

function getItems() {
  const items = data.items || eventData.items;
  if (getType(items) !== 'array') return [];
  const itemFields = makeTableMap(data.itemFields, 'key', 'value') || {};

  return items.map((item) => ({
    event: item[itemFields.event || 'event'] || '',
    price: item[itemFields.price || 'price'] || 0,
    name: item[itemFields.name || 'item_name'] || '',
    code: item[itemFields.code || 'item_id'] || '',
    voucher: item[itemFields.voucher || 'coupon'] || ''
  }));
}

function getValueFromItems(items) {
  return items.reduce((acc, item) => acc + item.price, 0);
}

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = !!(
    containerVersion &&
    (containerVersion.debugMode || containerVersion.previewMode)
  );

  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'no') {
    return false;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}
