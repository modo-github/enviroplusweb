/**
 * Enviro Plus Web
 * @author idotj
 * @url https://gitlab.com/idotj/enviroplusweb
 * @license GNU AGPLv3
 */
"use strict";

const menuMainBtn = document.getElementById("menu-hamburger");
const menuMainContainer = document.getElementById("container-menu-settings");
const themeLightBtn = document.getElementById("theme-light");
const themeDarkBtn = document.getElementById("theme-dark");
let hasThemeLight = body.classList.contains("theme-light");
const style = getComputedStyle(document.body);
const fan_gpio = body.dataset.fanGpio.toLowerCase() === "true";
const temp_celsius = body.dataset.tempCelsius.toLowerCase() === "true";
const unitTemp = temp_celsius ? "°C" : "°F";
const tempScale = document.getElementById("tempScale");
const gas_sensor = body.dataset.gasSensor.toLowerCase() === "true";
const particulate_sensor =
  body.dataset.particulateSensor.toLowerCase() === "true";
const items_ngp = {
  temp: {
    id: "temp",
    label: "Temperature",
    unit: unitTemp,
    color: style.getPropertyValue("--color-red"),
    min: 0,
    max: 50,
  },
  humi: {
    id: "humi",
    label: "Humidity",
    unit: "%",
    color: style.getPropertyValue("--color-blue"),
    min: 0,
    max: 100,
  },
  pres: {
    id: "pres",
    label: "Pressure",
    unit: "hPa",
    color: style.getPropertyValue("--color-green"),
    min: 980,
    max: 1020,
  },
  lux: {
    id: "lux",
    label: "Light",
    unit: "lux",
    color: style.getPropertyValue("--color-yellow"),
    min: 0,
    max: 25000,
  },
  high: {
    id: "high",
    label: "High",
    unit: "u",
    color: style.getPropertyValue("--color-noise-high"),
    min: 0,
    max: 100,
  },
  mid: {
    id: "mid",
    label: "Mid",
    unit: "u",
    color: style.getPropertyValue("--color-noise-mid"),
    min: 0,
    max: 100,
  },
  low: {
    id: "low",
    label: "Low",
    unit: "u",
    color: style.getPropertyValue("--color-noise-low"),
    min: 0,
    max: 100,
  },
  amp: {
    id: "amp",
    label: "Amp",
    unit: "u",
    color: style.getPropertyValue("--color-noise-amp"),
    min: 0,
    max: 100,
  },
};
const items_gas = {
  nh3: {
    id: "nh3",
    label: "NH3",
    unit: "kΩ",
    color: style.getPropertyValue("--color-olive"),
    min: 0,
    max: 500,
  },
  oxi: {
    id: "red",
    label: "Reducing",
    unit: "kΩ",
    color: style.getPropertyValue("--color-turquoise"),
    min: 0,
    max: 500,
  },
  red: {
    id: "oxi",
    label: "Oxidising",
    unit: "kΩ",
    color: style.getPropertyValue("--color-violet"),
    min: 0,
    max: 500,
  },
};
const items_pm = {
  pm1: {
    id: "pm1",
    label: "PM1",
    unit: "μg/m3",
    color: style.getPropertyValue("--color-dust1"),
    min: 0,
    max: 800,
  },
  pm25: {
    id: "pm25",
    label: "PM2.5",
    unit: "μg/m3",
    color: style.getPropertyValue("--color-dust25"),
    min: 0,
    max: 800,
  },
  pm10: {
    id: "pm10",
    label: "PM10",
    unit: "μg/m3",
    color: style.getPropertyValue("--color-dust10"),
    min: 0,
    max: 800,
  },
};
let items;
if (particulate_sensor) {
  items = { ...items_ngp, ...items_gas, ...items_pm };
} else if (gas_sensor) {
  items = { ...items_ngp, ...items_gas };
} else {
  items = items_ngp;
}
let firstRun = true;
let dataReadings;
let transformedData;
const frequencies = {
  day: { major: 3 * 3600, minor: 3600, poll: 60 },
  week: { major: 24 * 3600, minor: 6 * 3600, poll: 600 },
  month: { major: 7 * 24 * 3600, minor: 24 * 3600, poll: 1440 },
  year: { major: 31 * 24 * 3600, minor: 7 * 24 * 3600, poll: 17280 },
};
let frequency;
let last_frequency = "";
let last_graph = 0;
const ctxTemp = document.getElementById("graphChartTemp");
const ctxHumi = document.getElementById("graphChartHumi");
const ctxPres = document.getElementById("graphChartPres");
const ctxLux = document.getElementById("graphChartLux");
const ctxNoise = document.getElementById("graphChartNoise");
const ctxGas = document.getElementById("graphChartGas");
const ctxPm = document.getElementById("graphChartPm");
let graphChartTemp;
let graphChartHumi;
let graphChartPres;
let graphChartLux;
let graphChartNoise;
let graphChartGas;
let graphChartPm;

