const Discord = require('discord.js')
const bot = new Discord.Client()

// Fonctions du programme du bot Discord

function random(min, max){
     min = Math.ceil(1);
     max = Math.floor(4);
     randnum = Math.floor(Math.random() * (max - min +1)+ min);
 }

 function test(min, max){
     min = Math.ceil(1);
     max = Math.floor(21);
     randnum = Math.floor(Math.random() * (max - min +1)+ min);
 }

 function random3(min, max){
     min = Math.ceil(1);
     max = Math.floor(6);
     randnum = Math.floor(Math.random() * (max - min +1)+ min);
 }

  function random4(min, max){
     min = Math.ceil(1);
     max = Math.floor(2);
     randnum = Math.floor(Math.random() * (max - min +1)+ min);
 }

   function random5(min, max){
     min = Math.ceil(0);
     max = Math.floor(10);
     randnum = Math.floor(Math.random() * (max - min +1)+ min);
 }

    function randombj1(min, max){
     min = Math.ceil(3);
     max = Math.floor(21);
     randnum = Math.floor(Math.random() * (max - min +1)+ min);
 }

function randombj2(min, max){
     min = Math.ceil(6);
     max = Math.floor(21);
     randnum = Math.floor(Math.random() * (max - min +1)+ min);
 }

 function randombj3(min, max){
     min = Math.ceil(9);
     max = Math.floor(21);
     randnum = Math.floor(Math.random() * (max - min +1)+ min);
 }

 function randombj4(min, max){
     min = Math.ceil(12);
     max = Math.floor(21);
     randnum = Math.floor(Math.random() * (max - min +1)+ min);
 }

 function randombj5(min, max){
     min = Math.ceil(15);
     max = Math.floor(21);
     randnum = Math.floor(Math.random() * (max - min +1)+ min);
 }

 //Accueil et départ des membres et attribution d'un rôle

bot.on("guildMemberAdd", member => {
	let role = member.guild.roles.find("name", "Nouveaux")
	random()
	if (randnum ==1){
	member.guild.channels.find("name", "discussion").send(`1️ ➡️ :alegendary:  hey ! un ${member} sauvage apparaît. :alegendary:.`)
	}

	if (randnum ==2){
	member.guild.channels.find("name", "discussion").send(`2 ➡️ Bienvenue freelancer ${member} ! N'oublies pas de passer par #քrésentation et à utiliser le vocal de temps en temps pour discuter avec nous 😉.`)
	}

	if (randnum ==3){
	member.guild.channels.find("name", "discussion").send(`3 ➡️ salut ${member},! Tu gagnes le droit de te présenter sur #քrésentation et de venir fêter ça en vocal avec nous 😉.`)
	}

	if (randnum ==4){
	member.guild.channels.find("name", "discussion").send(`4 ➡️ :eyes:  ${member}, vient de se glisser dans le serveur. chuuut plus un bruit ! 😉.`)
	}
	member.addRole(role)
}) 

bot.on("guildMemberRemove", member => {
	random()
	if (randnum ==1){
	member.guild.channels.find("name", "départs").send(`1 ➡️ ${member} vient de nous quitter ! Bonne chance à lui pour le reste de son aventure 👋🏻.`)
	}

	if (randnum ==2){
	member.guild.channels.find("name", "départs").send(`2 ➡️ ${member} vient quitter le navire ! Puisse t'il ne jamais faire naufrage par la suite 👋🏻.`)
	}

	if (randnum ==3){
	member.guild.channels.find("name", "départs").send(`3 ➡️ ${member} vient de claquer la porte ! 1 de perdu, 10 de retrouvés 👋🏻.`)
	}

	if (randnum ==4){
	member.guild.channels.find("name", "départs").send(`4 ➡️ Patience est mère de vertus, ${member} à ragequit .`)
	}
}) 

bot.on("guildMemberAdd", member => {
	let role = member.guild.roles.find("name", "Sans licence")
	member.addRole(role)
}) 


bot.on('message', function(message) {
 if (message.content === '!serv') {
		let server_name = message.guild.name
		let server_size = message.guild.members.size
		let cdate = message.guild.CreatedAt
    	let mdate = message.member.joinedAt
    	let numero = message.guild.MemberCount
		message.channel.send('**Nom du serveur** : "' + server_name + '"' + '\n**Créé le** : ' + cdate + '\n**Membres inscrits** : ' + server_size + '\n\n**Rejoint le** : ' + mdate + '\n**Id** : ' + numero)
		user = message.member.user.tag
		console.log("\n\nL'utilisateur " + user + " a utilisé la commande !serv.")
	}
		if (message.content === '!servs') {
    	let nom = message.guild.name
    	let cdate = message.guild.CreatedAt
    	let mdate = message.member.joinedAt
    	let numero = message.guild.MemberCount
    	message.channel.send('Le serveur **' + nom + '** a été créé le **' + cdate + '**.' + '\nVous l"avez rejoint le **' + mdate + '** et en êtes ainsi le membre n°**' + numero + '**.')
	user = message.member.user.tag
	console.log("\n\nL'utilisateur " + user + " a utilisé la commande !servs.")
	}		
 })
