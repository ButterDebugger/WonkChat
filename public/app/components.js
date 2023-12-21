import { domParser } from "https://debutter.dev/x/js/utils.js@1.2";

export function createRoomTab(name) {
	let ele = domParser(
		`<div class="channel-tab">
            <span class="ic-raw ic-text-size ic-hashtag"></span>
            <span name="channel-name"></span>
        </div>`
	);

    ele.setAttribute("data-channel-id", name); // NOTE: is name is not always going to be the id
    ele.querySelector("[name='channel-name']").innerText = name;

    return ele;
}

export function createMessageTab(userId, username) { // NOTE: unfinished
	let ele = domParser(
		`<div class="channel-tab">
            <span class="ic-raw ic-text-size ic-at"></span>
            <span name="channel-name"></span>
        </div>`
	);

    ele.querySelector("[name='channel-name']").innerText = username;

    return ele;
}

export function createMessage(message) {
    let ele = domParser(
        `<div class="message">
            <div class="message-header">
                <span class="message-author"></span>
                <span class="message-timestamp"></span>
            </div>
            <div class="message-content">
                <div class="message-body"></div>
                <div class="message-attachments"></div>
            </div>
        </div>`
    );

    // Set message text content
    ele.querySelector(".message-author").innerText = message.author.username;
    ele.querySelector(".message-author").style.color = message.author.color;
    ele.querySelector(".message-timestamp").innerText = moment(message.timestamp).format("LT");
    ele.querySelector(".message-body").innerText = message.content;

    // Add tippy to the message timestamp
    tippy(ele.querySelector(".message-timestamp"), {
        content: moment(message.timestamp).format("LLLL"),
    });

    return ele;
}
