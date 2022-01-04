/// <reference path="../node_modules/@types/paho-mqtt/index.d.ts" />

import { Host } from "./lib.js";
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
    activeDirections: Map<Direction, number>;
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

type SwitchStateCommand = {
    command: "switch_state";
    metadata: {
        new_state: "grabbing" | "roaming" | "commands";
    };
}

type SwitchAIEnabled = {
    command: "set_ai_active";
    metadata: {
        active: boolean;
    };
};

type RobotCommand =
    | MoveCommand
    | ArmInCommand
    | ArmOutCommand
    | ArmResetPositionCommand
    | ArmSavePositionCommand
    | ArmStopCommand
    | SwitchStateCommand
    | SwitchAIEnabled;

export interface IControlConnection {
    host: Host;
    setControlStateListener(listener: ControlStateListener): void;
    connect(): Promise<void>;
    disconnect(): void;
    updateMovement(x: number, y: number): void;
    dispatchArmAction(action: ArmAction): void;
    setAIEnabled(active: boolean): void;
}

/**
 * The ControlConnection class encapsulates the operations that can be performed
 * on the robot. It keeps track of the control state and exposes methods to
 * interact with the robot.
 *
 * The observer pattern is used to notify objects on changes to the control
 * state of this connection.
 */
export class ControlConnection implements IControlConnection {

    private static readonly ControlTopic = "topic/control";
    private static readonly ConnectTopic = "topic/connect";
    private static readonly Timeout = 15; // seconds

    private readonly client: Paho.MQTT.Client;
    private readonly lastWillTestament: Paho.MQTT.Message;
    private finishConnection: ((value: void | PromiseLike<void>) => void) | null = null;
    private connectTimeoutHandle = 0;
    private connected = false;

    private movement = { x: 0, y: 0 };
    private lastArmAction: ArmAction | null = null;
    private armMovement = ArmMovement.NONE;

    private controlStateListener: ControlStateListener | undefined = undefined;

    constructor(host: string, port: number) {
        this.client = new Paho.MQTT.Client(host, port, "web-controller");

        this.client.onMessageArrived = this.onMessageArrived.bind(this);
        this.client.onConnectionLost = this.onDisconnected.bind(this);

        this.lastWillTestament = new Paho.MQTT.Message(`close_con:${this.client.clientId}`);
        this.lastWillTestament.destinationName = ControlConnection.ConnectTopic;
    }

    get host(): Host {
        return new Host(this.client.host, this.client.port);
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
                willMessage: this.lastWillTestament,
                onSuccess: (o: Paho.MQTT.WithInvocationContext) => {
                    this.client.subscribe(ControlConnection.ConnectTopic);

                    this.client.send(
                        ControlConnection.ConnectTopic,
                        `init_con:${this.client.clientId}`,
                        2
                    );

                    // Give the rest of the class the possibility to "resolve"
                    // this promise when the end-to-end connection has been
                    // established.
                    this.finishConnection = resolve;

                    this.connectTimeoutHandle = setTimeout(() => {
                        reject("Timeout reached: robot did not respond.");
                        this.finishConnection = null;
                    }, ControlConnection.Timeout * 1000);
                },
                onFailure: (e: Paho.MQTT.ErrorWithInvocationContext) => {
                    reject(e.errorMessage);
                },
                timeout: ControlConnection.Timeout,
            });
        });
    }

    disconnect() {
        this.client.send(this.lastWillTestament);
        this.client.disconnect();
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

    setAIEnabled(active: boolean) {
        this.send({ command: "set_ai_active", metadata: { active }});
    }

    private verifyAxis(axis: number): void {
        if (axis < -1 || axis > 1) {
            throw new Error(`The axis value must be in range [-1, 1]. ${axis} given.`);
        }
    }

    private send(command: RobotCommand, qos: Paho.MQTT.Qos = 2, retained: boolean = false) {
        this.client.send(
            this.controlTopic,
            JSON.stringify(command),
            qos,
            retained
        );
    }

    private updateControlStateListener() {
        if (!this.controlStateListener) {
            return;
        }

        const directions = new Map();
        if (this.movement.x < 0) {
            directions.set(Direction.LEFT, Math.abs(this.movement.x));
        }

        if (this.movement.x > 0) {
            directions.set(Direction.RIGHT, Math.abs(this.movement.x));
        }

        if (this.movement.y < 0) {
            directions.set(Direction.BACKWARD, Math.abs(this.movement.y));
        }

        if (this.movement.y > 0) {
            directions.set(Direction.FORWARD, Math.abs(this.movement.y));
        }

        this.controlStateListener.onControlStateChange({
            activeDirections: directions,
            armMovement: this.armMovement
        });
    }

    private onDisconnected(error: Paho.MQTT.MQTTError) {
        this.enterDisconnectedState();
    }

    private onMessageArrived(message: Paho.MQTT.Message) {
        if (message.destinationName === ControlConnection.ConnectTopic) {
            this.handleConnectionMessage(message);
        } else if (message.destinationName === this.controlTopic) {
            this.handleControlMessage(message.payloadString);
        }
    }

    private handleControlMessage(payload: string) {
        const deserialized = JSON.parse(payload);

        if (!this.isCommand(deserialized)) {
            return;
        }

        switch (deserialized.command) {
            case "move":
                this.movement = deserialized.metadata;
                break;

            case "arm_in":
                this.armMovement = ArmMovement.UP;
                break;

            case "arm_out":
                this.armMovement = ArmMovement.DOWN;
                break;

            case "arm_stop":
                this.armMovement = ArmMovement.NONE;
                break;

            case "switch_state":
                this.movement = { x: 0, y: 0 };
                break;
        }

        this.updateControlStateListener();
    }

    private isCommand(obj: object): obj is RobotCommand {
        return "command" in obj && "metadata" in obj;
    }

    private handleConnectionMessage(message: Paho.MQTT.Message): void {
        const CON_OK_PREFIX = "con_ok:";
        const CLOSE_CON_PREFIX = "close_con:";
        const payload = message.payloadString;

        if (!this.connected && payload.startsWith(CON_OK_PREFIX) && this.finishConnection) {
            clearTimeout(this.connectTimeoutHandle);
            this.connectTimeoutHandle = 0;

            const robot_client_id = payload.substring(CON_OK_PREFIX.length);

            this.client.send(
                ControlConnection.ConnectTopic,
                `con_ok:${this.client.clientId}:${robot_client_id}`,
                2
            );

            this.client.subscribe(this.controlTopic);

            this.finishConnection();
            this.finishConnection = null;
            this.connected = true;
        } else if (this.connected && payload.startsWith(CLOSE_CON_PREFIX)) {
            this.enterDisconnectedState();
        }
    }

    private enterDisconnectedState(): void {
        alert("Connection to the robot was lost.");

        this.connected = false;

        const event = new CustomEvent("application-state-change", {
            detail: new DisconnectedState()
        });

        window.dispatchEvent(event);
    }

    private get controlTopic(): string {
        return `${ControlConnection.ControlTopic}/${this.client.clientId}`;
    }
}

export const MOCK_ROBOT_CONNECTION: IControlConnection = {
    host: new Host("127.0.0.1", 1883),
    setControlStateListener(listener: ControlStateListener) {},
    connect(): Promise<void> {
        return Promise.resolve();
    },

    disconnect() {},

    updateMovement(x: number, y: number) {},
    dispatchArmAction(action: ArmAction) {},
    setAIEnabled(active: boolean) {}
};