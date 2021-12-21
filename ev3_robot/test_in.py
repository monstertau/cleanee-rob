from ev3dev2.motor import *
from ev3dev2.sound import Sound
from ev3dev2.sensor import *
from ev3dev2.sensor.lego import *

motorC = MediumMotor(OUTPUT_C)
print(motorC.position)
motorC.run_to_rel_pos(position_sp=-360, speed_sp=500)
print(motorC.position)