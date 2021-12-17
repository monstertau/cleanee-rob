import type { Application } from "../application.js";
import type { ApplicationUI } from "../application-ui.js";
import type { ApplicationState } from "./application-state.js";

import { ControlConnection } from "../control-connection.js";
import { Host } from "../lib.js";
import { ConnectedState } from "./connected-state.js";

type SuccessfulConnection = {
    status: "success";
};

type FailedConnection = {
    status: "failed";
    reason: string;
};

type ConnectionResult = SuccessfulConnection | FailedConnection;

/**
 * The disconnected state presents the user with a form that allows them to
 * connect to an MQTT broker and an IP webcam feed. If a successful connection
 * is established to both, the connected state is entered.
 */
export class DisconnectedState implements ApplicationState {

    // Constants used to retrieve data from the connection form.
    static readonly CamIpFieldId = "cam-ip";
    static readonly CamPortFieldId = "cam-port";
    static readonly MqttIpFieldId = "mqtt-ip";
    static readonly MqttPortFieldId = "mqtt-port";

    private connectionDetailsForm: HTMLFormElement | undefined = undefined;
    private connectionErrorEl: HTMLElement | undefined = undefined;

    onEnter(application: Application, applicationUI: ApplicationUI): void {
        this.connectionDetailsForm = applicationUI.getApplicationElement<HTMLFormElement>("connection-form");
        this.connectionDetailsForm?.addEventListener("submit", this.onConnectionFormSubmit.bind(this));

        this.connectionErrorEl = applicationUI.getApplicationElement("connection-error");

        applicationUI.connectionStatus.textContent = "Disconnected";
        applicationUI.showDiv("disconnected-state");
    }

    onExit(application: Application, applicationUI: ApplicationUI): void {
        this.connectionDetailsForm?.removeEventListener("submit", this.onConnectionFormSubmit.bind(this));
        this.connectionDetailsForm = undefined;
        this.connectionErrorEl = undefined;
    }

    private onConnectionFormSubmit(ev: Event): void {
        ev.preventDefault();

        const formData = new FormData(this.connectionDetailsForm);
        this.initializeConnection(
            new Host(
                formData.get(DisconnectedState.CamIpFieldId) as string,
                parseInt(formData.get(DisconnectedState.CamPortFieldId) as string)
            ),
            new Host(
                formData.get(DisconnectedState.MqttIpFieldId) as string,
                parseInt(formData.get(DisconnectedState.MqttPortFieldId) as string)
            )
        );
    }

    private initializeConnection(camHost: Host, mqttHost: Host): void {
        const mqttConnection = new ControlConnection(
            mqttHost.address,
            mqttHost.port
        );

        this.disableForm();

        Promise
            .all([
                this.verifyCamIp(camHost),
                this.verifyMqttConnection(mqttConnection)
            ])
            .then(([camConnectionResult, mqttConnectionResult]) => {
                if (this.handleErrors(camConnectionResult, mqttConnectionResult)) {
                    return;
                }

                const event = new CustomEvent("application-state-change", {
                    detail: new ConnectedState(camHost, mqttConnection)
                });

                window.dispatchEvent(event);
            })
            .catch(() => {
                if (this.connectionErrorEl) {
                    this.connectionErrorEl.textContent = "An unknown error occured.";
                }

                this.enableForm();
            });
    }

    private handleErrors(...connectionResults: ConnectionResult[]): boolean {
        const errors = connectionResults
            .filter(res => res.status == "failed")
            .map(res => (res as FailedConnection).reason)
            .map(reason => `<li>${reason}</li>`);

        if (errors.length === 0 || !this.connectionErrorEl) {
            return false;
        }

        this.connectionErrorEl.innerHTML = `<ul>${errors.join("")}</ul>`;
        this.enableForm();
        return true;
    }

    private verifyMqttConnection(mqttConnection: ControlConnection): Promise<ConnectionResult> {
        return new Promise((resolve, reject) => {
            mqttConnection
                .connect()
                .then(() => resolve({ status: "success" }))
                .catch(reason => resolve({ status: "failed", reason }));
        });
    }

    private verifyCamIp(camHost: Host): Promise<ConnectionResult> {
        return new Promise((resolve, reject) => {
            const feed = `http://${camHost}/video`;
            fetch(feed)
                .then(response => {
                    if (response.status == 200) {
                        resolve({ status: "success" });
                    } else {
                        console.log(response);
                        resolve({
                            status: "failed",
                            reason: `Camera stream returned status ${response.status}`
                        });
                    }
                })
                .catch(reason => resolve({
                    status: "failed",
                    reason: `Failed to connect to IP camera: ${reason}`
                }));
        });
    }

    private enableForm() {
        this.connectionDetailsForm?.children[0].removeAttribute("disabled");
    }

    private disableForm() {
        this.connectionDetailsForm?.children[0].setAttribute("disabled", "disabled");
    }
}