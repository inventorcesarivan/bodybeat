
// ========================================
// BodyBeat Official Module
// Audio Analyzer Pro v4.0 (True Signal Chain)
// ========================================

(function(){

if(!window.BodyBeat){
    console.warn("BodyBeat Core not found.");
    return;
}

BodyBeat.registerModule({

    id: "audio_analyzer_pro_v4",
    name: "Audio Analyzer Pro DJ",
    type: "visual-audio",
    hasPanel: true,

    active: false,
    visible: true,

    bands: 64,
    sensitivity: 2.2,
    color: "#00ffcc",
    opacity: 1,

    analyser: null,
    canvas: null,
    ctx2: null,
    animationId: null,

    init(core){

        this.core = core;

        const ctx = core.getAudioContext();
        const fxBus = core.getFxBus ? core.getFxBus() : core.getMasterMix();

        if(!ctx || !fxBus){
            console.warn("Audio not ready");
            return;
        }

        ctx.resume();

        // Create analyser
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;

        // === Insert analyser in real chain ===
        fxBus.disconnect();
        fxBus.connect(this.analyser);
        this.analyser.connect(ctx.destination);

        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        this.createCanvas();

        this.active = true;
        this.loop();

        console.log("Audio Analyzer Pro v4 activated");
    },

    destroy(){

        if(!this.active) return;

        const ctx = this.core.getAudioContext();
        const fxBus = this.core.getFxBus ? this.core.getFxBus() : this.core.getMasterMix();

        try{
            fxBus.disconnect();
            fxBus.connect(ctx.destination);
        }catch(e){}

        cancelAnimationFrame(this.animationId);

        if(this.canvas){
            this.canvas.remove();
        }

        this.active = false;
        console.log("Audio Analyzer Pro v4 deactivated");
    },

    createCanvas(){

        this.canvas = document.createElement("canvas");
        this.canvas.style.position = "fixed";
        this.canvas.style.left = "0";
        this.canvas.style.bottom = "0";
        this.canvas.style.pointerEvents = "none";
        this.canvas.style.zIndex = "700";

        document.body.appendChild(this.canvas);

        this.ctx2 = this.canvas.getContext("2d");

        this.resize();
        window.addEventListener("resize", ()=>this.resize());
    },

    resize(){
        this.canvas.width = window.innerWidth;
        this.canvas.height = Math.floor(window.innerHeight * 0.35);
    },

    loop(){

        if(!this.active) return;

        this.animationId = requestAnimationFrame(()=>this.loop());

        if(!this.visible) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx2.clearRect(0,0,w,h);
        this.ctx2.globalAlpha = this.opacity;

        const step = Math.floor(this.dataArray.length / this.bands);
        const barWidth = w / this.bands;

        for(let i=0;i<this.bands;i++){

            const value = this.dataArray[i*step] * this.sensitivity;
            const barHeight = Math.max(8, (value / 255) * h);

            const x = i * barWidth;
            const y = h - barHeight;

            // Glow
            this.ctx2.shadowBlur = 20;
            this.ctx2.shadowColor = this.color;

            this.ctx2.fillStyle = this.color;
            this.ctx2.fillRect(x, y, barWidth - 2, barHeight);

            // Reflection
            this.ctx2.globalAlpha = 0.25;
            this.ctx2.fillRect(x, h, barWidth - 2, barHeight * 0.6);
            this.ctx2.globalAlpha = this.opacity;
        }
    },

    renderPanel(){

        let existing = document.getElementById("analyzerPanelV4");
        if(existing){
            existing.style.display = "block";
            return;
        }

        const panel = document.createElement("div");
        panel.id = "analyzerPanelV4";
        panel.className = "subPanel";
        panel.style.display = "block";

        panel.innerHTML = `
            <div class="closeBtn" onclick="document.getElementById('analyzerPanelV4').style.display='none'">✕</div>
            <h3>Audio Analyzer DJ</h3>

            <label>Bandas</label><br>
            <input type="range" min="32" max="128" step="32" value="${this.bands}" id="bandsSlider"><br><br>

            <label>Sensibilidad</label><br>
            <input type="range" min="1" max="4" step="0.1" value="${this.sensitivity}" id="sensSlider"><br><br>

            <label>Opacidad</label><br>
            <input type="range" min="0.5" max="1" step="0.1" value="${this.opacity}" id="opacitySlider"><br><br>

            <label>Color</label><br>
            <input type="color" value="${this.color}" id="colorPicker"><br><br>

            <button id="toggleVisibilityBtn">${this.visible ? "Ocultar" : "Mostrar"}</button><br><br>

            <button id="toggleAnalyzerBtn">${this.active ? "Desactivar" : "Activar"}</button>
        `;

        document.body.appendChild(panel);

        document.getElementById("bandsSlider").oninput = e=> this.bands=parseInt(e.target.value);
        document.getElementById("sensSlider").oninput = e=> this.sensitivity=parseFloat(e.target.value);
        document.getElementById("opacitySlider").oninput = e=> this.opacity=parseFloat(e.target.value);
        document.getElementById("colorPicker").oninput = e=> this.color=e.target.value;

        document.getElementById("toggleVisibilityBtn").onclick = ()=>{
            this.visible = !this.visible;
            panel.style.display="none";
        };

        document.getElementById("toggleAnalyzerBtn").onclick = ()=>{
            if(this.active) BodyBeat.deactivateModule(this.id);
            else BodyBeat.activateModule(this.id);
            panel.style.display="none";
        };
    }

});

})();
