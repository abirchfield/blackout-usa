"use strict";

/* ------------------------------------------------------------------------- */
/* Global state variables */
/* ------------------------------------------------------------------------- */

const G = {
    inDrag: false,
    dragstartX: null,
    dragstartY: null,
    dragorigX: null,
    dragorigY: null,
    scale_adjust: 0.25,
    xmax: -80,
    xmin: -112,
    ymax: 40,
    ymin: 23,
    scale_max: 800,
    scale_min: 50,
    last_game_step_time: 0,
    last_anim_time: 0,
    anim_cycle_state: 0,
    selected_sub: 0,
    selected_unit: 0,
    selected_branch: 0,
    canvas: null,
    ctx: null,
    bor: null,
    day: 0,
    scenario_state: "stopped", /* or "paused", "normal", "fast"*/
    subs: null,
    branches: null,
    nsubs: 0
};


/* ------------------------------------------------------------------------- */
/* Page startup */
/* ------------------------------------------------------------------------- */

if (document.readyState == "loading") {
    document.addEventListener('DOMContentLoaded', ready)
} else {
    ready();
}

function set_defaults() {
    for (let key in G.subs) {
        let sub = G.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            u.Status = u.Status0;
            u.P = u.Pset = u.P0;
            u.StatusCount = 0;
            if (sub.Category == "Solar" || sub.Category == "Wind") {
                u.Pset = sub.pmax / sub.Units;
            }
        }
    }
    for (let key in G.branches) {
        let br = G.branches[key];
        br.P = 0;
        br.Status1 = "IN";
        br.Status2 = "IN";
    }
    G.x0 = -107;
    G.y0 = 37;
    G.scaleX = 100;
    G.scaleY = 100;
    G.t = 0;
    G.Ybus = null;
    G.Yinv = null;
    G.frequency = 60;
    G.fr_load = 1;
    G.fr_wind = 1;
    G.fr_solar = 1;
    G.total_load_served = 0;
    G.total_load_unserved = 0;
    G.total_wind = 0;
    G.total_solar = 0;
    G.total_thermal = 0;
    G.total_nuclear = 0;
    G.spin_reserves = 0;
    G.current_fuel_cost = 0;
    G.current_running_cost = 0;
    G.current_uload_cost = 0;
    G.total_fuel_cost = 0;
    G.total_running_cost = 0;
    G.total_uload_cost = 0;
    G.total_cost = 0;
    G.average_cost = 0;
    G.total_mwh = 0;
    clear_alerts();
}

function ready() {

    /* Get Items */
    G.canvas = document.getElementById("main-canvas-id");
    G.ctx = G.canvas.getContext("2d");
    G.bor = scenario_data.borders;
    G.subs = scenario_data.subs;
    G.branches = scenario_data.branches;
    G.nsubs = scenario_data.nsubs;

    /* Set Up Modal Close buttons automatically */
    const closeModalButtons = document.querySelectorAll('[data-close-modal]');
    closeModalButtons.forEach(button => 
        {button.addEventListener('click', modalCloseClicked)});

    /* Assign handlers for top right buttons */
    document.getElementById("pause-button").addEventListener('click', 
        pauseClicked);
    document.getElementById("fast-button").addEventListener('click',
        fastClicked); 
    document.getElementById("help-button").addEventListener('click', 
        helpClicked);
    document.getElementById("quit-button").addEventListener('click',
        quitClicked); 
    document.getElementById("alerts-button").addEventListener('click',
        alertsClicked); 
        
    /* Process input data */
    for (let key in G.branches){
        let branch = G.branches[key];
        branch.sub1 = G.subs[branch.FromNum];
        branch.sub2 = G.subs[branch.ToNum];
        branch.dist = Math.sqrt(Math.pow(
            branch.sub1.Latitude-branch.sub2.Latitude, 2) 
            + Math.pow(branch.sub1.Longitude-branch.sub2.Longitude, 2))
    }

    /* Assign canvas event listeners */
    G.canvas.addEventListener("mousedown", mouseDownHandler);
    G.canvas.addEventListener("mousemove", mouseMoveHandler);
    G.canvas.addEventListener("mouseleave", mouseLeaveHandler);
    G.canvas.addEventListener("mouseup", mouseUpHandler);
    G.canvas.addEventListener("wheel", wheelScrolled, {passive: false});
    document.addEventListener("keydown", keyPressed);
    window.addEventListener("resize", windowResized);


    /* Startup: draw, begin animation loop, and open welcome page */
    set_defaults();
    draw();
    requestAnimationFrame(animation_step);
    openModal(document.getElementById("welcome-modal"));
}

/* ------------------------------------------------------------------------- */
/* Animation loop and drawing */
/* ------------------------------------------------------------------------- */

function animation_step(timeStamp) {
    if (G.scenario_state == "normal")
    {
        if (timeStamp - G.last_game_step_time >= 500)
        {
            do_next_game_step();
            G.last_game_step_time = timeStamp;
        }
        if (timeStamp - G.last_anim_time >= 100)
        {
            G.last_anim_time = timeStamp;
            G.anim_cycle_state = (G.anim_cycle_state + 1) % 16;
            draw();
        }
    }
    else if (G.scenario_state == "fast")
    {
        if (timeStamp - G.last_game_step_time >= 100)
        {
            for (let i = 0 ; i < 2; ++i)
            do_next_game_step();
            G.last_game_step_time = timeStamp;
        }
        if (timeStamp - G.last_anim_time >= 50)
        {
            G.last_anim_time = timeStamp;
            G.anim_cycle_state = (G.anim_cycle_state + 2) % 16;
            draw();
        }
    }
    else
    {
        if (timeStamp - G.last_anim_time >= 100)
        {
            G.last_anim_time = timeStamp;
            draw();
        }
    }
    requestAnimationFrame(animation_step);
}

function draw() {
    G.canvas.width = G.canvas.offsetWidth;
    G.canvas.height = G.canvas.offsetHeight;
    G.ctx.clearRect(0, 0, G.ctx.width, G.ctx.height)
    if (G.x0 < G.xmin) G.x0 = G.xmin;
    if (G.x0 + G.canvas.width/G.scaleX > G.xmax) 
        G.x0 = G.xmax - G.canvas.width/G.scaleX;
    if (G.y0 - G.canvas.height/G.scaleY < G.ymin) 
        G.y0 = G.ymin + G.canvas.height/G.scaleY;
    if (G.y0 > G.ymax) G.y0 = G.ymax;

    G.ctx.strokeStyle = "White";
    G.ctx.lineWidth = 2;
    G.ctx.beginPath();
    G.ctx.moveTo((-G.x0+G.bor[0][0])*G.scaleX, (G.y0-G.bor[0][1])*G.scaleY)
    for (let i = 1; i < G.bor.length; i++) {
        G.ctx.lineTo((-G.x0 + G.bor[i][0])*G.scaleX, 
            (G.y0 - G.bor[i][1])*G.scaleY)
    } 
    G.ctx.stroke();

    for (let key in G.branches){
        let branch = G.branches[key];
        let s1, s2;
        if (branch.P >= 0)
        {
            s1 = branch.sub1;
            s2 = branch.sub2;
        }
        else
        {
            s2 = branch.sub1;
            s1 = branch.sub2;
        }
        G.ctx.beginPath();
        G.ctx.moveTo((-G.x0+s1.Longitude)*G.scaleX,(G.y0-s1.Latitude)*G.scaleY);
        G.ctx.lineTo((-G.x0+s2.Longitude)*G.scaleX,(G.y0-s2.Latitude)*G.scaleY);
        if (branch.Status1 == "IN")
        {
            if (math.abs(branch.P) > branch.Circuits*branch.Pmax*1.2)
            {
                G.ctx.strokeStyle = "Orange";
            }
            else if (math.abs(branch.P) > branch.Circuits*branch.Pmax)
            {
                G.ctx.strokeStyle = "Yellow";
            }
            else {
                G.ctx.strokeStyle = "White";
            }
            G.ctx.lineWidth = 2;
            G.ctx.setLineDash([0]);
            G.ctx.lineDashOffset = 0;
            G.ctx.stroke();
            if (Math.abs(branch.P) > 10)
            {
                G.ctx.strokeStyle = "Black";
                G.ctx.lineWidth = 3;
                G.ctx.setLineDash([6, 26]);
                G.ctx.lineDashOffset = 2*G.anim_cycle_state+1;
                G.ctx.stroke();
                G.ctx.strokeStyle = "Lime";
                G.ctx.lineWidth = 3;
                G.ctx.setLineDash([4, 28]);
                G.ctx.lineDashOffset = 2*G.anim_cycle_state;
                G.ctx.stroke();
            }
        }
        else if (branch.Status1 == "DIS")
        {
            G.ctx.strokeStyle = "White";
            G.ctx.lineWidth = 2;
            G.ctx.setLineDash([0]);
            G.ctx.lineDashOffset = 0;
            G.ctx.stroke();
            G.ctx.strokeStyle = "Black";
            G.ctx.lineWidth = 3;
            G.ctx.setLineDash([5, 5]);
            G.ctx.lineDashOffset = 0;
            G.ctx.stroke();
        }
        else if (branch.Status1 == "TRIP")
        {
            G.ctx.strokeStyle = "Red";
            G.ctx.lineWidth = 2;
            G.ctx.setLineDash([5, 5]);
            G.ctx.lineDashOffset = 0;
            G.ctx.stroke();
        }
        if (branch.Circuits == 2)  {
            G.ctx.beginPath();
            let circuit_offX = (s2.Latitude - s1.Latitude)/branch.dist * 5;
            let circuit_offY = (s2.Longitude - s1.Longitude)/branch.dist * 5;
            G.ctx.moveTo((-G.x0+s1.Longitude)*G.scaleX, 
                (G.y0-s1.Latitude)*G.scaleY);
            G.ctx.lineTo((-G.x0+s1.Longitude)*G.scaleX + circuit_offX, 
                (G.y0-s1.Latitude)*G.scaleY + circuit_offY);
            G.ctx.lineTo((-G.x0+s2.Longitude)*G.scaleX + circuit_offX, 
                (G.y0-s2.Latitude)*G.scaleY + circuit_offY);
            G.ctx.lineTo((-G.x0+s2.Longitude)*G.scaleX, 
                (G.y0-s2.Latitude)*G.scaleY);
            if (branch.Status2 == "IN")
            {
                if (math.abs(branch.P) > branch.Circuits*branch.Pmax*1.2)
                {
                    G.ctx.strokeStyle = "Orange";
                }
                else if (math.abs(branch.P) > branch.Circuits*branch.Pmax)
                {
                    G.ctx.strokeStyle = "Yellow";
                }
                else {
                    G.ctx.strokeStyle = "White";
                }
                G.ctx.lineWidth = 2;
                G.ctx.setLineDash([0]);
                G.ctx.lineDashOffset = 0;
                G.ctx.stroke();
                if (Math.abs(branch.P) > 10)
                {
                    G.ctx.strokeStyle = "Black";
                    G.ctx.lineWidth = 3;
                    G.ctx.setLineDash([6, 26]);
                    G.ctx.lineDashOffset = 2*G.anim_cycle_state+1;
                    G.ctx.stroke();
                    G.ctx.strokeStyle = "Lime";
                    G.ctx.lineWidth = 3;
                    G.ctx.setLineDash([4, 28]);
                    G.ctx.lineDashOffset = 2*G.anim_cycle_state;
                    G.ctx.stroke();
                }
            }
            else if (branch.Status2 == "DIS")
            {
                G.ctx.strokeStyle = "White";
                G.ctx.lineWidth = 2;
                G.ctx.setLineDash([0]);
                G.ctx.lineDashOffset = 0;
                G.ctx.stroke();
                G.ctx.strokeStyle = "Black";
                G.ctx.lineWidth = 3;
                G.ctx.setLineDash([5, 5]);
                G.ctx.lineDashOffset = 0;
                G.ctx.stroke();
            }
            else if (branch.Status2 == "TRIP")
            {
                G.ctx.strokeStyle = "Red";
                G.ctx.lineWidth = 2;
                G.ctx.setLineDash([5, 5]);
                G.ctx.lineDashOffset = 0;
                G.ctx.stroke();
            }
        }
    }

    G.ctx.setLineDash([0]);
    G.ctx.lineDashOffset = 0;

    for (let key in G.subs){
        let sub = G.subs[key];
        let P = 0
        for (let iu = 0; iu < sub.Units; ++iu) P += sub.U[iu].P;
        P = Math.min(P, 0.99*sub.Pmax);
        P = Math.max(P, 0);
        if (sub.Category=="Load") {
            let Pmax = sub.Pmax*G.fr_load;
            G.ctx.strokeStyle = "White";
            G.ctx.lineWidth = 3;
            G.ctx.fillStyle = "Black";
            let alltrip = 1;
            for (let iu = 0; iu < sub.Units; ++iu)
            {
                let u = sub.U[iu];
                if (u.Status != "TRIP") alltrip = 0;
            }
            if (alltrip == 1) {
                G.ctx.strokeStyle = "Red";
            }
            G.ctx.fillRect((-G.x0 + sub.Longitude)*G.scaleX - 10, 
                (G.y0 - sub.Latitude)*G.scaleY - 10, 20, 20);
            G.ctx.fillStyle = "White";
            G.ctx.fillRect((-G.x0 + sub.Longitude)*G.scaleX - 10, 
                (G.y0 - sub.Latitude)*G.scaleY - 10 - 20*(P-Pmax)/Pmax, 
                20, 20*(P)/Pmax);
            G.ctx.strokeRect((-G.x0 + sub.Longitude)*G.scaleX - 10, 
                (G.y0 - sub.Latitude)*G.scaleY - 10, 20, 20);
        }
        else {
            if (sub.Category=="Wind") G.ctx.fillStyle = "Green";
            if (sub.Category=="Solar PV") G.ctx.fillStyle = "Yellow";
            if (sub.Category=="Gas Turbine") G.ctx.fillStyle = "Gray";
            if (sub.Category=="Gas Combined Cycle") G.ctx.fillStyle = "Gray";
            if (sub.Category=="Coal-fired Steam") G.ctx.fillStyle = "Gray";
            if (sub.Category=="Nuclear Steam") G.ctx.fillStyle = "Magenta";
            G.ctx.strokeStyle = "White";
            let alltrip = 1;
            for (let iu = 0; iu < sub.Units; ++iu)
            {
                let u = sub.U[iu];
                if (u.Status != "TRIP") alltrip = 0;
            }
            if (alltrip == 1) {
                G.ctx.strokeStyle = "Red";
                G.ctx.fillStyle = "Red";
            }
            G.ctx.lineWidth = 1;
            G.ctx.beginPath();
            G.ctx.arc((-G.x0 + sub.Longitude)*G.scaleX, 
                (G.y0 - sub.Latitude)*G.scaleY, 12, 0, 2*Math.PI);
            G.ctx.fill();
            G.ctx.stroke();
            G.ctx.fillStyle = "Black";
            G.ctx.beginPath();
            G.ctx.arc((-G.x0 + sub.Longitude)*G.scaleX, 
                (G.y0 - sub.Latitude)*G.scaleY, 10, 
                -Math.PI/2, -Math.PI/2+0.001+6.28*P/sub.Pmax, true);
            G.ctx.lineTo((-G.x0 + sub.Longitude)*G.scaleX, 
                (G.y0 - sub.Latitude)*G.scaleY);
            G.ctx.fill();
        }
    }

    for (let key in G.subs){
        let sub = G.subs[key];
        G.ctx.font = "15px Arial";
        G.ctx.strokeStyle = "Black";
        G.ctx.lineWidth = 3;
        G.ctx.fillStyle = "White";
        G.ctx.strokeText(sub.Name, (-G.x0 + sub.Longitude)*G.scaleX + 15, 
            (G.y0 - sub.Latitude)*G.scaleY + 5);
        G.ctx.fillText(sub.Name, (-G.x0 + sub.Longitude)*G.scaleX + 15, 
            (G.y0 - sub.Latitude)*G.scaleY + 5);
    }

}

