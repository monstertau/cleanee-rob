import math
import time


class Robot:
    def __init__(self, left_motor, right_motor, rotate_motor):
        self.left_motor = left_motor
        self.right_motor = right_motor
        self.rotate_motor = rotate_motor
        self.arm_position = 0

    def run(self):
        self.left_motor.run_forever()
        self.right_motor.run_forever()

    def stop(self):
        self.left_motor.stop(stop_action="brake")
        self.right_motor.stop(stop_action="brake")

    def moving_in_coord(self, x, y):
        speed = math.sqrt(y ** 2 + x ** 2)
        steering = 1 - 2 * abs(math.atan2(y, x) / math.pi)
        if steering > 0:
            self.left_motor.speed_sp = speed * self.left_motor.max_speed
            self.right_motor.speed_sp = speed * \
                self.right_motor.max_speed * (1 - int(steering) * 2)
            self.run()
        elif steering == 0 and y < 0:
            self.left_motor.speed_sp = speed * self.left_motor.max_speed * -1
            self.right_motor.speed_sp = speed * self.right_motor.max_speed * -1
            self.run()
        else:
            self.left_motor.speed_sp = speed * \
                self.left_motor.max_speed * (1 + int(steering) * 2)
            self.right_motor.speed_sp = speed * self.right_motor.max_speed
            self.run()

    def arm_run(self):
        self.rotate_motor.run_forever()

    def arm_in(self, speed_sp=-300):
        self.rotate_motor.speed_sp = speed_sp
        self.arm_run()

    def arm_out(self, speed_sp=300):
        self.rotate_motor.speed_sp = speed_sp
        self.arm_run()

    def arm_stop(self):
        self.rotate_motor.stop(stop_action="brake")

    def arm_reset_position(self):
        self.rotate_motor.run_to_abs_pos(position_sp=self.arm_position)

    def arm_set_position(self):
        self.arm_position = self.arm_get_position()

    def arm_get_position(self):
        return self.rotate_motor.position

    def arm_grab(self, speed_sp=300):
        self.arm_reset_position()
        self.rotate_motor.run_to_rel_pos(position_sp=-720, speed_sp=speed_sp)
        time.sleep(3)
        self.rotate_motor.run_to_rel_pos(position_sp=1080, speed_sp=speed_sp)
        time.sleep(3)
        self.arm_reset_position()
