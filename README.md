# Computer Vision 20211

This is the code repository for Computer Vision 20211 project. It
contains projects for the LEGO EV3 code, the python server and the
web UI controller.

---

## 1. Prerequisites

### a. For server and Robot

- Docker and Docker Compose:

```
https://docs.docker.com/engine/install/
https://docs.docker.com/compose/install/
```

- Python3 and PIP

```
https://www.python.org/downloads/
```

- (Additional): Install MQTT Explorer to have an GUI Manage Application of MQTT Topic

```
http://mqtt-explorer.com/
```

### b. For Control Application

- NodeJS and NPM

```
https://nodejs.org/en/download/
```

---

## 2. How to run

- First, we need to run our MQTT Broker Server from Docker Compose: `docker compose up` or `docker compose up -d` for running in background
- For detail instruction of running robot and running control application, check here:
  - [Running Robot](./ev3_robot/INSTRUCTION.md)
  - [Running GUI Application](./README.md)
---
## 3. Authors