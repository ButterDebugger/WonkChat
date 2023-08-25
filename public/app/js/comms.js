import { debugMode, client } from "./client.js";
import * as cryption from "../../cryption.js";

export let stream;
export const baseUrl = location.origin;
export const gatewayUrl = `${baseUrl}/api`;

let eventHandlers = {};

export function init() {
    stream = new EventSource(`${gatewayUrl}/stream`);

    // Check every 500ms if the stream has closed
    let stateInterval = setInterval(() => {
        if (stream.readyState === EventSource.CLOSED) {
            closeHandler();
            clearInterval(stateInterval);
        }
    }, 500);

    stream.addEventListener("open", () => {
        if (debugMode) console.log("Event stream opened");
    });

    stream.addEventListener("error", (event) => {
        if (debugMode) console.error("An error has occurred with the event stream", event);

        stream.close();
    });

    function closeHandler() {
        if (debugMode) console.log("Event stream closed");
        
        stream.dispatchEvent(new CustomEvent("close", {
            detail: {}
        }));

        // Reload window after 2.5sec
        setTimeout(() => {
            if (debugMode) console.log("Reloading webpage");
            location.reload();
        }, 2500);
    };

    stream.addEventListener("ping", ({ data }) => {
        data = parseData(data);
        if (typeof data == "undefined") return;

        if (debugMode) console.log("ping", data.ping);
    });

    // Re-register event handlers
    for (let type of Object.keys(eventHandlers)) {
        for (let listener of eventHandlers[type]) {
            stream.addEventListener(type, listener);
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
    return stream.readyState === EventSource.OPEN;
}

export function registerEvent(type, callback) {
    let listeners = eventHandlers[type] ?? [];

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

    if (stream instanceof EventSource) stream.addEventListener(type, controller);
    listeners.push(controller);
    eventHandlers[type] = listeners;
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
