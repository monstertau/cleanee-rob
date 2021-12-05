# Runestone 2021 Team A Server

This project contains the python server which sits between the web UI
application and the EV3 robot. It is a python project which uses pipenv to
manage libraries and python versions.

## Running the server
To run the server, pipenv is used to maintain a consistent experience across
different machines. Hence, instead of running `main.py` directly with python,
it can be run with [Pipenv](https://pypi.org/project/pipenv/):
```sh
$ pipenv run main.py
```