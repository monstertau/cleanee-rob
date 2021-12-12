/// <reference path="../node_modules/@types/paho-mqtt/index.d.ts" />

export class MQTTConnection {
    private client: Paho.MQTT.Client;

    constructor(host: string, port: number) {
        this.client = new Paho.MQTT.Client(host, port, "web-controller");

        this.client.onMessageArrived = this.onMessageArrived.bind(this);
        this.client.onMessageDelivered = this.onMessageDelivered.bind(this);
        this.client.onConnectionLost = this.onDisconnected.bind(this);
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.connect({
                onSuccess: (o: Paho.MQTT.WithInvocationContext) => {
                    this.onConnected(o);
                    resolve();
                },
                onFailure: (e: Paho.MQTT.ErrorWithInvocationContext) => {
                    reject(e.errorMessage);
                },
                timeout: 15,
            });
        });
    }

    private onConnected(o: Paho.MQTT.WithInvocationContext) {
        console.log('connected');
        console.log(o);
    }

    private onDisconnected(error: Paho.MQTT.MQTTError) {
        console.log('disconnected');
        console.log(error);
    }

    private onMessageArrived(message: Paho.MQTT.Message) {
        console.log('message arrived');
        console.log(message);
    }

    private onMessageDelivered(message: Paho.MQTT.Message) {
        console.log('message delivered');
        console.log(message);
    }
}