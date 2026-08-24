import { twi } from "../index.js";
import "dotenv/config";

twi.slashcmd({
    name: "help",
    description: "Discord Bot Commands",
    run: async function(interaction) {
        interaction.defer(64);

        const embed = twi.embed()
            .title("Help & Commands")
            .description(`**/ping** - Check The Bot's Latency\n**/support** - Create an Organised Support Thread\n**/tea** - Play Tea (Red)\n**/help** - Display This Screen\n**!** - Invoke Bangs; E.g., \`!wiki\`\n\nCredit to **KindleTweaks**\nVersion **${process.env.version}**`)
            .color(twi.color("blurple")) 
            .build();
        interaction.createFollowup({ embeds: [embed] });
    }
});
