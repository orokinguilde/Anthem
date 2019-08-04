const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

function BigBrowserV2()
{ }

BigBrowserV2.prototype.getServers = function()
{
    if(!this.servers)
        this.servers = {};
    
    return this.servers;
}

BigBrowserV2.prototype.getServer = function(guild)
{
    const servers = this.getServers();
    const now = Date.now();

    const serverId = guild.id;

    let server = servers[serverId];
    if(!server)
    {
        server = {
            id: serverId,
            name: guild.name,
            createDate: now,
            users: {},
            currentDayOfTheWeek: new Date().getDay()
        };

        servers[serverId] = server;
    }
    
    return server;
}

BigBrowserV2.prototype.getUserVoiceExp = function(user)
{
    const score30minutes = user.stats ? user.stats.totalVoiceTimeMs / (1000 * 60 * 30) : 0;
    return score30minutes;
}

BigBrowserV2.prototype.getUserTextExp = function(user)
{
    const score500chars = user.stats ? user.stats.totalTextSize / 500 : 0;
    return score500chars;
}

BigBrowserV2.prototype.getUserExp = function(user)
{
    const voiceScore = this.getUserVoiceExp(user);
    const textScore = this.getUserTextExp(user);

    return voiceScore + textScore;
}

BigBrowserV2.prototype.getUserRanking = function(user, server)
{
    const users = this.getSortedUsers(server).reverse();
    const len = users.length;

    let index;
    for(index = 0; index < len; ++index)
    {
        if(users[index].id == user.id)
            break;
    }
    
    return {
        index: index,
        total: len
    }
}

BigBrowserV2.prototype.ranks = {};

let ranks = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ranks.json')).toString());
ranks = ranks.sort((a, b) => a.level - b.level);
for(const rank of ranks)
{
    rank.roleRegex = new RegExp('[^a-zA-Z0-9\\s]\\s*' + rank.role.replace(/:.+:/img, '').trim() + '$');
    BigBrowserV2.prototype.ranks[rank.level] = rank;
}

let index = -1;
let lastRank = undefined;
for(const rankStart in BigBrowserV2.prototype.ranks)
{
    const rank = BigBrowserV2.prototype.ranks[rankStart];
    rank.start = rankStart;
    rank.index = ++index;

    if(lastRank)
        lastRank.end = rank.start;

    lastRank = rank;
}

BigBrowserV2.prototype.updateUserRoles = function(member)
{
    const user = this.getUser(member);
    const rank = this.getUserRank(user);
    const currentRank = rank.currentRank;

    const hasCurrentRole = member.roles.some((role) => role.name === currentRank.role);

    if(!hasCurrentRole)
    {
        const roleToAdd = member.guild.roles.filter((role) => currentRank.roleRegex.test(role.name)).array()[0];

        if(roleToAdd && user.rankRoleId !== roleToAdd.id)
        {
            user.rankRoleId = roleToAdd.id;
            member.addRole(roleToAdd).then(() => {
                const rolesToRemove = [];
                for(const rankId in this.ranks)
                {
                    const rank = this.ranks[rankId];

                    if(rank.role !== currentRank.role)
                    {
                        const roles = member.roles.filter((role) => rank.roleRegex.test(role.name)).array();

                        for(const role of roles)
                            rolesToRemove.push(role);
                    }
                }

                if(rolesToRemove.length > 0)
                    member.removeRoles(rolesToRemove);
            }).catch(() => {
                console.error(`Could not add the rank role ${roleToAdd.name} to ${member.nickname || member.displayName}`);
                user.rankRoleId = undefined;
            })
        }
    }
}

