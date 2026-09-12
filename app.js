/**
 * APP.JS
 * Master Controller for METABOLIC HUD // BIO-QUANTUM v4.2
 */

import { MetabolicScience } from './science-engine.js';
import { cyberAudio } from './audio.js';
import { BioHologramScene } from './visuals-3d.js';
import { TelemetryCharts } from './charts-telemetry.js';

class MetabolicApp {
  constructor() {
    this.state = {
      unit: 'metric', // 'metric' (kg, cm) or 'imperial' (lbs, in)
      gender: 'male',
      age: 28,
      weightKg: 75,
      heightCm: 178,
      bodyFat: 15,
      activity: 'moderate',
      goal: 'maintenance',
      macroSplit: { protein: 30, carbs: 45, fats: 25 },
      scanlines: true,
      audioMuted: false
    };

    this.hologram = null;
    this.counters = {};
  }

  init() {
    // 1. Initialize 3D Visual Scene
    this.hologram = new BioHologramScene('hologram-viewport');

    // 2. Bind DOM Event Listeners
    this.bindInputs();
    this.bindUnitToggles();
    this.bindGenderToggles();
    this.bindActivityToggles();
    this.bindGoalToggles();
    this.bindAudioControls();
    this.bindMacroSliders();
    this.bindOrganHovers();
    this.bindExportDossier();
    this.bindArchetypeHelpers();

    // 3. Initial Calculation & Render
    this.recalculateAll();

    // 4. Play boot sequence on first user click anywhere
    const onFirstUserAction = () => {
      cyberAudio.init();
      cyberAudio.playBootSequence();
      window.removeEventListener('click', onFirstUserAction);
    };
    window.addEventListener('click', onFirstUserAction);

    // Update real-time timestamp in header
    this.startTelemetryClock();
  }

  startTelemetryClock() {
    const clockEl = document.getElementById('telemetry-clock');
    if (!clockEl) return;
    setInterval(() => {
      const now = new Date();
      clockEl.textContent = now.toISOString().replace('T', ' // ').substring(0, 22) + ' UTC';
    }, 1000);
  }

  bindInputs() {
    const syncPair = (sliderId, numId, stateKey, parser = parseFloat) => {
      const slider = document.getElementById(sliderId);
      const num = document.getElementById(numId);
      if (!slider || !num) return;

      const update = (val) => {
        val = parser(val);
        if (isNaN(val)) return;

        if (stateKey === 'weight') {
          this.state.weightKg = this.state.unit === 'metric' ? val : val * 0.45359237;
        } else if (stateKey === 'height') {
          this.state.heightCm = this.state.unit === 'metric' ? val : val * 2.54;
        } else {
          this.state[stateKey] = val;
        }

        slider.value = val;
        num.value = val;
        cyberAudio.playClick();
        this.recalculateAll();
      };

      slider.addEventListener('input', (e) => update(e.target.value));
      num.addEventListener('input', (e) => update(e.target.value));
    };

    syncPair('input-age-range', 'input-age-num', 'age', parseInt);
    syncPair('input-weight-range', 'input-weight-num', 'weight', parseFloat);
    syncPair('input-height-range', 'input-height-num', 'height', parseFloat);
    syncPair('input-bodyfat-range', 'input-bodyfat-num', 'bodyFat', parseFloat);
  }

  bindUnitToggles() {
    const btnMetric = document.getElementById('btn-unit-metric');
    const btnImperial = document.getElementById('btn-unit-imperial');

    const updateDisplayUnits = () => {
      const isMetric = this.state.unit === 'metric';
      btnMetric?.classList.toggle('cyber-btn-active', isMetric);
      btnImperial?.classList.toggle('cyber-btn-active', !isMetric);

      const weightVal = isMetric ? Math.round(this.state.weightKg) : Math.round(this.state.weightKg * 2.20462);
      const heightVal = isMetric ? Math.round(this.state.heightCm) : Math.round(this.state.heightCm / 2.54);

      // Update labels
      document.querySelectorAll('.unit-weight-label').forEach(el => el.textContent = isMetric ? 'KG' : 'LBS');
      document.querySelectorAll('.unit-height-label').forEach(el => el.textContent = isMetric ? 'CM' : 'IN');

      // Update ranges
      const wRange = document.getElementById('input-weight-range');
      const wNum = document.getElementById('input-weight-num');
      if (wRange && wNum) {
        wRange.min = isMetric ? "35" : "75";
        wRange.max = isMetric ? "200" : "440";
        wRange.value = weightVal;
        wNum.value = weightVal;
      }

      const hRange = document.getElementById('input-height-range');
      const hNum = document.getElementById('input-height-num');
      if (hRange && hNum) {
        hRange.min = isMetric ? "120" : "48";
        hRange.max = isMetric ? "230" : "90";
        hRange.value = heightVal;
        hNum.value = heightVal;
      }
    };

    btnMetric?.addEventListener('click', () => {
      if (this.state.unit === 'metric') return;
      this.state.unit = 'metric';
      cyberAudio.playModeSwitch();
      updateDisplayUnits();
    });

    btnImperial?.addEventListener('click', () => {
      if (this.state.unit === 'imperial') return;
      this.state.unit = 'imperial';
      cyberAudio.playModeSwitch();
      updateDisplayUnits();
    });
  }

