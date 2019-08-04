const Message = require('./Message');

function Server(application)
{
    this.application = application;

    this.messageManager = Message.createUniqueServerWideMessage();
}
Server.prototype.save = function() {
    return {
        messageManager: this.messageManager.save()
    };
}
Server.prototype.load = function(obj, ctx) {
    this.messageManager.load(obj.messageManager, ctx);
}
Server.prototype.getMessage = function(channel) {
    return this.messageManager.getMessage(channel);
}
Server.prototype.setChannel = function(channel) {
    this.messageManager.getMessage(channel);
}
Server.prototype.getChannel = function() {
    return this.messageManager.getChannel();
}
Server.prototype.getGuild = function() {
    return this.messageManager.getGuild();
}
Server.prototype.update = function() {
}

module.exports = Server;