BigBrowserV2.prototype.getUserRank = function(user, exp)
{
    if(exp === undefined)
        exp = this.getUserExp(user);

    const ranks = this.ranks;

    let lastMatchingRank = ranks[0];
    let nextRank = undefined;
    for(const rankStart in ranks)
    {
        const rank = ranks[rankStart];

        if(exp >= rankStart)
        {
            lastMatchingRank = rank;
        }
        else if(!nextRank)
        {
            nextRank = ranks[rankStart];
            break;
        }
    }

    if(nextRank === lastMatchingRank)
        nextRank = undefined;

    const expFromCurrentToNextRank = nextRank ? nextRank.start - lastMatchingRank.start : 0;
    const expLeftToNextRank = nextRank ? nextRank.start - exp : 0;
    const expLeftToNextRankPercent = nextRank ? expLeftToNextRank / expFromCurrentToNextRank : 1;

    return {
        exp: exp,
        currentRank: lastMatchingRank,
        nextRank: nextRank,
        expInCurrentRank: exp - lastMatchingRank.start,
        expFromCurrentToNextRank: expFromCurrentToNextRank,
        expLeftToNextRank: expLeftToNextRank,
        expLeftToNextRankPercent: expLeftToNextRankPercent,
        currentExpPercentToNextRank: 1 - expLeftToNextRankPercent
    };
}

BigBrowserV2.prototype.deleteUser = function(member)
{
    const id = member.id;
    const server = this.getServer(member.guild);

    if(!server.users)
        server.users = {};

    delete server.users[id];
}

BigBrowserV2.prototype.deleteServer = function(guild)
{
    const servers = this.getServers();

    delete servers[guild.id];
}

BigBrowserV2.prototype.getUser = function(member)
{
    const now = Date.now();

    const id = member.id;
    const server = this.getServer(member.guild);

    if(!server.users)
        server.users = {};

    let user = server.users[id];
    if(!user)
    {
        user = {
            id: id,
            createDate: now
        };
        server.users[id] = user;
    }

    if(!user.day)
        user.day = {};
    if(!user.week)
        user.week = {};

    const initUser = (user) => {
        user.lastUpdate = now;
        user.displayName = member.displayName;
        user.name = member.nickname;

        if(member.bot !== undefined)
            user.isBot = member.bot;
        if(member.user && member.user.bot !== undefined)
            user.isBot = member.user.bot;
        
        if(!user.stats)
        {
            user.stats = {
                lastVocalDate: undefined,
                totalVoiceTimeMs: 0,
                nbTextMessages: 0,
                nbTextMessagesWithDuplicates: 0,
                totalTextSize: 0,
                totalTextSizeWithDuplicates: 0,
                lastTextContent: undefined,
                lastTextDate: undefined,
                lastNotDuplicateTextDate: undefined,
                wasVoicingLastTick: false
            };
        }

        if(!user.joinedTimestamp)
            user.joinedTimestamp = member.joinedTimestamp;

        if(member.roles)
            user.roles = member.roles.array().map((role) => role.name);

        if(member.roles)
            user.isWeird = member.roles.array().some((role) => role.name === 'EN phase de test' || role.name === 'Tenno') && !user.stats.totalVoiceTimeMs;

        const zero = (name) => {
            if(user.stats[name] === undefined)
                user.stats[name] = 0;
        }
        
        zero('totalAnthemDiscordTimeMs');
        zero('totalAnthemDiscordTimeMsNot');
        zero('totalAnthemDiscordTimeMsUndefined');
    };

    initUser(user);
    initUser(user.day);
    initUser(user.week);

    return user;
}

BigBrowserV2.prototype.save = function()
{
    return {
        servers: this.getServers()
    };
}
BigBrowserV2.prototype.load = function(obj, ctx) {
    this.servers = obj.servers || obj;
}

