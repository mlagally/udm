'use strict';

var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
const https = require('https');
const CryptoJS = require('crypto-js');

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
const applicationId = '78A292BD-ED8F-451B-98D2-07460FD0109F';
const deviceId = '3AA222E6-E4D3-465F-BF77-129EE689FDEB';

var verbose = (process.argv[2]=='-v');
var useEvent = (process.argv[3]=='-e');

// disable TLS certificate checking
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var connectionString = 'HostName='+azureHost+';DeviceId='+twinDeviceId+';SharedAccessKey='+azureAccessKey;

var client = clientFromConnectionString(connectionString, Mqtt);

function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}


function onWriteLine(request, response) {
    console.log(request.payload);

    response.send(200, 'Input was written to log.', function(err) {
        if(err) {
            console.error('An error ocurred when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.' );
        }
    });
}

function onStartPump(request, response) {
    console.log(request.payload);

    var options = {
      hostname: oracleHost,
      port: 443,
      path: '/iot/api/v2/apps/'+applicationId+'/devices/'+deviceId+'/deviceModels/urn%3Acom%3Asiemens%3Awot%3AFestoPlant/actions/StartPump',
      method: 'POST',
      // authentication headers
      headers: {
        'Authorization': 'Basic ' + new Buffer(username + ':' + passw).toString('base64')
      }
    };
//    options.path='/iot/api/v2/apps/'+applicationId+'/devices/'+deviceId+'/deviceModels/urn%3Acom%3Asiemens%3Awot%3AFestoPlant/actions/StartPump';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const req = https.request(options, (res) => {
      console.log('statusCode:', res.statusCode);
      console.log('headers:', res.headers);

      res.on('data', (d) => {
        process.stdout.write(d);
      });
    });

    req.on('error', (e) => {
      console.error(e);
    });
    req.end();


    response.send(200, 'Pump was started.', function(err) {
        if(err) {
            console.error('An error ocurred when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.' );
        }
    });
}

function onStopPump(request, response) {
    console.log(request.payload);

    response.send(200, 'Pump was stopped.', function(err) {
        if(err) {
            console.error('An error ocurred when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.' );
        }
    });
}

function getAzureAuthorizationToken() {

  // See this doc for details: https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-security
  var resourceUri = encodeURIComponent(azureHost); // The resource uri
  var expiry = Math.ceil((Date.now() / 1000) + expiresInMins * 60); // Expire the token 60 minutes from now
  var uriExpiry = resourceUri + '\n' + expiry; // this is the string format to gen signature from
  var decodedKey = CryptoJS.enc.Base64.parse(signingKey); // The SHA256 key is the Base64 decoded version of the IoT Hub key
  var signature = CryptoJS.HmacSHA256(uriExpiry, decodedKey); // The signature generated from the decodedKey
  var encodedUri = encodeURIComponent(CryptoJS.enc.Base64.stringify(signature)); // The url encoded version of the Base64 signature

// Construct authorization string (shared access signature)
  var token = "SharedAccessSignature sr=" + resourceUri + "&sig=" + encodedUri + "&se=" + expiry;

// Add token if one is present
  token += "&skn="+ policyName;
  if (verbose) console.log("Shared Access Signature:" + token);
  return token;
}


function updateDeviceTwin (body) {
  var payload = {
    deviceId: twinDeviceId,
    properties: {
      "desired": JSON.parse(body)
    }
  };

  var postData = JSON.stringify(payload);

  var options = {
     host: azureHost,
     port: 443,
     path: twinEndpoint,
     method: 'PATCH',
     // authentication headers
     headers: {
        'Authorization': getAzureAuthorizationToken(),
        'Content-Type': 'application/json',
        'Content-Length': postData.length
     }
  };

  var req = https.request(options, (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);

    res.on('data', (d) => {
      process.stdout.write(d);
    });
  });

  req.on('error', (e) => {
    console.error(e);
  });

  console.log("patching twin: " + postData);

  req.write(postData);
  req.end();
}

// Create a callback and use the setInterval function to send a message to your IoT hub every second:

var connectCallback = function (err) {
  if (err) {
    console.log('Could not connect: ' + err);
  } else {
    console.log('Client connected');
    // connect method
    client.onDeviceMethod('writeLine', onWriteLine);

    client.onDeviceMethod('startPump', onStartPump);
    client.onDeviceMethod('stopPump', onStopPump);

    // Create a message and send it to the IoT Hub every second

    setInterval(function(){
        var temperature = 20 + (Math.random() * 15);
        var humidity = 60 + (Math.random() * 20);

        var attributeEndpoint='/iot/api/v2/apps/'+applicationId+'/devices/'+deviceId+'/deviceModels/urn%3Acom%3Asiemens%3Awot%3AFestoPlant/attributes';
        var options = {
           host: oracleHost,
           port: 443,
           path: attributeEndpoint,
           // authentication headers
           headers: {
              'Authorization': 'Basic ' + new Buffer(username + ':' + passw).toString('base64')
           }
        };

        https.get(options, (res) => {
          if (verbose) console.log('statusCode:', res.statusCode);
          if (verbose) console.log('headers:', res.headers);

          var body = "";
          res.on('data', function(data) {
            body += data;
          });
          res.on('end', function() {
            //here we have the full response, html or json object
            console.log("Received message: " + body);

            if (!useEvent) {
              updateDeviceTwin(body);
            }
            else {
              var message = new Message(body);
      //        message.properties.add('temperatureAlert', (temperature > 30) ? 'true' : 'false');
              console.log("Sending message: " + message.getData());
              client.sendEvent(message, printResultFor('send'));
            }
          })
          res.on('error', function(e) {
            console.log("Got error: " + e.message);
          });
        });

    }, 1000); // every 10 seconds
  }
};

// Open the connection to your IoT Hub and start sending messages:

client.open(connectCallback);
