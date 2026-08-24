import { twi, client } from "../index.js";
import fetch from "node-fetch";
import { ComponentTypes, TextInputStyles, InteractionTypes, MessageFlags, SeparatorSpacingSize, ButtonStyles } from "oceanic.js";
import fs from "fs";
import path from "path";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAI } from "openai";
import "dotenv/config";

const ai = new OpenAI({
    apiKey: process.env.hetzner,
    baseURL: "https://inference.hetzner.com/api/v1"
});

let rag = null;
let vector = path.resolve("./assets/hnswlib-cache");

const response = await fetch("https://kindlemodding.org/models.json");
const models = await response.json(); //Stored in Memory

let device;
let fw; 

function lookup(s) {    
    if (s.length == 2 || s.length == 3)
        return {
            s_version: s.length == 2 ? 0 : 1,
            device_code: s
        }
        
    if (s[0] == "G") { 
        if (s.length < 6)
            return -1

        return {
            "serial_version": 1,
            "device_code": s.substring(3, 6)
        }
    } else if (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"].includes(s[0])) {
        if (s.length < 4)
            return -1

        return {
            "serial_version": 0,
            "device_code": s.substring(2, 4)
        }
    }
    else {
        return -2;
    }
}

function serial(s) {
    s = s.toUpperCase().replaceAll(" ", "");
    let info = -2;

    try {
        info = lookup(s);
    } catch {
        return false;
    }

    if(info === -1 || info === -2) return false; //Too Short, Invalid (Respectively)

    for(const kindle of models) {
        if(kindle.serial_version < info.serial_version) {
            continue;
        } else {
            if(Object.keys(kindle.device_codes).includes(info.device_code)) {
                device = kindle;
                return true;
            }
        };
    };

    return false;
};

function firmware(f) {
    f = f.replace(/[^0-9.]/g, "");
    let validation = /^\d{1,2}(\.\d{1,2}){1,5}$/; 

    if(validation.test(f) && parseInt(f.split(".")[0]) <= 5) {
        fw = f;
        return true;
    }

    return false;
};

twi.slashcmd({
    name: "support",
    description: "Open a Support Thread",
    run: async function(interaction) {
        interaction.createModal({
            customID: "support-info",
            title: "Support Information",
            components: [
                {
                    type: ComponentTypes.LABEL,
                    label: "Enter Beginning of Serial Number:",
                    description: "Find this in Three Dots > Settings > Device options > Device info.",
                    component: {
                        type: ComponentTypes.TEXT_INPUT,
                        customID: "support-serial",
                        required: true,
                        minLength: 6,
                        maxLength: 8,
                        placeholder: "G093 KM...",
                        style: TextInputStyles.SHORT
                    }
                }, {
                    type: ComponentTypes.LABEL,
                    label: "Enter Firmware Version:",
                    description: "Find this in Three Dots > Settings > Device options > Device info.",
                    component: {
                        type: ComponentTypes.TEXT_INPUT,
                        customID: "support-firmware",
                        required: true,
                        minLength: 5,
                        maxLength: 16,
                        placeholder: "5.17.1.0.4...",
                        style: TextInputStyles.SHORT
                    }
                }, {
                    type: ComponentTypes.LABEL,
                    label: "What's the Issue?",
                    description: "Describe the issue; mention jailbreak method, problematic app, attempts tried, etc. in detail.",
                    component: {
                        type: ComponentTypes.TEXT_INPUT,
                        customID: "support-issue",
                        required: true,
                        placeholder: "I am having trouble jailbreaking with SpringBreak because...",
                        style: TextInputStyles.PARAGRAPH
                    }
                }, {
                    type: ComponentTypes.LABEL,
                    label: "Give the Thread a Title (Summary):",
                    description: "A quick one-sentence title to grab helpers' attention and get you faster support :)",
                    component: {
                        type: ComponentTypes.TEXT_INPUT,
                        customID: "support-title",
                        required: true,
                        minLength: 5,
                        maxLength: 100,
                        placeholder: "SpringBreak jailbreak refuses to load...",
                        style: TextInputStyles.SHORT
                    }
                }, {
                    type: ComponentTypes.LABEL,
                    label: "Have You Read the Wiki?",
                    description: "I affirm I have read the Wiki's jailbreaking lander, and FAQ (if applicable).",
                    component: {
                        type: ComponentTypes.CHECKBOX_GROUP,
                        customID: "support-docs",
                        minValues: 1,
                        maxValues: 1,
                        options: [
                            {
                                label: "Yes",
                                value: "yes",
                                description: "I have read the proper documentation."
                            },
                            {
                                label: "No",
                                value: "no",
                                description: "I would like to obtain a link and terminate my application."
                            }
                        ]
                    }
                }
            ]
        }); 
    }
});

