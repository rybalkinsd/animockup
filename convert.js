var inner = document.getElementById("convert");
var workerPath = 'https://archive.org/download/ffmpeg_asm/ffmpeg_asm.js';
if (document.domain == 'localhost') {
    workerPath = location.href.replace(location.href.split('/').pop(), '') + 'ffmpeg_asm.js';
}

function processInWebWorker() {
    var blob = URL.createObjectURL(new Blob(['importScripts("' + workerPath + '");var now = Date.now;function print(text) {postMessage({"type" : "stdout","data" : text});};onmessage = function(event) {var message = event.data;if (message.type === "command") {var Module = {print: print,printErr: print,files: message.files || [],arguments: message.arguments || [],TOTAL_MEMORY: message.TOTAL_MEMORY||536870912  || false};postMessage({"type" : "start","data" : Module.arguments.join(" ")});postMessage({"type" : "stdout","data" : "Received command: " +Module.arguments.join(" ") +((Module.TOTAL_MEMORY ) ? ".  Processing with " + Module.TOTAL_MEMORY + " bits." : "")});var time = now();var result = ffmpeg_run(Module);var totalTime = now() - time;postMessage({"type" : "stdout","data" : "Finished processing (took " + totalTime + "ms)"});postMessage({"type" : "done","data" : result,"time" : totalTime});}};postMessage({"type" : "ready"});'], {
        type: 'application/javascript'
    }));

    var worker = new Worker(blob);
    URL.revokeObjectURL(blob);
    return worker;
}

var worker;

function convertStreams(videoBlob, setting) {
    var aab;
    var buffersReady;
    var workerReady;
    var posted;

    var fileReader = new FileReader();
    fileReader.onload = function() {
        aab = this.result;
        postMessage();
    };
    fileReader.readAsArrayBuffer(videoBlob);

    if (!worker) {
        worker = processInWebWorker();
    }
    worker.onmessage = function(event) {
        var message = event.data;
        if (message.type == "ready") {

            workerReady = true;
            if (buffersReady)
                postMessage();
        } else if (message.type == "done") {
            var result = message.data[0];
            if (setting == "gif") {
                var blob = new File([result.data], 'test.gif', {
                    type: 'image/gif'
                });
                PostBlob(blob);
            } else if (setting == "mp4") {
                var blob = new File([result.data], 'test.mp4', {
                    type: 'video/mp4'
                });
                PostBlob(blob);
            }
        }
    };
    var postMessage = function() {
        posted = true;
        if (setting == "gif") {
            worker.postMessage({
                type: 'command',
                arguments: '-i video.webm -r 10 output-10.gif'.split(' '),
                files: [{
                    data: new Uint8Array(aab),
                    name: 'video.webm'
                }]
            });
        } else if (setting == "mp4") {
            worker.postMessage({
                type: 'command',
                arguments: '-i video.webm -c:v mpeg4 -b:v 6400k -strict experimental output.mp4'.split(' '),
                files: [{
                    data: new Uint8Array(aab),
                    name: 'video.webm'
                }]
            });
        }
    };
}

function PostBlob(blob) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = URL.createObjectURL(blob);;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(URL.createObjectURL(blob));
    }, 100);
    document.getElementById("download-final").classList.remove("download-active");
    document.getElementById("download-final").innerHTML = "Download";
}
