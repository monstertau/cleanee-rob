import type { ApplicationUI } from "../application-ui.js";
import type { Application } from "../application.js";

/**
 * An interface that describes an application state. It exposes lifecycle
 * methods used to manage resources within the state implementation.
 */
export interface ApplicationState {
    /**
     * Called when the state is activated.
     *
     * @param applicationUI An application UI instance.
     */
    onEnter(application: Application, applicationUI: ApplicationUI): void;

    /**
     * Called when the state is exited.
     *
     * @param applicationUI An application UI instance.
     */
    onExit(application: Application, applicationUI: ApplicationUI): void;
}
