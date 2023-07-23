const backdropEle = document.getElementById("modal-backdrop");

let lastModal = null;

export function openModal(ele, zIndex = 1000) {
    if (lastModal !== null) {
        closeModal(lastModal);
    }

    ele.classList.add("open");
    ele.style.setProperty("z-index", zIndex);
    showBackdrop(zIndex - 1);

    lastModal = ele;

    backdropEle.addEventListener("click", () => {
        closeModal(ele);
    }, {
        once: true
    });
}

export function closeModal(ele) {
    if (!(lastModal === ele)) return;

    ele.classList.remove("open");
    ele.style.removeProperty("z-index");
    hideBackdrop();

    lastModal = null;
}

export function showBackdrop(zIndex = 1000) {
    backdropEle.style.setProperty("z-index", zIndex);
    backdropEle.classList.add("show");
}

export function hideBackdrop() {
    backdropEle.style.removeProperty("z-index");
    backdropEle.classList.remove("show");
}
