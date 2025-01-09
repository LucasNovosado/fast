const Parse = require('parse/node');

Parse.initialize(
  "PwFPSbEQmNUgal5GY97iPdVHNQ3clOVoFO5BMa63", // Application ID
  "o4fdrs27lufsPykgFRdGDDopDNPC7DHm5zeeazns"  // JavaScript Key
);

Parse.serverURL = 'https://parseapi.back4app.com';

module.exports = Parse;