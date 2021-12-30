import json
from threading import Condition
from paho.mqtt.client import Client as MQTTClient, MQTTMessage

class ConnectionConfig(object):
    """
    A data class with the information required to connect to the MQTT broker.
    """

    client_id = "ai-controller"

    def __init__(self, mqtt_host: str, mqtt_port: int, keep_alive: int, topic: str):
        self.mqtt_host = mqtt_host
        self.mqtt_port = mqtt_port
        self.keep_alive = keep_alive
        self.topic = topic


class MqttConnection(object):

    def __init__(self, config: ConnectionConfig) -> None:
        self.config = config
        self.client = MQTTClient(config.client_id)
        self.cv = Condition()
        self.connected = False

    def connect(self):
        if self.connected:
            return

        self.client.on_connect = self.__on_connect
        self.client.on_message = self.__on_message

        self.client.connect_async(
            self.config.mqtt_host,
            self.config.mqtt_port,
            self.config.keep_alive
        )

        self.client.loop_start()

        with self.cv:
            self.cv.wait_for(self.is_connected)

    def disconnect(self):
        self.client.disconnect()
        self.client.loop_stop()

    def is_connected(self):
        return self.connected

    def submit_instruction(self, instruction):
        assert self.is_connected()

        if instruction is None:
            return

        print("Submitting instruction {}".format(instruction))

        self.client.publish(
            self.config.topic,
            instruction.serialize()
        )

    def __on_connect(self, client: MQTTClient, userdata: None, flags: None, rc: None):
        print("Connected to mqtt broker")
        self.client.subscribe(self.config.topic)

        with self.cv:
            self.connected = True
            self.cv.notify()

    def __on_message(self, client: MQTTClient, userdata: None, msg: MQTTMessage):
        command = json.loads(msg.payload.decode("utf-8"))

        if command["command"] == "set_ai_active" and self.on_active_change is not None:
            self.on_active_change(command["metadata"]["active"])
