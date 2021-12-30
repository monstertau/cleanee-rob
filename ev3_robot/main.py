from controller import RobotController
from ev3dev2.motor import LargeMotor, MediumMotor, OUTPUT_A, OUTPUT_B, OUTPUT_C
from ev3dev2.sensor import INPUT_1
from ev3dev2.sensor.lego import UltrasonicSensor
from os import path
import yaml

from connection import Connection, ConnectionConfig
from msg_parser import CommandFactory
from robot import Robot


CONFIG_NAME = "config.yml"


def load_config() -> ConnectionConfig:
    """
    Loads the yaml config into memory. The config file has unique values for
    each environment, and is therefore not committed to the repository. There
    is, however, an example file that contains the keys required by the program
    to work. It should be copied and renamed to the value of the CONFIG_NAME
    constant.
    """

    MQTT_CONFIG_KEYS = ["host", "port", "keep_alive", "topic_control", "topic_connect"]

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

    mqtt_config = parsed_config["mqtt_server"]
    missing_keys = False
    for key in MQTT_CONFIG_KEYS:
        if not key in mqtt_config:
            missing_keys = True
            print("Missing key '{}' in the config file.".format(key))

    if missing_keys:
        return None

    return ConnectionConfig(
        mqtt_config.get("host"),
        mqtt_config.get("port"),
        mqtt_config.get("keep_alive"),
        mqtt_config.get("topic_connect"),
        mqtt_config.get("topic_control")
    )


def main():
    config = load_config()
    if config is None:
        return

    robot = Robot(
        LargeMotor(OUTPUT_A),
        LargeMotor(OUTPUT_C),
        MediumMotor(OUTPUT_B),
        UltrasonicSensor(INPUT_1)
    )
    cmd_factory = CommandFactory()
    robot_controller = RobotController(robot, cmd_factory)

    connection = Connection(config)

    connection.on_control_message = robot_controller.on_message

    connection.establish()

    while True:
        robot_controller.update()

    # connection.disconnect()


if __name__ == "__main__":
    main()
