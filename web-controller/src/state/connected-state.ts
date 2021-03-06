import type { Application } from "../application.js";
import type { ApplicationUI } from "../application-ui.js";
import type { ControlStateListener, IControlConnection, ControlState } from "../control-connection.js";
import type { Host } from "../lib.js";

import { ApplicationState } from "./application-state";

/**
 * The disconnected state presents the user with a form that allows them to
 * connect to an MQTT broker and an IP webcam feed. If a successful connection
 * is established to both, the connected state is entered.
 */
export class ConnectedState implements ApplicationState, ControlStateListener {

    private movementStates: HTMLElement[] = [];
    private armStates: Element[] = [];

    constructor(
        private camHost: Host,
        private controlConnection: IControlConnection,
        private cvHost: Host,
    ) {
        controlConnection.setControlStateListener(this);
    }

    onEnter(application: Application, applicationUI: ApplicationUI): void {
        const feedEl = applicationUI.getApplicationElement<HTMLImageElement>("camera-feed")
            .querySelector("img");
        if (!feedEl) throw new Error("Unable to find feed element.");

        const cvFeed = applicationUI.getApplicationElement<HTMLImageElement>("cv-feed")
            .querySelector("img");
        if (!cvFeed) throw new Error("Unable to find feed element.");

        feedEl.src = `http://${this.camHost}/mjpeg`;
        cvFeed.src = `http://${this.cvHost}/mjpeg`;

        this.movementStates = this.getMovementStateElements(applicationUI);

        applicationUI.getApplicationElement("mqtt-address").textContent = this.controlConnection.host.toString();
        applicationUI.getApplicationElement("webcam-address").textContent = this.camHost.toString();

        application.robotInput.setOnMovementHandler((x, y) => {
            this.controlConnection.updateMovement(x, y)
        });

        application.robotInput.setOnArmActionHandler(action => {
            this.controlConnection.dispatchArmAction(action);
        });

        const aiEnabledCheckbox = applicationUI.getApplicationElement<HTMLInputElement>("ai-switch");

        aiEnabledCheckbox.checked = false;
        this.controlConnection.setAIEnabled(false);

        aiEnabledCheckbox.onchange = () => {
            this.controlConnection.setAIEnabled(aiEnabledCheckbox.checked);
        };

        applicationUI.showDiv("connected-state");
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

        this.movementStates.forEach(el => {
            el.style.setProperty("--opacity", "0");
        });

        newState.activeDirections.forEach((magnitude, direction) => {
            const el = this.movementStates
                .find(el => el.id === `movement-${direction}`);

            el?.style.setProperty("--opacity", `${magnitude}`);
        });

        const armStateEl = this.movementStates.find(el => el.id === `arm-${newState.armMovement}`);
        armStateEl?.style.setProperty("--opacity", "0.5");
    }

    private getMovementStateElements(applicationUI: ApplicationUI): HTMLElement[] {
        const containerEl = applicationUI.getApplicationElement("movement-states");
        return Array.from(containerEl.children) as HTMLElement[];
    }
}