/* ------------------------------------------------------------------------- */
/* Event handlers -- main screen buttons */
/* ------------------------------------------------------------------------- */

function openModal(modal) {
    if (modal == null) return;
    let overlay = document.getElementById("overlay");
    modal.classList.add('active');
    overlay.classList.add('active');
    modal.getElementsByClassName("modal-body")[0].scrollTop = 0;
}

function closeModal(modal) {
    if (modal == null) return;
    let overlay = document.getElementById("overlay");
    modal.classList.remove('active');
    overlay.classList.remove('active');
    if (G.scenario_state == "modal_paused")
        play_normal();
}

function modalCloseClicked(event) {
    let modal = event.target.closest(".modal");
    closeModal(modal);
}

function pauseClicked(event) {
    if (G.scenario_state == "paused" || 
        G.scenario_state == "modal_paused") play_normal();
    else pause();
}

function fastClicked(event) {
    if (G.scenario_state == "fast") play_normal();
    else play_fast();
}

function helpClicked(event) {
    let help_modal = document.getElementById("help-modal");
    openModal(help_modal);
    if (G.scenario_state == "normal" || G.scenario_state == "fast"){
        pause();
        G.scenario_state = "modal_paused";
    }
}

function quitClicked(event) {
    let quit_modal = document.getElementById("quit-modal");
    openModal(quit_modal);
    if (G.scenario_state == "normal" || G.scenario_state == "fast"){
        pause();
        G.scenario_state = "modal_paused";
    }
}

function alertsClicked(event) {
    let alerts_modal = document.getElementById("alerts-modal");
    openModal(alerts_modal);
    if (G.scenario_state == "normal" || G.scenario_state == "fast"){
        pause();
        G.scenario_state = "modal_paused";
    }
}

function quitToBeginning() {
    closeModal(document.getElementById("quit-modal"));
    openModal(document.getElementById("welcome-modal"));
    G.scenario_state = "stopped";
}

function quitRestart() {
    closeModal(document.getElementById("quit-modal"));
    G.scenario_state = "stopped";
    start_day();
}

function quitSkipAhead() {
    closeModal(document.getElementById("quit-modal"));
    G.scenario_state = "stopped";
    if (G.day < 5) {
        G.day += 1;
        start_day();
    }
    else {
        openModal(document.getElementById("welcome-modal"));
    }
}

function finishNext() {
    closeModal(document.getElementById("finished-modal"));
    if (G.day < 5) {
        G.day += 1;
        start_day();
    }
    else {
        openModal(document.getElementById("welcome-modal"));
    }
}

function finishReplay() {
    closeModal(document.getElementById("finished-modal"));
    start_day();
}

function finishToBeginning() {
    closeModal(document.getElementById("finished-modal"));
    openModal(document.getElementById("welcome-modal"));
}

/* ------------------------------------------------------------------------- */
/* Event handlers -- map navigation */
/* ------------------------------------------------------------------------- */

function windowResized(event) {
    draw();
}

function zoom_in(x, y, factor) {
    if (factor < 0 || factor > 1) factor = 1;
    let this_scale = 1 + G.scale_adjust * factor
    if (G.scaleX*this_scale < G.scale_max)
    {
        G.scaleX *= this_scale;
        G.scaleY *= this_scale;
        G.x0 += x/G.scaleX*(this_scale-1);
        G.y0 -= y/G.scaleY*(this_scale-1);
    }
}

function zoom_out(x, y, factor) {
    if (factor < 0 || factor > 1) factor = 1;
    let this_scale = 1 + G.scale_adjust * factor
    if (G.scaleX/this_scale > G.scale_min)
    {
        G.scaleX /= this_scale;
        G.scaleY /= this_scale;
        G.x0 += x/G.scaleX*(1/this_scale-1);
        G.y0 -= y/G.scaleY*(1/this_scale-1);
    }
}

function wheelScrolled(event) {
    if (event.deltaY < 0)
    {
        zoom_in(event.offsetX, event.offsetY, Math.abs(event.deltaY/3));
    } 
    else if (event.deltaY > 0)
    {
        zoom_out(event.offsetX, event.offsetY, Math.abs(event.deltaY/3));
    }
    draw();
    event.preventDefault();
}

function mouseDownHandler(event) {
    G.inDrag = true;
    G.dragorigX = G.dragstartX = event.offsetX;
    G.dragorigY = G.dragstartY = event.offsetY;
}

function mouseMoveHandler(event) {
    if (G.inDrag)
    {
        let deltaX = (event.offsetX - G.dragstartX);
        let deltaY = (event.offsetY - G.dragstartY);
        G.x0 -= deltaX/G.scaleX;
        G.y0 += deltaY/G.scaleY;
        G.dragstartX = event.offsetX
        G.dragstartY = event.offsetY;
        draw();
    }
}

function mouseLeaveHandler(event) {
    G.inDrag = false;
}

function mouseUpHandler(event) {

    G.inDrag = false;

    let dragdist = Math.sqrt(Math.pow(event.offsetX-G.dragorigX, 2) 
        + Math.pow(event.offsetY-G.dragorigY, 2));
    if (dragdist < 10)
    {
        /* Check for clicks */
        let found_click = false;
        let x = G.x0 + G.dragorigX/G.scaleX;
        let y = G.y0 - G.dragorigY/G.scaleY;
        for (let key in G.subs){
            let sub = G.subs[key];
            let dist_to_sub = Math.sqrt(Math.pow(x-sub.Longitude, 2) 
                + Math.pow(y-sub.Latitude, 2))*G.scaleX;
            if (dist_to_sub < 12) {
                open_sub_dialog(sub);
                found_click = true;
                break;
            }
        }

        if (found_click == false)
        {
            for (var key in G.branches){
                let branch = G.branches[key];
                let s1 = branch.sub1, s2 = branch.sub2;
                let dist_to_line = Math.abs(
                    (s2.Latitude-s1.Latitude)*x - (s2.Longitude-s1.Longitude)*y 
                    + s2.Longitude*s1.Latitude - s2.Latitude*s1.Longitude) 
                    / branch.dist * G.scaleX;
                let xmin2 = Math.min(s1.Longitude, s2.Longitude);
                let xmax2 = Math.max(s1.Longitude, s2.Longitude);
                let ymin2 = Math.min(s1.Latitude, s2.Latitude);
                let ymax2 = Math.max(s1.Latitude, s2.Latitude);
                if (dist_to_line < 5 && x > xmin2 && x < xmax2 
                    && y > ymin2 && y < ymax2) {
                    open_branch_dialog(branch);
                    found_click = true;
                    break;
                }
            }
        }
        G.dragorigX = G.dragorigY = 0;
    }

}

