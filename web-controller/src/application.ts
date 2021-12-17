import type { ApplicationState } from "./state/application-state.js";

import { ApplicationUI } from "./application-ui.js";
import { DisconnectedState } from "./state/disconnected-state.js";
import { GamepadUI } from "./gamepad-ui.js";
import { RobotInput } from "./robot-input.js";

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

    private applicationUI = new ApplicationUI();
    private gamepadUI = new GamepadUI(this.robotInput, this.applicationUI);

    private applicationState: ApplicationState;

    constructor() {
        this.applicationState = new DisconnectedState();

        window.addEventListener("application-state-change", ((ev: CustomEvent<ApplicationState>) => {
            this.setState(ev.detail);
        }) as EventListener);

        this.robotInput.setOnInputHandler((x, y) => console.log(`Updating input: (${x}, ${y})`));
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