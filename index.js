const moment = require('moment-timezone');
const fs = require('fs');

const app = require('express').createServer();
const io = require('socket.io').listen(app);

moment.locale('fr')

process.env = fs.existsSync('./env.json') ? JSON.parse(fs.readFileSync('./env.json')) : process.env;

const { initialize } = require('./src/globals');
const Bot = require('./src/Bot');

const bot = new Bot({
    token: process.env.TOKEN
});
bot.debug = fs.existsSync('./env.json');

console.log('Debug mode:', bot.debug ? 'on' : 'off');

const socket = io.listen(process.env.PORT);

initialize(bot);

bot.start();
