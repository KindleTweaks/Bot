import { twi, client } from "../index.js";
import fetch from "node-fetch";
import { ComponentTypes, TextInputStyles, InteractionTypes, MessageFlags, SeparatorSpacingSize, ButtonStyles, RoleFlags } from "oceanic.js";
import fs from "fs";
import path from "path";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({ apiKey: process.env.gemini });
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

    const embeddings = new OllamaEmbeddings({
        model: "nomic-embed-text",
        baseUrl: "http://localhost:11434"
    });

    if(fs.existsSync(vector)) {
        console.log("Found RAG DB on Disk!");
        rag = await HNSWLib.load(vector, embeddings);
        return rag;
    };

    console.log("No Cache DB Found, Generating Embeddings.... (This May Take a While)");

    const wiki = fs.readFileSync(path.resolve("./assets/wiki.txt"), "utf8");
    const convo = fs.readFileSync(path.resolve("./assets/convo.txt"), "utf8");

    const docs = [wiki, convo];

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1200,
        chunkOverlap: 200
    });

    const chunks = await splitter.createDocuments(docs);

    rag = await MemoryVectorStore.fromDocuments(chunks, embeddings);

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
    const result = store ? await store.similaritySearch(q, 2) : [{ pageContent: "N/A, No Documents. Report Failure." }];

    console.log("Found Relevant Chunks!");
    return result.map(doc => doc.pageContent).join("\n\n");
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
            You are a KindleTweaks Helper Bot. Answer the user's Kindle jailbreaking/homebrew query using ONLY the provided context. If the context does not contain the answer, respond with "Service Currently Unavailable. Sorry! :("
            Be concise, laconic, but do not omit any necessary details and stress them with markdown if necessary.

            Context: 
            ${await localRAG(query)}

            Question: ${query}
        `.trim();

        let response;
        try {
            response = await ai.models.generateContent({
                model: "gemma-4-31b-it",
                contents: prompt 
            });
        } catch (e) {
            response.text = "Service Currently Unavailable. Sorry! :(";
        }

        interaction.createFollowup({
            flags: MessageFlags.IS_COMPONENTS_V2,
            components: [{
                type: ComponentTypes.CONTAINER,
                components: [{
                    type: ComponentTypes.TEXT_DISPLAY,
                    content: `# Quick Response\n${response.text}\n-# This Was Generated by AI. Check your Sources.`
                }]
            }]
        })
    };
});