'use strict';

var EventHubClient = require('azure-event-hubs').Client;

var connectionString = 'HostName=michaelIOTHub2.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=XbdYIDL2Se+y9R9pGB7EknjgjhRG+2LiivAQnpgy3ug=';

var printError = function (err) {
  console.log(err.message);
};

var printMessage = function (message) {
  console.log('Message received: ');
  console.log(JSON.stringify(message.body));
  console.log('');
};

var client = EventHubClient.fromConnectionString(connectionString);
client.open()
    .then(client.getPartitionIds.bind(client))
    .then(function (partitionIds) {
        return partitionIds.map(function (partitionId) {
            return client.createReceiver('$Default', partitionId, { 'startAfterTime' : Date.now()}).then(function(receiver) {
                console.log('Created partition receiver: ' + partitionId)
                receiver.on('errorReceived', printError);
                receiver.on('message', printMessage);
            });
        });
    })
    .catch(printError);