function keyPressed(event) {
    if (event.key == "PageUp")
    {
        zoom_in(G.canvas.width/2, G.canvas.height/2, 1);
        draw();
    }
    else if (event.key == "PageDown")
    {
        zoom_out(G.canvas.width/2, G.canvas.height/2, 1);
        draw();
    }
    else if (event.key == "ArrowLeft")
    {
        G.x0 -= 50/G.scaleX;
    }
    else if (event.key == "ArrowRight")
    {
        G.x0 += 50/G.scaleX;
    }
    else if (event.key == "ArrowDown")
    {
        G.y0 -= 50/G.scaleY;
    }
    else if (event.key == "ArrowUp")
    {
        G.y0 += 50/G.scaleY;
    }
}

/* ------------------------------------------------------------------------- */
/* Sub/branch dialog construction */
/* ------------------------------------------------------------------------- */

function open_sub_dialog(sub) {
    let sub_modal = document.getElementById("substation-modal");
    openModal(sub_modal);
    G.selected_sub = sub;
    populate_sub_dialog();
}

function populate_sub_dialog() {
    let sub = G.selected_sub;
    document.getElementById("substation-title").innerHTML 
        = `${sub.Name} Substation`
    if (sub.Category == "Load")
    {
        document.getElementById("sub-main-text").innerHTML 
            = `This substation has ${sub.Units} load`
            + ` circuits`;
    }
    else {
        let extra = ``;
        if (sub.Category == "Wind") {
            extra = `<br>At current wind levels, ${(G.fr_wind*100).toFixed(0)}%
                of the Max power is available
                (${(G.fr_wind*sub.Pmax/sub.Units).toFixed(0)} MW per unit)`;
        }
        if (sub.Category == "Solar PV") {
            extra = `<br>With current solar availability, 
                ${(G.fr_solar*100).toFixed(0)}% of the Max power is available
                (${(G.fr_solar*sub.Pmax/sub.Units).toFixed(0)} MW per unit)`;
        }
        document.getElementById("sub-main-text").innerHTML 
            = `This substation has ${sub.Units} ${sub.Category} `
            + `generating units` + extra;
    }
    for (let iu = 0; iu < 8; ++iu)
    {
        let ctr = document.getElementById("sub-u" + (iu+1));
        if (iu >= sub.Units)
        {
            ctr.style.display = "none";
            continue;
        }
        ctr.style.display = "block";
        let u = sub.U[iu];
        let maintx = ctr.getElementsByClassName("sub-txt")[0];
        let btn1 = ctr.getElementsByClassName("sub-btn1")[0];
        let btn2 = ctr.getElementsByClassName("sub-btn2")[0];
        if (sub.Category == "Load")
        {
            if (u.Status == "IN")
            {
                maintx.innerHTML = `Circuit #${iu+1} (IN-SERVICE)<br>`
                    + `Power consumed: ${u.P.toFixed(0)} MW`;
                btn1.style.display = "block";
                btn1.innerHTML = "Open (Disconnect)";
                btn2.style.display = "none";
            }
            else if (u.Status == "DIS")
            {
                maintx.innerHTML = `Circuit #${iu+1} (OUT-OF-SERVICE)`;
                btn1.style.display = "block";
                btn1.innerHTML = "Close (Connect)";
                btn2.style.display = "none";
            }
            else if (u.Status == "TRIP")
            {
                maintx.innerHTML = `Circuit #${iu+1} `
                    + `(TRIPPED - CANNOT RECLOSE)`;
                btn1.style.display = "none";
                btn2.style.display = "none";
            }
        }
        else
        {
            if (u.Status == "IN")
            {
                let current_cost = `Current cost of this unit:
                     $${(sub.FixedCost + u.P*sub.FuelCost).toFixed(0)}/hour`;
                let avg_cost = `Average power cost:
                    $${(sub.FixedCost/u.P + sub.FuelCost).toFixed(2)}/MW/hour`;
                maintx.innerHTML = `Unit #${iu+1} (IN-SERVICE)
                    <br>Power output: ${u.P.toFixed(0)} MW
                    <br>Power set point: ${u.Pset.toFixed(0)} MW <br>Max:
                    ${(sub.Pmax/sub.Units).toFixed(0)} MW, Min:
                    ${(sub.Pmin/sub.Units).toFixed(0)} MW
                    <br> Operating cost: $${sub.FixedCost}/hour
                    <br> Fuel cost $${sub.FuelCost}/MW/hour
                    <br> ${current_cost}
                    <br> ${avg_cost}`;
                btn1.style.display = "block";
                btn1.innerHTML = "Shut Down";
                btn2.style.display = "block";
                btn2.innerHTML = "Change Set Point";
            }
            else if (u.Status == "DIS")
            {
                let current_cost = `Current cost of this unit:
                     $0/hour`;
                let sut = `Start up time  ${(sub.StartTime/60).toFixed(1)} hr`;
                if (sub.StartTime < 60) sut = `Start up time < 1 hr`;
                maintx.innerHTML = `Unit #${iu+1} (OUT-OF-SERVICE)\
                <br>Max: ${(sub.Pmax/sub.Units).toFixed(0)} MW, 
                    Min: ${(sub.Pmin/sub.Units).toFixed(0)} MW
                <br>${sut}
                <br> Operating cost: $${sub.FixedCost}/hour
                <br> Fuel cost $${sub.FuelCost}/MW/hour
                <br> ${current_cost}`;
                btn1.style.display = "block";
                btn1.innerHTML = "Start Up";
                btn2.style.display = "none";
            }
            else if (u.Status == "STARTUP")
            {
                let current_cost = `Current cost of this unit:
                     $${(sub.FixedCost + u.P*sub.FuelCost).toFixed(0)}/hour`;
                let sut = `Start up time  ${(sub.StartTime/60).toFixed(1)} hr`;
                if (sub.StartTime < 60) sut = `Start up time < 1 hr`;
                maintx.innerHTML = `Unit #${iu+1} (STARTING UP)
                    <br>Power output: ${u.P.toFixed(0)} MW
                    <br>Power set point: ${u.Pset.toFixed(0)} MW <br>Max:
                    ${(sub.Pmax/sub.Units).toFixed(0)} MW, Min: 
                    ${(sub.Pmin/sub.Units).toFixed(0)} MW
                    <br>${sut}
                    <br>Hours since startup began: 
                    ${(u.StatusCount/60).toFixed(1)}
                    <br> ${current_cost}`;
                btn1.style.display = "block";
                btn1.innerHTML = "Shut Down";
                btn2.style.display = "block";
                btn2.innerHTML = "Change Set Point";
            }
            else if (u.Status == "SHUTDOWN")
            {
                let current_cost = `Current cost of this unit:
                     $${(sub.FixedCost + u.P*sub.FuelCost).toFixed(0)}/hour`;
                maintx.innerHTML = `Unit #${iu+1} (SHUTTING DOWN)
                    <br>Power output ${u.P.toFixed(0)} MW<br>Max: 
                    ${(sub.Pmax/sub.Units).toFixed(0)} MW, Min:
                    ${(sub.Pmin/sub.Units).toFixed(0)} MW
                    <br> ${current_cost}`;
                btn1.style.display = "none";
                btn2.style.display = "none";
            }
            else if (u.Status == "TRIP")
            {
                maintx.innerHTML = `Unit #${iu+1} (TRIPPED - CANNOT RECLOSE)`;
                btn1.style.display = "none";
                btn2.style.display = "none";
            }
        }
    }
}

function open_branch_dialog(branch) {
    let branch_modal = document.getElementById("branch-modal");
    openModal(branch_modal);
    let s1, s2;
    if (branch.P >= 0)
    {
        s1 = branch.sub1;
        s2 = branch.sub2;
    }
    else
    {
        s2 = branch.sub1;
        s1 = branch.sub2;
    }
    document.getElementById("branch-title").innerHTML 
        = "Transmission Line: ".concat(s2.Name).concat(" to ").concat(s1.Name);
    document.getElementById("branch-direction-text").innerHTML 
        = "Direction of power flow: ".concat(s2.Name).concat(" to ")
        .concat(s1.Name);
    if (branch.Circuits == 1)
    {
        document.getElementById("branch-second-circuit").style.display = "none";
        if (branch.Status1 == "IN")
        {
            document.getElementById("branch-ckt1-txt").innerHTML 
                = `In-service <br/> Flow: ${Math.abs(branch.P).toFixed(0)} MW 
                    <br/> Max:  ${Math.abs(branch.Pmax).toFixed(0)} MW`;
            document.getElementById("branch-ckt1-btn").innerHTML 
                = `Open (Disconnect)`;
            document.getElementById("branch-ckt1-btn").style.display = "block";
        }
        else if  (branch.Status1 == "DIS")
        {
            document.getElementById("branch-ckt1-txt").innerHTML 
                = `Out-of-service <br/> Max: 
                    ${Math.abs(branch.Pmax).toFixed(0)} MW`;
            document.getElementById("branch-ckt1-btn").innerHTML 
                = `Close (Connect)`;
            document.getElementById("branch-ckt1-btn").style.display = "block";
        }
        else if  (branch.Status1 == "TRIP")
        {
            document.getElementById("branch-ckt1-txt").innerHTML 
                = `TRIPPED - cannot reclose`;
            document.getElementById("branch-ckt1-btn").style.display = "none";
        }
    }
    else
    {
        document.getElementById("branch-second-circuit").style.display 
            = "block";
        if (branch.Status1 == "IN")
        {
            document.getElementById("branch-ckt1-txt").innerHTML 
                = `Circuit 1 In-service <br/> Flow:
                    ${Math.abs(branch.P/2.0).toFixed(0)} MW <br/> 
                    Max:  ${Math.abs(branch.Pmax).toFixed(0)} MW`;
            document.getElementById("branch-ckt1-btn").innerHTML 
                = `Open (Disconnect)`;
            document.getElementById("branch-ckt1-btn").style.display = "block";
        }
        else if  (branch.Status1 == "DIS")
        {
            document.getElementById("branch-ckt1-txt").innerHTML 
                = `Circuit 1 Out-of-service <br/> Max: 
                    ${Math.abs(branch.Pmax).toFixed(0)} MW`;
            document.getElementById("branch-ckt1-btn").innerHTML 
                = `Close (Connect)`;
            document.getElementById("branch-ckt1-btn").style.display = "block";
        }
        else if  (branch.Status1 == "TRIP")
        {
            document.getElementById("branch-ckt1-txt").innerHTML 
                = `Circuit 1 TRIPPED - cannot reclose`;
            document.getElementById("branch-ckt1-btn").style.display = "none";
        }
        if (branch.Status2 == "IN")
        {
            document.getElementById("branch-ckt2-txt").innerHTML 
            = `Circuit 2 
                In-service <br/> Flow: ${Math.abs(branch.P/2.0).toFixed(0)} 
                MW <br/> 
                Max:  ${Math.abs(branch.Pmax)} MW`;
            document.getElementById("branch-ckt2-btn").innerHTML 
                = `Open (Disconnect)`;
            document.getElementById("branch-ckt2-btn").style.display = "block";
        }
        else if  (branch.Status2 == "DIS")
        {
            document.getElementById("branch-ckt2-txt").innerHTML 
                = `Circuit 2
                     Out-of-service <br/> Max: 
                     ${Math.abs(branch.Pmax).toFixed(0)} MW`;
            document.getElementById("branch-ckt2-btn").innerHTML 
                = `Close (Connect)`;
            document.getElementById("branch-ckt2-btn").style.display = "block";
        }
        else if  (branch.Status2 == "TRIP")
        {
            document.getElementById("branch-ckt2-txt").innerHTML 
                = `Circuit 2 TRIPPED - cannot reclose`;
            document.getElementById("branch-ckt2-btn").style.display = "none";
        }
    }
    G.selected_branch = branch;
}