// Request to get readings data
function getData() {
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      // console.log('getData(): ', JSON.parse(this.responseText));
      listReadings(JSON.parse(this.responseText));
    }
  };
  if (fan_gpio) {
    let fan = document.getElementById("fan").value;
    xhttp.open("GET", "readings?fan=" + fan, true);
  } else {
    xhttp.open("GET", "readings", true);
  }
  xhttp.send();
}

// Show live readings
tempScale.innerText = unitTemp;
function listReadings(d) {
  dataReadings = d;
  for (let i = 0; i < Object.keys(dataReadings).length; i++) {
    let dataKey = Object.keys(dataReadings)[i];
    let elementIdKey = document.getElementById(dataKey);
    let dataValue = Object.values(dataReadings)[i];
    if (typeof elementIdKey != "undefined" && elementIdKey != null) {
      elementIdKey.innerHTML = dataValue;
    }
  }
}

// Request to get graph data
function getGraph() {
  frequency = document.getElementById("graph-sel").value;
  let t = Date.now() / 1000;
  if (
    frequency != last_frequency ||
    t - last_graph >= frequencies[frequency].poll
  ) {
    last_frequency = frequency;
    last_graph = t;
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        // console.log("getGraph(): ", JSON.parse(this.responseText));
        transformedData = JSON.parse(this.responseText).map((element) => {
          return {
            // Normalize data for the graph
            time: new Date(element.time).toISOString(),
            temp: element.temp,
            humi: element.humi,
            pres: element.pres,
            lux: element.lux,
            high: element.high,
            mid: element.mid,
            low: element.low,
            amp: element.amp,
            nh3: element.nh3,
            red: element.red,
            oxi: element.oxi,
            pm1: element.pm1,
            pm25: element.pm25,
            pm10: element.pm10,
          };
        });

        if (!firstRun) {
          destroyAllCharts();
        } else {
          firstRun = false;
        }
        drawGraph(transformedData);
      }
    };

    xhttp.open("GET", "graph?time=" + frequency, true);
    xhttp.send();
  }
}

// Reload graph chart
function destroyAllCharts() {
  graphChartTemp.destroy();
  graphChartHumi.destroy();
  graphChartPres.destroy();
  graphChartLux.destroy();
  graphChartNoise.destroy();
  if (gas_sensor) graphChartGas.destroy();
  if (particulate_sensor) graphChartPm.destroy();
}

