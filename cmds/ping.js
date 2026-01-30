import { twi } from "../index.js";

twi.slashcmd({
    name: "ping",
    description: "Pong!",
    run: async function(interaction) {
         const latency = Date.now() - interaction.createdAt.getTime();

        const embed = twi.embed()
            .title("Pong!")
            .description(`Done In ${latency}ms`)
            .color(twi.color("blurple"))
            .build();
        interaction.createMessage({ embeds: [embed], flags: 64 });
    }
});
