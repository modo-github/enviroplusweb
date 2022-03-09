# 🌿 Enviro Plus Web

Web interface for [Enviro+](https://shop.pimoroni.com/products/enviro?variant=31155658457171) sensor board plugged into a Raspberry Pi.

![Screenshot](screenshot.jpg)

A very simple Flask application that serves a wep page with the current sensor readings and a graph over a specified time period.

Forked from <https://github.com/nophead/EnviroPlusWeb>

## 🗂️ User guide

First be sure to have the right config, check at the beginning of the file *enviroplusweb.py* the following values:

By default a gas sensor is expected. If you have and Enviro board without one set, change line 20 to  `gas_sensor = False`.

If you don't have a particle sensor [PMS5003](https://shop.pimoroni.com/products/pms5003-particulate-matter-sensor-with-cable?variant=29075640352851) attached, then change line 22 to `particle_sensor = False` to run without one.


Maybe you want to run Enviro Plus Web at boot, then just type in the terminal:
```
crontab -e
```
Add a new entry at the very bottom with `@reboot` to specify that you want to run the command at boot, followed by the path where you clone the project and the command. Here you have an example:
```
@reboot sudo python3 /home/EnviroPlusWeb/enviroplusweb.py
```

## 🚀 Improve me

Feel free to add/improve the app and add more features.

## ⚖️ License

GNU General Public License v3.0