async function instance() {
    if(rag) return rag;

    const embeddings = new OllamaEmbeddings({ //ENSURE MODEL IS PULLED REGARDLESS OF HAVING LOCAL CACHE
        model: "bge-m3",
        baseUrl: "http://localhost:11434"
    });

    if(fs.existsSync(vector)) {
        console.log("Found RAG DB on Disk!");
        rag = await HNSWLib.load(vector, embeddings);
        return rag;
    };

    console.log("No Cache DB Found, Generating Embeddings.... (This May Take a While)");

    const wiki = fs.readFileSync(path.resolve("./assets/wiki.txt"), "utf8");

    const docs = [wiki];

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1200,
        chunkOverlap: 200
    });

    const chunks = await splitter.createDocuments(docs);

    console.log(`Generating Embeddings for ${chunks.length} Chunks...`);
    console.time("Embeddings");

    rag = new HNSWLib(embeddings, { space: "cosine" });

    const size = 512;
    for (let i = 0; i < chunks.length; i+= size) {
        const batch = chunks.slice(i, i + size);
        console.log(`Processing Batch ${Math.floor(i / size) + 1}/${Math.ceil(chunks.length / size)}`); 

        await rag.addDocuments(batch);
    };

    console.timeEnd("Embeddings");
    await rag.save(vector);
    console.log("RAG DB Calculated, Saved to Disk.");

    return rag;
};

async function localRAG(q) {
    let store;
    try {
        store = await instance();
    } catch(e) {
        console.log(`Error: Couldn't Initialise RAG (Rate Limit?): ${e}`);
    };

    console.log("Querying DB...");
    if (!store) return "N/A, No Documents. Report Failure.";

    const results = await store.similaritySearchWithScore(q, 6);
    const valid = results
        .filter(([doc, score]) => {
            console.log(`Found Chunk with Relevance Score: ${score}.`);
            return score < 0.65;
        })
        .map(([doc, score]) => doc.pageContent);

    if(valid.length === 0) {
        console.log("No Relevant Documentation Matches.");
        return "N/A, No Documents. Report Failure.";
    };

    console.log(`Found ${valid.length} Highly Relevant Chunks!`);
    return valid.join("\n\n");
};

const support = "1467990913547632773";

