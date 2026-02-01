import { twi } from "../index.js";
import fs from "fs";

const cooldown = [];
const registry = "./assets/registry.jsonl";
const rawLines = fs.readFileSync(registry, "utf-8").split("\n").filter(Boolean);
const cache = rawLines.map(line => JSON.parse(line));

const choices = cache.map(obj => ({
    name: obj.name,
    value: obj.name
}));

function find(name) {
    return cache.find(
        obj => obj.name.toLowerCase() === name.toLowerCase()
    ) || null;
}

twi.slashcmd({
    name: "package",
    description: "Retrieve Information About Jailbreak Software on KindleForge",
    options: [
        {
            type: twi.optiontype("string"),
            name: "name",
            description: "Name Of Package",
            choices: choices,
            required: true
        }
    ],
    run: async function(interaction) {
        if (cooldown.includes(interaction.user.id)) {
            return interaction.createMessage({
                embeds: [
                    twi.embed()
                    .title(":x: Please Wait 30 Seconds!")
                    .color(twi.color("blurple"))
                    .build()
                        ],
                flags: 64
            });
        };
        
        cooldown.push(interaction.user.id);
        setTimeout(() => {
            const index = cooldown.indexOf(interaction.user.id);
            if (index > -1) cooldown.splice(index, 1);
        }, 30000);

        const pkgN = interaction.data.options.getString("name");
        const pkg = find(pkgN);
        if (pkg === null) {
            return interaction.createMessage({
                embeds: [
                    twi.embed()
                        .title(":x: That Package Was Not Found!")
                        .color(twi.color("blurple"))
                        .build()
                ],
                flags: 64
            });
        }

        const response = twi.embed()
            .title(pkgN)
            .description(`${pkg.description}. [Repository](${pkg.repo})\n\n**Author**: ${pkg.author}\n**Tags**: \`${pkg.tags.join("\`, \`")}\``)
            .color(twi.color("blurple"))
            .footer(`FW: ${pkg.firmware} | Requested By ${interaction.user.username.charAt(0).toUpperCase() + interaction.user.username.slice(1)}`)
            .image(pkg.icon)
            .build();

        interaction.createMessage({
            embeds: [response]
        });
    }
});