/* ------------------------------------------------------------------------- */
/* Event handlers -- sub and branch dialog buttons */
/* ------------------------------------------------------------------------- */

function branch_ckt1_click(event) {
    if (G.selected_branch.Status1 == "IN")
    {
        G.selected_branch.Status1 = "DIS";
        G.Ybus = null;
    }
    else if (G.selected_branch.Status1 == "DIS")
    {
        G.selected_branch.Status1 = "IN";
        G.Ybus = null;
    }
    closeModal(document.getElementById("branch-modal"));
    open_branch_dialog(G.selected_branch);
}

function branch_ckt2_click(event) {
    if (G.selected_branch.Status2 == "IN")
    {
        G.selected_branch.Status2 = "DIS";
        G.Ybus = null;
    }
    else if (G.selected_branch.Status2 == "DIS")
    {
        G.selected_branch.Status2 = "IN";
        G.Ybus = null;
    }
    closeModal(document.getElementById("branch-modal"));
    open_branch_dialog(G.selected_branch);
}

function sub_click1(iu)
{
    let u = G.selected_sub.U[iu];
    if (G.selected_sub.Category == "Load")
    {
        if (u.Status == "DIS")
        {
            u.Status = "IN";
            u.StatusCount = 0;
            G.Ybus = null;
        }
        else if (u.Status == "IN")
        {
            u.Status = "DIS";
            u.StatusCount = 0;
            G.Ybus = null;
        }
    }
    else
    {
        if (u.Status == "DIS")
        {
            u.Status = "STARTUP";
            u.StatusCount = 0;
            u.Pset = 99999;
            G.Ybus = null;
        }
        else if (u.Status == "IN" || u.Status == "STARTUP")
        {
            u.Status = "SHUTDOWN";
            u.StatusCount = 0;
            G.Ybus = null;
        }
    }
    populate_sub_dialog();
}

function sub_click2(iu)
{
    closeModal(document.getElementById("substation-modal"));
    let umodi = document.getElementById("setpoint-input");
    umodi.value = G.selected_sub.U[iu].Pset.toFixed(0);
    let utitle = document.getElementById("unit-title");
    utitle.innerHTML = `Choose setpoint for ${G.selected_sub.Name} 
        #${iu+1}`;
    G.selected_unit = iu;
    openModal(document.getElementById("unit-modal"));
}

function sub_u1_click1(event) { sub_click1(0); }
function sub_u1_click2(event) { sub_click2(0); }
function sub_u2_click1(event) { sub_click1(1); }
function sub_u2_click2(event) { sub_click2(1); }
function sub_u3_click1(event) { sub_click1(2); }
function sub_u3_click2(event) { sub_click2(2); }
function sub_u4_click1(event) { sub_click1(3); }
function sub_u4_click2(event) { sub_click2(3); }
function sub_u5_click1(event) { sub_click1(4); }
function sub_u5_click2(event) { sub_click2(4); }
function sub_u6_click1(event) { sub_click1(5); }
function sub_u6_click2(event) { sub_click2(5); }
function sub_u7_click1(event) { sub_click1(6); }
function sub_u7_click2(event) { sub_click2(6); }
function sub_u8_click1(event) { sub_click1(7); }
function sub_u8_click2(event) { sub_click2(7); }

function unit_ok() {
    closeModal(document.getElementById("unit-modal"));
    let uval = parseInt(document.getElementById("setpoint-input").value);
    if (!isNaN(uval) && uval >= 0 && uval <= 10000) {
        G.selected_sub.U[G.selected_unit].Pset = uval;
    }
    open_sub_dialog(G.selected_sub);
}

function unit_cancel() {
    closeModal(document.getElementById("unit-modal"));
    open_sub_dialog(G.selected_sub);
}

/* ------------------------------------------------------------------------- */
/* Alerts */
/* ------------------------------------------------------------------------- */

function add_alert(message, critical) {
    let cmess = "";
    if (critical) cmess = "CRITICAL";
    let header_clock = document.getElementById("dash-clock");
    let new_alert_div = document.createElement("div");
    new_alert_div.classList.add("alerts-row");
    new_alert_div.innerHTML = `
        <div class="alert-time">${header_clock.innerText}</div>
        <div class="alert-message">${message}</div>
        <div class="alert-critical">${cmess}</div>
        <div class="alert-action"><button 
        class="alert-remove-button">OK</button></div>
    `
    let abh = document.getElementById("alerts-body-header");
    abh.after(new_alert_div);
    new_alert_div.getElementsByClassName("alert-remove-button")[0]
        .addEventListener("click", function(event) {
            event.target.parentElement.parentElement.remove();
            update_alert_bar();
        });
    update_alert_bar();
}

function update_alert_bar() {
    let bar = document.getElementById("alert-footer-text-bar");
    let alert_container = document.getElementById("alerts-body");
    let alerts = alert_container.getElementsByClassName("alerts-row");
    if (alerts.length <= 1) bar.innerText = "No alerts to show";
    else 
    {
        bar.innerText = alerts[1].getElementsByClassName("alert-message")[0]
            .innerText;
    }
}

function clear_alerts() {
    let ab = document.getElementById("alerts-body");
    while (ab.childNodes.length > 2) ab.removeChild(ab.lastChild);
}

/* ------------------------------------------------------------------------- */
/* Scenario startup, management, completion */
/* ------------------------------------------------------------------------- */

function pause_modal() {
    pause();
    G.scenario_state = "modal_paused";
}

function pause() {
    /* Start in paused condition */
    G.scenario_state = "paused";
    document.getElementById("canvas-box-obj").style.borderColor = "red";
    document.getElementById("dashboard-panel-id").style.borderColor = "red";
    document.getElementById("canvas-box-obj").style.borderWidth = "10px";
    document.getElementById("dashboard-panel-id").style.borderWidth = "10px";
    let dash_clock_label = document.getElementById("dash-clock-label");
    dash_clock_label.innerHTML = `Day ${G.day} -- PAUSED`;
    dash_clock_label.style.color = "red";
    let dash_clock = document.getElementById("dash-clock");
    dash_clock.style.color = "red";
    let pause_button = document.getElementById("pause-button");
    pause_button.innerHTML = "&#x25B6;&#xfe0e;";
    let fast_button = document.getElementById("fast-button");
    fast_button.innerHTML = "&#x23E9;&#xfe0e;";
}

function play_normal() {
    /* Start in paused condition */
    G.scenario_state = "normal";
    document.getElementById("canvas-box-obj").style.borderColor = "green";
    document.getElementById("dashboard-panel-id").style.borderColor = "green";
    document.getElementById("canvas-box-obj").style.borderWidth = "3px";
    document.getElementById("dashboard-panel-id").style.borderWidth = "3px";
    let dash_clock_label = document.getElementById("dash-clock-label");
    dash_clock_label.innerHTML = `Day ${G.day}`;
    dash_clock_label.style.color = "white";
    let dash_clock = document.getElementById("dash-clock");
    dash_clock.style.color = "white";
    let pause_button = document.getElementById("pause-button");
    pause_button.innerHTML = "&#x23F8;&#xfe0e;";
    let fast_button = document.getElementById("fast-button");
    fast_button.innerHTML = "&#x23E9;&#xfe0e;";
}

function play_fast() {
    /* Start in paused condition */
    G.scenario_state = "fast";
    document.getElementById("canvas-box-obj").style.borderColor = "green";
    document.getElementById("dashboard-panel-id").style.borderColor = "green";
    document.getElementById("canvas-box-obj").style.borderWidth = "3px";
    document.getElementById("dashboard-panel-id").style.borderWidth = "3px";
    let dash_clock_label = document.getElementById("dash-clock-label");
    dash_clock_label.innerHTML = `Day ${G.day} (fast-forward)`;
    dash_clock_label.style.color = "white";
    let dash_clock = document.getElementById("dash-clock");
    dash_clock.style.color = "white";
    let pause_button = document.getElementById("pause-button");
    pause_button.innerHTML = "&#x23F8;&#xfe0e;";
    let fast_button = document.getElementById("fast-button");
    fast_button.innerHTML = "&#x25B6;&#xfe0e;";
}

function start_day1() {
    closeModal(document.getElementById("welcome-modal"));
    G.day = 1;
    start_day();
}

