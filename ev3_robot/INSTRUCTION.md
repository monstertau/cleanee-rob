# Running Robot Instruction
## 1. Prerequisites
- `requirements.txt` file contains the require package of python project
- `config.yml` file contains the require config of robot.
---
## 2. How to run
- Make sure that the MQTT Broker Server is on:
```
 monstertau@f5-573g  docker ps
CONTAINER ID   IMAGE               COMMAND                  CREATED       STATUS             PORTS                                            NAMES
bcfe4d812e44   eclipse-mosquitto   "/docker-entrypoint.…"   2 weeks ago   Up About an hour   0.0.0.0:1883->1883/tcp, 0.0.0.0:9001->9001/tcp   team-a_mosquitto_1

```
- After that, find your computer's IP with `ifconfig` in Ubuntu or `ipconfig` in Windows, in here im using Ubuntu and find out that my IP is 192.168.2.108
```
monstertau@f5-573g  ifconfig
wlp3s0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.2.108  netmask 255.255.255.0  broadcast 192.168.2.255
        inet6 fe80::74b5:d603:5b9b:e8fd  prefixlen 64  scopeid 0x20<link>
        ether 3c:a0:67:b0:9e:b9  txqueuelen 1000  (Ethernet)
        RX packets 76016  bytes 63773198 (63.7 MB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 52125  bytes 10927998 (10.9 MB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

```
- Replace the `host: 192.168.2.108` with your IP Address (Please if you are in team programming, make sure that you wont push the config.yml file)
- In your computer, run `pip install -r requirements.txt`
- Copy ev3_robot directory into the robot, and run `pip install -r requirements.txt` again to install require package.

- ssh to the robot, in the ev3_robot directory you had copied to in previous step, run `python3 main.py` to start the robot program.
---
## 3. Message Design
For manual control, basically we will have some JSON Format Command publish to MQTT Server:
### 3.1. Move Command
- Instruction: To move the robot
- JSON Format:
```
    "command": "move",
    "metadata": {
        "x": number
        "y": number 
    }
```
- Detail metadata field: 
    - x: for steering (-1 <= x <= 1)
    - y: for moving straight up or down (-1 <= y <= 1)
### 3.2. Arm In Command
- Instruction: To make the arm move in
- JSON Format:
```
    "command": "arm_in",
    "metadata": { 
        "speed": number
    }
```
- Detail metadata field: 
    - speed: (Optional) if missing speed metadata, the default speed of arm_in command is -300. Range of speed must be < 0 For Arm In Command
### 3.3. Arm Out Command
- Instruction: To make the arm move Out
- JSON Format:
```
    "command": "arm_in",
    "metadata": { 
        "speed": number
    }
```
- Detail metadata field: 
    - speed: (Optional) if missing speed metadata, the default speed of arm_in command is 300. Range of speed must be > 0 For Arm Out Command
### 3.4. Arm Grab Command
- Instruction: To make the arm automatically doing grab procedure. Make sure that the current position of arm is in ideal position (can set it in another command), otherwise the procedure will fail.
- JSON Format:
```
    "command": "arm_grab",
    "metadata": {
    }
```
### 3.5. Arm Reset Command
- Instruction: Reset the arm position to default start-up position (position = 0, the position when the program first run) or preset position.
- JSON Format:
```
    "command": "arm_reset_position",
    "metadata": {
    }
```
### 3.6. Arm Set Command
- Instruction: Set the arm position to current position. the Arm Reset Command will be affected after send this command
- JSON Format:
```
    "command": "arm_reset_position",
    "metadata": {
    }
```
## 4. Additional
- (Optional) If you want to test out the functionalities as well as message design of robot, please head to the `test_keyboard.py` file. Run `python3 test_keyboard.py` file and start test the robot with some useful command:
```
arrow: up, down, left, right -> move the robot command
r: reset arm command
s: save current arm position command to reset
g: make arm grab
i: make arm move in
o: make arm move out
```