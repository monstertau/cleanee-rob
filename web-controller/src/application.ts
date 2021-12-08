import { ApplicationState, DisconnectedState } from "./application-state.js";
import { ApplicationUI } from "./application-ui.js";

export class Application {

    private applicationUI = new ApplicationUI();
    private applicationState: ApplicationState;

    constructor() {
        this.applicationState = new DisconnectedState();

        window.addEventListener("application-state-change", ((ev: CustomEvent<ApplicationState>) => {
            this.setState(ev.detail);
        }) as EventListener);
    }

    start() {
        this.applicationState.onEnter(this.applicationUI);
    }

    setState(newState: ApplicationState) {
        this.applicationState.onExit(this.applicationUI);
        this.applicationState = newState;
        this.applicationState.onEnter(this.applicationUI);
    }
}