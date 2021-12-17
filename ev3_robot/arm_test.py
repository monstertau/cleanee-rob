from ev3dev2.motor import *
from ev3dev2.sensor import *
from ev3dev2.sensor.lego import *

speed_up = SpeedPercent(-10)
speed_down = SpeedPercent(10)

print("Booting...")
motor = MediumMotor(OUTPUT_B)
gyro = GyroSensor(INPUT_3)

print("Calibrating...")
gyro.calibrate()

motor.on(SpeedPercent(-10))
print("Waiting for angle change...")
gyro.wait_until_angle_changed_by(-130, True)
motor.on_for_degrees(SpeedPercent(50), 100)

_ = input("Press a key to continue...")

motor.on(SpeedPercent(10))
gyro.wait_until_angle_changed_by(90, True)
motor.on_for_degrees(SpeedPercent(50), -100)
