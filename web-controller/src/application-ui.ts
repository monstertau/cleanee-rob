/**
 * The ApplicationUI class is the interaction between application state and the
 * DOM. It provides convenient methods to change "global" UI state, or switch
 * which "state-div" to show.
 *
 * A "state-div" is a div in index.html which encompasses the UI for any given
 * application state. This means only one "state-div" can be active at any given
 * time. The state itself is responsible for triggering the appropriate div to
 * be visible through calling the {@link ApplicationUI#showDiv} method.
 */
export class ApplicationUI {
    /**
     * The HTMLElement that indicates the connection status to the user.
     */
    readonly connectionStatus: HTMLElement;

    private readonly stateDivs: { [key: string]: HTMLElement } = {};

    constructor() {
        this.connectionStatus = this.getConnectionStatusElement();
        this.stateDivs = this.buildStateDivCache();
    }

    /**
     * Show a state-div, and hide any other shown state div.
     *
     * @param id The id of the state-div to show.
     */
    showDiv(id: string): void {
        if (!(id in this.stateDivs)) {
            throw new Error(`Unknown state div: ${id}`);
        }

        this.hideAllStateDivs();
        this.showStateDiv(id);
    }

    /**
     * A wrapper around {@link Document#getElementById}, which throws an error
     * if no element exists with the given id.
     *
     * The reason for this, over directly using {@link Document#getElementById},
     * is to make it more clear when an element is queried that does not exist.
     *
     * @param id The id of the element.
     * @returns The HTMLElement with the given id.
     */
    getApplicationElement<T extends HTMLElement>(id: string): T {
        const el = document.getElementById(id);
        if (!el) {
            throw new Error(`Could not find element: #${id}.`);
        }

        return el as T;
    }

    private getConnectionStatusElement(): HTMLElement {
        return this.getApplicationElement("connection-status");
    }

    private buildStateDivCache(): { [key: string]: HTMLElement } {
        return Array
            .from(document.getElementsByClassName("state-div"))
            .reduce((acc, el: Element) => ({ ...acc, [el.id]: el }), {});
    }

    private hideAllStateDivs(): void {
        Object
            .values(this.stateDivs)
            .forEach(el => el.classList.remove("active"));
    }

    private showStateDiv(id: string) {
        this.stateDivs[id].classList.add("active");
    }
}
