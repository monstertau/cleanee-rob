from robot import Robot
import json
from abc import ABC, abstractmethod


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
            return StopCommand(cmd, metadata)
        else:
            raise Exception("Unknown Command")


class Command:
    def __init__(self, command, metadata):
        self.command = command
        self.metadata = metadata

    @abstractmethod
    def execute(self, robot: Robot):
        pass

    @abstractmethod
    def to_string(self):
        pass


class StopCommand(Command):
    def __init__(self, command: str, metadata: dict):
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