function start_day() {

    let scenario_title = document.getElementById("scenario-title");
    let scenario_description = document.getElementById("scenario-description");

    set_defaults();
    scenario_title.innerHTML = `Day ${G.day} Briefing`;

    /* Scenario specific setup items */
    if (G.day == 1)
    {
        scenario_description.innerHTML = "Day 1 is a calm day on the power "
            + "grid. <ul><li>Your goal is to avoid a blackout and "
            + "keep operating costs as low as possible</li>"
            + "<li>Your shift runs from 1pm to 11pm. </li>"
            + "<li>Load (electrical demand from customers) is expected to rise,"
            + " peak around 7pm, and then decline later in the night. </li>"
            + "<li>There is a steady, moderate wind "
            + "predicted for whole afternoon and everning. </li>"
            + "<li>Keep in mind the solar generation will go down later in "
            + "the afternoon!</li></ul>";
        G.fr_load = 0.83;
        G.fr_wind = 0.48;
        G.fr_solar = 1.00;
        for (let key in G.subs) {
            let sub = G.subs[key];
            for (let iu = 0 ; iu < sub.Units; ++iu) {
                let u = sub.U[iu];
                let pmax = sub.Pmax / sub.Units;
                let pmin = sub.Pmin / sub.Units;
                if (sub.Category == "Wind") {
                    u.P = pmax * G.fr_wind;
                    u.Pset = pmax;
                }
                else if (sub.Category == "Solar PV") {
                    u.P = pmax * G.fr_solar;
                    u.Pset = pmax;
                }
            }
        }
        add_alert(`Hint #4: For the rest of the day, watch the reserves 
            carefully. If they get below 500 MW you need to find new
            generation to start up. The Gas Turbine units start the most
            quickly. If reserves ever get to zero you might need to 
            disconnect some load to keep the frequency under control.`, false);
        add_alert(`Hint #3: You are going to need more reserves in the evening
            once the solar has gone down and the load is higher. A great
            low-cost option is the Gas Combined Cycle units, but they take 
            several hours to start up. Go ahead and find a few extra units 
            somewhere on the system and begin their startup so they will be 
            ready by the evening.`, false);
        add_alert(`Hint #2: The Mission Gas Turbine plant in South Texas has
            very high costs. Try shutting down 1-3 of these units while you 
            still have plenty of reserves. Gas Turbine units can quickly be 
            started back if you need more reserves later.`, false);
        add_alert(`Hint #1: The McCamey Solar PV plant in West Texas is 
            currently disconnected. You might as well start up all 3 units
            at that plant to get more, low-cost energy. (Keep in mind the solar 
            will start to decrease around 5pm and be gone by 7pm)`, false);
        add_alert("Your shift has started. Click \"View all Alerts\" to "
            + "see additional hints for what to do.", false);
    }
    else if (G.day == 2)
    {
        scenario_description.innerHTML = "Day 2 is a great day for wind! "
        + "<ul><li>Your goal is to avoid a blackout and keep operating costs "
        + " as low as possible</li>"
        + "<li>Wind availabiliy will rise steadily this afternoon, up to"
        + " nearly 100% by 4pm and remain high the rest of your shift</li>"
        + "<li>Other conditions are the same as yesterday</li>"
        + "<li>Unfortunately, at 2:30 PM both transmission lines from  "
        + "Abiline to Ft Worth will need to be taken offline due to some  "
        + "unavoidable maintenance issues</li>"
        + "<li>Watch transmission line loading. If lines are overloaded 120% "
        + "or more they may trip, triggering a cascade and blackout!</li></ul>";
        G.fr_load = 0.83;
        G.fr_wind = 0.48;
        G.fr_solar = 1.00;
        for (let key in G.subs) {
            let sub = G.subs[key];
            for (let iu = 0 ; iu < sub.Units; ++iu) {
                let u = sub.U[iu];
                let pmax = sub.Pmax / sub.Units;
                let pmin = sub.Pmin / sub.Units;
                if (sub.Category == "Wind") {
                    u.P = pmax * G.fr_wind;
                    u.Pset = pmax;
                }
                else if (sub.Category == "Solar PV") {
                    u.P = pmax * G.fr_solar;
                    u.Pset = pmax;
                }
            }
        }
        add_alert("Hint for Day 2: Watch the East-West lines. If they turn "
            + "yellow or orange start shutting down western generation", false);
    }
    else if (G.day == 3)
    {
        scenario_description.innerHTML = "Day 3 is the tornado scenario"
        + "<ul><li>Your goal is to avoid a blackout and keep operating costs "
        + " as low as possible</li>"
        + "<li>Wind is expected to be high, as yesterday</li>"
        + "<li>Tornados are expected near Abilene around 5pm</li>"
        + "<li>Any nearby transmission lines are subject to tripping</li>"
        + "<li>In addition, a scheduled shutdown of Wadsworth Unit #1"
        + " begins at 1:30 PM</li></ul>";
        G.fr_load = 0.83;
        G.fr_wind = 0.48;
        G.fr_solar = 1.00;
        for (let key in G.subs) {
            let sub = G.subs[key];
            for (let iu = 0 ; iu < sub.Units; ++iu) {
                let u = sub.U[iu];
                let pmax = sub.Pmax / sub.Units;
                let pmin = sub.Pmin / sub.Units;
                if (sub.Category == "Wind") {
                    u.P = pmax * G.fr_wind;
                    u.Pset = pmax;
                }
                else if (sub.Category == "Solar PV") {
                    u.P = pmax * G.fr_solar;
                    u.Pset = pmax;
                }
            }
        }
        add_alert("No hints for Day 3: You can do this!", false);
    }
    else if (G.day == 4)
    {
        scenario_description.innerHTML = "Day 4 is a freezing weather scenario"
        + "<ul><li>Your goal is to avoid a blackout and keep operating costs "
        + " as low as possible</li>"
        + "<li>Generators will be tripping significantly due to "
        + "cold weather</li>"
        + "<li>Intentional load shedding will be necessary to avoid frequency"
        + "issues and blackout</li></ul>";
        G.fr_load = 0.83;
        G.fr_wind = 0.48;
        G.fr_solar = 1.00;
        for (let key in G.subs) {
            let sub = G.subs[key];
            for (let iu = 0 ; iu < sub.Units; ++iu) {
                let u = sub.U[iu];
                let pmax = sub.Pmax / sub.Units;
                let pmin = sub.Pmin / sub.Units;
                if (sub.Category == "Wind") {
                    u.P = pmax * G.fr_wind;
                    u.Pset = pmax;
                }
                else if (sub.Category == "Solar PV") {
                    u.P = pmax * G.fr_solar;
                    u.Pset = pmax;
                }
            }
        }
        add_alert("Hint for Day 4: Things can happen really fast when "
            + "there is rapid loss of generation. Stay vigilent!", false);
    }
    else if (G.day == 5)
    {
        scenario_description.innerHTML = "Ready for the last challenge? "
        + "On Day 5, your shift starts after an extreme hurricane hit this "
        + "morning. Many loads, lines, and generators along the gulf coast "
        + "are tripped. Throughout the day, crews are working tirelessly to "
        + "get these tripped elements ready for restoration. Your job is "
        + "to get service restored to customers as quickly and safely"
        + " as possible. Note that when a line or substation turns from red "
        + "to white it is eligible to be restored.";
        G.fr_load = 0.83;
        G.fr_wind = 0.48;
        G.fr_solar = 1.00;
        for (let key in G.subs) {
            let sub = G.subs[key];
            for (let iu = 0 ; iu < sub.Units; ++iu) {
                let u = sub.U[iu];
                let pmax = sub.Pmax / sub.Units;
                let pmin = sub.Pmin / sub.Units;
                if (sub.Category == "Wind") {
                    u.P = pmax * G.fr_wind;
                    u.Pset = pmax;
                }
                else if (sub.Category == "Solar PV") {
                    u.P = pmax * G.fr_solar;
                    u.Pset = pmax;
                }
            }
        }
        let i;
        for (i=0;i<5;++i) G.subs["2"].U[i].Status = "TRIP"; 
        for (i=0;i<3;++i) G.subs["5"].U[i].Status = "TRIP"; 
        for (i=0;i<4;++i) G.subs["8"].U[i].Status = "TRIP"; 
        for (i=0;i<8;++i) G.subs["10"].U[i].Status = "DIS"; 
        for (i=0;i<4;++i) G.subs["14"].U[i].Status = "TRIP"; 
        for (i=0;i<8;++i) G.subs["15"].U[i].Status = "TRIP"; 
        for (i=2;i<5;++i) G.subs["16"].U[i].Status = "TRIP"; 
        for (i=1;i<4;++i) G.subs["21"].U[i].Status = "TRIP"; 
        for (i=0;i<4;++i) G.subs["25"].U[i].Status = "TRIP"; 
        for (i=0;i<2;++i) G.subs["31"].U[i].Status = "TRIP"; 
        G.branches["5"].Status1 = "TRIP";
        G.branches["10"].Status1 = "TRIP";
        G.branches["11"].Status1 = "TRIP";
        G.branches["15"].Status1 = "TRIP";
        G.branches["16"].Status1 = "TRIP";
        G.branches["20"].Status1 = "TRIP";
        G.branches["21"].Status1 = "TRIP";
        G.branches["29"].Status1 = "TRIP";
        G.branches["30"].Status1 = "TRIP";
        G.branches["31"].Status1 = "TRIP";
        G.branches["32"].Status1 = "TRIP";
        G.branches["32"].Status2 = "TRIP";
        G.branches["33"].Status1 = "TRIP"; 
        G.branches["35"].Status1 = "TRIP";
        G.branches["35"].Status2 = "TRIP";
        G.branches["36"].Status1 = "TRIP"; 
        G.branches["36"].Status2 = "TRIP";
        G.branches["43"].Status1 = "TRIP";
        G.branches["44"].Status1 = "TRIP";
        G.branches["50"].Status1 = "TRIP";
        G.branches["59"].Status1 = "TRIP";
        G.branches["59"].Status2 = "TRIP";
        G.branches["60"].Status1 = "TRIP";
        for (i=0;i<2;++i) G.subs["26"].U[i].P = 290; 
        for (i=0;i<3;++i) G.subs["19"].U[i].Status = "IN"; 
        
        add_alert("Hint for Day 5: Keep checking the coastal substations and "
            + "lines to see if anything new has become ready for restoration", 
            false);
    }

    openModal(document.getElementById("help-modal"));
    pause_modal();

    update_dash();
}

function finish_day() {
    G.scenario_state = "stopped";
    if(document.getElementById("substation-modal").classList.contains("active"))
        closeModal(document.getElementById("substation-modal"));
    if(document.getElementById("branch-modal").classList.contains("active"))
        closeModal(document.getElementById("branch-modal"));
    openModal(document.getElementById("finished-modal"));
    let title_box = document.getElementById("finished-title");
    let result_box = document.getElementById("scenario-results");
    result_box.innerHTML = "Scenario results TBD";
    if (G.day == 1) {
        title_box.innerHTML = "Day 1 Results";
        if (G.total_cost < 1650000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Amazing!! This is better than the prior record, $1.65M.
                <br>Super job managing the grid today and keeping costs low
                &#x1F44D;&#xfe0e;`;
        }
        else if (G.total_cost < 2000000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Great job! The record for this scenario is $1.65M.
                <br>Super job managing the grid today and keeping costs low
                 &#x1F44D;&#xfe0e;`;
        }
        else if (G.total_cost < 10000000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Not too bad. We would hope to keep the cost under $2M
                     for this scenario.
                <br>Feel free to give it another try
                 &#x1F44D;&#xfe0e;`;
        }
        else {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>That's too high! We would hope to keep the cost under 
                    $2M for this scenario.
                <br>Feel free to give it another try
                 &#x1F44D;&#xfe0e;`;
        }
    }
    else if (G.day == 2) {
        title_box.innerHTML = "Day 2 Results";
        if (G.total_cost < 1410000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Amazing!! This is better than the prior record, $1.41M.
                <br>Super job managing the grid today and keeping costs low
                &#x1F44D;&#xfe0e;`;
        }
        else if (G.total_cost < 2000000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Great job! The record for this scenario is $1.41M.
                <br>Super job managing the grid today and keeping costs low
                 &#x1F44D;&#xfe0e;`;
        }
        else if (G.total_cost < 10000000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Not too bad. We would hope to keep the cost under $2M
                     for this scenario.
                <br>Feel free to give it another try
                 &#x1F44D;&#xfe0e;`;
        }
        else {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>That's too high! We would hope to keep the cost under 
                    $2M for this scenario.
                <br>Feel free to give it another try
                 &#x1F44D;&#xfe0e;`;
        }

    }
    else if (G.day == 3) {
        title_box.innerHTML = "Day 3 Results";
        if (G.total_cost < 3350000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Amazing!! This is better than the prior record, $3.35M.
                <br>Super job managing the grid today and keeping costs low
                &#x1F44D;&#xfe0e;`;
        }
        else if (G.total_cost < 5000000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Great job! The record for this scenario is $3.35M.
                <br>Super job managing the grid today and keeping costs low
                 &#x1F44D;&#xfe0e;`;
        }
        else if (G.total_cost < 15000000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Not too bad. We would hope to keep the cost under $5M
                     for this scenario.
                <br>Feel free to give it another try
                 &#x1F44D;&#xfe0e;`;
        }
        else {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>That's too high! We would hope to keep the cost under 
                    $5M for this scenario.
                <br>Feel free to give it another try
                 &#x1F44D;&#xfe0e;`;
        }

    }
    else if (G.day == 4) {
        title_box.innerHTML = "Day 4 Results";
        if (G.total_cost < 3220000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Amazing!! This is better than the prior record, $3.22M.
                <br>Super job managing the grid today and keeping costs low
                &#x1F44D;&#xfe0e;`;
        }
        else if (G.total_cost < 8000000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Great job! The record for this scenario is $3.22M.
                <br>Super job managing the grid today and keeping costs low
                 &#x1F44D;&#xfe0e;`;
        }
        else if (G.total_cost < 20000000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Not too bad. We would hope to keep the cost under $8M
                     for this scenario.
                <br>Feel free to give it another try
                 &#x1F44D;&#xfe0e;`;
        }
        else {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>That's too high! We would hope to keep the cost under 
                    $8M for this scenario.
                <br>Feel free to give it another try
                 &#x1F44D;&#xfe0e;`;
        }

    }
    else if (G.day == 5) {
        title_box.innerHTML = "Day 5 Results";
        if (G.total_cost < 12900000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Amazing!! This is better than the prior record, $12.90M.
                <br>Super job managing the grid today and keeping costs low
                &#x1F44D;&#xfe0e;`;
        }
        else if (G.total_cost < 18000000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Great job! The record for this scenario is $12.90M.
                <br>Super job managing the grid today and keeping costs low
                 &#x1F44D;&#xfe0e;`;
        }
        else if (G.total_cost < 30000000) {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>Not too bad. We would hope to keep the cost under $18M
                     for this scenario.
                <br>Feel free to give it another try
                 &#x1F44D;&#xfe0e;`;
        }
        else {
            result_box.innerHTML = `Total cost for your shift was 
                $${(G.total_cost/1000000).toFixed(2)}M.
                <br>That's too high! We would hope to keep the cost under 
                    $18M for this scenario.
                <br>Feel free to give it another try
                 &#x1F44D;&#xfe0e;`;
        }
    }
    let stats_box = document.getElementById("stats-box");
    stats_box.innerHTML = `
        Total generator operating cost: 
        $${(G.total_running_cost/1000).toFixed(0)}k
        <br>
        Total fuel cost: $${(G.total_fuel_cost/1000).toFixed(0)}k
        <br>
        Total unserved load cost: $${(G.total_uload_cost/1000).toFixed(0)}k
        <br>
        Average cost of power: ${(G.total_cost/G.total_mwh).toFixed(2)}
             $/MW/hour

    `;
}

