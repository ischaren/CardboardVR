var backgroundElement = document.getElementById('background');
var statusElement = document.getElementById('status');
var progressElement = document.getElementById('progress');
var viewportElement = document.getElementById("viewport");
var canvasElement = document.getElementById('canvas');

// Initialize Module
var Module = {
	// ----------------------------------------------------------------------------------------
	// Runtime configuration
	contentURL: "content",
	// ----------------------------------------------------------------------------------------
	// Emscripten required Module definitions
	preRun: [],
	postRun: [],
	print: (function() {
		var element = document.getElementById('output');
		if (element) element.value = ''; // clear browser cache
		return function(text) {
			if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
			console.log(text);
			if (element) {
				element.value += text + "\n";
				element.scrollTop = element.scrollHeight; // focus on bottom
			}
		};
	})(),
	printErr: function(text) {
		if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
		console.error(text);
	},
	canvas: (function() {
		var canvas = document.getElementById('canvas');
		canvas.addEventListener("webglcontextlost", function(e) { Module.reportError('WebGL context lost. You will need to reload the page.'); e.preventDefault(); }, false);
		return canvas;
	})(),
	setStatus: function(text) {
		// Return if status text didn't change
		if (!Module.setStatus.text) Module.setStatus.text = '';
		if (Module.setStatus.text === text) return;
		// Parse: any (number/number)
		var m = text.match(/([^(]+)\((\d+)\/(\d+)\)/);
		if (m) {
			text = m[1];
			progressElement.value = parseInt(m[2]);
			progressElement.max = parseInt(m[3]);
			progressElement.hidden = false;
		} else {
			progressElement.value = null;
			progressElement.max = null;
			progressElement.hidden = true;
		}
		statusElement.innerHTML = text;
	},
	totalDependencies: 0,
	monitorRunDependencies: function(left) {},
	// ----------------------------------------------------------------------------------------
	// Stingray required Module definitions
	setCanvasVisible: function(visible) {
		if (visible) {
			backgroundElement.hidden = true;
			viewportElement.style.width = canvasElement.width + "px";
			viewportElement.style.height = canvasElement.height + "px";
			viewportElement.style.boxShadow = "0 3px 9px rgba(0, 0, 0, 0.5)";
			canvasElement.style.display = 'block';
		} else {
			backgroundElement.hidden = false;
			viewportElement.style.boxShadow = 'none';
			canvasElement.style.display = 'none';
		}
	},
	onInitComplete: function() {
		var interval = window.setInterval(function () {
			if (canvasElement.width !== 300) {
				Module.setCanvasVisible(true);
				window.clearInterval(interval);
			}
		}, 100);
	},
	onShutdown: function() {
		Module.setCanvasVisible(false);
		Module.setStatus("Reload the page to restart engine.");
	},
	abortExecution: false,
	reportError: function(text) {
		Module.setCanvasVisible(false);
		Module.setStatus('Error: ' + text);
		Module.setStatus = function(text) {
			if (text) Module.printErr(text);
		};
		Module.onInitComplete = function() {};
		Module.onShutdown = function() {};
		Module.abortExecution = true;
	}
};
var browser = get_browser_info();

// Test for WebAssembly support
var wasm_supported = (typeof WebAssembly === 'object' && typeof WebAssembly.Memory === 'function');
if (!wasm_supported) {
	var wasm_capable = (browser.name === "Chrome" && browser.version >= 57) || (browser.name === "Firefox" && browser.version >= 52);

	var message = "";
	if (wasm_capable) {
		message = "Your browser support WebAssembly, but does not seem to be working.<br>";
		if (browser.name === "Chrome")
			message += "<br>Using Chrome? Navigate to <b>about:flags</b> and verify <b>WebAssembly</b> is <b>enabled</b>.";
		else if (browser.name === "Firefox")
			message += "<br>Using Firefox? Navigate to <b>about:config</b> and verify <b>javascript.options.wasm</b> is <b>true</b>.";
	} else {
		message = "Your browser does not appear to have WebAssembly support.<br>";
	}

	Module.reportError(message);
}

// Test for WebGL 2.0 support
var webgl2_supported = canvasElement.getContext('webgl2') || canvasElement.getContext('experimental-webgl2');
if (!webgl2_supported) {
	var webgl2_capable = (browser.name === "Chrome" && browser.version >= 56) || (browser.name === "Firefox" && browser.version >= 51);

	var message = "";
	if (webgl2_capable) {
		message = "Your browser support WebGL 2.0, but does not seem to be working.<br>";
		if (browser.name === "Chrome")
			message += "<br>Using Chrome? Navigate to <b>about:flags</b> and verify <b>WebGL 2.0</b> is <b>enabled</b>.";
		else if (browser.name === "Firefox")
			message += "<br>Using Firefox? Navigate to <b>about:config</b> and verify <b>webgl.enable-webgl2</b> is <b>true</b>.";
		message += "<br>Also, please verify graphics driver are up-to-date.";
	} else {
		message = "Your browser does not appear to have WebGL 2.0 support.<br>";
	}

	Module.reportError(message);
}

// Retrieve http GET parameters
if (typeof window === "object") {
	Module['arguments'] = window.location.search.substr(1).trim().split(RegExp('=|&'));
	// If no args were passed arguments = [''], in which case kill the single empty string.
	if (!Module['arguments'][0])
		Module['arguments'] = [];
}

// Setup initial page
Module.setStatus('Downloading...');
window.onerror = function(event) {
	Module.reportError("Exception thrown, see JavaScript console.");
};
