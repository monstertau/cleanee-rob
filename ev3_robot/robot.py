import math


class Robot:
    def __init__(self, left_motor, right_motor, rotate_motor):
        self.left_motor = left_motor
        self.right_motor = right_motor
        self.rotate_motor = rotate_motor

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
            self.left_motor.speed_sp = speed * 400
            self.right_motor.speed_sp = speed * 400 * (1 - int(steering) * 2)
            self.run()
        elif steering == 0 and y < 0:
            self.left_motor.speed_sp = speed * 400 * -1
            self.right_motor.speed_sp = speed * 400 * -1
            self.run()
        else:
            self.left_motor.speed_sp = speed * 400 * (1 + int(steering) * 2)
            self.right_motor.speed_sp = speed * 400
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
