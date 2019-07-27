const moment = require('moment-timezone');
const fs = require('fs');

moment.locale('fr')

process.env = fs.existsSync('./env.json') ? JSON.parse(fs.readFileSync('./env.json')) : process.env;

const { initialize } = require('./src/globals');
const Bot = require('./src/Bot');

const bot = new Bot({
    token: process.env.TOKEN
});
bot.debug = fs.existsSync('./env.json');

console.log('Debug mode:', bot.debug ? 'on' : 'off');

//const socket = require('socket.io')(process.env.PORT);

initialize(bot);

bot.start();
