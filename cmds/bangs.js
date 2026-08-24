import { twi, client } from "../index.js";
import { MessageFlags, ComponentTypes, SeparatorSpacingSize } from "oceanic.js";

let cooldown = [];
const bangs = [
    { name: "wiki", response: "See the [KindleModding Wiki](<https://kindlemodding.org/>)." },
    { name: "reddit", response: "Check out [r/kindlejailbreak](https://www.reddit.com/r/kindlejailbreak/)!" },

    //Main JB Lander Concepts -> https://kindlemodding.org/jailbreaking/index.html
    { name: "piracy", response: "Jailbreaking and piracy are not the same. You can sideload pirated content without having a jailbreak. Do not seek official support in regards to piracy." },
    { name: "bestjb", response: "Fundamentally, all jailbreaks are the same. They are different methods that all lead to one unified goal, as other methods become patched. **This means you can never 'update' a jailbreak.**" },
    { name: "jbinfo", response: "All jailbreaking allows you to do is run external code on your device (E.g., KOReader, or other apps). The Kindle is not affected in any other way, so all other features will remain (Kindle Unlimited, Store, etc...). This is alike to Android rooting, or iOS jailbreaking. Jailbreaking is a process, not an Operating System or firmware, so you cannot 'install' a jailbreak, within itself it is not an app." }
];

bangs.forEach((bang) => {
    twi.analogcmd({
        name: `!${bang.name}`,
        run: (message) => {
            if(cooldown.includes(message.author.id)) return client.rest.channels.createReaction(message.channel.id, message.id, "🕙");
            const latency = Date.now() - message.createdAt.getTime();
            

            cooldown.push(message.author.id);

            twi.message(message.channel.id, { flags: MessageFlags.IS_COMPONENTS_V2, components: [{
                type: ComponentTypes.CONTAINER,
                components: [{
                    type: ComponentTypes.TEXT_DISPLAY,
                    content: `${bang.response}`
                }, {
                    type: ComponentTypes.SEPARATOR,
                    spacing: SeparatorSpacingSize.SMALL,
                    divider: true
                }, {
                    type: ComponentTypes.TEXT_DISPLAY,
                    content: `-# I Am an Automated Assistant Designed by KindleTweaks | Done in ${latency}ms.\n-# Bang Invoked by: <@${message.author.id}>`
                }]
            }]  });

            setTimeout(() => { cooldown = cooldown.filter(id => id !== message.author.id) }, 30000);
        }
    });
});