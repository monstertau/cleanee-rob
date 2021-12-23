type OnMovement = (x: number, y: number) => void;

export enum ArmAction {
    IN,
    OUT,
    GRAB,
    RESET,
    SAVE,
    STOP
}

type OnArmAction = (action: ArmAction) => void;

abstract class RobotInputBase {

    private static readonly NOOP_HANDLER = () => {};

    protected onMovement: OnMovement = RobotInputBase.NOOP_HANDLER;
    protected onArmAction: OnArmAction = RobotInputBase.NOOP_HANDLER;

    setOnMovementHandler(handler: OnMovement) {
        this.onMovement = handler;
    }

    setOnArmActionHandler(handler: OnArmAction) {
        this.onArmAction = handler;
    }

    clearHandlers() {
        this.onMovement = RobotInputBase.NOOP_HANDLER;
        this.onArmAction = RobotInputBase.NOOP_HANDLER;
    }
}

/**
 * Handle gamepad input and trigger an OnInput event when the gamepad state
 * changes. Since gamepad axes are continuous instead of discreet, and we only
 * want to increment set steps, the values will be stored with 2 decimals
 * precision where possible. This might not be 100% precise technically, but
 * good enough for us.
 */
class GamepadInput extends RobotInputBase {

    /**
     * The number of decimals for precision.
     */
    private static PRECISION = 1;

    /**
     * Which axes on the gamepad control the robot.
     */
    private static X_AXIS = 0;
    private static Y_AXIS = 1;

    private readonly pollIntervalHandle: number;

    private onGamepadDisconnected: (() => void) | undefined = undefined;
    private lastPolledXAxisValue: number = 0;
    private lastPolledYAxisValue: number = 0;

    /**
     * Create a new GamepadInput instance.
     *
     * @param gamepad The gamepad to act as a source.
     * @param pollingRate The number of times per second the state of the gamepad
     * axes should be polled.
     */
    constructor(private gamepad: Gamepad, private readonly pollingRate = 10) {
        super();

        this.pollIntervalHandle = setInterval(
            this.pollGamepad.bind(this),
            1000 / pollingRate
        );
    }

    setGamepadDisconnectedHandler(handler: () => void) {
        this.onGamepadDisconnected = handler;
    }

    private pollGamepad() {
        this.checkConnected();

        const x_axis = this.round(this.gamepad.axes[GamepadInput.X_AXIS]);

        // For the robot, positive y is forward, whereas on the controller, moving
        // the thumbstick up gives a negative y.
        const y_axis = -this.round(this.gamepad.axes[GamepadInput.Y_AXIS]);

        if (x_axis === this.lastPolledXAxisValue && y_axis === this.lastPolledYAxisValue) {
            return;
        }

        this.lastPolledXAxisValue = x_axis;
        this.lastPolledYAxisValue = y_axis;

        if (this.onMovement) {
            this.onMovement(x_axis, y_axis);
        }
    }

    private checkConnected() {
        if (this.gamepad.connected) {
            return;
        }

        clearInterval(this.pollIntervalHandle);

        if (!!this.onGamepadDisconnected) {
            this.onGamepadDisconnected();
            this.onGamepadDisconnected = undefined;
        }
    }

    private round(axis: number): number {
        return Math.round(axis * (10 ** GamepadInput.PRECISION)) / 10 ** GamepadInput.PRECISION;
    }
}

class KeyboardInput extends RobotInputBase {

    private readonly onKeyDownHandler: (ev: KeyboardEvent) => void;
    private readonly onKeyUpHandler: (ev: KeyboardEvent) => void;

    constructor() {
        super();

        this.onKeyDownHandler = this.onKeyDown.bind(this);
        this.onKeyUpHandler = this.onKeyUp.bind(this);

        window.addEventListener("keydown", this.onKeyDownHandler);
        window.addEventListener("keyup", this.onKeyUpHandler);
    }

    private onKeyDown(e: KeyboardEvent) {
        switch (e.code) {
            case 'KeyW':
                this.onMovement(0, 1);
                break;

            case 'KeyS':
                this.onMovement(0, -1);
                break;

            case 'KeyA':
                this.onMovement(-1, 0);
                break;

            case 'KeyD':
                this.onMovement(1, 0);
                break;

            case 'KeyR':
                this.onArmAction(ArmAction.RESET);
                break;

            case 'KeyF':
                this.onArmAction(ArmAction.SAVE);
                break;

            case 'KeyQ':
                this.onArmAction(ArmAction.OUT);
                break;

            case 'KeyE':
                this.onArmAction(ArmAction.IN);
                break;

            case 'KeyX':
                this.onArmAction(ArmAction.GRAB);
                break;
        }
    }

    private onKeyUp(e: KeyboardEvent) {
        switch (e.code) {
            case 'KeyW':
                this.onMovement(0, 0);
                break;

            case 'KeyS':
                this.onMovement(0, 0);
                break;

            case 'KeyA':
                this.onMovement(0, 0);
                break;

            case 'KeyD':
                this.onMovement(0, 0);
                break;

            case 'KeyQ':
            case 'KeyE':
                this.onArmAction(ArmAction.STOP);
                break;
        }
    }
}

export class RobotInput extends RobotInputBase {

    private readonly keyboardInput = new KeyboardInput();
    private gamepadInput: GamepadInput | undefined = undefined;

    constructor() {
        super();
    }

    setOnMovementHandler(handler: OnMovement) {
        this.keyboardInput.setOnMovementHandler(handler);
    }

    setOnArmActionHandler(handler: OnArmAction) {
        this.keyboardInput.setOnArmActionHandler(handler);
    }

    clearGamepadInput() {
        this.gamepadInput?.clearHandlers();
        this.gamepadInput = undefined;
    }

    setGamepad(gamepad: Gamepad) {
        this.gamepadInput = new GamepadInput(gamepad);
        this.gamepadInput.setOnMovementHandler((x, y) => {
            if (this.onMovement) {
                this.onMovement(x, y);
            }
        });
    }
}