BigBrowserV2.prototype.initWithV1Data = function(servers)
{
    var now = Date.now();

    for(const serverId in servers)
    {
        const oldServer = servers[serverId];
        const server = this.getServer({
            id: oldServer.__id__ || serverId,
            name: oldServer.__name__
        });

        if(!server.users)
            server.users = {};

        for(const userId in oldServer)
        {
            if(userId !== '__name__' && userId !== '__id__')
            {
                const oldUser = oldServer[userId];

                const user = {
                    displayName: oldUser.__name__,
                    isBot: false,
                    id: userId,
                    createDate: now,
                    lastUpdate: now,
                    v1: {
                        lastVocalDate: oldUser.vocalActivity_date,
                        totalVoiceTimeMs: (oldUser.vocalActivity * 500) / (1 / (30 * 60 * 2)),
                        nbTextMessages: oldUser.textActivity * 2,
                        nbTextMessagesWithDuplicates: oldUser.textActivity * 2,
                        totalTextSize: oldUser.textActivity * 2 * 18,
                        totalTextSizeWithDuplicates: oldUser.textActivity * 2 * 18,
                        lastTextContent: undefined,
                        lastTextDate: oldUser.textActivity_date,
                        lastNotDuplicateTextDate: oldUser.textActivity_date,
                        wasVoicingLastTick: false,
                        totalAnthemDiscordTimeMs: oldUser.anthemActivity ? oldUser.anthemActivity * 500 : undefined,
                        lastAnthemDiscordDate: oldUser.anthemActivity_date ? oldUser.anthemActivity_date : undefined,
                        totalAnthemDiscordTimeMsUndefined: oldUser.anthemActivity_total ? oldUser.anthemActivity_total * 500 : undefined,
                        lastAnthemDiscordDateUndefined: oldUser.anthemActivity_date ? oldUser.anthemActivity_date : undefined
                    }
                };

                user.stats = JSON.parse(JSON.stringify(user.v1));
                user.v1.oldServerId = serverId;
                user.v1.oldUser = oldUser;

                server.users[userId] = user;
            }
        }
    }
}

BigBrowserV2.prototype.updateServer = async function(guild)
{
    const now = Date.now();

    const server = this.getServer(guild);

    let nbUsers = server.users.length + 1;
    const onDone = () => {
        --nbUsers;

        if(nbUsers === 0)
        {
            this.save();
        }
    }

    for(const userId in server.users)
    {
        const user = server.users[userId];

        if(!user.removedDate)
        {
            guild.fetchMember(userId).then(() => {
                onDone();
            }).catch(() => {
                user.removedDate = Date.now();

                onDone();
            })
        }
    }

    guild.members.forEach((member) => {

        /*
        if(member.displayName !== 'Akamelia ♡')
            return;*/
        const user = this.getUser(member);
        let updated = false;

        const updateUser = (user) => {
            let isInAnthem = undefined;
            if(member.user.presence && member.user.presence.game && member.user.presence.game.name)
                isInAnthem = member.user.presence.game.name.toLowerCase() === 'anthem';

            if(isInAnthem !== undefined)
            {
                if(isInAnthem)
                {
                    if(!user.stats.wasAnthemDiscordLastTick)
                    {
                        user.stats.wasAnthemDiscordLastTick = true;
                    }
                    else
                    {
                        user.stats.totalAnthemDiscordTimeMs += now - user.stats.lastAnthemDiscordDate;
                    }
                    
                    user.stats.lastAnthemDiscordDate = now;
                    user.stats.wasAnthemDiscordLastTickNot = false;
                }
                else
                {
                    if(!user.stats.wasAnthemDiscordLastTickNot)
                    {
                        user.stats.wasAnthemDiscordLastTickNot = true;
                    }
                    else
                    {
                        user.stats.totalAnthemDiscordTimeMsNot += now - user.stats.lastAnthemDiscordDateNot;
                    }
                    
                    user.stats.lastAnthemDiscordDateNot = now;
                    user.stats.wasAnthemDiscordLastTick = false;
                }
                
                user.stats.wasAnthemDiscordLastTickUndefined = false;
            }
            else
            {
                if(!user.stats.wasAnthemDiscordLastTickUndefined)
                {
                    user.stats.wasAnthemDiscordLastTickUndefined = true;
                }
                else
                {
                    user.stats.totalAnthemDiscordTimeMsUndefined += now - user.stats.lastAnthemDiscordDateUndefined;
                }
                
                user.stats.lastAnthemDiscordDateUndefined = now;
                user.stats.wasAnthemDiscordLastTickNot = false;
                user.stats.wasAnthemDiscordLastTick = false;
            }
            
            if(member.voiceChannelID && !member.deaf && member.voiceChannelID !== guild.afkChannelID)
            {
                if(!user.stats.wasVoicingLastTick)
                {
                    user.stats.wasVoicingLastTick = true;
                }
                else
                {
                    user.stats.totalVoiceTimeMs += now - user.stats.lastVocalDate;
                    updated = true;
                }
                
                user.stats.lastVocalDate = now;
            }
            else
            {
                user.stats.wasVoicingLastTick = false;
            }
        };

        updateUser(user);
        updateUser(user.day);
        updateUser(user.week);
        
        if(updated)
            this.updateUserRoles(member);
    })

    await this.updateTimeLimitedMetrics(guild);

    onDone();
}

