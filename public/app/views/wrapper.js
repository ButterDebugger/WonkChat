import { domParser } from "https://debutter.dev/x/js/utils.js@1.2";

const viewWrappers = new Map();

export function hasWrapper(key) {
    return viewWrappers.has(key);
}

export function getWrapper(key) {
    return viewWrappers.get(key);
}

export function getOrCreateWrapper(key) {
    if (viewWrappers.has(key)) return viewWrappers.get(key);

    let headerEle = domParser(`<div class="header"></div>`);
    let contentEle = domParser(`<div class="content"></div>`);
    let footerEle = domParser(`<div class="footer"></div>`);

    let wrapper = {
        header: headerEle,
        content: contentEle,
        footer: footerEle
    };

    viewWrappers.set(key, wrapper);
    return wrapper;
}
