const {
    Client,
    IntentsBitField,
    GatewayIntentBits,
    Collection,
    SlashCommandBuilder,
    CommandInteraction,
} = require("discord.js")
const {
    REST
} = require("@discordjs/rest")
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







const palavrasChave = ["banheiro", "corno", "cabeçuda", "tiltado", 'bocó', 'racionais'];

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
    const canalMusica = process.env.canalMusica
    console.log(canalMusica)
    if (message.channel.id === canalMusica) {
        const responder = (message) => {
            try {
                let palavrasEncontradas = identificarPalavrasChave(message.content);
                if (palavrasEncontradas.includes("banheiro")) {
                    let resposta = "cagão";

                    message.react("💩");
                    message.reply(`${message.author.username} ${resposta} 💩`);
                }

                if (palavrasEncontradas.includes("racionais")) {
                    message.channel.send(
                        "Proibido tocar esse tipo de música nesse discord 🚫"
                    );

                    message.react("🚫");
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

const puppeteer = require('puppeteer')
const stream = require('stream')
const ffmpeg = require('ffmpeg-static');
const ytdl = require('ytdl-core');
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


            if (message.member.voice.channel.id !== null || message.member.voice.channel.guild.id !== null) {

                const connection = joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: message.member.voice.channel.guild.id,
                    adapterCreator: message.member.voice.channel.guild.voiceAdapterCreator,
                });
                const audioBuffer = await textToSpeech(text);
                playAudio(connection, audioBuffer)
                async function playAudio(connection, url) {
                    try {
                        const stream = ytdl(url, {
                            filter: 'audioonly'
                        });
                        const convertedStream = stream.pipe(
                            ffmpeg({
                                args: [
                                    '-ss', '0',
                                    '-i', '-',
                                    '-f', 's16le',
                                    '-ar', '48000',
                                    '-ac', '2'
                                ]
                            })
                        );
                        const dispatcher = connection.play(convertedStream, {
                            type: 'converted'
                        });
                        dispatcher.on('finish', () => {
                            console.log('Terminou de tocar o áudio.');
                            connection.disconnect();
                        });
                    } catch (err) {
                        console.error(err);
                        connection.disconnect();
                    }







                }





            }

        }
    }




    async function textToSpeech(text) {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();




        // Navega até a página Text to Speech
        await page.goto('https://caiommendes.github.io/tts-teste/');


        const audioUrl = await page.evaluate((text) => {
            return new Promise((resolve, reject) => {
                const synth = window.speechSynthesis;
                const utterance = new SpeechSynthesisUtterance(text);
                const audioChunks = [];

                utterance.addEventListener('end', () => {
                    const blob = new Blob(audioChunks);
                    const url = URL.createObjectURL(blob);
                    resolve(url);
                });

                utterance.addEventListener('error', () => {
                    reject(new Error('Failed to generate speech'));
                });

                synth.speak(utterance);

                utterance.onaudioprocess = (event) => {
                    const channel = event.outputBuffer.getChannelData(0);
                    const float32Array = new Float32Array(channel);

                    const int16Array = new Int16Array(float32Array.length);
                    for (let i = 0; i < float32Array.length; i++) {
                        int16Array[i] = Math.floor(float32Array[i] * 32767);
                    }

                    const buffer = new ArrayBuffer(int16Array.length * 2);
                    const view = new DataView(buffer);

                    int16Array.forEach((value, index) => {
                        view.setInt16(index * 2, value, true);
                    });

                    audioChunks.push(buffer);
                };
            });
        }, text);

        // Fecha o navegador
        await browser.close();

        return audioUrl;
        // Faça algo com o buffer de áudio (como enviá-lo para um bot no Discord)
    }




    async function createAudioBuffer(audioBuffer) {
        const {
            Readable
        } = require('stream');
        const bufferStream = new Readable();
        bufferStream.push(Buffer.from(audioBuffer));
        bufferStream.push(null);
        return bufferStream;
    }
})



client.login(
    process.env.TOKEN
);