from ev3dev2.motor import *
from ev3dev2.sound import Sound
from ev3dev2.sensor import *
from ev3dev2.sensor.lego import *

ultrasonic_sensor = UltrasonicSensor(INPUT_2)
print(ultrasonic_sensor.distance_centimeters)