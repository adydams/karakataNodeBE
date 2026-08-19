// scripts/registerSenderFromStation.js
// Usage: node scripts/registerSenderFromStation.js --stationId=STATION_ID

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { StorePickupStation } = require('../models');
const ShipBubbleAdapter = require('../services/ShipBubbles/shipbubbleAdapterSafe');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach(a => {
    const [k,v] = a.split('=');
    out[k.replace(/^--/, '')] = v;
  });
  return out;
}

async function main() {
  const { stationId } = parseArgs();
  if (!stationId) {
    console.error('Please pass --stationId=STATION_ID');
    process.exit(2);
  }

  const station = await StorePickupStation.findByPk(stationId);
  if (!station) {
    console.error('StorePickupStation not found for id=', stationId);
    process.exit(2);
  }

  const fullAddress = [station.address, station.city, station.state, station.country].filter(Boolean).join(', ');
  try {
    console.log('Validating sender station address with ShipBubble:', fullAddress);
    const result = await ShipBubbleAdapter.validateAddress({ name: station.name || 'Sender', email: station.contactEmail || '', phone: station.contactPhone || '', address: fullAddress });
    if (result && result.address_code) {
      station.shipbubbleAddressCode = result.address_code;
      await station.save();
      console.log('Saved shipbubbleAddressCode on station:', result.address_code);
      console.log('You can also set SHIPBUBBLE_SENDER_ADDRESS_CODE in your .env to:', result.address_code);
      process.exit(0);
    } else {
      console.error('Unexpected ShipBubble response:', result);
      process.exit(3);
    }
  } catch (err) {
    console.error('Failed to register sender address:', err.message || err);
    process.exit(4);
  }
}

main();