/* ------------------------------------------------------------------------- */
/* Scenario advance */
/* ------------------------------------------------------------------------- */

function update_dash() {

    /* Update sub or branch modal if open */
    if(document.getElementById("substation-modal").classList.contains("active"))
    {
        populate_sub_dialog();
    }
    if(document.getElementById("branch-modal").classList.contains("active"))
    {
        closeModal(document.getElementById("branch-modal"));
        open_branch_dialog(G.selected_branch);
    }

    /* Update clocks */
    let h = Math.floor(G.t/60) + 1
    let m = (G.t - (h - 1)*60)
    let cltxt = ""
    cltxt += h + ":"
    if (m < 10) cltxt += "0" + m;
    else cltxt += "" + m;
    cltxt += " PM"
    let header_clock = document.getElementById("dash-clock")
    header_clock.innerHTML = cltxt;

    /* Frequency */
    let val = document.getElementById("dash-freq");
    val.innerText = G.frequency.toFixed(2) + " Hz";
    if (G.frequency > 60.7 || G.frequency < 59.3) 
        val.style.color = "red";
    else if (G.frequency > 60.3 || G.frequency < 59.7) 
        val.style.color = "orange";
    else 
        val.style.color = "white";

    /* Power values */
    document.getElementById("dash-sload").innerText = 
        G.total_load_served.toFixed(0) + " MW";
    document.getElementById("dash-uload").innerText = 
        G.total_load_unserved.toFixed(0) + " MW";
    if (G.total_load_unserved > 500) 
        document.getElementById("dash-uload").style.color = "red";
    else if (G.total_load_unserved > 20) 
        document.getElementById("dash-uload").style.color = "orange";
    else
        document.getElementById("dash-uload").style.color = "white";
    document.getElementById("dash-wgen").innerText = 
        G.total_wind.toFixed(0) + " MW";
    document.getElementById("dash-wgen").style.color = "green";
    document.getElementById("dash-sgen").innerText = 
        G.total_solar.toFixed(0) + " MW";
    document.getElementById("dash-sgen").style.color = "yellow";
    document.getElementById("dash-thgen").innerText = 
        G.total_thermal.toFixed(0) + " MW";
    document.getElementById("dash-thgen").style.color = "gray";
    document.getElementById("dash-nugen").innerText = 
        G.total_nuclear.toFixed(0) + " MW";
    document.getElementById("dash-nugen").style.color = "magenta";
    document.getElementById("dash-reserve").innerText = 
        Math.max(0, G.spin_reserves).toFixed(0) + " MW";
    if (G.spin_reserves < 50) 
        document.getElementById("dash-reserve").style.color = "red";
    else if (G.spin_reserves < 500) 
        document.getElementById("dash-reserve").style.color = "orange";
    else
        document.getElementById("dash-reserve").style.color = "white";

    /* Cost values */
    document.getElementById("dash-cfuel").innerText = 
        G.current_fuel_cost.toFixed(0) + " $/hr";
    document.getElementById("dash-cfixed").innerText = 
        G.current_running_cost.toFixed(0) + " $/hr";
    document.getElementById("dash-cuload").innerText = 
        G.current_uload_cost.toFixed(0) + " $/hr";
    document.getElementById("dash-tfuel").innerText = 
        "$" + (G.total_fuel_cost/1000).toFixed(0) + "k";
    document.getElementById("dash-tfixed").innerText = 
        "$" + (G.total_running_cost/1000).toFixed(0) + "k";
    document.getElementById("dash-tuload").innerText = 
        "$" + (G.total_uload_cost/1000).toFixed(0) + "k";
    document.getElementById("dash-tcost").innerText = 
        "$" + (G.total_cost/1000000).toFixed(2) + "M";
    document.getElementById("dash-avcost").innerText = 
        "" + G.average_cost.toFixed(2) + " $/MW/hr";
    
}

