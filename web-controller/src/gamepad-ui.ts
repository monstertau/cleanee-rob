import { ApplicationUI } from "./application-ui.js";
import type { RobotInput } from "./robot-input.js";

export class GamepadUI {

    private readonly refreshButton: HTMLButtonElement;
    private readonly statusLabel: HTMLElement;

    private connectedGamepad: Gamepad | undefined = undefined;

    constructor(
        private robotInput: RobotInput,
        applicationUI: ApplicationUI,
    ) {
        this.refreshButton = applicationUI.getApplicationElement("check-gamepads");
        this.statusLabel = applicationUI.getApplicationElement("gamepad-status");

        this.refreshButton.addEventListener("click", () => {
            this.pollGamepads();
        });

        window.addEventListener("gamepaddisconnected", ev => {
            if (ev.gamepad === this.connectedGamepad) {
                this.connectedGamepad = undefined;
                this.robotInput.clearGamepadInput();

                this.setStatus("Gamepad connection lost.");
            }
        });
    }

    private pollGamepads() {
        const gamepads = window.navigator.getGamepads()
            .filter(pad => pad !== null) as Gamepad[];

        if (gamepads.length === 0) {
            this.setStatus("No gamepads found.");
            return;
        }

        this.connectedGamepad = gamepads[0];
        this.robotInput.setGamepad(this.connectedGamepad);
        this.setStatus("Found gamepad.");
    }

    private setStatus(status: string) {
        this.statusLabel.textContent = status;
    }
}