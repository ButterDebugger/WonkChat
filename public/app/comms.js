import { debugMode } from "./client.js";

export const receiver = new EventTarget();
export let stream;

export const baseUrl = location.origin;
export const gatewayUrl = `${baseUrl}/api`;

init();

function init() {
    stream = new EventSource(`${gatewayUrl}/stream`);

    stream.addEventListener("open", () => {
        if (debugMode) console.log("Event stream opened");
        
        receiver.dispatchEvent(new CustomEvent("open", {
            detail: {}
        }));
    });

    stream.addEventListener("error", (event) => {
        if (debugMode) console.error("An error has occurred with the event stream", event)
    });

    stream.addEventListener("close", () => {
        if (debugMode) console.log("Event stream closed");
        
        receiver.dispatchEvent(new CustomEvent("close", {
            detail: {}
        }));

        setTimeout(() => {
            if (debugMode) console.log("Reconnecting event stream");
            init();
        }, 5000);
    });

    stream.addEventListener("message", ({ data }) => {
        let obj;
        try { obj = JSON.parse(data); } catch (error) { return; }

        if (debugMode) console.log("received", JSON.stringify(obj));

        if (typeof obj.event !== "string") return;

        receiver.dispatchEvent(new CustomEvent(obj.event, {
            detail: (() => {
                delete obj.event;
                return obj;
            })()
        }));
    });
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
