import cv2
from os import path
from typing import Tuple
import yaml

from core.detection import DetectionConfig, BufferlessVideoCapture, BottleDetector
from core.instructions import *
from core.mqtt_connection import ConnectionConfig, MqttConnection
from core.video_server import run_mjpeg_server

CONFIG_NAME = "config.yml"


def load_config() -> Tuple[ConnectionConfig, DetectionConfig]:
    """
    Loads the yaml config into memory. The config file has unique values for
    each environment, and is therefore not committed to the repository. There
    is, however, an example file that contains the keys required by the program
    to work. It should be copied and renamed to the value of the CONFIG_NAME
    constant.
    """

    MQTT_CONFIG_KEYS = ["host", "port", "keep_alive", "topic"]
    DETECTION_CONFIG_KEYS = ["image_url", "failed_detection_threshold", "bottom_blackout_height", "start_pickup_vdist"]

    config_path = path.join(
        path.dirname(path.realpath(__file__)),
        CONFIG_NAME
    )

    if not path.isfile(config_path):
        print(
            "Failed to load config file {} at {}. ".format(CONFIG_NAME, config_path) +
            "Make sure you duplicated the config.example.yml, renamed it to " +
            "{} and set the correct values for your environment.".format(CONFIG_NAME)
        )

        return None

    with open(config_path, 'r') as config_file:
        parsed_config = yaml.full_load(config_file)

    def verify_keys(dict_key: str, keys: list) -> bool:
        config = parsed_config[dict_key]
        missing_keys = False
        for key in keys:
            if not key in config:
                missing_keys = True
                print("Missing key '{}.{}' in the config file.".format(dict_key, key))

        return not missing_keys

    if not verify_keys("mqtt_server", MQTT_CONFIG_KEYS) or not verify_keys("detection", DETECTION_CONFIG_KEYS):
        return None

    connection_config = ConnectionConfig(
        parsed_config["mqtt_server"].get("host"),
        parsed_config["mqtt_server"].get("port"),
        parsed_config["mqtt_server"].get("keep_alive"),
        parsed_config["mqtt_server"].get("topic")
    )

    detection_config = DetectionConfig(
        parsed_config["detection"].get("image_url"),
        parsed_config["detection"].get("failed_detection_threshold"),
        parsed_config["detection"].get("bottom_blackout_height"),
        parsed_config["detection"].get("start_pickup_vdist")
    )

    return (connection_config, detection_config)


def discard_bottom_pixels(frame, frame_width, frame_height, discard_height):
    return cv2.rectangle(
        frame,
        (0, frame_height - discard_height),
        (frame_width, frame_height),
        (0, 0, 0),
        cv2.FILLED
    )


def main():
    main.run_model = False
    config_load_result = load_config()
    if config_load_result is None:
        return

    connection_config, detection_config = config_load_result

    mqtt_connection = MqttConnection(connection_config)
    detector = BottleDetector(detection_config.failed_detection_threshold, detection_config.start_pickup_vdist)
    capture = BufferlessVideoCapture(detection_config.image_url)


    def on_active_change(new_active_state: bool) -> None:
        print("Changing AI active status: {}".format(new_active_state))

        if new_active_state:
            detector.initialize()

        main.run_model = new_active_state

    mqtt_connection.on_active_change = on_active_change
    mqtt_connection.connect()

    mjpeg_image_buffer = run_mjpeg_server()

    while True:
        frame = cv2.rotate(capture.read(), cv2.ROTATE_90_CLOCKWISE)
        frame_height, frame_width, _ = frame.shape

        frame = discard_bottom_pixels(
            frame,
            frame_width,
            frame_height,
            detection_config.bottom_blackout_height
        )

        if main.run_model:
            instruction, frame = detector.get_instruction(frame)
            mqtt_connection.submit_instruction(instruction)

        mjpeg_image_buffer.write(cv2.imencode('.jpg', frame)[1].tobytes())

        cv2.imshow("Image", frame)
        key = cv2.waitKey(1)
        if key == 27:
            break
        elif key == 13:
            main.run_model = not main.run_model

    cv2.destroyAllWindows()
    print("Disconnecting")
    mqtt_connection.disconnect()

if __name__ == "__main__":
    main()
