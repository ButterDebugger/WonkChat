import axios from "axios";
const apiBaseurl = "https://cloud.butterycode.com";
const token = process.env.CLOUD_TOKEN;

function get(key) {
    return new Promise((resolve, reject) => {
        // Check if arguments are valid
        if (typeof key !== "string") {
            reject(new TypeError("Argument 1 must be a string."));
            return;
        }
        if (key.length == 0) {
            reject(new TypeError("Argument 1 cannot be an empty string."));
            return;
        }
        
        // Make request
        axios({
            method: "GET",
            url: `${apiBaseurl}/get/${key}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        }).then(res => {
            if (res.data.success === false) {
                if (res.data.cause === "Key does not exist.") {
                    resolve(undefined);
                } else if (res.data.cause === "Internal server error.") {
                    reject(new Error("Something went wrong."));
                }
            } else {
                resolve(res.data.data);
            }
        }).catch(err => {
            reject(err);
        });
    });
}
function has(key) {
    return new Promise((resolve, reject) => {
        // Check if arguments are valid
        if (typeof key !== "string") {
            reject(new TypeError("Argument 1 must be a string."));
            return;
        }
        if (key.length == 0) {
            reject(new TypeError("Argument 1 cannot be an empty string."));
            return;
        }
        
        // Make request
        axios({
            method: "GET",
            url: `${apiBaseurl}/has/${key}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        }).then(res => {
            resolve(res.data.exists);
        }).catch(err => {
            reject(err);
        });
    });
}
function set(key, data) {
    return new Promise((resolve, reject) => {
        // Check if arguments are valid
        if (typeof key !== "string") {
            reject(new TypeError("Argument 1 must be a string."));
            return;
        }
        if (key.length == 0) {
            reject(new TypeError("Argument 1 cannot be an empty string."));
            return;
        }
        if (typeof data == "undefined") {
            reject(new TypeError("Argument 2 cannot be undefined."));
            return;
        }
        
        // Make request
        axios({
            method: "PUT",
            url: `${apiBaseurl}/set/${key}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            data: JSON.stringify(data)
        }).then(res => {
            resolve(res.data.success);
        }).catch(err => {
            reject(err);
        });
    });
}
function remove(key) {
    return new Promise((resolve, reject) => {
        // Check if arguments are valid
        if (typeof key !== "string") {
            reject(new TypeError("Argument 1 must be a string."));
            return;
        }
        if (key.length == 0) {
            reject(new TypeError("Argument 1 cannot be an empty string."));
            return;
        }
        
        // Make request
        axios({
            method: "DELETE",
            url: `${apiBaseurl}/remove/${key}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        }).then(res => {
            if (res.data.success === true) {
                resolve(true);
            } else {
                reject(new Error("Something went wrong."));
            }
        }).catch(err => {
            reject(err);
        });
    });
}

export default {
    get,
    has,
    set,
    remove
}