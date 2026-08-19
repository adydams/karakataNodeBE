// scripts/bulkValidateAddresses.js
// Usage: node scripts/bulkValidateAddresses.js [--limit=N] [--delay=ms]

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { Address } = require('../models');
const LogisticsService = require('../services/logisticsService');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { limit: null, delay: 500 };
  args.forEach(a => {
    if (a.startsWith('--limit=')) opts.limit = parseInt(a.split('=')[1], 10);
    if (a.startsWith('--delay=')) opts.delay = parseInt(a.split('=')[1], 10);
  });
  return opts;
}

async function main() {
  const { limit, delay } = parseArgs();
  console.log('Bulk ShipBubble address revalidation script');
  console.log('Reading environment variables...');
  console.log('SHIPBUBBLE_API_KEY present:', !!process.env.SHIPBUBBLE_API_KEY);
  console.log('SHIPBUBBLE_SENDER_ADDRESS_CODE present:', !!process.env.SHIPBUBBLE_SENDER_ADDRESS_CODE);

  try {
    const where = { shipbubbleAddressCode: null, isDeleted: false };
    const query = { where, order: [['createdAt', 'ASC']] };
    if (limit && Number.isInteger(limit)) query.limit = limit;

    const addresses = await Address.findAll(query);
    console.log(`Found ${addresses.length} address(es) without shipbubbleAddressCode.`);

    let successCount = 0;
    let failCount = 0;

    for (const addr of addresses) {
      console.log('\nProcessing address id=', addr.id);
      try {
        const result = await LogisticsService.validateAndRegisterAddress(addr.id);
        console.log('-> Success. ShipBubble result:', result && result.address_code ? result.address_code : result);
        successCount++;
      } catch (err) {
        console.error('-> Failed:', err && err.message ? err.message : err);
        failCount++;
      }

      if (delay && delay > 0) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    console.log('\nBulk validation complete.');
    console.log(`Successful: ${successCount}, Failed: ${failCount}`);
    process.exit(0);
  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

main();
