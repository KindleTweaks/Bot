import { twi } from "../index.js";
import fs from "fs";

const CHANNEL_ID = "1427723942218563734";
const COLOR = twi.color("blurple");
const games = [];

const dictionary = JSON.parse(
    fs.readFileSync("./assets/dictionary.json", "utf8")
);

const LETTER_SETS = [
    "art","str","ent","act","con","res","pro","com","pre","int",
    "est","dis","uni","tri","ter","for","rea","anc","ous","lin",
    "men","ver","ran","mis","man","ind","ant","lat","rom","der",
    "sub","tin","min","ron","met","sis","rat","rel","lis","fun",
    "mat","din","rid","gen","lan","orm","tiv","ser","pot","par",
    "alt","bio","cap","dig","eco","fig","glo","hip","iso","jet",
    "log","mob","nip","opt","pal","ash","bun","cot","dot","elf",
    "fop","gym","hut","ivy","jog","kip","lop","mop","nub","owl",
    "pun","rut","sip","tug","vet","wop","yuk","zap","urn","sol",
    "tap"
];

const genID = () =>
    Math.floor(10000 + Math.random() * 90000).toString();

const getGame = (id) =>
    games.find(g => g.id === id && g.type === "tea");

twi.slashcmd({
    name: "tea",
    description: "Play Tea (Red)!",
    run: async interaction => {
        if (interaction.channelID !== CHANNEL_ID) {
            return interaction.createMessage({
                embeds: [
                    twi.embed()
                        .description(":x: You Cannot Do This In The Current Channel! Use <#"+CHANNEL_ID+">")
                        .color(COLOR)
                        .build()
                ]
            });
        }

        if (games.some(g => g.channel === interaction.channelID)) {
            interaction.defer(64);
            return interaction.createFollowup({
                content: ":x: There Is Already A Game Running In This Channel!"
            });
        }

        interaction.defer();
        const gid = genID();

        const joinEmbed = twi.embed()
            .title("Tea :teapot:")
            .description(`<@${interaction.user.id}> Is Hosting A Game Of Tea!\nPlayers: ...`)
            .footer("Type The Longest Word Containing The 3 Letters Provided.")
            .color(COLOR)
            .build();

        const msg = await interaction.createFollowup({
            embeds: [joinEmbed],
            components: [{
                type: twi.componenttype("actionrow"),
                components: [
                    { type: twi.componenttype("button"), style: 1, customID: `jointea|${gid}`, label: "Join Game" },
                    { type: twi.componenttype("button"), style: 1, customID: `leavetea|${gid}`, label: "Leave Game" },
                    { type: twi.componenttype("button"), style: 2, customID: `starttea|${gid}`, label: "Start Game" }
                ]
            }]
        });

        games.push({
            type: "tea",
            id: gid,
            channel: interaction.channelID,
            host: interaction.user.id,
            players: [],
            joinMessage: msg.message.id,
            embed: joinEmbed,
            begun: false
        });
    }
});

twi.handlecomponents({
    customid: "jointea",
    run: async interaction => {
        interaction.defer(64);
        const game = getGame(interaction.data.customID.split("|")[1]);
        if (!game) return interaction.createFollowup({ content: ":x: This Game Has Expired..." });
        if (game.begun) return interaction.createFollowup({ content: ":x: This Game Is In Progress!" });
        if (interaction.user.id === game.host) return interaction.createFollowup({ content: ":x: You Are The Host!" });
        if (game.players.some(p => p.id === interaction.user.id)) {
            return interaction.createFollowup({ content: ":x: You Have Already Joined!" });
        }

        game.players.push({ id: interaction.user.id, score: 0 });

        const players = game.players.map(p => `<@${p.id}>`).join(", ");
        game.embed.description = `<@${game.host}> Is Hosting A Game Of Tea!\nPlayers: ${players}`;
        await interaction.channel.editMessage(game.joinMessage, { embeds: [game.embed] });

        interaction.createFollowup({ content: "Joined Game Successfully!" });
    }
});

/* ================= LEAVE ================= */

