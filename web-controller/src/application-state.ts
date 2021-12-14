import { ApplicationUI } from "./application-ui.js";
import { ControlConnection } from "./control-connection.js";

export interface ApplicationState {
    onEnter(applicationUI: ApplicationUI): void;
    onExit(applicationUI: ApplicationUI): void;
}

class Host {
    constructor(
        public readonly address: string,
        public readonly port: number
    ) {}

    toString(): string {
        return `${this.address}:${this.port}`;
    }
}

type SuccessfulConnection = {
    status: "success";
}

type FailedConnection = {
    status: "failed";
    reason: string;
}

type ConnectionResult = SuccessfulConnection | FailedConnection;

export class DisconnectedState implements ApplicationState {

    static readonly CamIpFieldId = "cam-ip";
    static readonly CamPortFieldId = "cam-port";
    static readonly MqttIpFieldId = "mqtt-ip";
    static readonly MqttPortFieldId = "mqtt-port";

    private connectionDetailsForm: HTMLFormElement | undefined = undefined;
    private connectionErrorEl: HTMLElement | undefined = undefined;

    onEnter(applicationUI: ApplicationUI): void {
        this.connectionDetailsForm = applicationUI.getApplicationElement<HTMLFormElement>("connection-form");
        this.connectionDetailsForm?.addEventListener("submit", this.onConnectionFormSubmit.bind(this));

        this.connectionErrorEl = applicationUI.getApplicationElement("connection-error");

        applicationUI.connectionStatus.textContent = "Disconnected";
        applicationUI.showDiv("disconnected-state");
    }

    onExit(applicationUI: ApplicationUI): void {
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

        this.connectionDetailsForm?.children[0].setAttribute("disabled", "disabled");
        Promise.all([this.verifyCamIp(camHost), this.verifyMqttConnection(mqttConnection)])
            .then(([camConnectionResult, mqttConnectionResult]) => {
                const errors = [camConnectionResult, mqttConnectionResult]
                    .filter(res => res.status == "failed")
                    .map(res => (res as FailedConnection).reason)
                    .map(reason => `<li>${reason}</li>`);

                if (errors.length > 0 && this.connectionErrorEl) {
                    this.connectionErrorEl.innerHTML = `<ul>${errors.join("")}</ul>`;
                    this.connectionDetailsForm?.children[0].removeAttribute("disabled");
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
                this.connectionDetailsForm?.children[0].removeAttribute("disabled");
            });
    }

    private verifyMqttConnection(mqttConnection: ControlConnection): Promise<ConnectionResult> {
        return new Promise((resolve, reject) => {
            mqttConnection
                .connect()
                .then(() => resolve({ status: "success" }))
                .catch(reason => resolve({ status: "failed", reason }))
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
}

export class ConnectedState implements ApplicationState {

    constructor(
        private camHost: Host,
        private mqttConnection: ControlConnection,
    ) {}

    onEnter(applicationUI: ApplicationUI): void {
        applicationUI.showDiv("connected-state");
        applicationUI.getApplicationElement<HTMLImageElement>("camera-feed")
            .src = `http://${this.camHost}/video`;

        applicationUI.connectionStatus.textContent = "Connected";
    }

    onExit(applicationUI: ApplicationUI): void {
    }
}
