let ws;

function connect() {
    ws = new WebSocket("ws://moba.local:8081")

    ws.onopen = function () {
        console.log("connected");
        //bootstrap.Modal('#connectionModalCenter', {backdrop:false});
        $('#connectionModalCenter').modal('hide');
        ws.send("New Client");
    };

    ws.onmessage = function (evt) {
        let received_msg = evt.data;
        try {
            let msg = JSON.parse(received_msg);
            console.log(msg);

            if (msg.task === 'replace all services') {
                document.getElementById('service_container').children[0].innerHTML = '';
                for (let i = 0; i < msg.services.length; i++) {
                    add_service_div(msg.services[i], msg.status[i]);
                }
                return;
            }
            if (msg.task === 'service state update') {
                let status_text = document.getElementById('card-title-' + msg.service)
                if (msg.status) {
                    status_text.innerText = 'Running';
                    status_text.style.color = 'green'
                } else {
                    status_text.innerText = 'Halted';
                    status_text.style.color = 'red'
                }

                return;
            }

        } catch (e) {
            console.error(e);
        }
    };

    ws.onclose = function (e) {
        //console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        console.log('Socket is closed. Reconnect will be attempted in 1 second.');
        $('#connectionModalCenter').modal('show');

        setTimeout(function () {
            connect();
        }, 1000);
    };
}

connect()

function add_service_div(name, status) {
    let col = document.createElement('div');
    col.className = "col-md-4 py-4";
    col.innerHTML = `
    <div class="card">
          <div class="card-header">
          ${name}  
          </div>
          <div class="card-body">
            <h5 class="card-title" id="card-title-${name}" style="color: ${status ? "green" : "red"};">${status ? "Running" : "Halted"}</h5>
            <p class="card-text">With supporting text below as a natural lead-in to additional content.</p>
            <div class="text-right">
              <div class="buttons btn-group">
                <button class="btn btn-success btn-md" id="btn-start-${name}" onclick="ws.send('start ${name}')">START</button>
                <button class="btn btn-danger btn-md" id="btn-stop-${name}" onclick="ws.send('stop ${name}')">STOP</button>
              </div>
            </div>
          </div>
        </div>
    `;
    document.getElementById('service_container').children[0].appendChild(col);
}