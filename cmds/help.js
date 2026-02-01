import { twi } from "../index.js";
import "dotenv/config";

twi.slashcmd({
    name: "help",
    description: "Discord Bot Commands",
    run: async function(interaction) {

        const embed = twi.embed()
            .title("Help & Commands")
            .description(`**/ping** - Check The Bot's Latency\n**/article** - Retrieve Information About Jailbreak Articles\n**/package** - Retrieve Information About Jailbreak Software on KindleForge\n**/tea** - Play Tea (Red)\n**/help** - Display This Screen\n\nCredit to **KindleTweaks**\nVersion **${process.env.version}**`)
            .color(twi.color("blurple"))
            .build();
        interaction.createMessage({ embeds: [embed], flags: 64 });
    }
});
