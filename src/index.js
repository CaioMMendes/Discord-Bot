const {
    Client,
    IntentsBitField,
    GatewayIntentBits,
    Collection,
    SlashCommandBuilder,
    CommandInteraction,
} = require("discord.js");
const {
    REST
} = require("@discordjs/rest");
const https = require('https')
const {
    Routes
} = require("discord-api-types/v9");
const {
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel
} = require('@discordjs/voice');
const ping = require("./commands/ping");
const dotenv = require('dotenv')
dotenv.config();
const path = require("path");
const fs = require("fs");
const prefix = "/";
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildIntegrations,
        IntentsBitField.Flags.GuildEmojisAndStickers,
        IntentsBitField.Flags.GuildMessageReactions,
    ],
});
client.on("ready", (e) => {
    console.log(`😁 ${e.user.tag} is online`);
});

const commands = [require("./commands/ping")];

const rest = new REST({
    version: "9",
}).setToken(
    process.env.TOKEN
);

const clientId = process.env.clientId
const guildId = process.env.guildId
client.once("ready", async () => {
    console.log("Bot está online!");

    try {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commands.map((command) => command.data.toJSON()),
        });

        console.log("Comandos registrados com sucesso!");
    } catch (error) {
        console.error(error);
    }
});



client.on('ready', () => {
    console.log('Bot está online!');


    client.application.commands.create({

        name: 'pituim-oi',
        description: 'Te retorna um oi',

    }).then(console.log('first')).catch(console.error)
});


client.on('interactionCreate', interaction => {
    if (!interaction.isCommand()) return;

    const {
        commandName
    } = interaction;

    if (commandName === 'pituim-oi') {
        // Respondendo ao comando
        interaction.reply('Oi!');
    }
});







const palavrasChave = ["banheiro", "corno", "cabeçuda", "tiltado", 'bocó'];

function identificarPalavrasChave(texto) {
    let palavras = texto.toLowerCase().split(" ");

    let palavrasEncontradas = palavras.filter((palavra) =>
        palavrasChave.includes(palavra)
    );
    return palavrasEncontradas;
}

client.on("messageCreate", async (message) => {
    const canalTeste = process.env.canalTeste;
    const canalId = process.env.canalId
    const canalTesteBotCanalId = process.env.canalTesteBotCanalId
    if (message.channel.id === canalId) {
        const responder = (message) => {
            try {
                let palavrasEncontradas = identificarPalavrasChave(message.content);
                if (palavrasEncontradas.includes("banheiro")) {
                    let resposta = "cagão";

                    message.react("💩");
                    message.reply(`${message.author.username} ${resposta} 💩`);
                }
                if (palavrasEncontradas.includes("corno")) {
                    message.channel.send(
                        `${process.env.SLY}, estão falando de você aqui!`
                    );

                    message.react("🐂");
                }
                if (palavrasEncontradas.includes("cabeçuda")) {
                    message.channel.send(
                        `${process.env.LARISSA}, estão falando de você aqui!`
                    );
                }
                if (palavrasEncontradas.includes("tiltado")) {
                    message.channel.send(
                        `${process.env.WOLLIGAN}, estão falando de você aqui!`
                    );
                }
                if (palavrasEncontradas.includes("bocó")) {
                    message.channel.send(
                        `${process.env.ZEGOTINHA}, estão falando de você aqui!`
                    );
                }
            } catch (err) {
                console.log(err);
            }
        };
        responder(message);
    }
    if (message.channel.id === canalTesteBotCanalId) {




        // Verifica se a mensagem contém um comando para obter informações de um usuário
        if (message.content.startsWith('+pingPituim')) {
            // Obtém o ID do usuário a partir da mensagem
            const userId = message.content.split(' ')[1];
            // Obtém o objeto GuildMember correspondente ao ID do usuário
            const member = message.guild.members.cache.get(`${userId}`);
            message.guild.members.fetch(`${userId}`)
                .then(guildMember => {
                    // obtenha o ping em milissegundos usando a propriedade ping
                    const userPing = guildMember.ping;

                    // use o ping em uma mensagem
                    console.log(userPing)
                    return message.channel.send(`O ping do usuário é de ${userPing}ms.`);
                })
                .catch(console.error);

            // Acessa informações sobre o membro
            const username = member.user.username;
            const tag = member.user.tag;
            const joinDate = member.joinedAt;

            const roles = member.roles.cache.map(role => role.name).join(', ');
            console.log('userid:', userId)

            // Envie as informações de volta como uma mensagem
            return message.channel.send(`O usuário ${username}#${tag} tem um ping de ${ping}ms`);
        }












    }

});



client.on("messageCreate", async (message) => {
    const canalTesteBotCanalId = process.env.canalTesteBotCanalId;
    const prefixo = '+'
    if (message.channel.id === canalTesteBotCanalId) {
        if (!message.content.startsWith(prefixo) || message.author.bot) return;

        const args = message.content.slice(prefixo.length).trim().split(' ');
        const command = args.shift().toLowerCase();
        console.log(command)
        if (command === 'say') {

            const text = args.join(' ');




            const player = createAudioPlayer();
            const connection = joinVoiceChannel({
                channelId: message.member.voice.channelId,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
            connection.subscribe(player);










        }
    }
})
client.login(
    process.env.TOKEN
);