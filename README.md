# Webgains tag for Google Tag Manager Server Side

There are two types of events that Webgains tag supports: PageView and Conversion. 

- **PageView event** stores the cid URL parameter inside the `wg_cid` cookie. 
- **Conversion event** sends the HTTP request with the specified conversion data to Webgains.

## How to use the Webgains tag

1. Create a Webgains tag and add Page View and Purchase triggers
2. Add the only required field for the conversion event - Program ID, other fields are optional.

**Program ID** -  Program ID

**Order Reference** - Unique ID that identifies the order or transaction on your site.

**Event ID** - Event ID.

**Currency** - Transaction currency.

**Voucher ID** - Promotional voucher code on the entire order.

**Customer ID** - Customer ID, fill only on request.

**Location** - Checkout URL. May remain empty.

**Click ID** - Value of the identifier. This value must be the Click ID assigned to the user.

**Comment** - Optional commentary.

**Items** - Array with the articles of the transaction.

**Item Fields** - Array with the fields of the articles.

## Open Source

Webgains tag for GTM Server Side is developed and maintained by [Stape Team](https://stape.io/) under the Apache 2.0 license.

Sponsored by [InBiz Online Marketing](https://www.inbiz.de?utm_source=github&utm_medium=wg-tag).
