import type { Application } from "../application.js";
import type { ApplicationUI } from "../application-ui.js";
import type { ControlStateListener, ControlConnection, ControlState } from "../control-connection.js";

import { Direction } from "../control-connection.js";
import { Host } from "../lib";
import { ApplicationState } from "./application-state";

/**
 * The disconnected state presents the user with a form that allows them to
 * connect to an MQTT broker and an IP webcam feed. If a successful connection
 * is established to both, the connected state is entered.
 */
export class ConnectedState implements ApplicationState, ControlStateListener {

    private movementStates: Element[] = [];

    constructor(
        private camHost: Host,
        private controlConnection: ControlConnection,
    ) {
        controlConnection.setControlStateListener(this);
    }

    onEnter(application: Application, applicationUI: ApplicationUI): void {
        applicationUI.showDiv("connected-state");
        applicationUI.getApplicationElement<HTMLImageElement>("camera-feed")
            .src = `http://${this.camHost}/video`;

        applicationUI.connectionStatus.textContent = "Connected";

        this.movementStates = this.getMovementStateElements(applicationUI);

        application.robotInput.setOnInputHandler((x, y) => {
            this.controlConnection.updateMovement(x, y)
        });
    }

    onExit(application: Application, applicationUI: ApplicationUI): void {
        this.movementStates = [];
        application.robotInput.clearOnInputHandler();
    }

    onControlStateChange(newState: ControlState): void {
        if (!this.movementStates) {
            return;
        }

        this.movementStates.forEach(el => {
            el.classList.remove("active");
        });

        const activateMovementState = (direction: Direction) => {
            const el = this.movementStates
                .find(el => el.id === `direction-${direction}`);

            el?.classList.add("active");
        };

        newState.activeDirections.forEach(activateMovementState);
    }

    private getMovementStateElements(applicationUI: ApplicationUI): Element[] {
        const containerEl = applicationUI.getApplicationElement("movement-states");
        return Array.from(containerEl.children);
    }
}
