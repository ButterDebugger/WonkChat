import { debugMode } from "./client.js";

export const receiver = new EventTarget();
export let socket;

export const websocketUrl = `${location.protocol == "https:" ? "wss" : "ws"}://${location.host}/`;
export const baseUrl = location.origin;
export const gatewayUrl = `${baseUrl}/api`;

init();

function init() {
    socket = new WebSocket(websocketUrl);

    socket.isOpen = function() {
        return socket?.readyState === 1;
    }
    
    socket.addEventListener("message", ({ data }) => {
        let obj;
        try { obj = JSON.parse(data); } catch (error) { return; }

        if (debugMode) console.log("received " + JSON.stringify(obj)); // TODO: remove this

        receiver.dispatchEvent(new CustomEvent(obj.event, {
            detail: (() => {
                delete obj.event;
                return obj;
            })()
        }));
    });

    socket.addEventListener("open", () => {
        if (debugMode) console.log("Websocket opened");
        
        receiver.dispatchEvent(new CustomEvent("open", {
            detail: {}
        }));
    });
    
    socket.addEventListener("close", () => {
        if (debugMode) console.log("Websocket closed");
        
        receiver.dispatchEvent(new CustomEvent("close", {
            detail: {}
        }));

        setTimeout(() => {
            if (debugMode) console.log("Reconnecting websocket");
            init();
        }, 5000);
    });
}

export function makeRequest(options) { // TODO: finish and test
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

receiver.addEventListener("ping", ({ detail }) => {
    if (detail.session === null) {
        axios.post(`${baseUrl}/api/receiver`, {
            session: detail.id
        }).catch(() => {});
    }

    socket.send(JSON.stringify({
        event: "pong"
    }));
});
