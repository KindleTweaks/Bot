import { Client } from "oceanic.js";
import { Twi } from "twicord.js";
import "dotenv/config";

const client = new Client({ auth: `Bot ${process.env.token}`, gateway: { intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"] } });
const twi = new Twi(client);

twi.cmdhandler("./cmds");
export { twi };