// Draw graph with data
function drawGraph(data) {
  // Change time range to read better the X axis
  let graphfrequency;
  switch (frequency) {
    case "day":
      graphfrequency = "hour";
      break;
    case "week":
      graphfrequency = "day";
      break;
    case "month":
      graphfrequency = "day";
      break;
    case "year":
      graphfrequency = "month";
      break;
    default:
      graphfrequency = frequency;
      break;
  }

  // Push data for chartJS
  graphChartTemp = new Chart(ctxTemp, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.temp.id,
          data: data,
          parsing: {
            yAxisKey: items.temp.id,
          },
          borderColor: items.temp.color,
          borderWidth: 2,
          pointBackgroundColor: items.temp.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          grace: "90%",
          ticks: {
            callback: function (value) {
              return value + items.temp.unit;
            },
          },
        },
        x: {
          type: "time",
          time: {
            unit: graphfrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxTemp.classList.remove("loading-spinner");
        },
      },
    },
  });

  graphChartHumi = new Chart(ctxHumi, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.humi.id,
          data: data,
          parsing: {
            yAxisKey: items.humi.id,
          },
          borderColor: items.humi.color,
          borderWidth: 2,
          pointBackgroundColor: items.humi.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          grace: "90%",
          ticks: {
            stepSize: 5,
            callback: function (value) {
              return value + items.humi.unit;
            },
          },
        },
        x: {
          type: "time",
          time: {
            unit: graphfrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxHumi.classList.remove("loading-spinner");
        },
      },
    },
  });

  graphChartPres = new Chart(ctxPres, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.pres.id,
          data: data,
          parsing: {
            yAxisKey: items.pres.id,
          },
          fill: items.pres.color,
          borderColor: items.pres.color,
          borderWidth: 2,
          pointBackgroundColor: items.pres.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          min: items.pres.min,
          max: items.pres.max,
          ticks: {
            stepSize: 20,
            callback: function (value) {
              return value + " " + items.pres.unit;
            },
          },
        },
        x: {
          type: "time",
          time: {
            unit: graphfrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxPres.classList.remove("loading-spinner");
        },
      },
    },
  });

  graphChartLux = new Chart(ctxLux, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.lux.id,
          data: data,
          parsing: {
            yAxisKey: items.lux.id,
          },
          borderColor: items.lux.color,
          borderWidth: 2,
          pointBackgroundColor: items.lux.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grace: "40%",
          ticks: {
            stepSize: 100,
            callback: function (value) {
              return value + " " + items.lux.unit;
            },
          },
        },
        x: {
          type: "time",
          time: {
            unit: graphfrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxLux.classList.remove("loading-spinner");
        },
      },
    },
  });

  graphChartNoise = new Chart(ctxNoise, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.high.id,
          data: data,
          parsing: {
            yAxisKey: items.high.id,
          },
          yAxisID: "y",
          borderColor: items.high.color,
          borderWidth: 2,
          pointBackgroundColor: items.high.color,
          pointRadius: 1,
        },
        {
          label: items.mid.id,
          data: data,
          parsing: {
            yAxisKey: items.mid.id,
          },
          yAxisID: "y1",
          borderColor: items.mid.color,
          borderWidth: 2,
          pointBackgroundColor: items.mid.color,
          pointRadius: 1,
        },
        {
          label: items.low.id,
          data: data,
          parsing: {
            yAxisKey: items.low.id,
          },
          yAxisID: "y2",
          borderColor: items.low.color,
          borderWidth: 2,
          pointBackgroundColor: items.low.color,
          pointRadius: 1,
        },
        {
          label: items.amp.id,
          data: data,
          parsing: {
            yAxisKey: items.amp.id,
          },
          yAxisID: "y3",
          borderColor: items.amp.color,
          borderWidth: 2,
          pointBackgroundColor: items.amp.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          min: items.high.min,
          max: items.high.max,
          ticks: {
            callback: function (value) {
              return value + " " + items.high.unit;
            },
          },
        },
        y1: {
          min: items.high.min,
          max: items.high.max,
          display: false,
        },
        y2: {
          min: items.high.min,
          max: items.high.max,
          display: false,
        },
        y3: {
          min: items.high.min,
          max: items.high.max,
          display: false,
        },
        x: {
          type: "time",
          time: {
            unit: graphfrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxNoise.classList.remove("loading-spinner");
        },
      },
    },
  });

  graphChartGas = new Chart(ctxGas, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.nh3.id,
          data: data,
          parsing: {
            yAxisKey: items.nh3.id,
          },
          yAxisID: "y",
          borderColor: items.nh3.color,
          borderWidth: 2,
          pointBackgroundColor: items.nh3.color,
          pointRadius: 1,
        },
        {
          label: items.red.id,
          data: data,
          parsing: {
            yAxisKey: items.red.id,
          },
          yAxisID: "y1",
          borderColor: items.red.color,
          borderWidth: 2,
          pointBackgroundColor: items.red.color,
          pointRadius: 1,
        },
        {
          label: items.oxi.id,
          data: data,
          parsing: {
            yAxisKey: items.oxi.id,
          },
          yAxisID: "y2",
          borderColor: items.oxi.color,
          borderWidth: 2,
          pointBackgroundColor: items.oxi.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          min: items.nh3.min,
          max: items.nh3.max,
          ticks: {
            callback: function (value) {
              return value + " " + items.nh3.unit;
            },
          },
        },
        y1: {
          min: items.red.min,
          max: items.red.max,
          display: false,
        },
        y2: {
          min: items.oxi.min,
          max: items.oxi.max,
          display: false,
        },
        x: {
          type: "time",
          time: {
            unit: graphfrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxGas.classList.remove("loading-spinner");
        },
      },
    },
  });

  graphChartPm = new Chart(ctxPm, {
    type: "line",
    data: {
      datasets: [
        {
          label: items.pm1.id,
          data: data,
          parsing: {
            yAxisKey: items.pm1.id,
          },
          yAxisID: "y",
          borderColor: items.pm1.color,
          borderWidth: 2,
          pointBackgroundColor: items.pm1.color,
          pointRadius: 1,
        },
        {
          label: items.pm25.id,
          data: data,
          parsing: {
            yAxisKey: items.pm25.id,
          },
          yAxisID: "y",
          borderColor: items.pm25.color,
          borderWidth: 2,
          pointBackgroundColor: items.pm25.color,
          pointRadius: 1,
        },
        {
          label: items.pm10.id,
          data: data,
          parsing: {
            yAxisKey: items.pm10.id,
          },
          yAxisID: "y",
          borderColor: items.pm10.color,
          borderWidth: 2,
          pointBackgroundColor: items.pm10.color,
          pointRadius: 1,
        },
      ],
    },
    options: {
      cubicInterpolationMode: "monotone",
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grace: "60%",
          ticks: {
            stepSize: 10,
            callback: function (value) {
              return value + " " + items.pm1.unit;
            },
          },
        },
        x: {
          type: "time",
          time: {
            unit: graphfrequency,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      parsing: {
        xAxisKey: "time",
      },
      animation: {
        onComplete: function () {
          ctxPm.classList.remove("loading-spinner");
        },
      },
    },
  });
}

