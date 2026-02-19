
// ========================================
// BodyBeat Official Module
// Glow Visual Pro v3.0
// ========================================

(function(){

if(!window.BodyBeat){
    console.warn("BodyBeat Core not found.");
    return;
}

BodyBeat.registerModule({

    id: "glow_visual_pro_v3",
    name: "Glow Visual Pro",
    type: "visual",
    hasPanel: true,

    intensity: 40,
    mode: "border", // border | cells | grid
    active: false,
    hook: null,

    init(core){
        this.core = core;
        this.ctx = core.getContext();
        this.canvas = core.getCanvas();
        this.active = true;

        this.hook = () => {

            if(!this.active) return;
            if(!this.ctx || !this.canvas) return;

            this.ctx.save();
            this.ctx.shadowColor = "#00ffff";
            this.ctx.shadowBlur = this.intensity;

            if(this.mode === "border"){
                this.ctx.strokeStyle = "#00ffff";
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(0,0,this.canvas.width,this.canvas.height);
            }

            if(this.mode === "grid"){
                this.ctx.strokeStyle = "#00ffff";
                this.ctx.lineWidth = 1.5;
                this.ctx.strokeRect(0,0,this.canvas.width,this.canvas.height);
            }

            if(this.mode === "cells"){
                // simple glow pulse overlay
                this.ctx.fillStyle = "rgba(0,255,255,0.08)";
                this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
            }

            this.ctx.restore();
        };

        BodyBeat.onAfterDraw(this.hook);
        this.loadConfig();
        console.log("Glow Visual Pro v3 activated");
    },

    destroy(){
        this.active = false;

        if(this.hook){
            BodyBeat.hooks.afterDraw =
                BodyBeat.hooks.afterDraw.filter(fn => fn !== this.hook);
        }

        console.log("Glow Visual Pro v3 deactivated");
    },

    renderPanel(){

        let existing = document.getElementById("glowPanelV3");
        if(existing){
            existing.style.display = "block";
            return;
        }

        const panel = document.createElement("div");
        panel.id = "glowPanelV3";
        panel.className = "subPanel";
        panel.style.display = "block";

        panel.innerHTML = `
            <div class="closeBtn" onclick="document.getElementById('glowPanelV3').style.display='none'">✕</div>
            <h3>Glow Visual Pro</h3>

            <label>Intensidad</label><br>
            <input type="range" min="0" max="100" value="${this.intensity}" id="glowIntensitySlider"><br><br>

            <label>Modo</label><br>
            <select id="glowModeSelect">
                <option value="border">Solo Borde</option>
                <option value="cells">Celdas Activas</option>
                <option value="grid">Grid Neon</option>
            </select><br><br>

            <button id="glowToggleBtn">${this.active ? "Desactivar" : "Activar"}</button>
            <button id="glowSaveBtn">Guardar</button>
        `;

        document.body.appendChild(panel);

        document.getElementById("glowModeSelect").value = this.mode;

        document.getElementById("glowIntensitySlider").oninput = (e)=>{
            this.intensity = parseInt(e.target.value);
        };

        document.getElementById("glowModeSelect").onchange = (e)=>{
            this.mode = e.target.value;
        };

        document.getElementById("glowToggleBtn").onclick = ()=>{
            if(this.active){
                BodyBeat.deactivateModule(this.id);
            }else{
                BodyBeat.activateModule(this.id);
            }
            document.getElementById("glowPanelV3").style.display="none";
        };

        document.getElementById("glowSaveBtn").onclick = ()=>{
            this.saveConfig();
            alert("Configuración guardada");
        };
    },

    saveConfig(){
        localStorage.setItem("bb_glow_v3_config", JSON.stringify({
            intensity: this.intensity,
            mode: this.mode
        }));
    },

    loadConfig(){
        const saved = localStorage.getItem("bb_glow_v3_config");
        if(!saved) return;
        const data = JSON.parse(saved);
        if(data.intensity !== undefined) this.intensity = data.intensity;
        if(data.mode) this.mode = data.mode;
    }

});

})();
