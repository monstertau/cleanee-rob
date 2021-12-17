type OnInput = (x: number, y: number) => void;

abstract class RobotInputBase {
    protected onInput: OnInput | undefined = undefined;

    setOnInputHandler(handler: OnInput) {
        this.onInput = handler;
    }

    clearOnInputHandler() {
        this.onInput = undefined;
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

        if (this.onInput) {
            this.onInput(x_axis, y_axis);
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
        if (!this.onInput) {
            return;
        }

        switch (e.code) {
            case 'KeyW':
                this.onInput(0, 1);
                break;

            case 'KeyS':
                this.onInput(0, -1);
                break;

            case 'KeyA':
                this.onInput(-1, 0);
                break;

            case 'KeyD':
                this.onInput(1, 0);
                break;
        }
    }

    private onKeyUp(e: KeyboardEvent) {
        if (!this.onInput) {
            return;
        }

        switch (e.code) {
            case 'KeyW':
                this.onInput(0, 0);
                break;

            case 'KeyS':
                this.onInput(0, 0);
                break;

            case 'KeyA':
                this.onInput(0, 0);
                break;

            case 'KeyD':
                this.onInput(0, 0);
                break;
        }
    }
}

export class RobotInput extends RobotInputBase {

    private readonly keyboardInput = new KeyboardInput();
    private gamepadInput: GamepadInput | undefined = undefined;

    constructor() {
        super();

        this.keyboardInput.setOnInputHandler((x, y) => {
            if (this.onInput) {
                this.onInput(x, y);
            }
        });
    }

    clearGamepadInput() {
        this.gamepadInput?.clearOnInputHandler();
        this.gamepadInput = undefined;
    }

    setGamepad(gamepad: Gamepad) {
        this.gamepadInput = new GamepadInput(gamepad);
        this.gamepadInput.setOnInputHandler((x, y) => {
            if (this.onInput) {
                this.onInput(x, y);
            }
        });
    }
}