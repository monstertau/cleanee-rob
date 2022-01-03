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

    constructor() {
        super();
    }

    setOnMovementHandler(handler: OnMovement) {
        this.keyboardInput.setOnMovementHandler(handler);
    }

    setOnArmActionHandler(handler: OnArmAction) {
        this.keyboardInput.setOnArmActionHandler(handler);
    }
}