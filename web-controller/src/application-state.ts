import { ApplicationUI } from "./application-ui.js";

export interface ApplicationState {
    onEnter(applicationUI: ApplicationUI): void;
    onExit(applicationUI: ApplicationUI): void;
}

export class DisconnectedState implements ApplicationState {

    static readonly CamIpFieldId = "cam-ip";
    static readonly MqttIpFieldId = "mqtt-ip";

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
            formData.get(DisconnectedState.CamIpFieldId) as string,
            formData.get(DisconnectedState.MqttIpFieldId) as string
        );
    }

    private initializeConnection(camIp: string, mqttIp: string): void {
        Promise.all([this.verifyCamIp(camIp), this.verifyMqttIp(mqttIp)])
            .then(([camFeed, _]) => {
                const event = new CustomEvent("application-state-change", {
                    detail: new ConnectedState(camFeed)
                });

                window.dispatchEvent(event);
            })
            .catch(reason => {
                if (this.connectionErrorEl) {
                    this.connectionErrorEl.textContent = reason;
                }
            });
    }

    private verifyMqttIp(mqttIp: string): Promise<void> {
        return Promise.resolve();
    }

    private verifyCamIp(camIp: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const feed = `http://${camIp}/video`;
            fetch(feed)
                .then(response => {
                    if (response.status == 200) {
                        resolve(`http://${camIp}`);
                    } else {
                        console.log(response);
                        reject(`Camera stream returned status ${response.status}`);
                    }
                })
                .catch(reason => reject(`Failed to connect to IP camera: ${reason}`));
        });
    }
}

export class ConnectedState implements ApplicationState {

    constructor(
        private camUrl: string
    ) {}

    onEnter(applicationUI: ApplicationUI): void {
        applicationUI.showDiv("connected-state");
        applicationUI.getApplicationElement<HTMLImageElement>("camera-feed")
            .src = `${this.camUrl}/video`;

        applicationUI.connectionStatus.textContent = "Connected";
    }

    onExit(applicationUI: ApplicationUI): void {
    }
}
