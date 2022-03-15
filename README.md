# 🌿 Enviro Plus Web

Web interface for [Enviro](https://shop.pimoroni.com/products/enviro?variant=31155658489939) and [Enviro+](https://shop.pimoroni.com/products/enviro?variant=31155658457171) sensor board plugged into a Raspberry Pi.

![Screenshot](screenshot.jpg)

A very simple Flask application that serves a web page with the current sensor readings and a graph over a specified time period.

Forked from <https://github.com/nophead/EnviroPlusWeb>

## 📖 User guide

Check at the beginning of the file *enviroplusweb.py* the following lines and choose `True` or `False` depending on your config:

- If you have an Enviro board without gas sensor, edit this line

    ```
    gas_sensor = False
    ```

- If you don't have a particle sensor [PMS5003](https://shop.pimoroni.com/products/pms5003-particulate-matter-sensor-with-cable?variant=29075640352851) attached, edit this line

    ```
    particle_sensor = False
    ```

- If you prefer to keep the Enviro LCD screen off, edit this line

    ```
    lcd_screen = False
    ```

- If you don't have a fan plugged on GPIO, edit this line

    ```
    fan_gpio = False
    ```

Temperature and humidity readings will vary depending on how you assambled your Enviro board with your Raspberry Pi.  
Find an alternative device/reference for measurnig temperature and humidity to compare the readings. Then if needed you can compensate the values changing the `factor_temp` and `factor_humi` numbers to adjust them.


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