BigBrowserV2.prototype.updateUserText = function(message)
{
    const content = message.content;

    if(content)
    {
        const member = message.member;

        const user = this.getUser(member);
        const now = Date.now();

        const updateUser = (user) => {
            if(user.stats.lastTextContent !== content)
            {
                ++user.stats.nbTextMessages;
                user.stats.totalTextSize += message.content.length;
                user.stats.lastNotDuplicateTextDate = now;
            }

            user.stats.lastTextContent = content;
            ++user.stats.nbTextMessagesWithDuplicates;
            user.stats.totalTextSizeWithDuplicates += message.content.length;
            user.stats.lastTextDate = now;
        };

        updateUser(user);
        updateUser(user.day);
        updateUser(user.week);
        
        this.updateUserRoles(member);
    }
}

BigBrowserV2.prototype.updateTimeLimitedMetrics = function(guild)
{
    const server = this.getServer(guild);

    if(server && server.tracking !== false)
    {
        const currentDayOfTheWeek = new Date().getDay();

        if(server.lastDayOfTheWeek === undefined || server.lastDayOfTheWeek !== currentDayOfTheWeek)
        {
            console.log('Processing best users');

            const findBestAndErase = (users, propName) => {
                let maxValue = null;
                let maxUser;

                for(const userId in users)
                {
                    const user = users[userId];
                    const userData = user[propName];
                    if(!user.isBot && userData)
                    {
                        const value = this.getUserExp(userData);
                        delete user[propName];

                        if(maxValue === null || maxValue < value)
                        {
                            maxValue = value;
                            maxUser = user;
                        }
                    }
                }

                if(maxValue === null)
                {
                    return undefined;
                }
                else
                {
                    return {
                        user: maxUser,
                        value: maxValue
                    };
                }
            };

            const setUniqueRoleToUser = async (userObj, roleRegex) => {
                const role = guild.roles.filter((role) => roleRegex.test(role.name)).array()[0];
        
                if(role)
                {
                    await Promise.all(
                        guild
                        .members
                        .filter((member) => member.roles.has(role.id))
                        .map((member) => member.removeRole(role))
                    );

                    const member = guild.members.filter((member) => member.id === userObj.id).first();
                    
                    if(member)
                    {
                        console.error(`Member ${userObj.id} / ${userObj.displayName} is the best user !`);

                        await member.addRole(role);
                    }
                    else
                    {
                        console.error(`Could not find the member ${userObj.id} / ${userObj.displayName} to apply to the role of the best user`);
                    }
                }
                else
                {
                    console.error(`Could not find the role ${role} to apply to the best user ${userObj.id} / ${userObj.displayName}`);
                }
            }

            const dayBestUser = findBestAndErase(server.users, 'day');
            if(dayBestUser)
            {
                setUniqueRoleToUser(dayBestUser.user, /LégendaryDay/img);
            }

            if(currentDayOfTheWeek === 1)
            {
                const weekBestUser = findBestAndErase(server.users, 'week');
                if(weekBestUser)
                {
                    setUniqueRoleToUser(weekBestUser.user, /LégendaryWeek/img);
                }

                server.weekBestUsers = { };
            }
            
            server.lastDayOfTheWeek = currentDayOfTheWeek;
        }
    }
}

BigBrowserV2.prototype.setTrackingUser = function(member, isTracking)
{
    const user = this.getUser(member);

    if(isTracking)
    {
        if(user && user.tracking === false)
            this.deleteUser(member);
    }
    else
    {
        if(user)
        {
            for(const propName in user)
                delete user[propName];
            
            user.tracking = false;
        }
    }
}

