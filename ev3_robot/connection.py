from time import sleep
from typing import Callable
from threading import Condition

from paho.mqtt.client import Client as MQTTClient, MQTTMessage

class ConnectionConfig(object):
    """
    A data class with the information required to connect to the MQTT broker.
    """

    client_id = "cleanee-rob"

    def __init__(self, mqtt_host: str, mqtt_port: int, keep_alive: int, connection_topic: str, control_topic_prefix: str):
        self.mqtt_host = mqtt_host
        self.mqtt_port = mqtt_port
        self.keep_alive = keep_alive
        self.connection_topic = connection_topic
        self.control_topic_prefix = control_topic_prefix


class Connection(object):
    """
    Manages the end-to-end connection between the robot and the controller via
    the MQTT broker. This class implements the required messages that establish
    a verified connection.
    """

    __connected = False
    __controller_id = ""

    on_control_message = None

    def __init__(self, config: ConnectionConfig):
        self.config = config

        self.client = MQTTClient(config.client_id)

    def establish(self) -> None:
        print("Establishing end-to-end connection.")

        self.client.will_set(
            self.config.connection_topic,
            self.__get_disconnect_msg(),
            2
        )

        self.client.on_connect = self.__on_connect()
        self.client.on_message = self.__on_message()

        self.client.loop_start()

        self.client.connect_async(
            self.config.mqtt_host,
            self.config.mqtt_port,
            self.config.keep_alive
        )

        self.__cv = Condition()

        with self.__cv:
            self.__cv.wait_for(self.is_connected)

    def disconnect(self) -> None:
        self.client.publish(
            self.config.connection_topic,
            self.__get_disconnect_msg(),
            2
        )

        self.client.disconnect()
        self.client.loop_stop()

        self.__controller_id = ""
        self.__connected = False

    def is_connected(self) -> bool:
        return self.__connected

    def __on_connect(self) -> Callable[[MQTTClient, None, None, None], None]:
        def on_connect(client: MQTTClient, userdata: None, flags: None, rc: None) -> None:
            print("\tConnected to MQTT broker.")
            client.subscribe(self.config.connection_topic)

        return on_connect

    def __on_message(self) -> Callable[[MQTTClient, MQTTMessage], None]:
        def on_message(client: MQTTClient, userdata: None, msg: MQTTMessage) -> None:
            # If the end-to-end connection has not been established, we only
            # care about messages on the connection topic.
            if not self.__connected and msg.topic != self.config.connection_topic:
                return

            if msg.topic == self.config.connection_topic:
                self.__handle_connection_message(msg.payload)
            elif msg.topic == self.__get_control_topic() and self.on_control_message is not None:
                self.on_control_message(msg.payload.decode("utf-8"))

        return on_message

    def __handle_connection_message(self, payload: bytes) -> None:
        INIT_CON_PREFIX = "init_con:"
        CON_OK_PREFIX = "con_ok:"
        CLOSE_CON_PREFIX = "close_con:"

        decoded = payload.decode("utf-8")

        if not self.__connected and decoded.startswith(INIT_CON_PREFIX):
            self.__controller_id = decoded[len(INIT_CON_PREFIX):]
            self.client.publish(
                self.config.connection_topic,
                "con_ok:{}".format(self.config.client_id)
            )

        elif not self.__connected and decoded.startswith(CON_OK_PREFIX):
            ok_response = decoded[len(CON_OK_PREFIX):]
            ids = ok_response.split(":")

            if len(ids) != 2:
                return

            controller_id, own_id = ids
            if controller_id == self.__controller_id and own_id == self.config.client_id:
                self.__on_finish_connection()

        elif self.__connected and decoded.startswith(CLOSE_CON_PREFIX):
            disconnecting_controller = decoded[len(CLOSE_CON_PREFIX):]

            if self.__controller_id == disconnecting_controller:
                self.disconnect()

    def __on_finish_connection(self) -> None:
        print("\tConnection established\n")
        self.client.subscribe(self.__get_control_topic())

        with self.__cv:
            self.__connected = True
            self.__cv.notify()

    def __get_control_topic(self) -> str:
        return "{}/{}".format(
            self.config.control_topic_prefix,
            self.__controller_id
        )

    def __get_disconnect_msg(self):
        return "close_con:{}".format(self.config.client_id)
