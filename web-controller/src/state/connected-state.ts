import type { Application } from "../application.js";
import type { ApplicationUI } from "../application-ui.js";
import type { ControlStateListener, ControlConnection, ControlState } from "../control-connection.js";
import type { Host } from "../lib.js";

import { ArmAction } from "../robot-input.js";
import { Direction } from "../control-connection.js";
import { ApplicationState } from "./application-state";

/**
 * The disconnected state presents the user with a form that allows them to
 * connect to an MQTT broker and an IP webcam feed. If a successful connection
 * is established to both, the connected state is entered.
 */
export class ConnectedState implements ApplicationState, ControlStateListener {

    private movementStates: Element[] = [];
    private armStates: Element[] = [];

    constructor(
        private camHost: Host,
        private controlConnection: ControlConnection,
    ) {
        controlConnection.setControlStateListener(this);
    }

    onEnter(application: Application, applicationUI: ApplicationUI): void {
        applicationUI.showDiv("connected-state");

        applicationUI.getApplicationElement<HTMLImageElement>("camera-feed")
            .src = `http://${this.camHost}/mjpeg`;

        applicationUI.connectionStatus.textContent = "Connected";

        this.movementStates = this.getMovementStateElements(applicationUI);
        this.armStates = this.getArmStateElements(applicationUI);

        application.robotInput.setOnMovementHandler((x, y) => {
            this.controlConnection.updateMovement(x, y)
        });

        application.robotInput.setOnArmActionHandler(action => {
            this.controlConnection.dispatchArmAction(action);
        });
    }

    onExit(application: Application, applicationUI: ApplicationUI): void {
        this.movementStates = [];
        this.armStates = [];
        application.robotInput.clearHandlers();
    }

    onControlStateChange(newState: ControlState): void {
        if (!this.movementStates) {
            return;
        }

        [...this.movementStates, ...this.armStates].forEach(el => {
            el.classList.remove("active");
        });

        const activateMovementState = (direction: Direction) => {
            const el = this.movementStates
                .find(el => el.id === `direction-${direction}`);

            el?.classList.add("active");
        };

        newState.activeDirections.forEach(activateMovementState);

        const armStateEl = this.armStates.find(el => el.id === `arm-state-${newState.armMovement}`);
        if (armStateEl) {
            armStateEl.classList.add("active");
        }
    }

    private getMovementStateElements(applicationUI: ApplicationUI): Element[] {
        const containerEl = applicationUI.getApplicationElement("movement-states");
        return Array.from(containerEl.children);
    }

    private getArmStateElements(applicationUI: ApplicationUI): Element[] {
        const containerEl = applicationUI.getApplicationElement("arm-states");
        return Array.from(containerEl.children);
    }

    private setVideoSource(element: HTMLElement, source: string) {
        const sourceEl = document.createElement("source");
        sourceEl.src = source;
        sourceEl.type = "application/x-mpegURL";

        element.appendChild(sourceEl);
    }
}