BigBrowserV2.prototype.setTrackingServer = function(guild, isTracking)
{
    const server = this.getServer(guild);

    if(isTracking)
    {
        if(server && server.tracking === false)
            this.deleteServer(guild);
    }
    else
    {
        if(server)
        {
            for(const propName in server)
                delete server[propName];
            
            server.tracking = false;
        }
    }
}

BigBrowserV2.prototype.getServersText = function(servers, withBOM) {
    let result = '';
    let isFirst = true;

    for(let server of servers)
    {
        if(!isFirst)
            result += '\r\n';

        isFirst = false;

        if(server.constructor && server.constructor.name === 'Guild')
            server = this.getServer(server);

        if(server.tracking !== false)
        {
            const body = this.getServerText(server);
            const firstLine = body.split(/\r?\n/img, 2)[1];

            let header = '';
            let nbCharsLeft = firstLine.length - (server.name.length + 4) * 3 - 4 * 2;
            for(let i = 0; i < 4; ++i)
                header += '=';
            header += `[ ${server.name} ]`;
            for(let i = 0; i < nbCharsLeft / 2; ++i)
                header += '=';
            header += `[ ${server.name} ]`;
            for(let i = 0; i < nbCharsLeft / 2; ++i)
                header += '=';
            header += `[ ${server.name} ]`;
            for(let i = 0; i < 4; ++i)
                header += '=';

            let footer = '';
            while(footer.length < firstLine.length)
                footer += '=';

            result += `${header}\r\n`;
            result += body;
            result += `\r\n${footer}\r\n`;
        }
    }

    return result;
}

BigBrowserV2.prototype.getServersCSV = function(servers, withBOM) {
    let result = withBOM ? decodeURIComponent('%EF%BB%BF') : '';
    let isFirst = true;

    for(let server of servers)
    {
        if(!isFirst)
            result += '\r\n\r\n';

        isFirst = false;

        if(server.constructor && server.constructor.name === 'Guild')
            server = this.getServer(server);

        if(server.tracking !== false)
        {
            result += `================================;${server.name}\r\n`;
            result += this.getServerCSV(server, false);
        }
    }

    return result;
}

BigBrowserV2.prototype.getServersMarkDown = function(servers) {
    let result = '';
    let isFirst = true;

    for(let server of servers)
    {
        if(!isFirst)
            result += '\r\n\r\n';

        isFirst = false;

        if(server.constructor && server.constructor.name === 'Guild')
            server = this.getServer(server);

        if(server.tracking !== false)
        {
            result += `**${server.name}**\r\n`;
            result += this.getServerMarkDown(server);
        }
    }

    return result;
}

BigBrowserV2.prototype.getServerCSV = function(server, withBOM) {
    
    const formatter = {
        row: function(/* arguments... */) {
            const args = [];
    
            for(const arg of arguments)
            {
                if(arg === undefined || arg === null)
                    args.push('?');
                else
                    args.push(arg.toString());
            }
            
            return `${args.join(';')}\r\n`;
        }
    };

    formatter.noRow = formatter.row;

    const text = this.getServerFormatted(server, formatter);

    return (withBOM ? decodeURIComponent('%EF%BB%BF') : '') + text;
}

BigBrowserV2.prototype.getServerMarkDown = function(server) {

    let nbCols = undefined;

    const formatter = {
        headerEnd: function() {
            let text = '';

            for(let i = 0; i < nbCols; ++i)
                text += '|-';

            return `${text}|\r\n`;
        },
        row: function(/* arguments... */) {
            if(nbCols === undefined)
                nbCols = arguments.length;
            
            const args = [];

            for(const arg of arguments)
            {
                if(arg === undefined || arg === null)
                    args.push('?');
                else
                    args.push(arg.toString());
            }
            
            return `| ${args.join(' | ')} |\r\n`;
        },
        noRow: function(/* arguments... */) {
            const args = [];
    
            for(const arg of arguments)
            {
                if(arg === undefined || arg === null)
                    args.push('?');
                else
                    args.push(arg.toString());
            }
            
            return `| ${args.join(' ')} |\r\n`;
        }
    };

    return this.getServerFormatted(server, formatter);
}

