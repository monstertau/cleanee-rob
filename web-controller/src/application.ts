import type { ApplicationState } from "./state/application-state.js";

import { ApplicationUI } from "./application-ui.js";
import { DisconnectedState } from "./state/disconnected-state.js";
import { RobotInput } from "./robot-input.js";
import { ConnectedState } from "./state/connected-state.js";
import { Host } from "./lib.js";
import { ControlConnection, MOCK_ROBOT_CONNECTION } from "./control-connection.js";

/**
 * The application class is the main entry point to the controller application.
 *
 * It uses the state pattern to manage interactions with the page. The state
 * can be changed from anywhere by dispatching the "application-state-change"
 * custom event to the global window object. The custom event must have the new
 * state assigned to the 'detail' property of the custom event.
 */
export class Application {

    public readonly robotInput = new RobotInput();

    private readonly applicationUI = new ApplicationUI();

    private applicationState: ApplicationState;

    constructor() {
        // this.applicationState = new ConnectedState(
        //     new Host("127.0.0.1", 8080),
        //     MOCK_ROBOT_CONNECTION
        // );

        this.applicationState = new DisconnectedState();

        window.addEventListener("application-state-change", ((ev: CustomEvent<ApplicationState>) => {
            this.setState(ev.detail);
        }) as EventListener);
    }

    start() {
        this.applicationState.onEnter(this, this.applicationUI);
    }

    /**
     * Switch the state of the application, calling the appropriate lifecycle
     * methods on the exiting and entering state.
     *
     * @param newState The new state to enter.
     */
    setState(newState: ApplicationState) {
        this.applicationState.onExit(this, this.applicationUI);
        this.applicationState = newState;
        this.applicationState.onEnter(this, this.applicationUI);
    }
}