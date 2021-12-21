# Import the necessary libraries
import paho.mqtt.client as mqtt
from msg_parser import CommandFactory
import yaml
import time
import math
from ev3dev2.motor import *
from ev3dev2.sound import Sound
from ev3dev2.sensor import *
from ev3dev2.sensor.lego import *
from robot import Robot
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
    client.subscribe("test")


def on_message(client, userdata, msg):
    try:
        command = cmdFactory.get_command(msg.payload.decode())
        command.execute(robot)
    except Exception as e:
        print(e)


with open('config.yml') as f:
    configs = yaml.load(f, Loader=yaml.FullLoader)


def main():
    mqttConf = configs.get("mqtt_server")
    if mqttConf is not None:
        host = mqttConf.get("host", "localhost")
        port = mqttConf.get("port", 1883)
        keep_alive = mqttConf.get("keep_alive", 60)
        client = mqtt.Client()
        client.connect(host, port, keep_alive)

        client.on_connect = on_connect
        client.on_message = on_message

        client.loop_forever()
    else:
        print("Config file is required.")


if __name__ == "__main__":
    main()