BigBrowserV2.prototype.getServerText = function(server) {

    const pad = (value, nb, char) => {
        value = value === undefined || value === null ? '' : value.toString();
        nb = nb || 0;
        
        if(char === undefined)
            char = ' ';

        while(value.length < nb)
            value = `${char}${value}`;

        return value;
    };

    let pads = [
        35, 35,  0,  0, 20,
        20,  0,  0,  0,  0,
         0,  0,  0,  0,  0,
         0,  0,  0,  0,  0,
         0,  0,  0,  0,  0,
         0,  0,  0,  0,  0,
    ];

    let isFirstRow = true;
    
    const formatter = {
        headerEnd: function() {
            let str = '';

            for(const padding of pads)
            {
                if(padding)
                {
                    str += pad('', padding + 3, '=');
                }
            }
            
            return str.substring(0, str.length - 3) + '\r\n';
        },
        row: function(/* arguments... */) {
            const args = [];
            let index = 0;
    
            for(const arg of arguments)
            {
                if(arg === undefined || arg === null)
                    args.push(pad('?', pads[index]));
                else
                    args.push(pad(arg.toString(), pads[index]));

                ++index;
            }

            if(isFirstRow)
            {
                isFirstRow = false;

                pads = args.map((str, i) => {
                    const pad = pads[i];
                    if(!pad)
                        return str.length;
                    else
                        return pad;
                })
            }
            
            return `${args.join(' | ')}\r\n`;
        },
        noRow: function(/* arguments... */) {
            const args = [];
    
            for(const arg of arguments)
            {
                if(arg === undefined || arg === null)
                    args.push('?');
                else
                    args.push(arg.toString());
            }
            
            return `${args.join(' ')}\r\n`;
        }
    };

    return this.getServerFormatted(server, formatter);
}

BigBrowserV2.prototype.getSortedUsers = function(server) {
    if(server.constructor && server.constructor.name === 'Guild')
        server = this.getServer(server);

    const users = Object.keys(server.users)
        .map(id => server.users[id])
        .filter(user => !user.removedDate)
        .filter(user => user.tracking !== false)
        .sort((u1, u2) => {
            const u1exp = this.getUserExp(u1);
            const u2exp = this.getUserExp(u2);
            
            return u1exp > u2exp ? 1 : u1exp === u2exp ? 0 : -1;
        });

    return users;
}

