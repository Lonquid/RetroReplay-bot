require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const Poll = require('discord.js-poll').Poll;
const express = require('express');
const fs = require('fs');
const app = express();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

app.get('/ping', (req, res) => {
    res.send('Bot is alive!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

client.once('ready', () => {
    loadGameList();
    console.log(`Logged in as ${client.user.tag}!`);
});

const GAME_LIST_PATH = './games.json';
let suggestedGames = [];

const consoleAbbreviations = {
    'psx': 'PlayStation',
    'ps1': 'PlayStation',
    'playstation': 'PlayStation',
    'gba': 'Game Boy Advance',
    'gameboy advance': 'Game Boy Advance',
    'game boy advance': 'Game Boy Advance',
    'gbc': 'Game Boy Color',
    'gameboy color': 'Game Boy Color',
    'game boy color': 'Game Boy Color',
    'gb': 'Game Boy',
    'gameboy': 'Game Boy',
    'game boy': 'Game Boy',
    'game and watch': 'Game & Watch',
    'game & watch': 'Game & Watch',
    'snes': 'SNES',
    'super nintendo': 'SNES',
    'super nes': 'SNES',
    'nes': 'NES',
    'nintendo entertainment system': 'NES',
    'n64': 'Nintendo 64',
    'nintendo 64': 'Nintendo 64',
    'virtual boy': 'Virtual Boy',
    'genesis': 'Sega Genesis',
    'sega genesis': 'Sega Genesis',
    'megadrive': 'Sega Genesis',
    'mega drive': 'Sega Genesis',
    'master system': 'Master System',
    'sega cd': 'Sega CD',
    'saturn': 'Sega Saturn',
    'sega saturn': 'Sega Saturn',
    'game gear': 'Game Gear',
    'atari 2600': 'Atari 2600',
    '2600': 'Atari 2600',
    'atari 7800': 'Atari 7800',
    '7800': 'Atari 7800',
    'atari jaguar': 'Atari Jaguar',
    'jaguar': 'Atari Jaguar',
    '3do': '3DO',
    'panasonic 3do': '3DO',
    'turbografx': 'TurboGrafx-16',
    'turbografx-16': 'TurboGrafx-16',
    'pc engine': 'TurboGrafx-16',
    'neo geo': 'Neo Geo',
    'neo geo cd': 'Neo Geo CD',
    'neo geo pocket': 'Neo Geo Pocket',
    'fm towns': 'FM Towns Marty',
    'fm towns marty': 'FM Towns Marty',
    'cdi': 'Philips CD-i',
    'cd-i': 'Philips CD-i',
    'philips cdi': 'Philips CD-i',
    'cd32': 'Amiga CD32',
    'amiga cd32': 'Amiga CD32',
    'vectrex': 'Vectrex',
    'arcade': 'Arcade'
};

const validConsoles = [
    'NES', 'SNES', 'Nintendo 64', 'Game Boy', 'Game Boy Color', 'Game Boy Advance',
    'Game & Watch', 'Virtual Boy', 'Sega Genesis', 'Master System', 'Sega CD',
    'Sega Saturn', 'Game Gear', 'Neo Geo', 'Neo Geo CD', 'Neo Geo Pocket',
    'TurboGrafx-16', 'PlayStation', 'Arcade', 'Atari 2600', 'Atari 7800',
    'Atari Jaguar', '3DO', 'FM Towns Marty', 'Philips CD-i', 'Amiga CD32', 'Vectrex'
];

function loadGameList() {
    if (fs.existsSync(GAME_LIST_PATH)) {
        const data = fs.readFileSync(GAME_LIST_PATH, 'utf-8');
        suggestedGames = JSON.parse(data);
    }
}

function saveGameList() {
    fs.writeFileSync(GAME_LIST_PATH, JSON.stringify(suggestedGames, null, 2));
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '.suggest') {
        message.reply('Please suggest **3 games** in the following format:\n\n' +
            'Game1 (console used)\n' +
            'Game2 (console used)\n' +
            'Game3 (console used)\n\n' +
            'Example: Metroid Fusion (GBA)\n' +
            'Please enter all games in one message.');

        const filter = (response) => response.author.id === message.author.id;
        const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 60000,
            errors: ['time'],
        }).catch(() => {
            message.reply('You took too long to respond!');
            return null;
        });

        if (!collected) return;
        const userResponse = collected.first().content.trim();
        const games = userResponse.split('\n').map(game => game.trim());

        if (games.length !== 3 || !games.every(game => /\(.*\)/.test(game))) {
            message.reply('Invalid format. Please ensure your suggestion follows this format:\n\n' +
                'Game1 (console used)\n' +
                'Game2 (console used)\n' +
                'Game3 (console used)\n\n' +
                'Example: Metroid Fusion (GBA)');
            return;
        }

        const invalidGames = [];
        const validGames = [];

        games.forEach(game => {
            const consoleMatch = game.match(/\((.*?)\)/);
            const rawConsole = consoleMatch && consoleMatch[1] ? consoleMatch[1].toLowerCase() : '';
            const fullConsoleName = consoleAbbreviations[rawConsole] || rawConsole;
            const cleanGameName = game.replace(/\(.*?\)/, '').trim();

            if (validConsoles.includes(fullConsoleName)) {
                validGames.push(`${cleanGameName} (${fullConsoleName})`);
            } else {
                invalidGames.push(`${cleanGameName} (Miscellaneous)`);
            }
        });

        const allSuggestions = [...validGames, ...invalidGames];
        const duplicates = allSuggestions.filter(game => suggestedGames.includes(game));

        if (duplicates.length > 0) {
            message.reply(`The following games have already been suggested: ${duplicates.join(', ')}`);
            return;
        }

        if (invalidGames.length > 0) {
            await message.reply(`The following game(s) have unrecognized consoles:\n- ${invalidGames.join('\n- ')}\nWould you like to suggest them anyway under **Miscellaneous**? (yes/no)`);

            const confirmation = await message.channel.awaitMessages({
                filter,
                max: 1,
                time: 30000,
                errors: ['time'],
            }).catch(() => {
                message.reply('You took too long to respond. Suggestion cancelled.');
                return null;
            });

            if (!confirmation) return;

            const answer = confirmation.first().content.toLowerCase();
            if (answer !== 'yes') {
                message.reply('Got it! No games were added.');
                return;
            }
        }

        suggestedGames.push(...allSuggestions);
        saveGameList();
        message.reply(`Thank you! The following games have been added to the suggestions list:\n- ${allSuggestions.join('\n- ')}`);
    }

    if (message.content === '.list') {
        if (suggestedGames.length === 0) {
            message.reply('No games have been suggested yet.');
            return;
        }

        const groupedGames = suggestedGames.reduce((acc, game) => {
            const console = game.match(/\((.*?)\)/);
            const consoleName = console && console[1] ? console[1].toLowerCase() : '';
            const fullConsoleName = consoleAbbreviations[consoleName] || consoleName;
            const category = validConsoles.includes(fullConsoleName) ? fullConsoleName : 'Miscellaneous';

            if (!acc[category]) acc[category] = [];
            acc[category].push(game);
            return acc;
        }, {});

        const sortedConsoles = Object.keys(groupedGames)
            .filter(c => c !== 'Miscellaneous')
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        if (groupedGames['Miscellaneous']) {
            sortedConsoles.push('Miscellaneous');
        }

        let listMessage = '';
        sortedConsoles.forEach(console => {
            const sortedGames = groupedGames[console].sort();
            listMessage += `**${console}**\n`;
            listMessage += sortedGames.map(game => {
                const gameWithoutConsole = game.replace(/\(.*?\)/, '').trim();
                return `- ${gameWithoutConsole}`;
            }).join('\n') + '\n\n';
        });

        message.reply(`Here are the suggested games:\n\n${listMessage}`);
    }

    if (message.content === '.validConsoles') {
        const validConsoleList = validConsoles.join(', ');
        const abbreviationList = Object.keys(consoleAbbreviations).join(', ');
        message.reply(`Here are the valid consoles:\nFull names: ${validConsoleList}\nAbbreviations: ${abbreviationList}`);
    }

    // Admin command to show random games and request the 5th game
    if (message.content.toLowerCase() === '.random') {
        try {
            if (!message.member.roles.cache.some(role => role.name === 'Retro Admin')) {
                message.reply('You do not have permission to use this command.');
                return;
            }

            if (suggestedGames.length < 5) {
                message.reply('There are not enough games in the list to randomly select 5 games.');
                return;
            }

            // Select 4 random games
            const randomGames = [];
            while (randomGames.length < 4) {
                const randomGame = suggestedGames[Math.floor(Math.random() * suggestedGames.length)];
                if (!randomGames.includes(randomGame)) {
                    randomGames.push(randomGame);
                }
            }

            // Ask for the 5th game from admin
            message.reply('I have selected 4 games randomly. Please provide the 5th game in the format: GameName (Console)');

            const filter = (response) => response.author.id === message.author.id;
            const collected = await message.channel.awaitMessages({
                filter,
                max: 1,
                time: 60000,
                errors: ['time'],
            }).catch(() => {
                message.reply('You took too long to respond! Try again.');
                return null;
            });

            if (!collected) return;
            const fifthGame = collected.first().content.trim();

            if (!/\(.*\)/.test(fifthGame)) {
                message.reply('Invalid format. Please use GameName (Console).');
                return;
            }

            randomGames.push(fifthGame);

            // Sort the games alphabetically
            const sortedGames = randomGames.sort((a, b) => a.localeCompare(b));

            // Prepare poll question
            let outputMessage = '**Here are the 5 selected games for this month:**\n\n';
            sortedGames.forEach((game) => {
                outputMessage += `- **${game}**\n`; // Retains full name + console
            });

            message.reply(outputMessage);

            // Ask if they want to create a poll
            message.reply('Would you like to create a poll for these games? (yes/no)');

            const pollResponse = await message.channel.awaitMessages({
                filter,
                max: 1,
                time: 30000,
                errors: ['time'],
            }).catch(() => {
                message.reply('You took too long to respond! Poll creation cancelled.');
                return null;
            });

            if (!pollResponse) return;
            const pollAnswer = pollResponse.first().content.toLowerCase();

            if (pollAnswer === 'yes') {
                const pollChannel = message.guild.channels.cache.find(channel => channel.name === 'poll');

                if (!pollChannel) {
                    message.reply('Poll channel not found! Make sure a channel named "poll" exists.');
                    return;
                }

                // Send the poll with full game name + console
                pollChannel.send({
                    content: "📊 **Vote for the next game!** 📊",
                    poll: {
                        question: { text: "Which game should we play next?" },
                        answers: sortedGames.map(option => ({ text: option })), // Keeps full game name (GameName (Console))
                        allow_multiselect: false,
                        duration: 24, // 24 hours
                    }
                });

                message.reply('Poll created in the #poll channel!');
            }
        } catch (error) {
            console.error('An error occurred in .random command:', error);
            message.reply('An unexpected error occurred. Please try again.');
        }
    }

    // Command to import game list from file
    if (message.content === '.import') {
        loadGameList();
        message.reply(`Game list imported from file. Currently loaded: ${suggestedGames.length} games.`);
    }

    // Command to clear the game list
    if (message.content === '.clear') {
        if (!message.member.roles.cache.some(role => role.name === 'Retro Admin')) {
            message.reply('You do not have permission to use this command.');
            return;
        }

        suggestedGames = [];
        saveGameList();
        message.reply('Game list has been cleared!');
    }
});

// Start the bot with your token
client.login(process.env.DISCORD_TOKEN);
