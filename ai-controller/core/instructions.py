from abc import ABC, abstractmethod
import json
from math import dist

SPEED = 0.2

class Instruction(ABC):

    @abstractmethod
    def serialize(self) -> str:
        """
        Serialize this instruction so it can be sent to the MQTT broker for the
        robot to execute.
        """
        pass


class TurnLeftInstruction(Instruction):

    contents = {
        "command": "move",
        "metadata": {
            "x": -SPEED,
            "y": 0
        }
    }

    def __init__(self, distance) -> None:
        if distance >= 100:
            self.contents["metadata"]["x"] = -SPEED
        else:
            self.contents["metadata"]["x"] = -distance / 100 * SPEED

    def serialize(self) -> str:
        return json.dumps(self.contents)


class TurnRightInstruction(Instruction):

    contents = {
        "command": "move",
        "metadata": {
            "x": SPEED,
            "y": 0
        }
    }

    def __init__(self, distance) -> None:
        if distance <= -100:
            self.contents["metadata"]["x"] = SPEED
        else:
            self.contents["metadata"]["x"] = -distance / 100 * SPEED


    def serialize(self) -> str:
        return json.dumps(self.contents)


class MoveForwardInstruction(Instruction):

    contents = {
        "command": "move",
        "metadata": {
            "x": 0,
            "y": SPEED
        }
    }

    def serialize(self) -> str:
        return json.dumps(self.contents)


class StopRoamingInstruction(Instruction):
    contents = {
        "command": "switch_state",
        "metadata": {
            "state": "commands"
        }
    }

    def serialize(self) -> str:
        return json.dumps(self.contents)

class StartRoamingInstruction(Instruction):
    contents = {
        "command": "switch_state",
        "metadata": {
            "state": "roaming"
        }
    }

    def serialize(self) -> str:
        return json.dumps(self.contents)


class StartPickupInstruction(Instruction):
    contents = {
        "command": "switch_state",
        "metadata": {
            "state": "grabbing"
        }
    }

    def serialize(self) -> str:
        return json.dumps(self.contents)
