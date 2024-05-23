# -*- coding: utf-8 -*-

"""
Project: Enviro Plus Web
Description: Web interface for Enviro and Enviro+ sensor board plugged into a Raspberry Pi.
Author: i.j
URL: https://gitlab.com/idotj/enviroplusweb
Forked from: https://github.com/nophead/EnviroPlusWeb
License: GNU
"""

import RPi.GPIO as IO
import st7735
from fonts.ttf import RobotoMedium as UserFont
from PIL import Image, ImageDraw, ImageFont
from pms5003 import PMS5003
from enviroplus.noise import Noise
from enviroplus import gas
from bme280 import BME280
from smbus2 import SMBus
try:
    from ltr559 import LTR559
    ltr559 = LTR559()
except ImportError:
    import ltr559
import logging
from flask import Flask, render_template, request
import os
import threading
import json
from math import ceil, floor
from time import sleep, time, asctime, localtime, strftime

# If you prefer to keep the Enviro LCD screen off, change the next value to False
lcd_screen = True
# If you don't have a fan plugged on GPIO, change the next value to False
fan_gpio = True
# Temperature scale in Celsius (switch to false to show in Fahrenheit)
temp_celsius = True
# Temperature and humidity compensation (edit values 'factor_temp' and 'factor_humi' to adjust them)
temp_humi_compensation = True
# If you have an Enviro board without gas sensor, change the next value to False
gas_sensor = True
# If you don't have a particle sensor PMS5003 attached, change the next value to False
particulate_sensor = True
# Can't have particle sensor without gas sensor
assert gas_sensor or not particulate_sensor
# BME280 temperature, humidity and pressure sensor
bus = SMBus(1)
bme280 = BME280(i2c_dev=bus)
# PMS5003 particulate sensor
pms5003 = PMS5003()
# Noise sensor
noise = Noise()
# Folder to save the readings
app_data = 'enviroplusweb-data'
# App init
app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True
log = logging.getLogger('werkzeug')
log.disabled = True
run_flag = True

# Configure the fan
if fan_gpio:
    IO.setmode(IO.BCM)
    IO.setup(4, IO.OUT)
    pwm = IO.PWM(4, 1000)
    pwm.start(100)

# Use temperature and humidity compensations to improve readings
if temp_humi_compensation:
    def get_cpu_temperature():
        with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
            temp = f.read()
            temp = int(temp) / 1000.0
        return temp

    factor_temp = 3.10
    factor_humi = 1.50