// Manages theme color
function changeColorTheme() {
  body.className = this.id;
  localStorage.setItem("theme-color", this.id);
  hasThemeLight = !hasThemeLight;
}
themeLightBtn.addEventListener("click", changeColorTheme);
themeDarkBtn.addEventListener("click", changeColorTheme);

// Main menu (mobile)
menuMainBtn.addEventListener("click", function () {
  this.classList.toggle("btn-active");
  this.setAttribute("aria-expanded", this.classList.contains("btn-active"));
  menuMainContainer.classList.toggle("menu-settings-open");

  document.addEventListener("click", function clickOutsideMenu(event) {
    let clickMenuContainer = menuMainContainer.contains(event.target);
    let clickMenuBtn = menuMainBtn.contains(event.target);
    if (
      !clickMenuContainer &&
      !clickMenuBtn &&
      menuMainContainer.classList.contains("menu-settings-open")
    ) {
      menuMainBtn.classList.toggle("btn-active");
      menuMainBtn.setAttribute(
        "aria-expanded",
        menuMainBtn.classList.contains("btn-active")
      );
      menuMainContainer.classList.toggle("menu-settings-open");
      document.removeEventListener("click", clickOutsideMenu);
    }
  });
});

// Redraw graphs on window resize
window.addEventListener("resize", function () {
  destroyAllCharts();
  drawGraph(transformedData);
});

// Call a function repetitively with ~1 second interval
setInterval(function () {
  getData();
  getGraph();
}, 900);
