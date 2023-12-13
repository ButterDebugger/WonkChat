import { domParser } from "https://debutter.dev/x/js/utils.js@1.2";

export function createRoomTab(name) {
	let ele = domParser(
		`<div class="channel-tab">
            <span class="ic-raw ic-text-size ic-hashtag"></span>
            <span name="channel-name"></span>
        </div>`
	);

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
