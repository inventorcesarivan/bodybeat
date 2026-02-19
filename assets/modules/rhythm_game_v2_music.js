
// ========================================
// BodyBeat Module
// Rhythm Game v2.0 (Music + Manual BPM Sync)
// ========================================

(function(){

if(!window.BodyBeat){
    console.warn("BodyBeat Core not found.");
    return;
}

BodyBeat.registerModule({

    id: "rhythm_game_v2",
    name: "Rhythm Game Music Mode",
    type: "game",
    hasPanel: true,

    active: false,
    paused: false,

    bpm: 80,
    difficultyWindow: 800,

    stepTime: 0,
    lookAhead: 0.1,
    intervalTime: 25,

    nextBeatTime: 0,
    timer: null,

    currentTarget: null,
    hitEffect: null,

    score: 0,
    combo: 0,

    rows: 0,
    cols: 0,
    canvas: null,
    ctx: null,

    floatingUI: null,
    drawHook: null,
    clickHandler: null,

    audioBuffer: null,
    audioSource: null,

    init(core){

        this.core = core;
        const ctxAudio = core.getAudioContext();
        if(!ctxAudio) return;

        this.canvas = core.getCanvas();
        this.ctx = core.getContext();

        const size = core.getGridSize();
        this.rows = size.rows;
        this.cols = size.cols;

        this.score = 0;
        this.combo = 0;
        this.paused = false;

        this.updateTiming();
        this.createFloatingUI();

        this.clickHandler = (e)=> this.handleClick(e);
        this.canvas.addEventListener("click", this.clickHandler);

        this.drawHook = ()=> this.drawOverlay();
        BodyBeat.onAfterDraw(this.drawHook);

        this.active = true;
    },

    destroy(){

        clearInterval(this.timer);

        if(this.canvas && this.clickHandler){
            this.canvas.removeEventListener("click", this.clickHandler);
        }

        if(this.audioSource){
            try{ this.audioSource.stop(); }catch(e){}
        }

        if(this.floatingUI){
            this.floatingUI.remove();
            this.floatingUI = null;
        }

        if(this.drawHook){
            BodyBeat.hooks.afterDraw =
                BodyBeat.hooks.afterDraw.filter(fn => fn !== this.drawHook);
        }

        this.active = false;
        this.paused = false;
    },

    updateTiming(){
        this.stepTime = 60 / this.bpm;
    },

    startBeat(){

        const ctxAudio = this.core.getAudioContext();
        this.updateTiming();
        this.nextBeatTime = ctxAudio.currentTime;

        clearInterval(this.timer);
        this.timer = setInterval(()=> this.schedule(), this.intervalTime);
    },

    schedule(){

        if(this.paused || !this.audioSource) return;

        const ctxAudio = this.core.getAudioContext();

        while(this.nextBeatTime < ctxAudio.currentTime + this.lookAhead){
            this.spawnTarget();
            this.nextBeatTime += this.stepTime;
        }
    },

    spawnTarget(){

        const row = Math.floor(Math.random() * this.rows);
        const col = 1 + Math.floor(Math.random() * (this.cols - 2));
        this.currentTarget = { row, col, born: Date.now() };
    },

    handleClick(e){

        if(!this.currentTarget || this.paused) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;

        const col = Math.floor(x / (this.canvas.width / this.cols));
        const row = Math.floor(y / (this.canvas.height / this.rows));

        const age = Date.now() - this.currentTarget.born;

        if(row === this.currentTarget.row &&
           col === this.currentTarget.col &&
           age <= this.difficultyWindow){

            this.score += 10 + (this.combo * 2);
            this.combo += 1;
            this.hitEffect = { row, col, time: Date.now() };

        }else{
            this.combo = 0;
        }
    },

    drawOverlay(){

        if(!this.active) return;

        const w = this.canvas.width / this.cols;
        const h = this.canvas.height / this.rows;

        if(this.currentTarget){
            const x = this.currentTarget.col * w;
            const y = this.currentTarget.row * h;
            this.ctx.save();
            this.ctx.strokeStyle = "#ff00ff";
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(x, y, w, h);
            this.ctx.restore();
        }

        if(this.hitEffect){
            const elapsed = Date.now() - this.hitEffect.time;
            if(elapsed < 250){
                const x = this.hitEffect.col * w;
                const y = this.hitEffect.row * h;
                this.ctx.save();
                this.ctx.fillStyle = "rgba(0,255,0,0.6)";
                this.ctx.fillRect(x, y, w, h);
                this.ctx.restore();
            }else{
                this.hitEffect = null;
            }
        }

        this.ctx.save();
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 20px Arial";
        this.ctx.fillText("Score: " + this.score, 20, 28);
        this.ctx.fillText("Combo: " + this.combo, 20, 54);
        this.ctx.restore();
    },

    async loadLocalFile(file){
        const ctx = this.core.getAudioContext();
        const arrayBuffer = await file.arrayBuffer();
        this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    },

    async loadFromURL(url){
        const ctx = this.core.getAudioContext();
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    },

    playMusic(){

        if(!this.audioBuffer) return;

        const ctx = this.core.getAudioContext();
        const master = this.core.getMasterMix();

        this.audioSource = ctx.createBufferSource();
        this.audioSource.buffer = this.audioBuffer;
        this.audioSource.connect(master);
        this.audioSource.start();

        this.startBeat();
    },

    pauseMusic(){
        this.paused = !this.paused;
    },

    createFloatingUI(){

        const container = document.createElement("div");

        container.style.position = "fixed";
        container.style.top = "80px";
        container.style.left = "50%";
        container.style.transform = "translateX(-50%)";
        container.style.zIndex = "1000";

        container.style.background = "rgba(0,0,0,0.85)";
        container.style.padding = "14px";
        container.style.borderRadius = "10px";
        container.style.boxShadow = "0 0 15px #ff00ff";
        container.style.color = "white";
        container.style.fontFamily = "Arial";
        container.style.width = "240px";

        container.innerHTML = `
            <input type="file" id="rgFileInput" accept="audio/*" style="width:100%;margin-bottom:6px;">
            <button id="rgLoadURLBtn" style="width:100%;margin-bottom:8px;">Cargar por URL</button>

            <button id="rgPlayBtn" style="width:100%;margin-bottom:6px;">Reproducir</button>
            <button id="rgPauseBtn" style="width:100%;margin-bottom:10px;">Pausar</button>

            <label>BPM</label>
            <input type="range" min="40" max="180" value="${this.bpm}" id="rgBpmSlider" style="width:100%;margin-bottom:8px;">

            <label>Ventana (ms)</label>
            <input type="range" min="300" max="2000" value="${this.difficultyWindow}" id="rgWindowSlider" style="width:100%;">
        `;

        document.body.appendChild(container);

        document.getElementById("rgFileInput").onchange = async (e)=>{
            const file = e.target.files[0];
            if(file) await this.loadLocalFile(file);
        };

        document.getElementById("rgLoadURLBtn").onclick = async ()=>{
            const url = prompt("Pega el link directo al archivo de audio (mp3, wav, etc):");
            if(url) await this.loadFromURL(url);
        };

        document.getElementById("rgPlayBtn").onclick = ()=>{
            this.playMusic();
        };

        document.getElementById("rgPauseBtn").onclick = ()=>{
            this.pauseMusic();
        };

        document.getElementById("rgBpmSlider").oninput = (e)=>{
            this.bpm = parseInt(e.target.value);
            this.updateTiming();
        };

        document.getElementById("rgWindowSlider").oninput = (e)=>{
            this.difficultyWindow = parseInt(e.target.value);
        };

        this.floatingUI = container;
    },

    renderPanel(){
        if(this.active){
            BodyBeat.deactivateModule(this.id);
        }else{
            BodyBeat.activateModule(this.id);
        }
    }

});

})();