  bindGenderToggles() {
    const btnMale = document.getElementById('btn-gender-male');
    const btnFemale = document.getElementById('btn-gender-female');

    btnMale?.addEventListener('click', () => {
      if (this.state.gender === 'male') return;
      this.state.gender = 'male';
      btnMale.classList.add('cyber-btn-active');
      btnFemale?.classList.remove('cyber-btn-active');
      cyberAudio.playModeSwitch();
      this.recalculateAll();
    });

    btnFemale?.addEventListener('click', () => {
      if (this.state.gender === 'female') return;
      this.state.gender = 'female';
      btnFemale.classList.add('cyber-btn-active');
      btnMale?.classList.remove('cyber-btn-active');
      cyberAudio.playModeSwitch();
      this.recalculateAll();
    });
  }

  bindActivityToggles() {
    const buttons = document.querySelectorAll('[data-activity]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-activity');
        this.state.activity = act;
        buttons.forEach(b => b.classList.remove('cyber-btn-active', 'border-cyan-400'));
        btn.classList.add('cyber-btn-active');
        cyberAudio.playModeSwitch();
        this.recalculateAll();
      });
    });
  }

  bindGoalToggles() {
    const buttons = document.querySelectorAll('[data-goal]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const g = btn.getAttribute('data-goal');
        this.state.goal = g;
        buttons.forEach(b => b.classList.remove('cyber-btn-active', 'border-purple-400'));
        btn.classList.add('cyber-btn-active');
        cyberAudio.playModeSwitch();
        this.recalculateAll();
      });
    });
  }

  bindAudioControls() {
    const btnAudio = document.getElementById('btn-toggle-audio');
    const btnScanlines = document.getElementById('btn-toggle-scanlines');
    const scanlineEl = document.getElementById('scanline-overlay');

    btnAudio?.addEventListener('click', () => {
      const isMuted = cyberAudio.toggleMute();
      this.state.audioMuted = isMuted;
      btnAudio.innerHTML = isMuted 
        ? `<span class="text-rose-400">🔇 AUDIO OFF</span>` 
        : `<span class="text-cyan-400">🔊 AUDIO ON</span>`;
      if (!isMuted) cyberAudio.playModeSwitch();
    });

    btnScanlines?.addEventListener('click', () => {
      this.state.scanlines = !this.state.scanlines;
      if (scanlineEl) {
        scanlineEl.style.display = this.state.scanlines ? 'block' : 'none';
      }
      btnScanlines.innerHTML = this.state.scanlines 
        ? `<span class="text-cyan-400">⚡ CRT FX: ON</span>` 
        : `<span class="text-slate-400">⚡ CRT FX: OFF</span>`;
      cyberAudio.playClick();
    });
  }

  bindMacroSliders() {
    const pSlider = document.getElementById('macro-protein-slider');
    const cSlider = document.getElementById('macro-carbs-slider');
    const fSlider = document.getElementById('macro-fats-slider');

    const updateMacros = () => {
      let p = parseInt(pSlider.value);
      let c = parseInt(cSlider.value);
      let f = parseInt(fSlider.value);

      // Normalize to 100%
      const sum = p + c + f;
      if (sum !== 100) {
        const factor = 100 / sum;
        p = Math.round(p * factor);
        c = Math.round(c * factor);
        f = 100 - (p + c);
      }

      this.state.macroSplit = { protein: p, carbs: c, fats: f };
      document.getElementById('macro-protein-val').textContent = `${p}%`;
      document.getElementById('macro-carbs-val').textContent = `${c}%`;
      document.getElementById('macro-fats-val').textContent = `${f}%`;

      this.recalculateAll();
    };

    [pSlider, cSlider, fSlider].forEach(sl => {
      sl?.addEventListener('input', () => {
        cyberAudio.playClick();
        updateMacros();
      });
    });
  }

  bindOrganHovers() {
    document.addEventListener('mouseover', (e) => {
      const organRow = e.target.closest('[data-organ]');
      if (organRow) {
        const organName = organRow.getAttribute('data-organ');
        this.hologram?.highlightOrgan(organName);
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('[data-organ]')) {
        this.hologram?.highlightOrgan('');
      }
    });
  }

  bindArchetypeHelpers() {
    const helperBtns = document.querySelectorAll('[data-bf-preset]');
    helperBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const bf = parseFloat(btn.getAttribute('data-bf-preset'));
        this.state.bodyFat = bf;
        const bfRange = document.getElementById('input-bodyfat-range');
        const bfNum = document.getElementById('input-bodyfat-num');
        if (bfRange) bfRange.value = bf;
        if (bfNum) bfNum.value = bf;
        cyberAudio.playModeSwitch();
        this.recalculateAll();
      });
    });
  }

  bindExportDossier() {
    const btn = document.getElementById('btn-export-dossier');
    const modal = document.getElementById('dossier-modal');
    const btnClose = document.getElementById('btn-close-dossier');
    const btnPrint = document.getElementById('btn-print-dossier');

    btn?.addEventListener('click', () => {
      cyberAudio.playScan();
      this.populateDossierModal();
      modal?.classList.remove('hidden');
    });

    btnClose?.addEventListener('click', () => {
      cyberAudio.playClick();
      modal?.classList.add('hidden');
    });

    btnPrint?.addEventListener('click', () => {
      cyberAudio.playClick();
      window.print();
    });
  }

  populateDossierModal() {
    const { mifflin, katch, cunningham, tdeeDecomposed, goalPlan, pontzer, lbmKg } = this.latestResults;
    const isMetric = this.state.unit === 'metric';

    const wStr = isMetric 
      ? `${this.state.weightKg.toFixed(1)} kg` 
      : `${(this.state.weightKg * 2.20462).toFixed(1)} lbs`;
    const hStr = isMetric 
      ? `${Math.round(this.state.heightCm)} cm` 
      : `${(this.state.heightCm / 2.54).toFixed(1)} inches`;
    const lbmStr = isMetric 
      ? `${lbmKg.toFixed(1)} kg` 
      : `${(lbmKg * 2.20462).toFixed(1)} lbs`;

    const content = document.getElementById('dossier-content');
    if (!content) return;

    content.innerHTML = `
      <div class="space-y-6 font-mono text-sm">
        <div class="border-b border-cyan-500/30 pb-4 flex justify-between items-end">
          <div>
            <div class="text-xs uppercase text-cyan-400 tracking-widest">METABOLIC BIOMETRICS DOSSIER // v4.2</div>
            <div class="text-xl font-bold font-hud text-white mt-1">TELEMETRY DIAGNOSTIC PROFILE</div>
          </div>
          <div class="text-right text-xs text-slate-400">
            <div>DATE: ${new Date().toLocaleDateString()}</div>
            <div>STATUS: VERIFIED CLINICAL MODELS</div>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-900/90 rounded border border-slate-700">
          <div>
            <span class="text-slate-400 text-xs block">BIOLOGICAL SEX</span>
            <span class="text-cyan-300 font-bold uppercase">${this.state.gender}</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">CHRONOLOGICAL AGE</span>
            <span class="text-cyan-300 font-bold">${this.state.age} Years</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">TOTAL WEIGHT</span>
            <span class="text-cyan-300 font-bold">${wStr}</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">STATURE</span>
            <span class="text-cyan-300 font-bold">${hStr}</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">BODY FAT %</span>
            <span class="text-purple-300 font-bold">${this.state.bodyFat}%</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">LEAN BODY MASS (FFM)</span>
            <span class="text-purple-300 font-bold">${lbmStr}</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">ACTIVITY MULTIPLIER</span>
            <span class="text-amber-300 font-bold">${tdeeDecomposed.pal}x (PAL)</span>
          </div>
          <div>
            <span class="text-slate-400 text-xs block">TARGET GOAL</span>
            <span class="text-emerald-300 font-bold">${goalPlan.goalLabel}</span>
          </div>
        </div>

        <!-- Metabolic Rates Comparison -->
        <div>
          <h4 class="text-xs uppercase tracking-widest text-cyan-400 mb-2">1. Basal Metabolic Rate (BMR) Matrix</h4>
          <div class="grid grid-cols-3 gap-3">
            <div class="p-3 bg-slate-950 rounded border border-cyan-500/40">
              <div class="text-xs text-slate-400">Mifflin-St Jeor (Clinical Consensus)</div>
              <div class="text-xl font-bold text-cyan-300 mt-1">${Math.round(mifflin)} kcal</div>
            </div>
            <div class="p-3 bg-slate-950 rounded border border-purple-500/40">
              <div class="text-xs text-slate-400">Katch-McArdle (LBM Driver)</div>
              <div class="text-xl font-bold text-purple-300 mt-1">${Math.round(katch)} kcal</div>
            </div>
            <div class="p-3 bg-slate-950 rounded border border-slate-700">
              <div class="text-xs text-slate-400">Cunningham (Athletic Performance)</div>
              <div class="text-xl font-bold text-white mt-1">${Math.round(cunningham)} kcal</div>
            </div>
          </div>
        </div>

        <!-- Pontzer Science Lifespan Status -->
        <div class="p-3 bg-purple-950/30 border border-purple-500/40 rounded">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-purple-300 uppercase">2. Pontzer (2021) Lifespan Metabolic State</span>
            <span class="text-xs font-bold text-cyan-400">${(pontzer.multiplier * 100).toFixed(0)}% Adult Benchmark</span>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">${pontzer.description}</p>
        </div>

        <!-- TDEE & Goal Prescription -->
        <div>
          <h4 class="text-xs uppercase tracking-widest text-cyan-400 mb-2">3. Total Energy Expenditure & Action Plan</h4>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-slate-950 rounded border border-cyan-500/30">
              <div class="text-xs text-slate-400">MAINTENANCE EXPENDITURE (TDEE)</div>
              <div class="text-2xl font-extrabold text-white mt-1">${tdeeDecomposed.total} <span class="text-sm font-normal text-slate-400">kcal/day</span></div>
              <div class="text-xs text-slate-400 mt-2 space-y-1">
                <div>• BMR (Resting): ${tdeeDecomposed.bmr} kcal</div>
                <div>• NEAT (Non-Exercise): ${tdeeDecomposed.neat} kcal</div>
                <div>• TEF (Digestion): ${tdeeDecomposed.tef} kcal</div>
                <div>• EAT (Exercise): ${tdeeDecomposed.eat} kcal</div>
              </div>
            </div>

            <div class="p-4 bg-slate-950 rounded border border-emerald-500/30">
              <div class="text-xs text-slate-400">PRESCRIBED DAILY TARGET (${goalPlan.deltaPercent > 0 ? '+' : ''}${goalPlan.deltaPercent}%)</div>
              <div class="text-2xl font-extrabold text-emerald-400 mt-1">${goalPlan.targetCalories} <span class="text-sm font-normal text-slate-400">kcal/day</span></div>
              <div class="text-xs text-slate-300 mt-2 space-y-1">
                <div>• Protein: <strong class="text-white">${goalPlan.macros.protein.grams}g</strong> (${goalPlan.macros.protein.percent}% kcal)</div>
                <div>• Fats: <strong class="text-white">${goalPlan.macros.fat.grams}g</strong> (${goalPlan.macros.fat.percent}% kcal)</div>
                <div>• Carbs: <strong class="text-white">${goalPlan.macros.carbs.grams}g</strong> (${goalPlan.macros.carbs.percent}% kcal)</div>
                <div class="text-emerald-400/80 pt-1 font-bold">Predicted Trend: ${goalPlan.weeklyDeltaKg > 0 ? '+' : ''}${goalPlan.weeklyDeltaKg} kg/week</div>
              </div>
            </div>
          </div>
        </div>

        <div class="text-[10px] text-slate-400 pt-3 border-t border-slate-800">
          Generated by METABOLIC HUD v4.2. Citations: Mifflin et al. (1990), Katch & McArdle (1996), Pontzer et al., Science (2021), Hall et al. (2012). For scientific research and nutritional optimization.
        </div>
      </div>
    `;
  }

  recalculateAll() {
    const { weightKg, heightCm, age, gender, bodyFat, activity, goal, macroSplit } = this.state;

    // 1. Calculate formulas
    const mifflin = MetabolicScience.calculateMifflinStJeor({ weightKg, heightCm, ageYears: age, gender });
    const harris = MetabolicScience.calculateHarrisBenedict({ weightKg, heightCm, ageYears: age, gender });
    const katchObj = MetabolicScience.calculateKatchMcArdle({ weightKg, bodyFatPercent: bodyFat });
    const cunninghamObj = MetabolicScience.calculateCunningham({ weightKg, bodyFatPercent: bodyFat });
    const oxford = MetabolicScience.calculateOxford({ weightKg, heightCm, ageYears: age, gender });

    // Primary consensus BMR (Mifflin is clinical consensus)
    const consensusBmr = mifflin;

    // 2. Pontzer Lifespan Model
    const pontzer = MetabolicScience.getPontzerLifespanAnalysis(age);

    // 3. TDEE & Compartment Decomposition
    const tdeeDecomposed = MetabolicScience.decomposeTDEE({
      bmr: consensusBmr,
      activityKey: activity,
      macroSplit
    });

    // 4. Goal Plan & Macronutrient Targets
    const goalPlan = MetabolicScience.calculateGoalPlan({
      tdee: tdeeDecomposed.total,
      weightKg,
      bodyFatPercent: bodyFat,
      goalKey: goal
    });

    // 5. Organ Respiration Budget
    const organBreakdown = MetabolicScience.getOrganMetabolism(consensusBmr);

    this.latestResults = {
      mifflin,
      harris,
      katch: katchObj.bmr,
      cunningham: cunninghamObj.bmr,
      oxford,
      consensusBmr,
      pontzer,
      tdeeDecomposed,
      goalPlan,
      organBreakdown,
      lbmKg: katchObj.lbmKg
    };

    // Update 3D Holographic speed & pulse
    this.hologram?.updateMetabolicRate(consensusBmr);

    // Update Telemetry Displays
    this.updateUI();
  }

  updateUI() {
    const { mifflin, harris, katch, cunningham, oxford, consensusBmr, pontzer, tdeeDecomposed, goalPlan, organBreakdown, lbmKg } = this.latestResults;
    const isMetric = this.state.unit === 'metric';

    // 1. Radial Gauges
    TelemetryCharts.renderRadialGauge({
      containerId: 'bmr-radial-gauge',
      value: consensusBmr,
      max: 3500,
      label: "KCAL / DAY",
      sublabel: "BASAL METABOLIC RATE",
      color: "#00f0ff"
    });

    TelemetryCharts.renderRadialGauge({
      containerId: 'tdee-radial-gauge',
      value: tdeeDecomposed.total,
      max: 4500,
      label: "KCAL / DAY",
      sublabel: "TOTAL DAILY EXPENDITURE",
      color: "#a855f7"
    });

    // 2. Formula Comparison
    const formulaList = [
      { name: "Mifflin-St Jeor", value: mifflin, highlight: true, tag: "Clinical Standard", color: "#00f0ff", desc: "Gold standard clinical equation endorsed by AND", citation: "Mifflin et al. 1990" },
      { name: "Katch-McArdle", value: katch, highlight: false, tag: "LBM Driven", color: "#a855f7", desc: "Lean Mass based; highly accurate for athletic builds", citation: "Katch-McArdle 1996" },
      { name: "Cunningham", value: cunningham, highlight: false, tag: "Athletic", color: "#06b6d4", desc: "Performance standard for athletes with low adiposity", citation: "Cunningham 1980/1991" },
      { name: "Oxford / Henry", value: oxford, highlight: false, tag: "WHO Update", color: "#3b82f6", desc: "Modern age-bracketed FAO/WHO/UNU equation", citation: "Oxford 2005" },
      { name: "Revised Harris-Benedict", value: harris, highlight: false, tag: "Historical", color: "#ec4899", desc: "Classic baseline updated by Roza & Shizgal", citation: "Roza & Shizgal 1984" }
    ];
    TelemetryCharts.renderFormulaComparison({
      containerId: 'formula-comparison-container',
      formulas: formulaList,
      consensusBmr
    });

    // 3. Pontzer Lifespan Chart
    TelemetryCharts.renderPontzerLifespanChart({
      containerId: 'pontzer-chart-container',
      currentAge: this.state.age,
      lifespanData: pontzer
    });

    // 4. Energy Expenditure Compartments
    TelemetryCharts.renderEnergyCompartments({
      containerId: 'energy-compartments-container',
      decomposed: tdeeDecomposed
    });

    // 5. Goal prescription cards
    const goalCalEl = document.getElementById('prescribed-calories');
    const goalDeltaEl = document.getElementById('prescribed-delta');
    const goalNoteEl = document.getElementById('prescribed-note');
    const weeklyRateEl = document.getElementById('prescribed-weekly-rate');

    if (goalCalEl) goalCalEl.textContent = goalPlan.targetCalories;
    if (goalDeltaEl) {
      goalDeltaEl.textContent = `${goalPlan.deltaPercent > 0 ? '+' : ''}${goalPlan.deltaPercent}% (${goalPlan.goalLabel})`;
      goalDeltaEl.className = `text-xs font-bold ${goalPlan.deltaPercent < 0 ? 'text-amber-400' : (goalPlan.deltaPercent > 0 ? 'text-cyan-400' : 'text-purple-400')}`;
    }
    if (goalNoteEl) goalNoteEl.textContent = goalPlan.note;
    if (weeklyRateEl) {
      const weeklyKg = goalPlan.weeklyDeltaKg;
      const weeklyLbs = (weeklyKg * 2.20462).toFixed(2);
      weeklyRateEl.textContent = isMetric 
        ? `${weeklyKg > 0 ? '+' : ''}${weeklyKg.toFixed(2)} kg / week` 
        : `${weeklyKg > 0 ? '+' : ''}${weeklyLbs} lbs / week`;
    }

    // Macros
    document.getElementById('macro-protein-g').textContent = `${goalPlan.macros.protein.grams}g`;
    document.getElementById('macro-protein-pct').textContent = `${goalPlan.macros.protein.percent}%`;
    document.getElementById('macro-fat-g').textContent = `${goalPlan.macros.fat.grams}g`;
    document.getElementById('macro-fat-pct').textContent = `${goalPlan.macros.fat.percent}%`;
    document.getElementById('macro-carbs-g').textContent = `${goalPlan.macros.carbs.grams}g`;
    document.getElementById('macro-carbs-pct').textContent = `${goalPlan.macros.carbs.percent}%`;

    // Lean Body Mass & Fat Mass readouts
    const fatMassKg = this.state.weightKg * (this.state.bodyFat / 100);
    const lbmDisplay = isMetric ? `${lbmKg.toFixed(1)} kg` : `${(lbmKg * 2.20462).toFixed(1)} lbs`;
    const fatMassDisplay = isMetric ? `${fatMassKg.toFixed(1)} kg` : `${(fatMassKg * 2.20462).toFixed(1)} lbs`;

    const lbmEl = document.getElementById('val-lbm');
    const fatEl = document.getElementById('val-fatmass');
    if (lbmEl) lbmEl.textContent = lbmDisplay;
    if (fatEl) fatEl.textContent = fatMassDisplay;

    // 6. Organ Respiration List
    const organContainer = document.getElementById('organ-breakdown-container');
    if (organContainer) {
      let organHtml = `<div class="space-y-2">`;
      organBreakdown.forEach(org => {
        organHtml += `
          <div 
            data-organ="${org.organ}"
            class="organ-row flex items-center justify-between p-2.5 bg-slate-900/50 hover:bg-slate-800/80 rounded border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all font-mono"
          >
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full" style="background: ${org.color}; box-shadow: 0 0 6px ${org.color};"></span>
              <div>
                <div class="text-xs font-bold text-white">${org.organ}</div>
                <div class="text-[10px] text-slate-400">${org.role}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs font-bold text-cyan-300">${org.kcal} kcal</div>
              <div class="text-[10px] text-slate-400">${org.percent}% BMR</div>
            </div>
          </div>
        `;
      });
      organHtml += `</div>`;
      organContainer.innerHTML = organHtml;
    }
  }
}

// Instantiate on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.metabolicApp = new MetabolicApp();
  window.metabolicApp.init();
});
