import { Client } from "../lib/client.js";
import { domParser } from "https://debutter.dev/x/js/utils.js@1.2";
import * as binForage from "https://debutter.dev/x/js/binforage.js";
import {} from "./ui.js";

const client = new Client();

await client.login(await binForage.get("username"), await binForage.get("publicKey"), await binForage.get("privateKey")).catch((err) => {
    console.log(err)
    location.href = "/login";
});
