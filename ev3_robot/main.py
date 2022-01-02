from controller import RobotConfig, RobotController
from ev3dev2.motor import LargeMotor, MediumMotor, OUTPUT_A, OUTPUT_B, OUTPUT_C
from ev3dev2.sensor import INPUT_2
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
    ROBOT_CONFIG_KEYS = ["grab_distance"]

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
        missing_keys = False
        for key in keys:
            if not key in parsed_config[dict_key]:
                missing_keys = True
                print("Missing key '{}.{}' in the config file.".format(dict_key, key))

        return not missing_keys

    mqtt_config_ok = verify_keys("mqtt_server", MQTT_CONFIG_KEYS)
    robot_config_ok = verify_keys("robot", ROBOT_CONFIG_KEYS)

    print("mqtt config: {}".format(mqtt_config_ok))
    print("robot config: {}".format(robot_config_ok))

    if not mqtt_config_ok or not robot_config_ok:
        return None

    connection_config = ConnectionConfig(
        parsed_config["mqtt_server"].get("host"),
        parsed_config["mqtt_server"].get("port"),
        parsed_config["mqtt_server"].get("keep_alive"),
        parsed_config["mqtt_server"].get("topic_connect"),
        parsed_config["mqtt_server"].get("topic_control")
    )

    robot_config = RobotConfig(
        parsed_config["robot"].get("grab_distance")
    )

    return (connection_config, robot_config)


def main():
    config = load_config()
    if config is None:
        return

    mqtt_config, robot_config = config

    robot = Robot(
        LargeMotor(OUTPUT_A),
        LargeMotor(OUTPUT_C),
        MediumMotor(OUTPUT_B),
        UltrasonicSensor(INPUT_2)
    )
    cmd_factory = CommandFactory()
    robot_controller = RobotController(robot, cmd_factory, robot_config)

    connection = Connection(mqtt_config)

    connection.on_control_message = robot_controller.on_message

    connection.establish()

    while True:
        robot_controller.update()

    # connection.disconnect()


if __name__ == "__main__":
    main()
