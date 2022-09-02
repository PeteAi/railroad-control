let width = 6000;
let height = 2000;
let div_width;
let div_height;
let ws;
let switches_list;


function connect() {
    switches_list = [];
    ws = new WebSocket("ws://moba.local:8080");

    ws.onopen = function () {
        console.log("connected");
        $('#connectionModalCenter').modal('hide');
        ws.send("New Client");
    };

    ws.onmessage = function (evt) {
        let received_msg = evt.data;
        try {
            let msg = JSON.parse(received_msg);
            // console.log(msg);

            if (msg.task === 'switch') {
                switches_list.find(switch_obj => switch_obj.id === msg.id).set_state(msg.state);
                return;
            }
            if (msg.hasOwnProperty('all_parts')) {
                console.log(msg);
                switches_list = [];
                layer.destroyChildren();
                for (let key in msg.all_parts) {
                    let obj = msg.all_parts[key];
                    let tempSwitch = new Switch(obj.id, obj.type, obj.state);
                    tempSwitch.set_pos(obj.x, obj.y, obj.rot);
                    switches_list.push(tempSwitch);
                    layer.add(tempSwitch.switch_group);
                }
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

connect();

class Switch {
    constructor(id, type, state) {
        this.id = id;
        this.type = type;
        this.switch_group = this.make_switch_group();
        this.set_state(state);
    }

    make_switch_group() {
        let switch_group = new Konva.Group({
            x: stage.width() / 2,
            y: stage.height() / 2,
            rotation: 0,
        });
        let line = new Konva.Line({
            points: [0, 0, 0, 188],
            stroke: 'orange',
            strokeWidth: 40,
            name: 'line'
        })
        let arc = new Konva.Arc({
            innerRadius: 417,
            outerRadius: 457,
            angle: 24.3,
            fill: 'orange',
            name: 'arc'
        });
        if (this.type === 0) {
            arc.x(-437);
        } else if (this.type === 1) {
            arc.x(437);
            arc.rotation(180 - 24.3);

        }
        switch_group.add(line);
        switch_group.add(arc);
        line.zIndex(1);
        arc.zIndex(0);

        switch_group.on('click tap', () => {
            clicked_switch(this.id);
        });


        return switch_group;
    }

    set_state(state) {
        this.state = state
        switch (state) {
            case 0:
                this.switch_group.getChildren().find((node) => {
                    return node.getName() === 'line'
                }).stroke('green').moveToTop();
                this.switch_group.getChildren().find((node) => {
                    return node.getName() === 'arc'
                }).fill('grey');
                break;
            case 1:
                this.switch_group.getChildren().find((node) => {
                    return node.getName() === 'line'
                }).stroke('grey');
                this.switch_group.getChildren().find((node) => {
                    return node.getName() === 'arc'
                }).fill('red').moveToTop();
                break;
            default:
                this.switch_group.getChildren().find((node) => {
                    return node.getName() === 'line'
                }).stroke('orange');
                this.switch_group.getChildren().find((node) => {
                    return node.getName() === 'arc'
                }).fill('orange').moveToTop();
                break;
        }
    }

    set_pos(x, y, rot) {
        this.switch_group.x(x);
        this.switch_group.y(y);
        this.switch_group.rotation(rot);
    }
}

function clicked_switch(id) {
    if (switches_list[id].state !== 2) {
        let msg = {"task": "set_switch", "id": switches_list[id].id, "state": 1 - switches_list[id].state};
        ws.send(JSON.stringify(msg));
    } else {
        let msg = {"task": "set_switch", "id": switches_list[id].id, "state": 0};
        ws.send(JSON.stringify(msg));
    }
}


// ---------------------Konva graphics------------------------------
Konva.hitOnDragEnabled = true;
let stage = new Konva.Stage({
    container: 'konva-container',   // id of container <div>
    draggable: true,
    scaleX: 0.5,
    scaleY: 0.5
});

// ---------------------Konva events------------------------------

let lastCenter = null;
let lastDist = 0;

stage.on('touchmove', function (e) {
    e.evt.preventDefault();
    let touch1 = e.evt.touches[0];
    let touch2 = e.evt.touches[1];

    function getCenter(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
        };
    }

    function getDistance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    if (touch1 && touch2) {
        // if the stage was under Konva's drag&drop
        // we need to stop it, and implement our own pan logic with two pointers
        if (stage.isDragging()) {
            stage.stopDrag();
        }

        let p1 = {
            x: touch1.clientX,
            y: touch1.clientY,
        };
        let p2 = {
            x: touch2.clientX,
            y: touch2.clientY,
        };

        if (!lastCenter) {
            lastCenter = getCenter(p1, p2);
            return;
        }
        let newCenter = getCenter(p1, p2);

        let dist = getDistance(p1, p2);

        if (!lastDist) {
            lastDist = dist;
        }

        // local coordinates of center point
        let pointTo = {
            x: (newCenter.x - stage.x()) / stage.scaleX(),
            y: (newCenter.y - stage.y()) / stage.scaleX(),
        };

        let scale = stage.scaleX() * (dist / lastDist);

        stage.scaleX(scale);
        stage.scaleY(scale);

        // calculate new position of the stage
        let dx = newCenter.x - lastCenter.x;
        let dy = newCenter.y - lastCenter.y;

        let newPos = {
            x: newCenter.x - pointTo.x * scale + dx,
            y: newCenter.y - pointTo.y * scale + dy,
        };

        stage.position(newPos);
        stage_move();
        lastDist = dist;
        lastCenter = newCenter;
    }
});

stage.on('touchend', function () {
    lastDist = 0;
    lastCenter = null;
});

stage.on('dragmove', () => {
    stage_move();
});

stage.on('wheel', (e) => {
    let scaleBy = 1.05;
    // stop default scrolling
    e.evt.preventDefault();

    let oldScale = stage.scaleX();
    let pointer = stage.getPointerPosition();

    let mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };

    // how to scale? Zoom in? Or zoom out?
    let direction = e.evt.deltaY > 0 ? 1 : -1;

    // when we zoom on trackpad, e.evt.ctrlKey is true
    // in that case lets revert direction
    if (e.evt.ctrlKey) {
        direction = -direction;
    }

    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    stage.scale({x: newScale, y: newScale});

    let newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    stage_move();
});

function fitStageIntoParentContainer() {
    let container = document.querySelector('#canvas-div');
    div_width = container.offsetWidth;
    div_height = container.offsetHeight;
    stage.width(container.offsetWidth);
    stage.height(container.offsetHeight);
}

fitStageIntoParentContainer();
// adapt the stage on any window resize
window.addEventListener('resize', fitStageIntoParentContainer);

function stage_move() {
    if (stage.x() >= 0 || width * stage.scaleX() <= div_width) {
        stage.x(0);
    } else if (stage.x() <= -(width * stage.scaleX()) + div_width) {
        stage.x(-(width * stage.scaleX()) + div_width);
    }
    if (stage.y() >= 0 || height * stage.scaleX() <= div_height) {
        stage.y(0);
    } else if (stage.y() <= -height * stage.scaleX() + div_height) {
        stage.y(-height * stage.scaleX() + div_height);
    }
}

// then create layer
let background = new Konva.Layer();
let rect1 = new Konva.Rect({
    x: 0,
    y: 0,
    width: width,
    height: height,
    stroke: '#383838',
    strokeWidth: 10
});
background.add(rect1);

let layer = new Konva.Layer();

let bezierLine = new Konva.Shape({
    stroke: 'grey',
    strokeWidth: 40,
    sceneFunc: (ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(100, 200);
        ctx.bezierCurveTo(
            100,
            100,
            100,
            100,
            500,
            100
        );
        ctx.fillStrokeShape(shape);
    },
});
background.add(bezierLine);

stage.add(background);
stage.add(layer);
background.draw();
layer.draw();