# Create ST7735 LCD display class
if lcd_screen:
    disp = st7735.ST7735(
        port=0,
        cs=1,
        dc='GPIO9',
        backlight='GPIO12',
        rotation=270,
        spi_speed_hz=10000000
    )

    disp.begin()

    WIDTH = disp.width
    HEIGHT = disp.height

    color_above_threshold = (255, 0, 128)  # Magenta
    color_below_threshold = (64, 220, 220)  # Cyan
    color_within_threshold = (64, 220, 64)   # Green

    img = Image.new('RGB', (WIDTH, HEIGHT), color=(0, 0, 0))
    draw = ImageDraw.Draw(img)

    path = os.path.dirname(os.path.realpath(__file__)) + '/static/fonts'
    smallfont = ImageFont.truetype(path + '/asap/Asap-Bold.ttf', 10)
    x_offset = 2
    y_offset = 2
    unitTemp = '°C' if temp_celsius else '°F'

    units = [unitTemp,
             '%',
             'hPa',
             'Lux',
             'u',
             'u',
             'u',
             'u']

    if gas_sensor:
        units += [
            'kΩ',
            'kΩ',
            'kΩ']

    if particulate_sensor:
        units += [
            'μg/m3',
            'μg/m3',
            'μg/m3']

    def display_everything():
        draw.rectangle((0, 0, WIDTH, HEIGHT), (0, 0, 0))
        column_count = 2
        variables = list(record.keys())
        row_count = ceil(len(units) / column_count)
        last_values = days[-1][-1]
        for i in range(len(units)):
            variable = variables[i + 1]
            data_value = record[variable]
            last_value = last_values[variable]
            unit = units[i]
            x = x_offset + (WIDTH // column_count) * (i // row_count)
            y = y_offset + (HEIGHT // row_count) * (i % row_count)
            message = '{}: {:s} {}'.format(variable[:4], str(data_value), unit)
            tol = 1.01
            if data_value > last_value * tol:
                rgb = color_above_threshold
            elif data_value < last_value / tol:
                rgb = color_below_threshold
            else:
                rgb = color_within_threshold
            draw.text((x, y), message, font=smallfont, fill=rgb)
        disp.display(img)


# Get all sensors values
def read_data(time):
    if temp_humi_compensation:
        cpu_temps = [get_cpu_temperature()] * 5
        cpu_temp = get_cpu_temperature()
        cpu_temps = cpu_temps[1:] + [cpu_temp]
        avg_cpu_temp = sum(cpu_temps) / float(len(cpu_temps))
        raw_temp = bme280.get_temperature()
        temperature_scaled = raw_temp - \
            ((avg_cpu_temp - raw_temp) / factor_temp)
        temperature = temperature_scaled if temp_celsius else temperature_scaled * 1.8 + 32
        raw_humi = bme280.get_humidity()
        humidity = raw_humi * factor_humi
    else:
        temperature_scaled = bme280.get_temperature()
        temperature = temperature_scaled if temp_celsius else temperature_scaled * 1.8 + 32
        humidity = bme280.get_humidity()

    pressure = bme280.get_pressure()
    lux = ltr559.get_lux()
    low, mid, high, amp = noise.get_noise_profile()
    low *= 128
    mid *= 128
    high *= 128
    amp *= 64

    if gas_sensor:
        gases = gas.read_all()
        oxi = round(gases.oxidising / 1000, 1)
        red = round(gases.reducing / 1000)
        nh3 = round(gases.nh3 / 1000)
    else:
        oxi = red = nh3 = 0

    if particulate_sensor:
        while True:
            try:
                particles = pms5003.read()
                break
            except RuntimeError as e:
                print('Particle read failed: ', e.__class__.__name__)
                if not run_flag:
                    raise e
                pms5003.reset()
                sleep(30)
        pm100 = particles.pm_ug_per_m3(10)
        pm25 = particles.pm_ug_per_m3(2.5)
        pm10 = particles.pm_ug_per_m3(1.0)
    else:
        pm100 = pm25 = pm10 = 0

    record = {
        'time': asctime(localtime(time)),
        'temp': round(temperature, 1),
        'humi': round(humidity, 1),
        'pres': round(pressure, 1),
        'lux': round(lux),
        'high': round(high, 2),
        'mid': round(mid, 2),
        'low': round(low, 2),
        'amp': round(amp, 2),
        'oxi': oxi,
        'red': red,
        'nh3': nh3,
        'pm10': pm10,
        'pm25': pm25,
        'pm100': pm100,
    }

    return record


# Throw away the first readings as not accurate
record = read_data(time())
data = []
days = []


def filename(t):
    return strftime(app_data + '/%Y_%j', localtime(t))


def sum_data(data):
    totals = {'time': data[0]['time']}
    keys = list(data[0].keys())
    keys.remove('time')
    for key in keys:
        totals[key] = 0
    for d in data:
        for key in keys:
            totals[key] += d[key]
    count = float(len(data))
    for key in keys:
        totals[key] = round(totals[key] / count, 1)
    return totals


def record_time(r):
    t = r['time'].split()[3].split(':')
    return int(t[0]) * 60 + int(t[1])


# Number of 1 second samples average per file record
samples = 600
samples_per_day = 24 * 3600 // samples


def add_record(day, record):
    # If not the first record of the day
    if record_time(record) > 0:
        # Is there a gap
        while len(day) == 0 or record_time(day[-1]) < record_time(record) - samples // 60:
            if len(day):
                # Duplicate the last record to forward fill
                filler = dict(day[-1])
                t = record_time(filler) + samples // 60
            else:
                filler = dict(record)  # Need to back fill
                t = 0                 # Only happens if the day is empty so most be the first entry
            old_time = filler['time']  # Need to fix the time field
            colon_pos = old_time.find(':')
            filler['time'] = old_time[:colon_pos - 2] + \
                ('%02d:%02d' % (t / 60, t % 60)) + old_time[colon_pos + 3:]
            day.append(filler)
    day.append(record)


def background():
    global record, data
    sleep(2)
    last_file = None
    while run_flag:
        t = int(floor(time()))
        record = read_data(t)
        # Keep five minutes
        data = data[-(samples - 1):] + [record]
        # At the end of a 5 minute period?
        if t % samples == samples - 1 and len(data) == samples:
            totals = sum_data(data)
            fname = filename(t - (samples - 1))
            with open(fname, 'a+') as f:
                f.write(json.dumps(totals) + '\n')
            # Handle new day
            if not days or (last_file and last_file != fname):
                days.append([])
            last_file = fname
            # Add to today, filling any gap from last reading if been stopped
            add_record(days[-1], totals)
        if lcd_screen and days:
            display_everything()
        sleep(max(t + 1 - time(), 0.1))


background_thread = threading.Thread(target=background)


@app.route('/')
def index():
    return render_template('index.html', gas_sensor=gas_sensor, particulate_sensor=particulate_sensor, fan_gpio=fan_gpio, temp_celsius=temp_celsius)


@app.route('/readings')
def readings():
    if fan_gpio:
        arg = request.args['fan']
        pwm.ChangeDutyCycle(int(arg))
    return record


def compress_data(ndays, nsamples):
    cdata = []
    for day in days[-(ndays + 1):]:
        for i in range(0, len(day), nsamples):
            cdata.append(sum_data(day[i: i + nsamples]))
    length = ndays * samples_per_day // nsamples
    return json.dumps(cdata[-length:])


# 288 @ 5m = 24h
# 336 @ 30m = 1w
# 372 @ 2h = 31d
# 365 @ 1d = 1y
@app.route('/graph')
def graph():
    arg = request.args['time']
    if arg == 'day':
        last2 = []
        for day in days[-2:]:
            last2 += day
        return json.dumps(last2[-samples_per_day:])
    if arg == 'week':
        return compress_data(7, 30 * 60 // samples)
    if arg == 'month':
        return compress_data(31, 120 * 60 // samples)
    if arg == 'year':
        return compress_data(365, samples_per_day)
    return json.dumps(data)


def read_day(fname):
    day = []
    print('reading ' + fname)
    with open(fname, 'r') as f:
        for line in f.readlines():
            record = json.loads(line)
            add_record(day, record)
    return day


if __name__ == '__main__':
    if not os.path.isdir(app_data):
        os.makedirs(app_data)
    files = sorted(os.listdir(app_data))
    for f in files:
        days.append(read_day(app_data + '/' + f))
    background_thread.start()
    try:
        app.run(debug=False, host='0.0.0.0', port=8080, use_reloader=False)
    except Exception as e:
        print(e)
    run_flag = False
    IO.cleanup()
    if lcd_screen:
        disp.set_backlight(0)
    print('Waiting for background to quit')
    background_thread.join()
