/// <reference path="../node_modules/@types/paho-mqtt/index.d.ts" />

import { ArmAction } from "./robot-input.js";
import { DisconnectedState } from "./state/disconnected-state.js";

export enum Direction {
    FORWARD = "forward",
    BACKWARD = "backward",
    LEFT = "left",
    RIGHT = "right"
}

export enum ArmMovement {
    UP = "up",
    DOWN = "down",
    NONE = "none"
}

/**
 * The control state is a representation of the actions the robot is executing.
 * Since we communicate with the robot through messages, this state is
 * maintained by the control connection and needs to be kept in sync.
 */
export interface ControlState {
    activeDirections: Set<Direction>;
    armMovement: ArmMovement;
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

type ArmInCommand = {
    command: "arm_in"
};

type ArmOutCommand = {
    command: "arm_out"
};

type ArmResetPositionCommand = {
    command: "arm_reset_position"
};

type ArmSavePositionCommand = {
    command: "arm_set_position"
};

type ArmStopCommand = {
    command: "arm_stop"
};

type RobotCommand =
    | MoveCommand
    | ArmInCommand
    | ArmOutCommand
    | ArmResetPositionCommand
    | ArmSavePositionCommand
    | ArmStopCommand;

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

    private movement = { x: 0, y: 0 };
    private lastArmAction: ArmAction | null = null;
    private armMovement = ArmMovement.NONE;

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
     */
    updateMovement(x: number, y: number): void {
        // Don't update the state if the movement matches already.
        if (this.movement.x === x && this.movement.y === y) {
            return;
        }

        this.verifyAxis(x);
        this.verifyAxis(y);

        // this.movementMagnitude = magnitude;
        this.send({
            command: "move",
            metadata: {
                x, y
            }
        });

        this.movement.x = x;
        this.movement.y = y;

        this.updateControlStateListener();
    }

    dispatchArmAction(action: ArmAction) {
        if (this.lastArmAction === action) {
            return;
        }

        this.lastArmAction = action;

        switch (action) {
            case ArmAction.STOP:
                this.send({ command: "arm_stop" });
                this.armMovement = ArmMovement.NONE;
                break;

            case ArmAction.IN:
                this.send({ command: "arm_in" });
                this.armMovement = ArmMovement.UP;
                break;

            case ArmAction.OUT:
                this.send({ command: "arm_out" });
                this.armMovement = ArmMovement.DOWN;
                break;

            case ArmAction.RESET:
                this.send({ command: "arm_reset_position" });
                this.armMovement = ArmMovement.NONE;
                break;

            case ArmAction.SAVE:
                this.send({ command: "arm_set_position" });
                this.armMovement = ArmMovement.NONE;
                break;
        }

        this.updateControlStateListener();
    }

    private verifyAxis(axis: number): void {
        if (axis < -1 || axis > 1) {
            throw new Error(`The axis value must be in range [-1, 1]. ${axis} given.`);
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
        if (this.movement.y !== 0) {
            directions.add(
                this.movement.y > 0 ? Direction.FORWARD : Direction.BACKWARD
            );
        }

        if (this.movement.x !== 0) {
            directions.add(
                this.movement.x > 0 ? Direction.RIGHT : Direction.LEFT
            );
        }

        this.controlStateListener.onControlStateChange({
            activeDirections: directions,
            armMovement: this.armMovement
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
    }

    private enterDisconnectedState(): void {
        const event = new CustomEvent("application-state-change", {
            detail: new DisconnectedState()
        });

        window.dispatchEvent(event);
    }
}