BigBrowserV2.prototype.getServerFormatted = function(server, formatter) {
    let text = '';
    
    formatter.asDate = formatter.asDate || ((date, includeTime) => {
        let dateString;
        let dateObj = moment(date).tz('Europe/Paris');

        if(includeTime === false)
            dateString = dateObj.format('DD/MM/YYYY');
        else
            dateString = dateObj.format('DD/MM/YYYY HH:mm');

        return dateString;
    });

    formatter.asPercent = formatter.asPercent || ((value) => {
        value = value || 0;
        return (value * 100).toString();
    });
    
    formatter.asInteger = formatter.asInteger || ((value) => {
        value = value || 0;
        value = Math.trunc(value);
        return value.toString();
    });

    formatter.asFloat = formatter.asFloat || ((value) => {
        value = value || 0;
        return value.toString();
    });

    formatter.asBool = formatter.asBool || ((value) => {
        return value ? '1' : '0';
    });

    formatter.asString = formatter.asString || ((value) => {
        return value !== undefined && value !== null ? value.toString() : ''
    });

    const users = this.getSortedUsers(server);

    if(formatter.onStart)
        formatter.onStart(users);

    if(users.length === 0)
    {
        text = formatter.noRow();
    }
    else
    {
        if(formatter.headerStart)
            text += formatter.headerStart();

        text += formatter.row(
            formatter.asString('Utilisateur (nom affiché)'),
            formatter.asString('Utilisateur (compte)'),
            formatter.asString('Est un bot ?'),

            formatter.asString('Expérience totale (exp)'),
            formatter.asString('Rang'),
            formatter.asString('Prochain rang'),
            formatter.asString('Progression vers le prochain rang (%)'),
            formatter.asString('Expérience restante avant prochain rang (exp)'),
            formatter.asString('Expérience restante avant prochain rang (%)'),

            formatter.asString('Expérience vocale (exp)'),
            formatter.asString('Temps total en vocal (ms)'),
            formatter.asString('Dernière mise à jour exp vocale'),

            formatter.asString('Expérience écrite (exp)'),
            formatter.asString('Dernière mise à jour exp écrite'),

            formatter.asString('Nb messages textes'),
            formatter.asString('Taille totale des messages textes'),
            formatter.asString('Nb messages textes (avec duplicatas)'),
            formatter.asString('Taille totale des messages textes (avec duplicatas)'),
            
            formatter.asString('Temps total sur Anthem (%)'),

            formatter.asString('Temps total sur Anthem (ms)'),
            formatter.asString('Dernière connection à Anthem'),

            formatter.asString('Temps total sur autre chose que Anthem (ms)'),
            formatter.asString('Dernier jeu autre que Anthem'),

            formatter.asString('Temps total sur aucune application (ms)'),
            formatter.asString('Dernière connection à aucune application'),

            formatter.asString('Date de join'),
            formatter.asString('Roles'),

            formatter.asString('Inactif ?')
        );

        if(formatter.headerEnd)
            text += formatter.headerEnd();
        
        if(formatter.bodyStart)
            text += formatter.bodyStart();

        for(const user of users)
        {
            const exp = this.getUserExp(user);
            const rank = this.getUserRank(user, exp);

            text += formatter.row(
                formatter.asString(user.displayName),
                formatter.asString(user.name),
                formatter.asBool(user.isBot),

                formatter.asFloat(exp),
                formatter.asString(rank.currentRank ? rank.currentRank.name : undefined),
                formatter.asString(rank.nextRank ? rank.nextRank.name : undefined),
                formatter.asPercent(rank.currentExpPercentToNextRank),
                formatter.asFloat(rank.expLeftToNextRank),
                formatter.asPercent(rank.expLeftToNextRankPercent),

                formatter.asFloat(this.getUserVoiceExp(user)),
                formatter.asInteger(user.stats.totalVoiceTimeMs),
                formatter.asDate(user.stats.lastVocalDate),

                formatter.asFloat(this.getUserTextExp(user)),
                formatter.asDate(user.stats.lastTextDate),

                formatter.asInteger(user.stats.nbTextMessages),
                formatter.asInteger(user.stats.totalTextSize),
                formatter.asInteger(user.stats.nbTextMessagesWithDuplicates),
                formatter.asInteger(user.stats.totalTextSizeWithDuplicates),

                !user.stats.lastAnthemDiscordDate && !user.stats.lastAnthemDiscordDateNot
                    ? formatter.asString('N/A')
                    : formatter.asPercent(user.stats.totalAnthemDiscordTimeMs / (user.stats.totalAnthemDiscordTimeMs + user.stats.totalAnthemDiscordTimeMsNot + user.stats.totalAnthemDiscordTimeMsUndefined)),

                formatter.asInteger(user.stats.totalAnthemDiscordTimeMs),
                formatter.asDate(user.stats.lastAnthemDiscordDate),

                formatter.asInteger(user.stats.totalAnthemDiscordTimeMsNot),
                formatter.asDate(user.stats.lastAnthemDiscordDateNot),

                formatter.asInteger(user.stats.totalAnthemDiscordTimeMsUndefined),
                formatter.asDate(user.stats.lastAnthemDiscordDateUndefined),

                formatter.asDate(user.joinedTimestamp),
                formatter.asString((user.roles || []).join(' / ')),

                formatter.asBool(user.isWeird || false)
            );
        }

        if(formatter.bodyEnd)
            text += formatter.bodyEnd();
    }

    return text.trimRight();
}

module.exports = BigBrowserV2;
