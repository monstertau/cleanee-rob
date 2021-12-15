import math


class Robot:
    def __init__(self, left_motor, right_motor):
        self.left_motor = left_motor
        self.right_motor = right_motor

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
            self.left_motor.speed_sp = speed * 250
            self.right_motor.speed_sp = speed * 250 * (1 - int(steering) * 2)
            self.run()
        else:
            self.left_motor.speed_sp = speed * 250 * (1 + int(steering) * 2)
            self.right_motor.speed_sp = speed * 250
            self.run()
