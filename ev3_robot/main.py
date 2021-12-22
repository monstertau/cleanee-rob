# Import the necessary libraries
import paho.mqtt.client as mqtt
from msg_parser import CommandFactory
from ev3dev2.motor import *
from ev3dev2.sound import Sound
from ev3dev2.sensor import *
from ev3dev2.sensor.lego import *
from robot import Robot
import yaml
MQTT_HOST = "192.168.2.108"
MQTT_PORT = 1883
KEEP_ALIVE = 60
TOPIC_CONNECT = "topic/connect"
TOPIC_CONTROL = "topic/control"

print("Connecting to motors...")

# Create the sensors and motors objects
motorA = LargeMotor(OUTPUT_A)
motorD = LargeMotor(OUTPUT_D)
motorC = MediumMotor(OUTPUT_C)
# tank_drive = MoveTank(OUTPUT_A, OUTPUT_B)
# steering_drive = MoveSteering(OUTPUT_A, OUTPUT_B)

# spkr = Sound()

# # color_sensor_in1 = ColorSensor(INPUT_1)
# # ultrasonic_sensor_in2 = UltrasonicSensor(INPUT_2)
# # gyro_sensor_in3 = GyroSensor(INPUT_3)
# # gps_sensor_in4 = GPSSensor(INPUT_4)
# # pen_in5 = Pen(INPUT_5)
robot = Robot(motorA, motorD, motorC)
cmdFactory = CommandFactory()
configs = {}


def on_connect(client, userdata, flags, rc):
    print("Connected with result code " + str(rc))
    control_topic = configs.get("topic_control", TOPIC_CONTROL)
    client.subscribe(control_topic)


def on_message(client, userdata, msg):
    try:
        command = cmdFactory.get_command(msg.payload.decode())
        command.execute(robot)
    except Exception as e:
        print(e)


with open('config.yml') as f:
    configs = yaml.load(f, Loader=yaml.FullLoader)


def main():
    host = configs.get("host", MQTT_HOST)
    port = configs.get("port", MQTT_PORT)
    keep_alive = configs.get("keep_alive", KEEP_ALIVE)
    client = mqtt.Client()

    print("Connecting to mqtt client...")
    client.connect(host, port, keep_alive)

    client.on_connect = on_connect
    client.on_message = on_message

    client.loop_forever()


if __name__ == "__main__":
    main()
