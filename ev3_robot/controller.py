from abc import ABC, abstractmethod
from msg_parser import Command, CommandFactory, SwitchControllerState
from time import time
from random import random, randrange
from robot import Robot


class RobotControllerState(ABC):

    @abstractmethod
    def on_command(self, command: Command):
        pass

    @abstractmethod
    def update(self):
        pass


class CommandState(RobotControllerState):
    """
    Controls the robot based on the commands sent from the MQTT broker. When
    using the manual or AI controlled state, this controller should be active.
    """

    def __init__(self, robot: Robot) -> None:
        super().__init__()

        self.robot = robot

    def on_command(self, command: Command):
        command.execute(self.robot)

    def update(self):
        pass


class RoamState(RobotControllerState):
    """
    Controls the robot by roaming around. This means the robot will continue
    straight on, until it detects there is an obstacle in-front. When that
    happens, it will rotate left or right randomly and continue straight on
    again.
    """

    STATE_STOPPED = "stopped"
    STATE_MOVING = "moving"
    STATE_TURNING = "turning"

    TURNING_LEFT = "left"
    TURNING_RIGHT = "right"

    MIN_TURN_DURATION = 5
    MAX_TURN_DURATION = 10

    SAFE_DISTANCE_READING = 20 #cm

    __state = STATE_STOPPED
    __turning = None
    __turn_duration = 0
    __turn_start = 0

    def __init__(self, robot: Robot) -> None:
        super().__init__()

        self.robot = robot

    def on_command(command: Command):
        pass

    def update(self):
        if self.__state == RoamState.STATE_MOVING:
            self.__check_distance()
        elif self.__state == RoamState.STATE_STOPPED:
            self.__start_moving()
        elif self.__state == RoamState.STATE_TURNING:
            self.__check_turn()

    def __is_safe(self):
        return self.robot.get_distance_reading() > RoamState.SAFE_DISTANCE_READING

    def __check_distance(self):
        if self.__is_safe():
            return

        print("Obstacle detected, turning.")
        self.__start_turn()

    def __start_moving(self):
        if not self.__is_safe():
            return

        print("Safe to move -> start moving")
        self.__state = RoamState.STATE_MOVING
        self.robot.run(speed=0.5)

    def __start_turn(self):
        self.__state = RoamState.STATE_TURNING
        self.robot.stop()

        if random() > 0.5:
            print("\tLeft")
            self.__turning = RoamState.TURNING_LEFT
        else:
            print("\tRight")
            self.__turning = RoamState.TURNING_RIGHT

        self.__turn_duration = randrange(RoamState.MIN_TURN_DURATION, RoamState.MAX_TURN_DURATION)
        self.__turn_start = time()
        print("Turning for {} ms".format(self.__turn_duration))

    def __check_turn(self):
        current_time = time()
        if current_time - self.__turn_start < self.__turn_duration:
            return

        if not self.__is_safe():
            print("Unsafe after turn, starting new turn.")
            self.__start_turn()

        self.__start_moving()


class RobotController(object):

    def __init__(self, robot: Robot, cmd_factory: CommandFactory) -> None:
        super().__init__()

        self.robot = robot
        self.cmd_factory = cmd_factory
        self.__state = RoamState(self.robot)

    def on_message(self, message: str):
        command = self.cmd_factory.get_command(message)

        if command is SwitchControllerState:
            self.__switch_state(command.new_state)
        else:
            self.__state.on_command(command)

    def update(self):
        self.__state.update()

    def __switch_state(self, new_state: str):
        if new_state == "roaming" and self.__state is not RoamState:
            self.robot.stop()
            self.__state = RoamState(self.robot)
        elif new_state == "commands" and self.__state is not CommandState:
            self.robot.stop()
            self.__state = CommandState(self.robot)