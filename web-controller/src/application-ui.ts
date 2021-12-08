export class ApplicationUI {
    readonly connectionStatus: HTMLElement;
    private stateDivs: { [key: string]: HTMLElement } = {};

    constructor() {
        this.connectionStatus = this.getConnectionStatusElement();
        this.stateDivs = Array.from(document.getElementsByClassName("state-div"))
            .reduce((acc, el: Element) => ({ ...acc, [el.id]: el }), {});
    }

    private getConnectionStatusElement(): HTMLElement {
        return this.getApplicationElement("connection-status");
    }

    showDiv(id: string): void {
        if (!(id in this.stateDivs)) {
            throw new Error(`Unknown state div: ${id}`);
        }

        // Hide all state divs.
        Object.values(this.stateDivs).forEach(el => el.classList.remove("active"));

        this.stateDivs[id].classList.add("active");
    }

    getApplicationElement<T extends HTMLElement>(id: string): T {
        const el = document.getElementById(id);
        if (!el) {
            throw new Error(`Could not find element: #${id}.`);
        }

        return el as T;
    }
}
