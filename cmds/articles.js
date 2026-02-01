import { twi } from "../index.js";
import fs from "fs";

const cooldown = [];
const registry = "./assets/articles.json";
const articles = JSON.parse(fs.readFileSync(registry, "utf-8"));

const cache = {};

const choices = articles.map(article => ({
    name: article.name,
    value: article.name
}));

function find(name) {
    return articles.find(
        a => a.name.toLowerCase() === name.toLowerCase()
    ) || null;
}

twi.slashcmd({
    name: "article",
    description: "Retrieve Information About Jailbreak Articles",
    options: [
        {
            type: twi.optiontype("string"),
            name: "name",
            description: "Name Of Article",
            choices: choices,
            required: true
        }
    ],
    run: async function (interaction) {
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
        }

        cooldown.push(interaction.user.id);
        setTimeout(() => {
            const index = cooldown.indexOf(interaction.user.id);
            if (index > -1) cooldown.splice(index, 1);
        }, 30000);

        const articleName = interaction.data.options.getString("name");
        const article = find(articleName);

        if (article === null) {
            return interaction.createMessage({
                embeds: [
                    twi.embed()
                        .title(":x: That Article Was Not Found!")
                        .color(twi.color("blurple"))
                        .build()
                ]
            });
        }

        if (!cache[article.body]) {
            const mdPath = `./assets/articles/${article.body}.md`;
            cache[article.body] = fs.readFileSync(mdPath, "utf-8");
        }

        const response = twi.embed()
            .title(article.name)
            .description(cache[article.body])
            .color(twi.color("blurple"))
            .build();

        interaction.createMessage({
            embeds: [response]
        });
    }
});
