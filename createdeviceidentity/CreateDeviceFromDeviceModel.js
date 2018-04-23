'use strict';

var iothub = require('azure-iothub');

var fs = require("fs");
var path = require("path");

const https = require('https');
//const CryptoJS = require('crypto-js');

const hubName = 'michaelIOTHub2';
const azureHost = hubName+'.azure-devices.net';
const twinDeviceId = 'myFestoDevice';
const azureAccessKey = 'tduZXLOsXDGvEQObB1DmU21rXH7shlNyd4GPQQNeRGM=';
const signingKey = 'XbdYIDL2Se+y9R9pGB7EknjgjhRG+2LiivAQnpgy3ug=';
const twinEndpoint = '/twins/'+twinDeviceId+'?api-version=2016-11-14';
const expiresInMins = 10;
const policyName = 'iothubowner';

const oracleHost = '129.144.182.85';
const username = 'IOTAdmin';
const passw = 'Welcome#1';

var connectionString = 'HostName='+azureHost+';SharedAccessKeyName='+policyName+';SharedAccessKey='+signingKey;

var registry = iothub.Registry.fromConnectionString(connectionString);

var deviceModelEndpoint = 'https://129.144.182.85:443/iot/api/v2/deviceModels';

if (process.argv.length < 4) {
  usage();
  process.exit(-1);
}

var deviceModelUrn=process.argv[2];
var myDeviceId=process.argv[3];
var verbose=process.argv[4] ==="-v";

if (verbose) console.log('verbose logging');

// Testcase: urn:com:EURECOM-TDs:BMW_X5_TD

// main

// disable TLS certificate checking
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

getDeviceModel(deviceModelUrn);

queryTwins();

function createTwin (dm) {
//  console.log(deviceModel.attributes);
  for (var i in dm.attributes) {
     console.log (dm.attributes[i].name);
  }
}

function queryTwins() {
//     var query = registry.createQuery("SELECT * FROM devices WHERE deviceId = 'twinDeviceId'", 100);
     var query = registry.createQuery("SELECT * FROM devices", 100);
     query.nextAsTwin(function(err, results) {
         if (err) {
             console.error('Failed to fetch the results: ' + err.message);
         } else {
             console.log();
             results.forEach(function(twin) {
                 var desiredConfig = twin.properties.desired.telemetryConfig;
                 var reportedConfig = twin.properties.reported.telemetryConfig;
                 console.log("Config report for: " + twin.deviceId);
                 console.log("Desired: ");
                 console.log(JSON.stringify(desiredConfig, null, 2));
                 console.log("Reported: ");
                 console.log(JSON.stringify(reportedConfig, null, 2));
             });
         }
     });
 };

function createIoTHubTwin (interactionModel) {
var device = {
  deviceId: myDeviceId
}
registry.create(device, function(err, deviceInfo, res) {
  if (err) {
    registry.get(device.deviceId, printDeviceInfo);
  }
  if (deviceInfo) {
    printDeviceInfo(err, deviceInfo, res)
  }
});
};

function getDeviceModel (urn) {
  var body = "";
  var options = {
    host: oracleHost,
    port: 443,
    path: deviceModelEndpoint+'/'+deviceModelUrn,
    // authentication headers
    headers: {
      'Authorization': 'Basic ' + new Buffer(username + ':' + passw).toString('base64')
    }
  };

  var req=https.get(options, (res) => {
    if (verbose) console.log('statusCode:', res.statusCode);
    if (verbose) console.log('headers:', res.headers);

    res.on('data', function(data) {
      body += data;
    });

    res.on('end', function() {
      //here we have the full response, html or json object
      if (verbose) console.log("Received message: " + body);
      createTwin(JSON.parse(body));
    })

    res.on('error', function(e) {
      console.log("Got error: " + e.message);
      body='invalid';
    });
  });
};


function printDeviceInfo(err, deviceInfo, res) {
  if (deviceInfo) {
    console.log('Device ID: ' + deviceInfo.deviceId);
    console.log('Device key: ' + deviceInfo.authentication.symmetricKey.primaryKey);
  }
}

function usage() {
  process.stdout.write('Usage: \n');
  process.stdout.write('CreateDeviceFromDeviceModel <deviceModelUrn> <deviceId> [-v]\n');
}
