#!/usr/bin/env node

const os = require('os');

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const localIPs = [];

  Object.keys(interfaces).forEach((name) => {
    interfaces[name].forEach((interface) => {
      // Skip internal and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        localIPs.push({
          name: name,
          address: interface.address,
          netmask: interface.netmask,
          mac: interface.mac
        });
      }
    });
  });

  return localIPs;
}

function displayLocalIPs() {
  console.log('🌐 Local Network IP Addresses');
  console.log('==============================\n');
  
  const localIPs = getLocalIPs();
  
  if (localIPs.length === 0) {
    console.log('No local network interfaces found.');
    return;
  }

  localIPs.forEach((ip, index) => {
    console.log(`${index + 1}. Interface: ${ip.name}`);
    console.log(`   IP Address: ${ip.address}`);
    console.log(`   Netmask: ${ip.netmask}`);
    console.log(`   MAC: ${ip.mac}`);
    console.log('');
  });

  console.log('💡 To access your app from other devices:');
  console.log('   Use one of the IP addresses above instead of localhost');
  console.log('   Example: http://192.168.1.100:3000');
  console.log('');
  console.log('📱 The QR code in your app will work with any of these IPs');
}

if (require.main === module) {
  displayLocalIPs();
}

module.exports = { getLocalIPs, displayLocalIPs };
