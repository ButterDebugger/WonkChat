import cookies from "https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/+esm";
import EventSource from "https://cdn.jsdelivr.net/npm/eventsource@2.0.2/+esm";
import { debugMode, client } from "./client.js";
import * as cryption from "../../cryption.js";

export const gatewayUrl = `${location.origin}/api`;
export let stream = null;

let earlyEvents = {};
let streamOpen = false;

export function init() {
    stream = new EventSource(`${gatewayUrl}/stream`, {
        headers: {
            Authorization: cookies.get("token")
        }
    });

    stream.on("open", () => {
        if (debugMode) console.log("Event stream opened");
        
        streamOpen = true;
    });
    
    stream.on("error", (event) => {
        if (debugMode) console.error("An error has occurred with the event stream", event);

        setTimeout(() => {
            window.location.href = "/login";
        }, 500);
    });

    stream.on("close", () => {
        if (debugMode) console.log("Event stream closed");
        
        streamOpen = false;
    });
    
    stream.on("ping", ({ data }) => {
        data = parseData(data);
        if (typeof data == "undefined") return;
    
        if (debugMode) console.log("ping", data.ping);
    });

    // Register early events
    for (const type in earlyEvents) {
        for (const event of earlyEvents[type]) {
            stream.on(type, event);
        }
    }
}

export function parseData(data) {
    try {
        return JSON.parse(data);
    } catch (error) {
        return undefined;
    }
}

export function isStreamOpen() {
    return streamOpen;
}

export function registerEvent(type, callback) {
    const controller = async function({ data, type }) {
        if (["open", "error", "close", "ping"].includes(type)) return callback({
            data: data,
            type: type
        });

        let decrypted = await cryption.decrypt(JSON.parse(data), client.keyPair.privateKey);

        callback({
            data: decrypted,
            type: type
        });
    }

    if (stream !== null) {
        stream.on(type, controller);
    } else {
        if (!earlyEvents[type]) earlyEvents[type] = [];
        earlyEvents[type].push(controller);
    }
}

export function makeRequest(options) {
    return new Promise((resolve, reject) => {
        axios(options).then((res) => {
            resolve(res);
        }).catch(error => {
            if (typeof error?.response == "object") {
                resolve(error.response);
            } else {
                reject(error);
            }
        });
    });
}
