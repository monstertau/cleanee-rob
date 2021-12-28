import paho.mqtt.client as mqtt


class RobotHandler(mqtt.Client):
    def __init__(self, host: str, port: int, keepalive: int, topic_response: str, topic_control: str):
        super().__init__()
        self._host = host
        self._port = port
        self._keepalive = keepalive
        self._topic_response = topic_response
        self._topic_control = topic_control
        self._last_message = None

    def on_connect(self, client, userdata, flags, rc):
        print("Connected to mqtt server.")

    def on_message(self, client, userdata, msg):
        print(f'Topic {msg.topic} got message {msg.payload}')
        self._last_message = msg.payload.decode("utf-8")

    def on_publish(self, mqttc, userdata, mid):
        print("published to control topic with code: " + str(mid))
        self._last_message = None

    def on_subscribe(self, mqttc, userdata, mid, granted_qos):
        print(f"Subscribed to response topic = {self._topic_response} with code: " + str(mid))

    def start(self):
        print("Start connecting to server...")
        self.connect(self._host, self._port, self._keepalive)
        self.subscribe(self._topic_response, 0)
        self.loop_start()

    def publish_control_message(self, msg: str):
        print(f"Start publish message: {msg}")
        self.publish(self._topic_control, msg)

    def get_last_resp_message(self):
        return self._last_message

    def stop(self):
        print("Stop listening to mqtt server...")
        self.loop_stop(force=True)

    def run(self):
        while True:
            pass