function do_next_game_step() {

    if (G.scenario_state == "stopped") return;

    /* Check for end of game */
    if (G.t == 600) {
        finish_day();
        return;
    }

    G.t += 1;


    /* Scenario specific updates */
    if (G.day == 1) {
        if (G.t < 360) G.fr_load = 0.83 + 0.0002777*G.t;
        else G.fr_load = 0.93-0.0008333*(G.t-360)
        if (G.t < 240) G.fr_solar = 1;
        else if (G.t < 360) G.fr_solar = 1 - (G.t-240)/120;
        else G.fr_solar = 0;
        if (G.fr_wind < .53 && G.fr_wind > .43)
        {
            if (Math.random() < .25) G.fr_wind += 0.0001;
            else if (Math.random() < 0.333) G.fr_wind -= 0.0001;
        }
    }
    else if (G.day == 2) {
        if (G.t < 360) G.fr_load = 0.83 + 0.0002777*G.t;
        else G.fr_load = 0.93-0.0008333*(G.t-360)
        if (G.t < 240) G.fr_solar = 1;
        else if (G.t < 360) G.fr_solar = 1 - (G.t-240)/120;
        else G.fr_solar = 0;
        if (G.t < 180)
        {
            G.fr_wind = 0.48 + 0.0028*G.t;
        }
        else
        {
            if (G.fr_wind < 1 && G.fr_wind > .9)
            {
                if (Math.random() < .25) G.fr_wind += 0.0001;
                else if (Math.random() < 0.333) G.fr_wind -= 0.0001;
            }
        }
        if (G.t == 90) {
            G.branches["26"].Status1 = "TRIP";
            G.branches["26"].Status2 = "TRIP";
            add_alert(`Maintenance requires tripping both Abiline 
                - Ft Worth lines`, false);
            G.Ybus = null;
        }
    }
    else if (G.day == 3) {
        if (G.t < 360) G.fr_load = 0.83 + 0.0002777*G.t;
        else G.fr_load = 0.93-0.0008333*(G.t-360)
        if (G.t < 240) G.fr_solar = 1;
        else if (G.t < 360) G.fr_solar = 1 - (G.t-240)/120;
        else G.fr_solar = 0;
        if (G.t < 180)
        {
            G.fr_wind = 0.48 + 0.0028*G.t;
        }
        else
        {
            if (G.fr_wind < 1 && G.fr_wind > .9)
            {
                if (Math.random() < .25) G.fr_wind += 0.0001;
                else if (Math.random() < 0.333) G.fr_wind -= 0.0001;
            }
        }
        if (G.t > 240) {
            let tbranches = ["1", "2", "3", "4", "26", "27"];
            for (let i = 0; i < 6; ++i) {
                if (Math.random() < 0.05) {
                    let br = G.branches[tbranches[i]];
                    if (br.Status1 == "TRIP") continue;
                    br.Status1 = "TRIP";
                    br.Status2 = "TRIP";
                    add_alert(`${br.sub1.Name}-
                        ${br.sub2.Name}- transmission line
                        trips due to tornado`, true);
                }
            }
            G.Ybus = null;
        }
        if (G.t == 30) {
            G.subs["31"].U[0].Status = "SHUTDOWN";
            add_alert(`Scheduled shutdown of Wadsworth Unit #1 begins`, false);
            G.Ybus = null;
        }
    }
    else if (G.day == 4) {
        if (G.t < 360) G.fr_load = 0.83 + 0.0002777*G.t;
        else G.fr_load = 0.93-0.0008333*(G.t-360)
        if (G.t < 240) G.fr_solar = 1;
        else if (G.t < 360) G.fr_solar = 1 - (G.t-240)/120;
        else G.fr_solar = 0;
        if (G.t < 180)
        {
            G.fr_wind = 0.48 + 0.0028*G.t;
        }
        else
        {
            if (G.fr_wind < 1 && G.fr_wind > .9)
            {
                if (Math.random() < .25) G.fr_wind += 0.0001;
                else if (Math.random() < 0.333) G.fr_wind -= 0.0001;
            }
        }
        let outages = [[90, "2", 3], [120, "2", 4], [75, "2", 1], 
            [350, "2", 0], [410, "2", 1], [190, "24", 3], [220, "24", 4], 
            [375, "24", 1], [50, "24", 0], [210, "24", 1], [400, "31", 1], 
            [300, "4", 0], [300, "4", 1],[300, "4", 2],[300, "4", 3],
            [250, "26", 1], [290, "28", 0], 
            [330, "20", 0], [335, "20", 1], [340, "20", 2], [360, "20", 3], 
            [390, "20", 4], [100, "21", 2], [150, "21", 1], [180, "21", 0]];
        for (let i = 0; i < outages.length; ++i) {
            if (G.t == outages[i][0]) {
                let sub = G.subs[outages[i][1]];
                let u = sub.U[outages[i][2]];
                u.Status = "TRIP";
                add_alert(`${sub.Name} unit # ${outages[i][2]+1} trips due
                    to cold weather`, true);
            }
        }
    }
    else if (G.day == 5) {
        if (G.t < 360) G.fr_load = 0.83 + 0.0002777*G.t;
        else G.fr_load = 0.93-0.0008333*(G.t-360)
        if (G.t < 240) G.fr_solar = 1;
        else if (G.t < 360) G.fr_solar = 1 - (G.t-240)/120;
        else G.fr_solar = 0;
        if (G.t < 180)
        {
            G.fr_wind = 0.48 + 0.0028*G.t;
        }
        else
        {
            if (G.fr_wind < 1 && G.fr_wind > .9)
            {
                if (Math.random() < .25) G.fr_wind += 0.0001;
                else if (Math.random() < 0.333) G.fr_wind -= 0.0001;
            }
        }
        let i;
        if (G.t == 30) {for (i=0;i<3;++i) G.subs["15"].U[i].Status = "DIS"; }
        if (G.t == 50) {G.branches["35"].Status2 = "DIS";}
        if (G.t == 70) {for (i=0;i<4;++i) G.subs["8"].U[i].Status = "DIS"; }
        if (G.t == 90) {G.branches["33"].Status1 = "DIS"; }
        if (G.t == 110) {G.branches["59"].Status1 = "DIS";}
        if (G.t == 130) {for (i=0;i<3;++i) G.subs["5"].U[i].Status = "DIS"; }
        if (G.t == 150) {G.branches["5"].Status1 = "DIS";}
        if (G.t == 170) {G.branches["43"].Status1 = "DIS";}
        if (G.t == 190) {for (i=0;i<2;++i) G.subs["25"].U[i].Status = "DIS"; }
        if (G.t == 200) {for (i=3;i<8;++i) G.subs["15"].U[i].Status = "DIS"; }
        if (G.t == 230) {for (i=2;i<5;++i) G.subs["16"].U[i].Status = "DIS"; }
        if (G.t == 250) {G.branches["10"].Status1 = "DIS";}
        if (G.t == 270) {for (i=2;i<4;++i) G.subs["25"].U[i].Status = "DIS"; }
        if (G.t == 300) {for (i=1;i<4;++i) G.subs["21"].U[i].Status = "DIS"; }
        if (G.t == 360) {for (i=0;i<2;++i) G.subs["14"].U[i].Status = "DIS"; }
        if (G.t == 390) {G.branches["30"].Status1 = "DIS";}
        if (G.t == 420) {for (i=3;i<5;++i) G.subs["2"].U[i].Status = "DIS"; }
        if (G.t == 430) {for (i=2;i<4;++i) G.subs["14"].U[i].Status = "DIS"; }
        if (G.t == 440) {G.branches["15"].Status1 = "DIS";}
        if (G.t == 450) {G.branches["20"].Status1 = "DIS";}
        if (G.t == 460) {G.branches["16"].Status1 = "DIS";}
        if (G.t == 490) {G.branches["29"].Status1 = "DIS";}
        if (G.t == 500) {G.branches["50"].Status1 = "DIS";}
        if (G.t == 520) {G.branches["21"].Status1 = "DIS";}
        if (G.t == 540) {G.branches["36"].Status1 = "DIS"; }
    }

    /* Trip generators or loads based on frequency issues */
    for (let key in G.subs) {
        let sub = G.subs[key];
        let prob_trip = 0;
        if (G.frequency < 57 || G.frequency > 63) {
            prob_trip = 0.05;
        }
        else if (G.frequency < 59 || G.frequency > 61) {
            prob_trip = 0.01;
            if (G.frequency > 60 && sub.Category == "Load") prob_trip = 0.001;
        }
        else if (G.frequency < 59.3 || G.frequency > 60.7) {
            prob_trip = 0.001;
            if (G.frequency > 60 && sub.Category == "Load") prob_trip = 0;
        }
        for (let iu = 0 ; iu < sub.Units; ++iu) {
            if (Math.random() > prob_trip) continue;
            let u = sub.U[iu];
            if (u.Status == "IN" || u.Status == "SHUTDOWN" 
                || u.status == "STARTUP") {
                u.Status = "TRIP";
                u.P = 0;
                u.Pset = 0;
                if (sub.Category == "Load")
                    add_alert(`Load ${sub.Name} #${iu+1} tripped due to 
                        frequency`, true);
                else
                    add_alert(`generator ${sub.Name} #${iu+1} tripped due to 
                        frequency`, true);
            }
        }
    }

    /* Trip branches based on frequency */
    for (let key in G.branches) {
        let br = G.branches[key];
        let prob_trip = 0;
        if (G.frequency < 50) {
            prob_trip = 0.3;
        }
        else if (G.frequency < 57 || G.frequency > 63) {
            prob_trip = 0.01;
        }
        else if (G.frequency < 59 || G.frequency > 61) {
            prob_trip = 0.003;
        }
        if (Math.random() > prob_trip) continue;
        if (br.Status1 == "IN" || br.Status2 == "IN")
        {
            br.Status1 = br.Status2 = "TRIP";
            add_alert(`Branch ${br.sub1.Name}-${br.sub2.Name} tripped 
                on instability`, true);
            G.Ybus = null;
        }
    }

    /* Trip branches based on overloading */
    for (let key in G.branches) {
        let br = G.branches[key];
        let prob_trip = 0;
        if (Math.abs(br.P) > br.Pmax * br.Circuits * 1.5)
        {
            prob_trip = 0.05;
            console.log(`${br.P} ${br.Pmax} ${br.Circuits} ${prob_trip}`);
        }
        else if (Math.abs(br.P) > br.Pmax * br.Circuits * 1.2)
        {
            console.log(`${br.P} ${br.Pmax} ${br.Circuits} ${prob_trip}`);
            prob_trip = 0.01;
        }
        if (Math.random() > prob_trip) continue;
        if (br.Status1 == "IN" || br.Status2 == "IN")
        {
            br.Status1 = br.Status2 = "TRIP";
            add_alert(`Branch ${br.sub1.Name}-${br.sub2.Name} tripped 
                on overloading!`, true);
            G.Ybus = null;
        }
    }

    /* Check for connected topology */
    for (let key in G.subs) {
        let sub = G.subs[key];
        sub.island = -1;
        if (sub.Name == "Bryan") sub.island = 0;
    }
    let changed_something = true;
    while (changed_something) {
        changed_something = false;
        for (let key in G.branches) {
            let br = G.branches[key];
            if (br.Status1 != "IN" && (br.Status2 != "IN" || br.Circuits == 1)) 
                continue;
            if (br.sub1.island != br.sub2.island)
            {
                br.sub1.island = br.sub2.island = 0;
                changed_something = true;
            }
        }
    }

    /* Trip anything not connected to the root */
    for (let key in G.subs) {
        let sub = G.subs[key];
        if (sub.island == -1) {
            for (let iu = 0 ; iu < sub.Units; ++iu) {
                let u = sub.U[iu];
                if (u.Status == "IN" || u.Status == "SHUTDOWN" 
                    || u.Status == "STARTUP") {
                    u.Status = "TRIP";
                    u.P = 0;
                    u.Pset = 0;
                    if (sub.Category == "Load")
                        add_alert(`Load ${sub.Name} #${iu+1} tripped due to 
                            separation from grid`, true);
                    else
                        add_alert(`generator ${sub.Name} #${iu+1} tripped due to 
                            separation from grid`, true);
                }
            }
        }
    }
    for (let key in G.branches) {
        let br = G.branches[key];
        if (br.sub1.island == -1 && (br.Status1 == "IN" 
            || (br.Status2 == "IN" && br.Circuits > 1))) 
        {
            add_alert(`Branch ${br.sub1.Name}-${br.sub2.Name} tripped 
                due to separation from the grid!`, true);
            br.Status1 = br.Status2 = "TRIP";
            G.Ybus = null;
        }
    }

    /* Sum up total P load and gen values */
    let PL = 0, PGSET = 0, PBASE = 0, PGMIN = 0, PGMAX = 0, PMAKE = 0;
    for (let key in G.subs) {
        let sub = G.subs[key];
        for (let iu = 0 ; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            let pmax = sub.Pmax / sub.Units;
            let pmin = sub.Pmin / sub.Units;
            u.StatusCount += 1;
            if (u.Pset < pmin) u.Pset = pmin;
            if (u.Pset > pmax) u.Pset = pmax;
            let tempset = Math.min(u.P + sub.Ramp, 
                Math.max(u.P - sub.Ramp, u.Pset));
            if (u.Status == "DIS" || u.Status == "TRIP") continue;
            if (sub.Category == "Load") {
                PL += pmax * G.fr_load;
            }
            else if (u.Status == "SHUTDOWN") {
                PBASE += pmax;
                PGMIN += Math.max(0, u.P - sub.Ramp);
                PGMAX += Math.max(0, u.P - sub.Ramp);
                PGSET += Math.max(0, u.P - sub.Ramp);
            }
            else if (sub.Category == "Wind")  {
                PBASE += pmax;
                let pavail = pmax * G.fr_wind;
                if (tempset > pavail) tempset = pavail;
                PGMIN += Math.max(u.P - sub.Ramp, 0);
                PGMAX += Math.min(u.P + sub.Ramp, pavail);
                PGSET += tempset; 
            }
            else if (sub.Category == "Solar PV") {
                PBASE += pmax;
                let pavail = pmax * G.fr_solar;
                if (tempset > pavail) tempset = pavail;
                PGMIN += Math.max(u.P - sub.Ramp, 0);
                PGMAX += Math.min(u.P + sub.Ramp, pavail);
                PGSET += tempset; 
            }
            else {
                if (u.Status == "STARTUP") {
                    if (u.StatusCount >= sub.StartTime) {
                        PBASE += pmax;
                        PGMIN += Math.min(u.P + sub.Ramp, 
                            Math.max(pmin, u.P - sub.Ramp));
                        PGMAX += Math.min(pmax, u.P + sub.Ramp);
                        PGSET += tempset; 
                    }
                }
                else {
                    PBASE += pmax;
                    PGMIN += Math.max(pmin, u.P - sub.Ramp);
                    PGMAX += Math.min(pmax, u.P + sub.Ramp);
                    PGSET += tempset;
                }
            }
        }
    }
    if (PBASE < 5) {
        G.frequency = 0.0;
        PMAKE = 0;
    }
    else if (PL <= PGMIN) {
        PMAKE = PGMIN - PL;
        if (PMAKE < 500) G.frequency += 0.01;
        else G.frequency += 0.05;
    }
    else if (PL >= PGMAX) {
        PMAKE = PL - PGMAX;
        if (PMAKE < 500) G.frequency -= 0.01;
        else G.frequency -= 0.05;
    }
    else {
        PMAKE = PL - PGSET;
        let ftarg = 60 - 0.2*PMAKE/(PGMAX-PGMIN);
        if (G.frequency < ftarg)
        {
            if (G.frequency < 57) {
                G.frequency += 0.04;
            }
            if (G.frequency < 59.3) {
                G.frequency += 0.025;
            }
            else {
                G.frequency += 0.01;
            }
        } 
        else {
            if (G.frequency > 63) {
                G.frequency -= 0.04;
            }
            if (G.frequency > 60.7) {
                G.frequency -= 0.025;
            }
            else {
                G.frequency -= 0.01;
            }
        }
    }

    /* Set load P values */
    for (let key in G.subs) {
        let sub = G.subs[key];
        for (let iu = 0 ; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            let pmax = sub.Pmax / sub.Units;
            if (u.Status == "DIS" || u.Status == "TRIP") continue;
            if (sub.Category == "Load") {
                if (G.frequency < 5) u.P = 0;
                else u.P = pmax * G.fr_load;
            }
        }
    }

    /* Iterate to find generator P values */
    let alpha0 = -1, alpha1 = 1, alpha = 0;
    while (alpha1 - alpha0 > 1e-6) {
        let PBAL = PL;
        alpha = 0.5 * (alpha0 + alpha1);
        for (let key in G.subs) {
            let sub = G.subs[key];
            for (let iu = 0 ; iu < sub.Units; ++iu) {
                let u = sub.U[iu];
                let pmax = sub.Pmax / sub.Units;
                let pmin = sub.Pmin / sub.Units;
                let tempset = Math.min(u.P + sub.Ramp, 
                    Math.max(u.P - sub.Ramp, u.Pset));
                let tryp = 0;
                if (u.Status == "DIS" || u.Status == "TRIP") continue;
                if (sub.Category == "Load") continue;
                else if (u.Status == "SHUTDOWN") {
                    tryp = Math.max(u.P - sub.Ramp, 0);
                }
                else if (sub.Category == "Wind")  {
                    let pavail = pmax * G.fr_wind;
                    if (tempset > pavail) tempset = pavail;
                    tryp = tempset + alpha*pmax;
                    if (tryp < 0) tryp = 0;
                    if (tryp < u.P - sub.Ramp) tryp = u.P - sub.Ramp;
                    if (tryp > u.P + sub.Ramp) tryp = u.P + sub.Ramp;
                    if (tryp > pavail) tryp = pavail;
                }
                else if (sub.Category == "Solar PV") {
                    let pavail = pmax * G.fr_solar;
                    if (tempset > pavail) tempset = pavail;
                    tryp = tempset + alpha*pmax;
                    if (tryp < 0) tryp = 0;
                    if (tryp < u.P - sub.Ramp) tryp = u.P - sub.Ramp;
                    if (tryp > u.P + sub.Ramp) tryp = u.P + sub.Ramp;
                    if (tryp > pavail) tryp = pavail;
                }
                else {
                    if (u.Status == "STARTUP") {
                        if (u.StatusCount >= sub.StartTime) {
                            tryp = tempset + alpha*pmax;
                            if (tryp < pmin) tryp = pmin;
                            if (tryp < u.P - sub.Ramp) tryp = u.P - sub.Ramp;
                            if (tryp > u.P + sub.Ramp) tryp = u.P + sub.Ramp;
                            if (tryp > pmax) tryp = pmax;
                        }
                    }
                    else {
                        tryp = tempset + alpha*pmax;
                        if (tryp < pmin) tryp = pmin;
                        if (tryp < u.P - sub.Ramp) tryp = u.P - sub.Ramp;
                        if (tryp > u.P + sub.Ramp) tryp = u.P + sub.Ramp;
                        if (tryp > pmax) tryp = pmax;
                    }
                }
                PBAL -= tryp;
            }
        }
        if (PBAL > 0) {
            alpha0 = alpha;
        }
        else {
            alpha1 = alpha;
        }
        //console.log(`${alpha0} ${alpha} ${alpha1} ${PBAL}`);
    }

    /* Final time through the generators to set their P values based on alpha */
    /* also create P vector */
    let pvec = math.zeros(G.nsubs, 1);
    for (let key in G.subs) {
        let sub = G.subs[key];
        let i = parseInt(sub.Number) - 1;
        for (let iu = 0 ; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            let pmax = sub.Pmax / sub.Units;
            let pmin = sub.Pmin / sub.Units;
            let tempset = Math.min(u.P + sub.Ramp, 
                Math.max(u.P - sub.Ramp, u.Pset));
            let tryp = 0;
            if (u.Status == "DIS" || u.Status == "TRIP")
            {
                u.P = 0;
                continue;
            }
            if (sub.Category == "Load") 
            {
                pvec.set([i, 0], pvec.get([i, 0]) - u.P/100.0);
                continue;
            }
            else if (u.Status == "SHUTDOWN") {
                tryp = Math.max(u.P - sub.Ramp, 0);
                if (tryp <= 1) u.Status = "DIS";
            }
            else if (sub.Category == "Wind")  {
                let pavail = pmax * G.fr_wind;
                if (tempset > pavail) tempset = pavail;
                tryp = tempset + alpha*pmax;
                if (tryp < 0) tryp = 0;
                if (tryp < u.P - sub.Ramp) tryp = u.P - sub.Ramp;
                if (tryp > u.P + sub.Ramp) tryp = u.P + sub.Ramp;
                if (tryp > pavail) tryp = pavail;
            }
            else if (sub.Category == "Solar PV") {
                let pavail = pmax * G.fr_solar;
                if (tempset > pavail) tempset = pavail;
                tryp = tempset + alpha*pmax;
                if (tryp < 0) tryp = 0;
                if (tryp < u.P - sub.Ramp) tryp = u.P - sub.Ramp;
                if (tryp > u.P + sub.Ramp) tryp = u.P + sub.Ramp;
                if (tryp > pavail) tryp = pavail;
            }
            else {
                tryp = tempset + alpha*pmax;
                if (tryp < pmin && u.Status == "IN") tryp = pmin;
                if (tryp < u.P - sub.Ramp) tryp = u.P - sub.Ramp;
                if (tryp > u.P + sub.Ramp) tryp = u.P + sub.Ramp;
                if (tryp > pmax) tryp = pmax;
            }
            if (u.Status == "STARTUP") {
                if (u.StatusCount >= sub.StartTime) {
                    if (tryp >= pmin) u.Status = "IN";
                }
                else {
                    tryp = 0;
                }
            }
            
            u.P = tryp;
            pvec.set([i, 0], pvec.get([i, 0]) + u.P/100.0);
        }
    }

    /* Y-bus if necessary */
    if (!G.Ybus)
    {
        console.log(`Creating Y-bus ${G.nsubs}`);
        G.Ybus = math.zeros(G.nsubs, G.nsubs);
        for (let key in G.branches)
        {
            let br = G.branches[key];
            let ybr = -1/br.Z;
            let i = parseInt(br.FromNum)-1;
            let j = parseInt(br.ToNum)-1;
            if (br.Status1 == "IN")
            {
                G.Ybus.set([i, i], G.Ybus.get([i, i]) + ybr);
                G.Ybus.set([i, j], G.Ybus.get([i, j]) - ybr);
                G.Ybus.set([j, i], G.Ybus.get([j, i]) - ybr);
                G.Ybus.set([j, j], G.Ybus.get([j, j]) + ybr);
            }
            if (br.Circuits == 2 && br.Status2 == "IN")
            {
                G.Ybus.set([i, i], G.Ybus.get([i, i]) + ybr);
                G.Ybus.set([i, j], G.Ybus.get([i, j]) - ybr);
                G.Ybus.set([j, i], G.Ybus.get([j, i]) - ybr);
                G.Ybus.set([j, j], G.Ybus.get([j, j]) + ybr);
            }
        }
        for (let key in G.subs)
        {
            let sub = G.subs[key];
            let i = parseInt(sub.Number)-1;
            if (sub.Number == 6 || sub.island == -1) {
                G.Ybus.set([i, i], G.Ybus.get([i,i]) - 1000);
            }
        }
        G.Yinv = math.lup(G.Ybus);
    }

    /* Power flow */
    let theta = math.lusolve(G.Yinv, pvec);
    //console.log(G.nsubs);
    //console.log(G.Ybus.toString());
    //console.log(pvec.toString());
    //console.log(theta.toString());
    if (Math.abs(theta.get([5,0])) > 1e-4) 
        console.log(`Power flow imbalance: ${theta.get([5,0])}`);
    for (let key in G.branches)
    {
        let br = G.branches[key];
        let ybr = -1/br.Z;
        let i = parseInt(br.FromNum)-1;
        let j = parseInt(br.ToNum)-1;
        let ang_i = theta.get([i,0]);
        let ang_j = theta.get([j,0]);
        let pflow = -ybr * (ang_i - ang_j) * 100;
        br.P = 0;
        if (br.Status1 == "IN")
        {
            br.P += pflow;
        }
        if (br.Circuits == 2 && br.Status2 == "IN")
        {
            br.P += pflow;
        }
    }

    /* Metrics and costs */
    G.total_load_served = 0;
    G.total_load_unserved = 0;
    G.total_wind = 0;
    G.total_solar = 0;
    G.total_thermal = 0;
    G.total_nuclear = 0;
    G.spin_reserves = 0;
    G.current_fuel_cost = 0;
    G.current_running_cost = 0;
    G.current_uload_cost = 0;
    for (let key in G.subs) {
        let sub = G.subs[key];
        let pmax = sub.Pmax / sub.Units;
        for (let iu = 0 ; iu < sub.Units; ++iu) {
            let u = sub.U[iu];
            if (sub.Category == "Load") {
                if (u.Status == "IN") {
                    G.total_load_served += u.P;
                    G.spin_reserves -= u.P;
                }
                else {
                    G.total_load_unserved += pmax*G.fr_load;
                    G.current_uload_cost += pmax*G.fr_load*1000;
                }
            }
            else {
                if (u.Status == "IN" || u.Status == "STARTUP" 
                        || u.Status == "SHUTDOWN") {
                    G.current_running_cost += sub.FixedCost;
                    G.current_fuel_cost += sub.FuelCost*u.P;
                }
                if (sub.Category == "Wind") {
                    G.total_wind += u.P;
                    if (u.Status == "IN") {
                        G.spin_reserves += pmax*G.fr_wind;
                    }
                    else {
                        G.spin_reserves += u.P
                    }
                }
                else if (sub.Category == "Solar PV") {
                    G.total_solar += u.P;
                    if (u.Status == "IN") {
                        G.spin_reserves += pmax*G.fr_solar;
                    }
                    else {
                        G.spin_reserves += u.P
                    }
                }
                else if (sub.Category == "Nuclear Steam") {
                    G.total_nuclear += u.P;
                    if (u.Status == "IN") {
                        G.spin_reserves += pmax;
                    }
                    else {
                        G.spin_reserves += u.P
                    }
                }
                else {
                    G.total_thermal += u.P;
                    if (u.Status == "IN") {
                        G.spin_reserves += pmax;
                    }
                    else {
                        G.spin_reserves += u.P
                    }
                }
            }
        }
    }
    G.total_fuel_cost += G.current_fuel_cost/60.0;
    G.total_running_cost += G.current_running_cost/60.0;
    G.total_uload_cost += G.current_uload_cost/60.0;
    G.total_cost = G.total_fuel_cost+G.total_running_cost+G.total_uload_cost;
    G.average_cost = (G.current_fuel_cost + G.current_running_cost
        + G.current_uload_cost) / (G.total_load_served + G.total_load_unserved);
    G.total_mwh += (G.total_load_served + G.total_load_unserved) / 60.0;

    update_dash();
    //pause();

    return;

}