twi.handlecomponents({
    customid: "leavetea",
    run: async interaction => {
        interaction.defer(64);
        const game = getGame(interaction.data.customID.split("|")[1]);
        if (!game) return interaction.createFollowup({ content: ":x: This Game Has Expired..." });
        if (game.begun) return interaction.createFollowup({ content: ":x: This Game Is In Progress!" });

        if (interaction.user.id === game.host) {
            games.splice(games.indexOf(game), 1);
            await interaction.createFollowup({ content: ":white_check_mark: You Have Cancelled The Game." });
            return twi.message(interaction.channelID, { content: ":x: The Host Has Cancelled The Game!" });
        }

        game.players = game.players.filter(p => p.id !== interaction.user.id);
        const players = game.players.map(p => `<@${p.id}>`).join(", ");

        game.embed.description = `<@${game.host}> Is Hosting A Game Of Tea!\nPlayers: ${players}`;
        await interaction.channel.editMessage(game.joinMessage, { embeds: [game.embed] });

        interaction.createFollowup({ content: "Left Game Successfully!" });
    }
});

twi.handlecomponents({
    customid: "starttea",
    run: async interaction => {
        interaction.defer(64);
        const game = getGame(interaction.data.customID.split("|")[1]);
        if (!game) return interaction.createFollowup({ content: ":x: This Game Has Expired..." });
        if (interaction.user.id !== game.host) return interaction.createFollowup({ content: ":x: You Do Not Have Permission To Begin The Game!" });
        if (game.begun) return interaction.createFollowup({ content: ":x: This Game Is In Progress!" });

        game.players.push({ id: game.host, score: 0 });
        game.begun = true;

        await interaction.createFollowup({ content: ":white_check_mark: Starting Game..." });
        twi.message(game.channel, { content: ":clock1030: Starting Game In 10s!" });

        setTimeout(() => {
            let round = 1;

            const startRound = () => {
                const letters = LETTER_SETS[Math.floor(Math.random() * LETTER_SETS.length)];
                const submissions = [];

                twi.message(game.channel, {
                    embeds: [
                        twi.embed()
                            .title(letters)
                            .description(`Round ${round}/6`)
                            .footer(`ID: ${game.id}`)
                            .color(COLOR)
                            .build()
                    ]
                });

                const listener = msg => {
                    if (msg.channelID !== game.channel) return;
                    if (!game.players.some(p => p.id === msg.author.id)) return;

                    const word = msg.content.toLowerCase();
                    if (word.includes(letters) && dictionary[word]) {
                        submissions.push({ word, id: msg.author.id });
                        twi.client.rest.channels.createReaction(game.channel, msg.id, "✅");
                    }
                };

                twi.client.on("messageCreate", listener);

                setTimeout(() => {
                    twi.client.off("messageCreate", listener);

                    if (submissions.length) {
                        submissions.sort((a, b) => b.word.length - a.word.length);
                        const win = submissions[0];
                        game.players.find(p => p.id === win.id).score++;
                        twi.message(game.channel, { content: `:tada: Longest Word: ${win.word} — <@${win.id}>` });
                    } else {
                        twi.message(game.channel, { content: ":x: No Valid Words This Round!" });
                    }

                    if (++round <= 6) startRound();
                    else {
                        game.players.sort((a, b) => b.score - a.score);
                        const board = game.players
                            .map(p => `<@${p.id}> - ${p.score}pt${p.score !== 1 ? "s" : ""}`)
                            .join("\n");

                        twi.message(game.channel, {
                            embeds: [
                                twi.embed()
                                    .title("Game Over!")
                                    .description(`🏆 Winner: <@${game.players[0].id}>\n\n${board}`)
                                    .color(COLOR)
                                    .build()
                            ]
                        });

                        games.splice(games.indexOf(game), 1);
                        twi.message(game.channel, { content: ":wave: Game Ended!" });
                    }
                }, 20000);
            };

            startRound();
        }, 10000);
    }
});

twi.slashcmd({
    name: "teaend",
    description: "Force-End an Inactive Tea Game (Admin Only)",
    defaultMemberPermissions: "8",
    run: async interaction => {
        const game = games.find(g =>
            g.type === "tea" &&
            g.channel === interaction.channelID &&
            !g.begun
        );

        if (!game) {
            return interaction.createMessage({
                content: ":x: There Is No Inactive Tea Game To End In This Channel!"
            });
        }

        games.splice(games.indexOf(game), 1);

        interaction.createMessage({
            content: ":white_check_mark: The Inactive Tea Game Has Been Force-Ended."
        });

        twi.message(interaction.channelID, {
            content: ":warning: An Admin Has Cancelled The Inactive Tea Game."
        });
    }
});
