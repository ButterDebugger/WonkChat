import { isNil, dom, domParser } from "https://butterycode.com/static/js/utils.js@1.2?min";

export function chatMessage(username, color, discriminator, content, timestamp) {
    let msgContainer = document.createElement("div");
    msgContainer.classList.add("message");
    
    if (!isNil(timestamp)) {
        let date = timestamp instanceof Date ? timestamp : new Date(timestamp);

        let time = date.toLocaleTimeString("en-us", {
            hour: "numeric",
            minute: "numeric"
        });
        let datetime = `${date.toLocaleDateString("en-us", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        })} at ${date.toLocaleTimeString("en-us", {
            hour: "numeric",
            minute: "numeric",
            second: "numeric"
        })}`;

        let timeEle = document.createElement("span");
        timeEle.setAttribute("name", "timestamp");
        timeEle.innerText = time;
        timeEle.title = datetime;
        msgContainer.appendChild(timeEle);
    }

    let nameContainer = document.createElement("div");
    nameContainer.classList.add("name-container");

    let nameEle = document.createElement("span");
    nameEle.setAttribute("name", "username");
    nameEle.innerText = username;
    nameEle.style.color = color;
    nameContainer.appendChild(nameEle);
    
    if (!isNil(discriminator)) {
        let discEle = document.createElement("span");
        discEle.setAttribute("name", "discriminator");
        discEle.innerText = "#" + `00${discriminator}`.slice(2);
        nameContainer.appendChild(discEle);
    }

    msgContainer.appendChild(nameContainer);

    let contEle = document.createElement("span");
    contEle.setAttribute("name", "content");
    contEle.innerText = content;
    msgContainer.appendChild(contEle);

    return msgContainer;
}

export function chatNotification(username, color, discriminator, content, timestamp) {
    let msgContainer = document.createElement("div");
    msgContainer.classList.add("message");
    
    if (!isNil(timestamp)) {
        let date = timestamp instanceof Date ? timestamp : new Date(timestamp);

        let time = date.toLocaleTimeString("en-us", {
            hour: "numeric",
            minute: "numeric"
        });
        let datetime = `${date.toLocaleDateString("en-us", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        })} at ${date.toLocaleTimeString("en-us", {
            hour: "numeric",
            minute: "numeric",
            second: "numeric"
        })}`;

        let timeEle = document.createElement("span");
        timeEle.setAttribute("name", "timestamp");
        timeEle.innerText = time;
        timeEle.title = datetime;
        msgContainer.appendChild(timeEle);
    }

    let nameContainer = document.createElement("div");

    let nameEle = document.createElement("span");
    nameEle.setAttribute("name", "username");
    nameEle.innerText = username;
    nameEle.style.color = color;
    nameContainer.appendChild(nameEle);
    
    if (!isNil(discriminator)) {
        let discEle = document.createElement("span");
        discEle.setAttribute("name", "discriminator");
        discEle.innerText = "#" + `00${discriminator}`.slice(2);
        nameContainer.appendChild(discEle);
    }

    msgContainer.appendChild(nameContainer);

    let contEle = document.createElement("span");
    contEle.setAttribute("name", "content");
    contEle.innerText = content;
    msgContainer.appendChild(contEle);

    return msgContainer;
}

export function userDisplay(username, color, discriminator) {
    var userEle = document.createElement("div");

    var nameEle = document.createElement("span");
    nameEle.innerText = `${username}`;
    nameEle.style.color = color;
    userEle.appendChild(nameEle);

    var discEle = document.createElement("span");
    discEle.innerText = "#" + `00${discriminator}`.slice(2);
    discEle.style.color = "rgba(255, 255, 255, 0.2)";
    userEle.appendChild(discEle);

    return userEle;
}
