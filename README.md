# 🌿 Enviro Plus Web

Web interface for Enviro+ sensor board plugged into a Raspberry Pi

![Screenshot](screenshot.jpg)

A very simple Flask application that serves a wep page with the current sensor readings and a graph over a specified time period.

Forked from <https://github.com/nophead/EnviroPlusWeb>

## 🗂️ User guide

By default it expects a particle sensor to be attached.
Change line 20 of enviroplusweb.py to `particle_sensor = False` to run without one.
Also by default a gas sensor is expected. If you have and Enviro board without one also set `gas_sensor = False`.

To run at boot just type in the terminal:
```
crontab -e
```
Add a new entry at the very bottom with @reboot to specify that you want to run the command at boot, followed by the path where you clone the project and the command. Here you have an example:
```
@reboot sudo python3 /home/EnviroPlusWeb/enviroplusweb.py
```

## 🚀 Improve me

Feel free to add/improve the styles and add more features.

## ⚖️ License

GNU GENERAL PUBLIC LICENSE v3.0
