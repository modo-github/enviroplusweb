setInterval(function () {
    // Call a function repetitively with 1 second interval
    getData();
    getGraph();
}, 900); //~1s update rate

var frequencies = {
    '5min': { major: 300, minor: 60, poll: 1 },
    'day': { major: 3 * 3600, minor: 3600, poll: 60 },
    'week': { major: 24 * 3600, minor: 6 * 3600, poll: 600 },
    'month': { major: 7 * 24 * 3600, minor: 24 * 3600, poll: 1440 },
    'year': { major: 31 * 24 * 3600, minor: 7 * 24 * 3600, poll: 17280 }
};

var particle_sensor_readings = false;
var gas_sensor_readings = false;
var fan_gpio = document.getElementById('fan_gpio').classList.contains('fan-gpio-True');

function getData() {
    var xhttp = new XMLHttpRequest();
    
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            document.getElementById("readings").innerHTML = this.responseText;
            particle_sensor_readings = this.responseText.search("10.0um") > 0;
            gas_sensor_readings = this.responseText.search("Oxidising") > 0;
        }
    };
    if (fan_gpio) {
        var fan = document.getElementById("fan").value;
        xhttp.open("GET", "readings?fan=" + fan, true);
    } else {
        xhttp.open("GET", "readings", true);
    }
    xhttp.send();
}

var last_frequency = "";
var last_graph = 0;
function getGraph(param) {
    var frequency = document.getElementById("graph-sel").value;
    var t = Date.now() / 1000;
    if (frequency != last_frequency || t - last_graph >= frequencies[frequency].poll || param == 'resized') {
        last_frequency = frequency;
        last_graph = t;
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                graph(JSON.parse(this.responseText));
            }
        };
        xhttp.open("GET", "graph?time=" + frequency, true);
        xhttp.send();
    }
}

var items_ngp = [
    { name: "temp", colour: "#ff595e", min: 0, max: 50 },
    { name: "humi", colour: "#006caf", min: 0, max: 100 },
    { name: "pres", colour: "#588f00", min: 950, max: 1050 },
    { name: "lux", colour: "#f5b60f", min: 0, max: 25000 },
]

var items_g = [
    { name: "oxi", colour: "#6a4c93", min: 0, max: 400 },
    { name: "red", colour: "#ce7100", min: 0, max: 1000 },
    { name: "nh3", colour: "#6ca88a", min: 0, max: 600 },
]

var items_p = [
    { name: "pm03", colour: "#575757", min: 0, max: 20000 },
    { name: "pm05", colour: "#696969", min: 0, max: 10000 },
    { name: "pm10", colour: "#7c7c7c", min: 0, max: 2000 },
    { name: "pm25", colour: "#909090", min: 0, max: 500 },
    { name: "pm50", colour: "#a4a4a4", min: 0, max: 200 },
    { name: "pm100", colour: "#b0b0b0", min: 0, max: 100 },
];

var firstLayoutRender = true;
var containerCanvas;
var canvas;
var ctx;
var data;
var yScaleSteps = 10;
var yLabelHeight = 10;
var xLabelHeight = 15;
var xScale;
var yScale;
var yLabelWidth = 25;
function graph(d) {
    data = d;
    containerCanvas = document.getElementById("container-graph");
    canvas = document.getElementById("canvas-graph");
    if (firstLayoutRender) {
        canvas.height = containerCanvas.offsetHeight;
        canvas.width = containerCanvas.offsetWidth;
        firstLayoutRender = false;
    }

    ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0099ff"
    ctx.font = "20 pt Verdana"

    yScale = (canvas.height - yLabelHeight - xLabelHeight);
    xScale = (canvas.width - yLabelWidth) / (data.length - 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Print X axis vertical time lines
    var frequency = document.getElementById("graph-sel").value;
    var major = frequencies[frequency].major;
    var minor = frequencies[frequency].minor;
    var show_date = major >= 24 * 3600;
    var months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    }
    ctx.textAlign = 'center';
    for (var i = 0; i < data.length; i++) {
        var fields = data[i]['time'].match(/\S+/g); // split is broken!
        var t = fields[3].split(':');
        var date = months[fields[1]] * 31 + parseInt(fields[2]) - 1;
        var time = date * 24 * 3600 + parseInt(t[0]) * 3600 + parseInt(t[1]) * 60 + parseInt(t[2]);
        if (time % minor == 0) {
            var is_major = (time % major) == 0;
            var x = i * xScale + yLabelWidth;
            if (is_major)
                ctx.fillText(show_date ? fields[0] + ' ' + fields[1] + ' ' + fields[2]
                    : fields[3].slice(0, 5), x, canvas.height);
            ctx.beginPath();
            ctx.strokeStyle = is_major ? "#b6b6b6" : "#dcdcdc"; // colour of grid lines
            ctx.setLineDash([5, 3]);
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height - xLabelHeight);
            ctx.stroke();
        }
    }

    // Print Y axis labels and draw horizontal grid lines
    ctx.beginPath();
    ctx.strokeStyle = "#dcdcdc"; // colour of grid lines
    ctx.textAlign = 'left';
    for (var i = 0; i <= yScaleSteps; i++) {
        var y = yScale * (yScaleSteps - i) / yScaleSteps + yLabelHeight - 1;
        ctx.fillText(i / yScaleSteps, yLabelHeight, y);
        ctx.moveTo(yLabelWidth, y)
        ctx.lineTo(canvas.width, y)
    }
    ctx.stroke();

    // Plot each item
    var scaleFactors = "";
    var items = particle_sensor_readings ? items_ngp.concat(items_g).concat(items_p) :
        gas_sensor_readings ? items_ngp.concat(items_g) : items_ngp;
    for (var item of items) {
        ctx.strokeStyle = item.colour;
        plotData(item.name, item.min, item.max);
        scaleFactors += '<tr><td>' + item.name + '</td><td>/' + (item.max - item.min) + '</td></tr>';
    }

    // Update the legend
    document.getElementById("scale-factors-tbody").innerHTML = scaleFactors;
}

function scaley(y, min, max) {
    return (y - min) * yScale / (max - min);
}

function plotData(dataSet, min, max) {
    ctx.beginPath();
    ctx.setLineDash([]);
    y0 = canvas.height - xLabelHeight;
    ctx.moveTo(yLabelWidth, y0 - scaley(data[0][dataSet], min, max));
    for (var i = 1; i < data.length; i++) {
        ctx.lineTo(yLabelWidth + i * xScale, y0 - scaley(data[i][dataSet], min, max));
    }
    ctx.stroke();
}

// Update the graph layout (width/height) if window resize
window.addEventListener("resize", function () {
    firstLayoutRender = true;
    getGraph('resized');
});
