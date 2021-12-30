from abc import ABC, abstractmethod
import json

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
            "x": -0.5,
            "y": 0
        }
    }

    def serialize(self) -> str:
        return json.dumps(self.contents)


class TurnRightInstruction(Instruction):

    contents = {
        "command": "move",
        "metadata": {
            "x": 0.5,
            "y": 0
        }
    }

    def serialize(self) -> str:
        return json.dumps(self.contents)


class MoveForwardInstruction(Instruction):

    contents = {
        "command": "move",
        "metadata": {
            "x": 0,
            "y": 0.5
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


