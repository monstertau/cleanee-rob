from robot import Robot
import json
from abc import abstractmethod


class CommandFactory:
    def __init__(self):
        self.command_dict = {}

    def get_command(self, msg):
        self.command_dict = json.loads(msg)
        cmd = self.command_dict.get("command", "")
        metadata = self.command_dict.get("metadata", {})
        if cmd == "move":
            return MoveCoordCommand(cmd, metadata)
        elif cmd == "stop":
            return StopCarCommand(cmd, metadata)
        elif cmd == "arm_in":
            return ArmInCommand(cmd, metadata)
        elif cmd == "arm_out":
            return ArmOutCommand(cmd, metadata)
        elif cmd == "arm_stop":
            return ArmStopCommand(cmd, metadata)
        elif cmd == "arm_grab":
            return ArmGrabCommand(cmd, metadata)
        elif cmd == "arm_reset_position":
            return ArmResetPositionCommand(cmd, metadata)
        elif cmd == "arm_set_position":
            return ArmSetPositionCommand(cmd, metadata)
        else:
            print("Unknown Command: {}".format(cmd))


class Command:
    def __init__(self,  command, metadata):
        self.command = command
        self.metadata = metadata

    @abstractmethod
    def execute(self, robot: Robot):
        pass

    @abstractmethod
    def to_string(self):
        pass


class StopCarCommand(Command):
    def __init__(self,  command: str, metadata: dict):
        super().__init__(command, metadata)

    def execute(self, robot: Robot):
        robot.stop()

    def to_string(self):
        return "StopCommand"


class MoveCoordCommand(Command):
    def __init__(self, command: str, metadata: dict):
        super().__init__(command, metadata)
        self.x = metadata.get("x", 0)
        self.y = metadata.get("y", 0)

    def execute(self, robot: Robot):
        robot.moving_in_coord(self.x, self.y)

    def to_string(self):
        return "MoveCoordCommand"


class ArmInCommand(Command):
    def __init__(self, command: str, metadata: dict):
        super().__init__(command, metadata)
        self.speed_sp = metadata.get("speed", 0)

    def execute(self, robot: Robot):
        if self.speed_sp != 0:
            robot.arm_in(self.speed_sp)
        else:
            robot.arm_in()

    def to_string(self):
        return "ArmInCommand"


class ArmOutCommand(Command):
    def __init__(self, command: str, metadata: dict):
        super().__init__(command, metadata)
        self.speed_sp = metadata.get("speed", 0)

    def execute(self, robot: Robot):
        if self.speed_sp != 0:
            robot.arm_out(self.speed_sp)
        else:
            robot.arm_out()

    def to_string(self):
        return "ArmOutCommand"


class ArmStopCommand(Command):
    def __init__(self, command: str, metadata: dict):
        super().__init__(command, metadata)

    def execute(self, robot: Robot):
        robot.arm_stop()

    def to_string(self):
        return "ArmStopCommand"


class ArmGrabCommand(Command):
    def __init__(self, command: str, metadata: dict):
        super().__init__(command, metadata)

    def execute(self, robot: Robot):
        robot.arm_grab()

    def to_string(self):
        return "ArmGrabCommand"

class ArmResetPositionCommand(Command):
    def __init__(self, command: str, metadata: dict):
        super().__init__(command, metadata)

    def execute(self, robot: Robot):
        robot.arm_reset_position()

    def to_string(self):
        return "ArmResetCommand"

class ArmSetPositionCommand(Command):
    def __init__(self, command: str, metadata: dict):
        super().__init__(command, metadata)

    def execute(self, robot: Robot):
        robot.arm_set_position()

    def to_string(self):
        return "ArmSetPositionCommand"