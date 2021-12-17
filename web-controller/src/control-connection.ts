/// <reference path="../node_modules/@types/paho-mqtt/index.d.ts" />

import { DisconnectedState } from "./state/disconnected-state.js";

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

type MoveCommand = {
    command: "move",
    metadata: {
        x: number,
        y: number
    }
};

// type RotateCommand = {
//     command: "rotate",
//     metadata: {
//         magnitude: number
//     }
// };

type RobotCommand = MoveCommand;

/**
 * The ControlConnection class encapsulates the operations that can be performed
 * on the robot. It keeps track of the control state and exposes methods to
 * interact with the robot.
 *
 * The observer pattern is used to notify objects on changes to the control
 * state of this connection.
 */
export class ControlConnection {

    private static readonly MQTTTopic = "topic/control";

    private readonly client: Paho.MQTT.Client;

    private movementMagnitude: number = 0;
    private rotationMagnitude: number = 0;

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
     * Update the movement of the robot with a new magnitude.
     *
     * @param magnitude The new magnitude of the movement the robot should
     *                  execute.
     */
    updateMovement(x: number, y: number): void {
        // Don't update the state if the magnitude matches already.
        // if (this.movementMagnitude === magnitude) {
        //     return;
        // }

        // this.verifyMagnitude(magnitude);

        // this.movementMagnitude = magnitude;
        this.send({
            command: "move",
            metadata: {
                x, y
            }
        });

        // No concurrent steering and moving.
        // if (this.movementMagnitude !== 0) {
        //     this.rotationMagnitude = 0;
        // }

        // this.updateControlStateListener();
    }

    /**
     * Update the rotation of the robot with a new magnitude.
     *
     * @param magnitude The new magnitude of the rotation the robot should
     *                  execute.
     */
    // updateRotation(magnitude: number): void {
    //     // Don't update the state if the magnitude matches already.
    //     if (this.rotationMagnitude === magnitude) {
    //         return;
    //     }

    //     this.verifyMagnitude(magnitude);

    //     this.rotationMagnitude = magnitude;
    //     this.send({
    //         command: "rotate",
    //         metadata: {
    //             magnitude
    //         }
    //     });

    //     // No concurrent steering and moving.
    //     if (this.rotationMagnitude !== 0) {
    //         this.movementMagnitude = 0;
    //     }

    //     this.updateControlStateListener();
    // }

    private verifyMagnitude(magnitude: number): void {
        if (magnitude < -1 || magnitude > 1) {
            throw new Error(`The magnitude value must be in range [-1, 1]. ${magnitude} given.`);
        }
    }

    private send(command: RobotCommand, qos: Paho.MQTT.Qos = 2, retained: boolean = false) {
        this.client.send(
            ControlConnection.MQTTTopic,
            JSON.stringify(command),
            qos,
            retained
        );
    }

    private updateControlStateListener() {
        if (!this.controlStateListener) {
            return;
        }

        const directions: Set<Direction> = new Set();
        if (this.movementMagnitude !== 0) {
            directions.add(
                this.movementMagnitude > 0 ? Direction.FORWARD : Direction.BACKWARD
            );
        }

        if (this.rotationMagnitude !== 0) {
            directions.add(
                this.rotationMagnitude > 0 ? Direction.RIGHT : Direction.LEFT
            );
        }

        this.controlStateListener.onControlStateChange({
            activeDirections: directions
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