import { twi } from "../index.js";
import fs from "fs";

const registry = "./assets/registry.jsonl";
const lines = fs.readFileSync(registry, "utf-8").split("\n").filter(Boolean);

const choices = lines.map(line => {
    const obj = JSON.parse(line);
    return {
        name: obj.name,
        value: obj.name
    };
});

function find(name) {
    const lines = fs.readFileSync(registry, "utf-8").split("\n").filter(Boolean);

    for (const line of lines) {
        const obj = JSON.parse(line);
        if (obj.name.toLowerCase() === name.toLowerCase()) {
            return obj; 
        };
    };

    return null; 
};

twi.slashcmd({
    name: "package",
    description: "Retrieve Information About Jailbreak Software",
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
        const pkgN = interaction.data.options.getString("name");
        const pkg = find(pkgN); if(pkg === null) return interaction.createMessage({ embeds: [ twi.embed().title(":x: That Package Was Not Found!").color(twi.color("blurple")).build() ] }); //Theoretically Should Never Call, But...

        const response = twi.embed()
            .title(pkgN)
            .description(`${pkg.description}. [Repository](${pkg.repo})`)
            .color(twi.color("blurple")) 
            .footer(`FW: ${pkg.firmware} | Requested By ${interaction.user.username.charAt(0).toUpperCase() + interaction.user.username.slice(1)}`)
            .image(pkg.icon)
            .build();
        
        interaction.createMessage({
            embeds: [response]
        });
    }
});