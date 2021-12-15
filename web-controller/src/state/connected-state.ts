import type { ApplicationUI } from "../application-ui";
import type { ControlStateListener, ControlConnection, ControlState } from "../control-connection";

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

    onEnter(applicationUI: ApplicationUI): void {
        applicationUI.showDiv("connected-state");
        applicationUI.getApplicationElement<HTMLImageElement>("camera-feed")
            .src = `http://${this.camHost}/video`;

        applicationUI.connectionStatus.textContent = "Connected";

        this.movementStates = this.getMovementStateElements(applicationUI);

        this.setupKeyboardListener();
    }

    onExit(applicationUI: ApplicationUI): void {
        this.movementStates = [];
        this.removeKeyboardListener();
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

    private onKeyDown(e: KeyboardEvent) {
        switch (e.code) {
            case 'KeyW':
                this.controlConnection.startDirection(Direction.FORWARD);
                break;

            case 'KeyS':
                this.controlConnection.startDirection(Direction.BACKWARD);
                break;

            case 'KeyA':
                this.controlConnection.startDirection(Direction.LEFT);
                break;

            case 'KeyD':
                this.controlConnection.startDirection(Direction.RIGHT);
                break;
        }
    }

    private onKeyUp(e: KeyboardEvent) {
        switch (e.code) {
            case 'KeyW':
                this.controlConnection.stopDirection(Direction.FORWARD);
                break;

            case 'KeyS':
                this.controlConnection.stopDirection(Direction.BACKWARD);
                break;

            case 'KeyA':
                this.controlConnection.stopDirection(Direction.LEFT);
                break;

            case 'KeyD':
                this.controlConnection.stopDirection(Direction.RIGHT);
                break;
        }
    }

    private setupKeyboardListener() {
        window.addEventListener("keydown", this.onKeyDown.bind(this));
        window.addEventListener("keyup", this.onKeyUp.bind(this));
    }

    private removeKeyboardListener() {
        window.removeEventListener("keydown", this.onKeyDown.bind(this));
        window.removeEventListener("keyup", this.onKeyUp.bind(this));
    }

    private getMovementStateElements(applicationUI: ApplicationUI): Element[] {
        const containerEl = applicationUI.getApplicationElement("movement-states");
        return Array.from(containerEl.children);
    }
}