client.on("interactionCreate", async (interaction) => {
    if(interaction.type === InteractionTypes.MODAL_SUBMIT && interaction?.data?.customID === "support-info") {
        await interaction.defer(64);

        const component = (id) => { return interaction.data.components.raw.find(item => item.component.customID === id).component };
        if(component("support-docs").values[0] !== "yes") return interaction.createFollowup({ embeds: [ twi.embed().color(twi.color("blurple")).title("Kindle Resources").description("Here are some resources/communities to view:\n1. [KindleModding Wiki Lander](https://kindlemodding.org/jailbreaking/index.html)\n2. [KindleModding FAQ](https://kindlemodding.org/jailbreaking/jailbreak-faq.html)\n3. [r/KindleJailbreak](https://www.reddit.com/r/kindlejailbreak/)\n4. [KindleModding Discord](https://discord.kindlemodding.org/)").build() ] });

        const valid = serial(component("support-serial").value) && firmware(component("support-firmware").value);
        if(!valid) return interaction.createFollowup({ embeds: [ twi.embed().color(twi.color("blurple")).title("Invalid Form :x:").description("Invalid form! Please submit a valid serial number & firmware.").build() ] });

        const thread = await client.rest.channels.startThreadInThreadOnlyChannel(support, { name: component("support-title").value, message: { 
            flags: MessageFlags.IS_COMPONENTS_V2,
            components: [
                {
                    type: ComponentTypes.TEXT_DISPLAY,
                    content: `<@${interaction.user.id}>`
                }, {
                    type: ComponentTypes.CONTAINER,
                    accentColor: twi.color("blurple"),
                    components: [
                        {
                            type: ComponentTypes.TEXT_DISPLAY,
                            content: "# Support Enquiry"
                        }, {
                            type: ComponentTypes.SEPARATOR,
                            spacing: SeparatorSpacingSize.SMALL,
                            divider: true
                        }, {
                            type: ComponentTypes.TEXT_DISPLAY,
                            content: `## Details\n**Author**: ${interaction.user.globalName},\n**Model**: ${device.generation_nickname} (${device.amazon_name}),\n**Firmware**: ${fw}.`
                        }, {
                            type: ComponentTypes.TEXT_DISPLAY,
                            content: `## Query\n*${component("support-issue").value}*`
                        }, {
                            type: ComponentTypes.ACTION_ROW,
                            components: [{
                                type: ComponentTypes.BUTTON,
                                style: ButtonStyles.DANGER,
                                label: "Delete Thread",
                                customID: `delete-thread`
                            }, {
                                type: ComponentTypes.BUTTON,
                                style: ButtonStyles.PRIMARY,
                                label: "Quick Response",
                                customID: "invoke-ai"
                            }]
                        }, {
                            type: ComponentTypes.SEPARATOR,
                            spacing: SeparatorSpacingSize.SMALL,
                            divider: true
                        }, {
                            type: ComponentTypes.TEXT_DISPLAY,
                            content: `-# Creation Date: ${new Date().toLocaleDateString("en-GB")}\n-# I Am an Automated Assistant Designed by KindleTweaks.`
                        }
                    ]
                }
            ]
        } });

        interaction.createFollowup({ embeds: [ 
            twi.embed()
                .color(twi.color("blurple"))
                .title("Thread Created :white_check_mark:")
                .description(`Your support thread has been created successfully.\nSee here: <#${thread.id}>`)
                .build()
        ] });
    };

    if(interaction.type === InteractionTypes.MESSAGE_COMPONENT && interaction?.data?.customID === "delete-thread") {
        await interaction.defer(64);
        const channel = interaction.channel.id;
        
        const author = interaction.message.components[0].content.slice(2, -1);
        if(interaction.user.id !== author && !interaction.channel.permissionsOf(interaction.user.id).has(Permissions.MANAGE_THREADS)) return interaction.createFollowup({ embeds: [ twi.embed().color(twi.color("blurple")).title("Cannot Delete :x:").description("You are not the author of this thread, nor do you have administrative powers.").build() ] });

        try {
            await client.rest.channels.delete(channel, "Author/Moderator Imposed Delete");
        } catch(e) {
            console.log(`Error: Failed to Delete Channel: ${e}.`);
        }
    };

    if(interaction.type === InteractionTypes.MESSAGE_COMPONENT && interaction?.data?.customID === "invoke-ai") {
        await interaction.defer();
        const query = interaction.message.components[1].components[3].content.slice(9, -1);
        
        const prompt = `
            Local Context: 
            ${await localRAG(query)}

            Question: ${query}
        `.trim();

        let response = null;
        try {
            response = await ai.chat.completions.create({
                model: "Qwen/Qwen3.6-35B-A3B-FP8",
                messages: [
                    {
                        role: "system",
                        content: "You are a KindleTweaks Helper Bot. Answer the user's Kindle jailbreaking/homebrew query using ONLY the base overview & provided local context. If the context does not contain the answer, prioritise the overview, or respond with 'Service Currently Unavailable. Sorry! :(' Be laconic, problem solve but do not omit any necessary details and stress them with markdown if necessary: the user cannot ask followup questions so try to cover all bases. Use markdown links but wrap them in '<' and '>' to prevent embedding, e.g. [KindleModding](<https://kindlemodding.org>). Do not wrap markdown links in backticks, they will not render. If links are relative, e.g. './item', append 'https://kindlemodding.org' to them as a base and resolve the path properly. Do not link to the KindleTweaks discord, you run inside of it; if unsure tell the user to wait for a human helper to double check before trying anything. Link to everything else, e.g. scriptlets, external resources, as necessary..."
                    }, {
                        role: "user",
                        content: prompt
                    }
                ]
            });
        } catch (e) {
            console.log(`Error: Couldn't Call Hetzner API: ${e}`);
            response = { choices: [{ message: "" }] }; response.choices[0].message.content = "Service Currently Unavailable. Sorry! :(";
        }

        interaction.createFollowup({
            flags: MessageFlags.IS_COMPONENTS_V2,
            components: [{
                type: ComponentTypes.CONTAINER,
                components: [{
                    type: ComponentTypes.TEXT_DISPLAY,
                    content: `# Quick Response 🧠`
                }, {
                    type: ComponentTypes.SEPARATOR,
                    spacing: SeparatorSpacingSize.SMALL,
                    divider: true
                }, {
                    type: ComponentTypes.TEXT_DISPLAY,
                    content: `${response.choices[0].message.content}\n-# This Was Generated by AI. Check your Sources.`
                }]
            }]
        })
    };
});