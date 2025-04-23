const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const Poll = require('discord.js-poll').Poll;
const express = require('express');  // Add Express to handle the HTTP server
const app = express();  // Create an Express app

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Add the /ping route for uptime monitoring
app.get('/ping', (req, res) => {
    res.send('Bot is alive!');
});

// Start the Express server on port 3000 (or any other port)
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// List to hold all the suggested games
let suggestedGames = [];

// Mapping of abbreviations to full console names
const consoleAbbreviations = {
    'psx': 'PlayStation',
    'ps1': 'PlayStation',
    'playstation': 'PlayStation',
    'gba': 'Game Boy Advance',
    'gameboy advance': 'Game Boy Advance',
    'game boy advance': 'Game Boy Advance',
    'gb': 'Game Boy',
    'gameboy': 'Game Boy',
    'snes': 'SNES',
    'nes': 'NES',
    'genesis': 'Sega Genesis',
    'sega genesis': 'Sega Genesis',
    'megadrive': 'Sega Genesis',
    'master system': 'Master System',
    'neo geo': 'Neo Geo',
    'arcade': 'Arcade',
    'atari 2600': 'Atari 2600',
    'atari7800': 'Atari 7800',
    'N64': 'Nintendo 64'
};

// List of valid consoles (Full names)
const validConsoles = [
    'NES', 'SNES', 'Nintendo 64', 'Game Boy', 'Game Boy Color', 'Game Boy Advance',
    'Sega Genesis', 'Master System', 'Sega CD', 'Neo Geo', 'PlayStation', 'Arcade',
    'Atari 2600', 'Atari 7800',
];

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Don't let the bot reply to its own messages
    if (message.author.bot) return;

    // Command to trigger the suggestion process
    if (message.content === '.suggest') {
        // Ask the user to enter all three games in a specific format
        message.reply('Please suggest **3 games** in the following format:\n\n' +
            'Game1 (console used)\n' +
            'Game2 (console used)\n' +
            'Game3 (console used)\n\n' +
            'Example: Metroid Fusion (GBA)\n' +
            'Please enter all games in one message.');

        // Wait for the user to respond
        const filter = (response) => response.author.id === message.author.id;
        const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 60000, // Wait for 1 minute
            errors: ['time'],
        }).catch(() => {
            message.reply('You took too long to respond!');
            return null;
        });

        if (!collected) return; // If no response, exit

        // Get the user's response
        const userResponse = collected.first().content.trim();

        // Split the message into lines and validate the format
        const games = userResponse.split('\n').map(game => game.trim());

        // Ensure the input has exactly 3 games in the correct format
        if (games.length !== 3 || !games.every(game => /\(.*\)/.test(game))) {
            message.reply('Invalid format. Please ensure your suggestion follows this format:\n\n' +
                'Game1 (console used)\n' +
                'Game2 (console used)\n' +
                'Game3 (console used)\n\n' +
                'Example: Metroid Fusion (GBA)');
            return;
        }

        // Validate that each console is one of the valid consoles (with abbreviations)
        const invalidConsoles = games.filter(game => {
            const console = game.match(/\((.*?)\)/);
            const consoleName = console && console[1] ? console[1].toLowerCase() : '';
            const fullConsoleName = consoleAbbreviations[consoleName] || consoleName;

            return fullConsoleName && !validConsoles.includes(fullConsoleName);
        });

        if (invalidConsoles.length > 0) {
            message.reply(`The following game(s) have an invalid console. Please use one of the following valid consoles: ${validConsoles.join(', ')}.\n\nInvalid games: ${invalidConsoles.join(', ')}`);
            return;
        }

        // Check for duplicates in the list
        const duplicates = games.filter(game => suggestedGames.includes(game));
        if (duplicates.length > 0) {
            message.reply(`The following games have already been suggested: ${duplicates.join(', ')}`);
            return;
        }

        // Add the games to the list
        suggestedGames.push(...games);
        message.reply(`Thank you! The following games have been added to the suggestions list:\n- ${games.join('\n- ')}`);
    }

    // Command to view the list of suggested games
    if (message.content === '.list') {
        if (suggestedGames.length === 0) {
            message.reply('No games have been suggested yet.');
            return;
        }

        // Group games by console
        const groupedGames = suggestedGames.reduce((acc, game) => {
            const console = game.match(/\((.*?)\)/);
            const consoleName = console && console[1] ? console[1].toLowerCase() : '';
            const fullConsoleName = consoleAbbreviations[consoleName] || consoleName;

            // Skip games with invalid consoles
            if (!validConsoles.includes(fullConsoleName)) {
                return acc;
            }

            // Add game to the appropriate console group
            if (!acc[fullConsoleName]) {
                acc[fullConsoleName] = [];
            }
            acc[fullConsoleName].push(game);

            return acc;
        }, {});

        // Sort the consoles alphabetically
        const sortedConsoles = Object.keys(groupedGames).sort();

        // Prepare the formatted list
        let listMessage = '';

        sortedConsoles.forEach(console => {
            // Sort the games for each console alphabetically
            const sortedGames = groupedGames[console].sort();

            // Add console header and the list of games under it
            listMessage += `**${console}**\n`;
            listMessage += sortedGames.map(game => {
                // Remove console name from the game entry
                const gameWithoutConsole = game.replace(/\(.*?\)/, '').trim();
                return `- ${gameWithoutConsole}`;
            }).join('\n') + '\n\n';
        });

        // Send the formatted list
        message.reply(`Here are the suggested games:\n\n${listMessage}`);
    }

    // Command to view valid consoles
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
            message.reply('I have selected 4 games randomly. Please provide the 5th game in the format: `GameName (Console)`');

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
                message.reply('Invalid format. Please use `GameName (Console)`.');
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
});

// Start the bot with your token
client.login(process.env.DISCORD_TOKEN);
