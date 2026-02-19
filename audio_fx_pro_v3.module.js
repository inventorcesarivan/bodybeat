
// ========================================
// BodyBeat Official Module
// Audio FX Pro v3.0 (Multi-Bus Pro)
// ========================================

(function(){

if(!window.BodyBeat){
    console.warn("BodyBeat Core not found.");
    return;
}

BodyBeat.registerModule({

    id: "audio_fx_pro_v3",
    name: "Audio FX Pro",
    type: "audio",
    hasPanel: true,

    active: false,

    // Target routing
    applyCenter: true,
    applyLateral: true,

    // EQ
    lowGain: 0,
    midGain: 0,
    highGain: 0,

    // FX
    reverbMix: 0.2,
    delayTime: 0.25,
    delayFeedback: 0.3,
    compressorThreshold: -24,

    nodes: {},

    init(core){

        this.core = core;

        const ctx = core.getAudioContext();
        const centerBus = core.getCenterBus();
        const lateralBus = core.getLateralBus();

        if(!ctx || !centerBus || !lateralBus){
            console.warn("Audio buses not ready");
            return;
        }

        // ===== Create EQ =====
        this.nodes.low = ctx.createBiquadFilter();
        this.nodes.low.type = "lowshelf";
        this.nodes.low.frequency.value = 80;

        this.nodes.mid = ctx.createBiquadFilter();
        this.nodes.mid.type = "peaking";
        this.nodes.mid.frequency.value = 1000;
        this.nodes.mid.Q.value = 1;

        this.nodes.high = ctx.createBiquadFilter();
        this.nodes.high.type = "highshelf";
        this.nodes.high.frequency.value = 8000;

        // ===== Delay =====
        this.nodes.delay = ctx.createDelay();
        this.nodes.feedback = ctx.createGain();

        this.nodes.delay.delayTime.value = this.delayTime;
        this.nodes.feedback.gain.value = this.delayFeedback;

        // ===== Reverb =====
        this.nodes.reverb = ctx.createConvolver();
        this.nodes.reverb.buffer = this.createImpulse(ctx);

        this.nodes.reverbGain = ctx.createGain();
        this.nodes.reverbGain.gain.value = this.reverbMix;

        // ===== Compressor =====
        this.nodes.comp = ctx.createDynamicsCompressor();
        this.nodes.comp.threshold.value = this.compressorThreshold;

        // ===== Routing Chain =====
        this.nodes.low.connect(this.nodes.mid);
        this.nodes.mid.connect(this.nodes.high);
        this.nodes.high.connect(this.nodes.delay);
        this.nodes.delay.connect(this.nodes.feedback);
        this.nodes.feedback.connect(this.nodes.delay);

        this.nodes.delay.connect(this.nodes.reverb);
        this.nodes.reverb.connect(this.nodes.reverbGain);
        this.nodes.reverbGain.connect(this.nodes.comp);
        this.nodes.comp.connect(ctx.destination);

        this.connectTargets();

        this.active = true;
        this.applyRealtime();
        this.loadConfig();

        console.log("Audio FX Pro v3 activated");
    },

    connectTargets(){

        const centerBus = this.core.getCenterBus();
        const lateralBus = this.core.getLateralBus();

        if(this.applyCenter){
            centerBus.connect(this.nodes.low);
        }

        if(this.applyLateral){
            lateralBus.connect(this.nodes.low);
        }
    },

    disconnectTargets(){

        const centerBus = this.core.getCenterBus();
        const lateralBus = this.core.getLateralBus();

        try{ centerBus.disconnect(this.nodes.low); }catch(e){}
        try{ lateralBus.disconnect(this.nodes.low); }catch(e){}
    },

    destroy(){

        if(!this.active) return;

        this.disconnectTargets();

        this.active = false;
        console.log("Audio FX Pro v3 deactivated");
    },

    createImpulse(ctx){
        const length = ctx.sampleRate * 2;
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        for(let i=0;i<2;i++){
            const ch = impulse.getChannelData(i);
            for(let j=0;j<length;j++){
                ch[j] = (Math.random()*2-1)*(1-j/length);
            }
        }
        return impulse;
    },

    applyRealtime(){

        if(!this.active) return;

        this.nodes.low.gain.value = this.lowGain;
        this.nodes.mid.gain.value = this.midGain;
        this.nodes.high.gain.value = this.highGain;

        this.nodes.delay.delayTime.value = this.delayTime;
        this.nodes.feedback.gain.value = this.delayFeedback;
        this.nodes.reverbGain.gain.value = this.reverbMix;
        this.nodes.comp.threshold.value = this.compressorThreshold;
    },

    renderPanel(){

        let existing = document.getElementById("audioFxPanelV3");
        if(existing){
            existing.style.display = "block";
            return;
        }

        const panel = document.createElement("div");
        panel.id = "audioFxPanelV3";
        panel.className = "subPanel";
        panel.style.display = "block";

        panel.innerHTML = `
            <div class="closeBtn" onclick="document.getElementById('audioFxPanelV3').style.display='none'">✕</div>
            <h3>Audio FX Pro</h3>

            <b>Aplicar a:</b><br>
            <input type="checkbox" id="applyCenter" ${this.applyCenter?"checked":""}> Centro<br>
            <input type="checkbox" id="applyLateral" ${this.applyLateral?"checked":""}> Laterales<br><br>

            <b>EQ</b><br>
            Low <input type="range" min="-20" max="20" step="1" value="${this.lowGain}" id="lowGain"><br>
            Mid <input type="range" min="-20" max="20" step="1" value="${this.midGain}" id="midGain"><br>
            High <input type="range" min="-20" max="20" step="1" value="${this.highGain}" id="highGain"><br><br>

            <b>FX</b><br>
            Reverb <input type="range" min="0" max="1" step="0.01" value="${this.reverbMix}" id="reverbMix"><br>
            Delay Time <input type="range" min="0" max="1" step="0.01" value="${this.delayTime}" id="delayTime"><br>
            Feedback <input type="range" min="0" max="0.9" step="0.01" value="${this.delayFeedback}" id="delayFeedback"><br>
            Comp <input type="range" min="-60" max="0" step="1" value="${this.compressorThreshold}" id="compThreshold"><br><br>

            <button id="fxToggleBtn">${this.active ? "Desactivar" : "Activar"}</button>
            <button id="fxSaveBtn">Guardar</button>
            <button id="fxResetBtn">Limpiar</button>
        `;

        document.body.appendChild(panel);

        const update = ()=> this.applyRealtime();

        document.getElementById("lowGain").oninput = e=>{ this.lowGain=parseFloat(e.target.value); update(); };
        document.getElementById("midGain").oninput = e=>{ this.midGain=parseFloat(e.target.value); update(); };
        document.getElementById("highGain").oninput = e=>{ this.highGain=parseFloat(e.target.value); update(); };
        document.getElementById("reverbMix").oninput = e=>{ this.reverbMix=parseFloat(e.target.value); update(); };
        document.getElementById("delayTime").oninput = e=>{ this.delayTime=parseFloat(e.target.value); update(); };
        document.getElementById("delayFeedback").oninput = e=>{ this.delayFeedback=parseFloat(e.target.value); update(); };
        document.getElementById("compThreshold").oninput = e=>{ this.compressorThreshold=parseFloat(e.target.value); update(); };

        document.getElementById("applyCenter").onchange = e=>{
            this.applyCenter=e.target.checked;
        };

        document.getElementById("applyLateral").onchange = e=>{
            this.applyLateral=e.target.checked;
        };

        document.getElementById("fxToggleBtn").onclick = ()=>{
            if(this.active){
                BodyBeat.deactivateModule(this.id);
            }else{
                BodyBeat.activateModule(this.id);
            }
            panel.style.display="none";
        };

        document.getElementById("fxSaveBtn").onclick = ()=>{
            this.saveConfig();
            alert("Configuración guardada");
        };

        document.getElementById("fxResetBtn").onclick = ()=>{
            localStorage.removeItem("bb_audio_fx_pro_v3_config");
            alert("Configuración limpiada");
        };
    },

    saveConfig(){
        localStorage.setItem("bb_audio_fx_pro_v3_config", JSON.stringify({
            applyCenter:this.applyCenter,
            applyLateral:this.applyLateral,
            lowGain:this.lowGain,
            midGain:this.midGain,
            highGain:this.highGain,
            reverbMix:this.reverbMix,
            delayTime:this.delayTime,
            delayFeedback:this.delayFeedback,
            compressorThreshold:this.compressorThreshold
        }));
    },

    loadConfig(){
        const saved = localStorage.getItem("bb_audio_fx_pro_v3_config");
        if(!saved) return;
        const d = JSON.parse(saved);
        Object.assign(this,d);
    }

});

})();
