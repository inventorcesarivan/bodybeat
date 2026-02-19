
// ========================================
// BodyBeat Module
// Rhythm Game v3.2 (Full Panel Restored)
// ========================================

(function(){

if(!window.BodyBeat){
    console.warn("BodyBeat Core not found.");
    return;
}

BodyBeat.registerModule({

    id: "rhythm_game_v3_2",
    name: "Rhythm Game v3.2",
    type: "game",
    hasPanel: true,

    active: false,
    paused: false,

    mode: "classic",

    bpm: 80,
    difficultyWindow: 800,

    clickVolume: 0.4,
    musicVolume: 0.7,

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
    toggleBtn: null,

    audioBuffer: null,
    audioSource: null,
    musicGain: null,
    startTime: 0,
    pauseOffset: 0,

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
        this.createToggleButton();
        this.createFloatingUI();
        this.startBeat();

        this.clickHandler = (e)=> this.handleClick(e);
        this.canvas.addEventListener("click", this.clickHandler);

        BodyBeat.onAfterDraw(()=>{
            if(this.active) this.drawOverlay();
        });

        this.active = true;
    },

    destroy(){

        clearInterval(this.timer);

        if(this.canvas && this.clickHandler){
            this.canvas.removeEventListener("click", this.clickHandler);
        }

        this.stopMusic();

        if(this.floatingUI){
            this.floatingUI.remove();
            this.floatingUI = null;
        }

        if(this.toggleBtn){
            this.toggleBtn.remove();
            this.toggleBtn = null;
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

        if(this.paused) return;

        const ctxAudio = this.core.getAudioContext();

        while(this.nextBeatTime < ctxAudio.currentTime + this.lookAhead){
            this.spawnTarget();
            this.playClick(this.nextBeatTime);
            this.nextBeatTime += this.stepTime;
        }
    },

    spawnTarget(){
        const row = Math.floor(Math.random() * this.rows);
        const col = 1 + Math.floor(Math.random() * (this.cols - 2));
        this.currentTarget = { row, col, born: Date.now() };
    },

    playClick(time){

        const ctx = this.core.getAudioContext();
        const master = this.core.getMasterMix();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.value = 700;

        gain.gain.setValueAtTime(this.clickVolume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.connect(gain).connect(master);
        osc.start(time);
        osc.stop(time + 0.05);
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

        this.stopMusic();

        this.musicGain = ctx.createGain();
        this.musicGain.gain.value = this.musicVolume;

        this.audioSource = ctx.createBufferSource();
        this.audioSource.buffer = this.audioBuffer;

        this.audioSource.connect(this.musicGain).connect(master);

        this.startTime = ctx.currentTime - this.pauseOffset;
        this.audioSource.start(0, this.pauseOffset);
    },

    pauseMusic(){

        if(!this.audioSource) return;

        const ctx = this.core.getAudioContext();

        if(!this.paused){
            this.pauseOffset = ctx.currentTime - this.startTime;
            this.audioSource.stop();
        }else{
            this.playMusic();
        }

        this.paused = !this.paused;
    },

    stopMusic(){

        if(this.audioSource){
            try{ this.audioSource.stop(); }catch(e){}
            this.audioSource = null;
        }
        this.pauseOffset = 0;
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

    createToggleButton(){

        const btn = document.createElement("button");

        btn.innerText = "Ver / Ocultar Controles";
        btn.style.position = "fixed";
        btn.style.top = "75px";   // MÁS ABAJO
        btn.style.left = "50%";
        btn.style.transform = "translateX(-50%)";
        btn.style.zIndex = "1001";
        btn.style.padding = "6px 12px";
        btn.style.background = "#111";
        btn.style.color = "white";
        btn.style.border = "1px solid #ff00ff";
        btn.style.borderRadius = "6px";
        btn.style.cursor = "pointer";

        btn.onclick = ()=>{
            if(this.floatingUI){
                const isHidden = this.floatingUI.style.display === "none";
                this.floatingUI.style.display = isHidden ? "block" : "none";
            }
        };

        document.body.appendChild(btn);
        this.toggleBtn = btn;
    },

    createFloatingUI(){

        const container = document.createElement("div");

        container.style.position = "fixed";
        container.style.top = "130px"; // PANEL MÁS ABAJO
        container.style.left = "50%";
        container.style.transform = "translateX(-50%)";
        container.style.zIndex = "1000";
        container.style.background = "rgba(0,0,0,0.85)";
        container.style.padding = "14px";
        container.style.borderRadius = "10px";
        container.style.boxShadow = "0 0 15px #ff00ff";
        container.style.color = "white";
        container.style.fontFamily = "Arial";
        container.style.width = "280px";

        container.innerHTML = `
            <select id="rgModeSelect" style="width:100%;margin-bottom:8px;">
                <option value="classic">Modo Classic</option>
                <option value="music">Modo Music</option>
            </select>

            <input type="file" id="rgFileInput" accept="audio/*" style="width:100%;margin-bottom:6px;">
            <button id="rgLoadURLBtn" style="width:100%;margin-bottom:6px;">Cargar por URL</button>

            <button id="rgPlayBtn" style="width:100%;margin-bottom:6px;">Reproducir Música</button>
            <button id="rgPauseBtn" style="width:100%;margin-bottom:8px;">Pausar Música</button>

            <label>BPM</label>
            <input type="range" min="40" max="180" value="${this.bpm}" id="rgBpmSlider" style="width:100%;margin-bottom:6px;">

            <label>Ventana (ms)</label>
            <input type="range" min="300" max="2000" value="${this.difficultyWindow}" id="rgWindowSlider" style="width:100%;margin-bottom:6px;">

            <label>Vol Click</label>
            <input type="range" min="0" max="1" step="0.01" value="${this.clickVolume}" id="rgClickVol" style="width:100%;margin-bottom:6px;">

            <label>Vol Música</label>
            <input type="range" min="0" max="1" step="0.01" value="${this.musicVolume}" id="rgMusicVol" style="width:100%;">
        `;

        document.body.appendChild(container);

        document.getElementById("rgModeSelect").onchange = (e)=>{
            this.mode = e.target.value;
        };

        document.getElementById("rgFileInput").onchange = async (e)=>{
            const file = e.target.files[0];
            if(file) await this.loadLocalFile(file);
        };

        document.getElementById("rgLoadURLBtn").onclick = async ()=>{
            const url = prompt("Pega el link directo al archivo de audio:");
            if(url) await this.loadFromURL(url);
        };

        document.getElementById("rgPlayBtn").onclick = ()=>{
            if(this.mode === "music") this.playMusic();
        };

        document.getElementById("rgPauseBtn").onclick = ()=>{
            if(this.mode === "music") this.pauseMusic();
        };

        document.getElementById("rgBpmSlider").oninput = (e)=>{
            this.bpm = parseInt(e.target.value);
            this.updateTiming();
        };

        document.getElementById("rgWindowSlider").oninput = (e)=>{
            this.difficultyWindow = parseInt(e.target.value);
        };

        document.getElementById("rgClickVol").oninput = (e)=>{
            this.clickVolume = parseFloat(e.target.value);
        };

        document.getElementById("rgMusicVol").oninput = (e)=>{
            this.musicVolume = parseFloat(e.target.value);
            if(this.musicGain) this.musicGain.gain.value = this.musicVolume;
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
