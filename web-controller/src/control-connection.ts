/// <reference path="../node_modules/@types/paho-mqtt/index.d.ts" />

import { DisconnectedState } from "./state/disconnected-state";

export enum Direction {
    FORWARD = "forward",
    BACKWARD = "backward",
    LEFT = "left",
    RIGHT = "right"
}

/**
 * The control state is a representation of the actions the robot is executing.
 * Since we communicate with the robot through messages, this state is
 * maintained by the control connection and needs to be kept in sync.
 */
export interface ControlState {
    activeDirections: Set<Direction>;
}

/**
 * A control state listener is an object which can act on changes to the control
 * state of a connection.
 */
export interface ControlStateListener {
    onControlStateChange(newState: ControlState): void;
}

/**
 * The ControlConnection class encapsulates the operations that can be performed
 * on the robot. It keeps track of the control state and exposes methods to
 * interact with the robot.
 *
 * The observer pattern is used to notify objects on changes to the control
 * state of this connection.
 */
export class ControlConnection {

    private static readonly MQTTTopic = "ev3-robot";

    private readonly client: Paho.MQTT.Client;

    private movingInDirections: Set<Direction> = new Set();
    private controlStateListener: ControlStateListener | undefined = undefined;

    constructor(host: string, port: number) {
        this.client = new Paho.MQTT.Client(host, port, "web-controller");

        this.client.onMessageArrived = this.onMessageArrived.bind(this);
        this.client.onMessageDelivered = this.onMessageDelivered.bind(this);
        this.client.onConnectionLost = this.onDisconnected.bind(this);
    }

    /**
     * Assign an object to be notified when the control state changes.
     *
     * @param listener The new control state listener.
     */
    setControlStateListener(listener: ControlStateListener) {
        this.controlStateListener = listener;
    }

    /**
     * Connect to the robot.
     *
     * @returns A promise which resolves when a connection is established.
     */
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

    /**
     * Start moving in a certain direction. This method is idempotent, meaning
     * it can be called multiple times without explicitely stopping the movement
     * and it will appear as if only a single command was sent.
     *
     * @param direction The direction for which the command is given.
     */
    startDirection(direction: Direction): void {
        // Don't update the state if we are already moving in this direction.
        if (this.movingInDirections.has(direction)) {
            return;
        }

        this.movingInDirections.add(direction);
        this.send("start-movement", { direction });

        this.updateControlStateListener();
    }

    /**
     * Stop moving in a certain direction. This method is idemptotent, just like
     * {@link ControlConnection#startMoving}.
     *
     * @param direction The direction for which we want to stop moving.
     */
    stopDirection(direction: Direction): void {
        // Don't update the state if we are not moving in this direction.
        if (!this.movingInDirections.has(direction)) {
            return;
        }

        this.movingInDirections.delete(direction);
        this.send("stop-movement", { direction });
        this.updateControlStateListener();
    }

    private send(action: string, payload: any, qos: Paho.MQTT.Qos = 2, retained: boolean = false) {
        this.client.send(
            ControlConnection.MQTTTopic,
            JSON.stringify({ action, payload }),
            qos,
            retained
        );
    }

    private updateControlStateListener() {
        if (!this.controlStateListener) {
            return;
        }

        this.controlStateListener.onControlStateChange({
            // We want to copy the set 'movingInDirections' so we don't expose
            // a reference of it outside of this class.
            activeDirections: new Set(this.movingInDirections)
        });
    }

    private onConnected(o: Paho.MQTT.WithInvocationContext) {
        console.log('connected');
        console.log(o);
    }

    private onDisconnected(error: Paho.MQTT.MQTTError) {
        alert("Connection to the robot was lost.");

        this.enterDisconnectedState();
    }

    private onMessageArrived(message: Paho.MQTT.Message) {
        console.log('message arrived');
        console.log(message);
    }

    private onMessageDelivered(message: Paho.MQTT.Message) {
        console.log('message delivered');
        console.log(message);
    }

    private enterDisconnectedState(): void {
        const event = new CustomEvent("application-state-change", {
            detail: new DisconnectedState()
        });

        window.dispatchEvent(event);
    }
}