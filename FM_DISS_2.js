// FM_DISS.js
// Interface integrada: cálculo de parciais FM (2 timbres) + curva de dissonância sensorial
// Usa p5.js em modo instance e Web Audio API

const fmDissSketch = (p) => {
  // --------- Variáveis do módulo FM (comum) ---------
  let carrierHzInput, midiInputFM, freqModeRadio;

  // Timbre 1
  let harmInput1, betaInput1, maxElemInput1, filterCheckbox1;
  let ratiosArea1, ampsArea1, calcButtonFM1, playButtonFM1, infoPFM1;

  // Timbre 2
  let harmInput2, betaInput2, maxElemInput2, filterCheckbox2;
  let ratiosArea2, ampsArea2, calcButtonFM2, playButtonFM2, infoPFM2;

  let factMemo = [1]; // memo de fatorial
  let currentParciais1 = [];
  let currentParciais2 = [];
  let lastFc = 0;     // frequência da portadora (comum)
  let lastFm1 = 0;
  let lastFm2 = 0;

  let containerFM;

  // --------- Variáveis do módulo DISS ---------
  let midiInputDISS;
  let ratioMinInput, ratioMaxInput; // controles de âmbito intervalar
  let calcButtonDISS;
  let minRatiosArea, minMidiArea, infoPDISS;

  let alphaArray = [];
  let dissArray = [];
  let minimaIndices = [];

  let fundamentalFreqDISS = 0;

  // Espectros globais para playback e dissonância (2 timbres)
  let baseFreqs1Global = [];
  let baseAmps1Global = [];
  let baseFreqs2Global = [];
  let baseAmps2Global = [];

  // Âmbito horizontal (razões intervalares) – parametrizável
  let ratioMin = 1.0;
  let ratioMax = 2.0;

  let plotX0 = 60;
  let plotX1;
  let plotY0 = 30;
  let plotY1;

  let containerDISS;

  // --------- Áudio (compartilhado) ---------
  let audioCtx = null;

  // =====================================================
  // SETUP
  // =====================================================
  p.setup = () => {
    containerFM = p.select("#fm-container");
    containerDISS = p.select("#diss-container");

    // Remove canvas padrão; o canvas será criado só para o gráfico de dissonância
    p.noCanvas();

    // ============ UI FM (comum) ============
    const titleFM = p.createElement("h2", "Calculadora de Parciais FM (2 timbres)");
    titleFM.parent(containerFM);

    const introFM = p.createP(
      "Insira os parâmetros da síntese FM para dois timbres com a MESMA frequência de portadora e clique em \"Calcular espectro\" para cada um. " +
      "As listas podem ser editadas e copiadas com Ctrl+C. Depois, use os botões de síntese aditiva para ouvir cada timbre separadamente."
    );
    introFM.parent(containerFM);

    const modeLabel = p.createP("Modo de entrada da frequência da portadora (comum aos 2 timbres):");
    modeLabel.parent(containerFM);

    freqModeRadio = p.createRadio();
    freqModeRadio.option("hz", "Inserir frequência em Hz");
    freqModeRadio.option("midi", "Inserir nota MIDI");
    freqModeRadio.selected("hz");
    freqModeRadio.style("margin-bottom", "8px");
    freqModeRadio.parent(containerFM);

    carrierHzInput = createLabeledInputFM(
      "Frequência da portadora (Hz): ",
      "261.625565"
    );

    midiInputFM = createLabeledInputFM(
      "Nota MIDI da portadora (ex.: 60): ",
      "60"
    );

    // ---------- Timbre FM 1 ----------
    const sep1 = p.createElement("h3", "Timbre FM 1");
    sep1.parent(containerFM);

    harmInput1 = createLabeledInputFM(
      "Índice de harmonicidade H₁ (fm/fc): ",
      "2.2673"
    );

    betaInput1 = createLabeledInputFM(
      "Índice de modulação β₁: ",
      "5"
    );

    maxElemInput1 = createLabeledInputFM(
      "Número máximo de elementos nas listas de saída (Timbre 1): ",
      "20"
    );

    filterCheckbox1 = p.createCheckbox(
      "Remover parciais com amplitude < 0.01 (Timbre 1)",
      false
    );
    filterCheckbox1.style("margin", "8px 0");
    filterCheckbox1.parent(containerFM);

    calcButtonFM1 = p.createButton("Calcular espectro (Timbre 1)");
    calcButtonFM1.mousePressed(() => calcularFMTimbre(1));
    calcButtonFM1.style("margin", "8px 4px 8px 0");
    calcButtonFM1.parent(containerFM);

    playButtonFM1 = p.createButton("Tocar som (síntese aditiva Timbre 1)");
    playButtonFM1.mousePressed(() => playAdditiveSoundFMTimbre(1));
    playButtonFM1.style("margin", "8px 0");
    playButtonFM1.parent(containerFM);

    infoPFM1 = p.createP("");
    infoPFM1.style("font-family", "monospace");
    infoPFM1.parent(containerFM);

    const ratiosLabel1 = p.createP("Razões Timbre 1 (|freq_parcial| / freq_portadora):");
    ratiosLabel1.parent(containerFM);

    ratiosArea1 = p.createElement("textarea");
    ratiosArea1.attribute("rows", "6");
    ratiosArea1.attribute("cols", "50");
    ratiosArea1.style("display", "block");
    ratiosArea1.style("margin-bottom", "8px");
    ratiosArea1.parent(containerFM);

    const ampsLabel1 = p.createP("Amplitudes absolutas correspondentes Timbre 1 (|Jₙ(β₁)|):");
    ampsLabel1.parent(containerFM);

    ampsArea1 = p.createElement("textarea");
    ampsArea1.attribute("rows", "6");
    ampsArea1.attribute("cols", "50");
    ampsArea1.style("display", "block");
    ampsArea1.style("margin-bottom", "16px");
    ampsArea1.parent(containerFM);

    // ---------- Timbre FM 2 ----------
    const sep2 = p.createElement("h3", "Timbre FM 2");
    sep2.parent(containerFM);

    harmInput2 = createLabeledInputFM(
      "Índice de harmonicidade H₂ (fm/fc): ",
      "3.0"
    );

    betaInput2 = createLabeledInputFM(
      "Índice de modulação β₂: ",
      "5"
    );

    maxElemInput2 = createLabeledInputFM(
      "Número máximo de elementos nas listas de saída (Timbre 2): ",
      "20"
    );

    filterCheckbox2 = p.createCheckbox(
      "Remover parciais com amplitude < 0.01 (Timbre 2)",
      false
    );
    filterCheckbox2.style("margin", "8px 0");
    filterCheckbox2.parent(containerFM);

    calcButtonFM2 = p.createButton("Calcular espectro (Timbre 2)");
    calcButtonFM2.mousePressed(() => calcularFMTimbre(2));
    calcButtonFM2.style("margin", "8px 4px 8px 0");
    calcButtonFM2.parent(containerFM);

    playButtonFM2 = p.createButton("Tocar som (síntese aditiva Timbre 2)");
    playButtonFM2.mousePressed(() => playAdditiveSoundFMTimbre(2));
    playButtonFM2.style("margin", "8px 0");
    playButtonFM2.parent(containerFM);

    infoPFM2 = p.createP("");
    infoPFM2.style("font-family", "monospace");
    infoPFM2.parent(containerFM);

    const ratiosLabel2 = p.createP("Razões Timbre 2 (|freq_parcial| / freq_portadora):");
    ratiosLabel2.parent(containerFM);

    ratiosArea2 = p.createElement("textarea");
    ratiosArea2.attribute("rows", "6");
    ratiosArea2.attribute("cols", "50");
    ratiosArea2.style("display", "block");
    ratiosArea2.style("margin-bottom", "8px");
    ratiosArea2.parent(containerFM);

    const ampsLabel2 = p.createP("Amplitudes absolutas correspondentes Timbre 2 (|Jₙ(β₂)|):");
    ampsLabel2.parent(containerFM);

    ampsArea2 = p.createElement("textarea");
    ampsArea2.attribute("rows", "6");
    ampsArea2.attribute("cols", "50");
    ampsArea2.style("display", "block");
    ampsArea2.style("margin-bottom", "16px");
    ampsArea2.parent(containerFM);

    // ============ UI DISS (gráfico + controles) ============
    const titleDISS = p.createElement("h2", "Curva de dissonância sensorial (Sethares) para 2 timbres");
    titleDISS.parent(containerDISS);

    const introDISS = p.createP(
      "1) Informe a nota fundamental em MIDI. " +
      "2) Ajuste o âmbito de razões intervalares (mín./máx.). " +
      "3) Clique em \"Calcular curva de dissonância\" para usar os dois timbres FM gerados. " +
      "Timbre 1 fica na fundamental; Timbre 2 é transposto pelo intervalo (razão). " +
      "4) Clique no gráfico para ouvir duas notas com espectros distintos."
    );
    introDISS.parent(containerDISS);

    // Canvas para o gráfico de dissonância
    const canvas = p.createCanvas(800, 400);
    canvas.parent(containerDISS);

    plotX1 = p.width - 30;
    plotY1 = p.height - 60;

    p.textFont("sans-serif");
    p.noSmooth();

    midiInputDISS = createLabeledInputDISS("Nota MIDI fundamental para análise de dissonância:", "60");

    ratioMinInput = createLabeledInputDISS("Razão intervalar mínima:", "1.0");
    ratioMaxInput = createLabeledInputDISS("Razão intervalar máxima:", "2.0");

    calcButtonDISS = p.createButton("Calcular curva de dissonância");
    calcButtonDISS.mousePressed(computeDissonanceCurve);
    calcButtonDISS.style("margin", "8px 0");
    calcButtonDISS.parent(containerDISS);

    infoPDISS = p.createP("");
    infoPDISS.style("font-family", "monospace");
    infoPDISS.parent(containerDISS);

    const minRatiosLabel = p.createP("Razões intervalares dos mínimos locais de dissonância (entre razão mínima e máxima):");
    minRatiosLabel.parent(containerDISS);

    minRatiosArea = p.createElement("textarea");
    minRatiosArea.attribute("rows", "4");
    minRatiosArea.attribute("cols", "40");
    minRatiosArea.style("display", "block");
    minRatiosArea.parent(containerDISS);

    const minMidiLabel = p.createP("Notas MIDI (microtonais) correspondentes aos mínimos locais:");
    minMidiLabel.parent(containerDISS);

    minMidiArea = p.createElement("textarea");
    minMidiArea.attribute("rows", "4");
    minMidiArea.attribute("cols", "40");
    minMidiArea.style("display", "block");
    minMidiArea.parent(containerDISS);
  };

  // =====================================================
  // DRAW (apenas o gráfico de dissonância)
  // =====================================================
  p.draw = () => {
    p.background(250);

    drawAxes();

    if (alphaArray.length > 0 && dissArray.length === alphaArray.length) {
      drawCurve();
      drawMinimaPoints();
      drawHoverTooltip();
    }
  };

  // =====================================================
  // Helpers de interface (FM e DISS)
  // =====================================================
  function createLabeledInputFM(labelText, defaultValue) {
    const div = p.createDiv();
    div.style("margin", "4px 0");
    div.parent(containerFM);

    const label = p.createSpan(labelText);
    label.parent(div);

    const inp = p.createInput(defaultValue, "number");
    inp.parent(div);
    inp.style("margin-left", "4px");
    inp.style("width", "120px");

    return inp;
  }

  function createLabeledInputDISS(labelText, defaultValue) {
    const div = p.createDiv();
    div.style("margin", "4px 0");
    div.parent(containerDISS);

    const label = p.createSpan(labelText);
    label.parent(div);

    const inp = p.createInput(defaultValue, "number");
    inp.parent(div);
    inp.style("margin-left", "4px");
    inp.style("width", "140px");

    return inp;
  }

  // =====================================================
  // MÓDULO FM
  // =====================================================

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Retorna fc comum (Hz) ou NaN se inválido
  function getFcCommon() {
    const mode = freqModeRadio.value();
    if (mode === "hz") {
      const fcHz = parseFloat(carrierHzInput.value());
      if (!isFinite(fcHz) || fcHz <= 0) {
        return NaN;
      }
      return fcHz;
    } else {
      const midiVal = parseFloat(midiInputFM.value());
      if (!isFinite(midiVal)) {
        return NaN;
      }
      return midiToFreq(midiVal);
    }
  }

  function calcularFMTimbre(which) {
    let fc = getFcCommon();
    if (!isFinite(fc)) {
      if (which === 1) infoPFM1.html("Frequência da portadora inválida (Hz ou MIDI).");
      else infoPFM2.html("Frequência da portadora inválida (Hz ou MIDI).");
      return;
    }
    lastFc = fc;

    let Hinput, betaInput, maxElemInput, filterCheckbox, infoP, ratiosArea, ampsArea;
    let isTimbre1 = (which === 1);

    if (isTimbre1) {
      Hinput = harmInput1;
      betaInput = betaInput1;
      maxElemInput = maxElemInput1;
      filterCheckbox = filterCheckbox1;
      infoP = infoPFM1;
      ratiosArea = ratiosArea1;
      ampsArea = ampsArea1;
    } else {
      Hinput = harmInput2;
      betaInput = betaInput2;
      maxElemInput = maxElemInput2;
      filterCheckbox = filterCheckbox2;
      infoP = infoPFM2;
      ratiosArea = ratiosArea2;
      ampsArea = ampsArea2;
    }

    const H = parseFloat(Hinput.value());
    const beta = parseFloat(betaInput.value());
    const maxElems = parseInt(maxElemInput.value(), 10);

    if (!isFinite(H) || !isFinite(beta) || !isFinite(maxElems) || maxElems <= 0) {
      infoP.html("Parâmetros inválidos. Verifique H, β e o número máximo.");
      ratiosArea.value("");
      ampsArea.value("");
      if (isTimbre1) currentParciais1 = []; else currentParciais2 = [];
      return;
    }

    const fm = H * fc;
    const N_internal = 50;

    let parciais = [];

    for (let n = -N_internal; n <= N_internal; n++) {
      const fn = fc + n * fm;
      const fnAbs = Math.abs(fn);
      if (!isFinite(fnAbs) || fnAbs === 0) continue;

      const amp = Math.abs(besselJ(n, beta)); // amplitude absoluta

      parciais.push({
        n: n,
        freq: fnAbs,           // frequência refletida para o eixo positivo
        ratio: fnAbs / fc,     // razão sempre positiva
        amp: amp               // amplitude positiva
      });
    }

    if (filterCheckbox.checked()) {
      parciais = parciais.filter(p0 => p0.amp >= 0.01);
    }

    parciais.sort((a, b) => a.ratio - b.ratio);

    if (parciais.length > maxElems) {
      parciais = parciais.slice(0, maxElems);
    }

    if (isTimbre1) {
      currentParciais1 = parciais;
      lastFm1 = fm;
    } else {
      currentParciais2 = parciais;
      lastFm2 = fm;
    }

    const ratios = parciais.map(p0 => p0.ratio);
    const amps = parciais.map(p0 => p0.amp);

    ratiosArea.value(formatArrayTruncated(ratios, 2));
    ampsArea.value(formatArrayTruncated(amps, 2));

    infoP.html(
      "Timbre " + which + ": fc = " + fc.toFixed(4) + " Hz, fm = " + fm.toFixed(4) + " Hz, " +
      "parciais listados (incluindo refletidos) = " + parciais.length
    );

    // sempre que recalcular qualquer timbre, limpamos a curva de dissonância antiga
    resetDissonanceData();
  }

  // Síntese aditiva de cada timbre FM separadamente
  function playAdditiveSoundFMTimbre(which) {
    let parciais, infoP;
    if (which === 1) {
      parciais = currentParciais1;
      infoP = infoPFM1;
    } else {
      parciais = currentParciais2;
      infoP = infoPFM2;
    }

    if (!parciais || parciais.length === 0) {
      infoP.html("Calcule o espectro do Timbre " + which + " antes de tocar o som.");
      return;
    }

    if (!isFinite(lastFc) || lastFc <= 0) {
      infoP.html("Frequência da portadora inválida. Recalcule o espectro.");
      return;
    }

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
    } catch (e) {
      infoP.html("Seu navegador não suporta Web Audio API.");
      return;
    }

    const duration = 2.0;
    const now = audioCtx.currentTime;

    const masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);

    let totalAmp = 0;
    parciais.forEach(p0 => {
      totalAmp += p0.amp;
    });

    if (totalAmp <= 0) {
      masterGain.gain.setValueAtTime(0, now);
      infoP.html("Sem amplitude suficiente para síntese.");
      return;
    }

    const scale = 0.7 / totalAmp;

    masterGain.gain.setValueAtTime(1.0, now);
    masterGain.gain.setTargetAtTime(0.0, now + duration * 0.8, 0.2);

    parciais.forEach(p0 => {
      const freq = lastFc * p0.ratio;

      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(p0.amp * scale, now);

      osc.connect(g);
      g.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration);
    });

    infoP.html(
      "Tocando som aditivo do Timbre " + which + ": fc = " + lastFc.toFixed(2) +
      " Hz, parciais usados = " + parciais.length
    );
  }

  // Fatorial com memoização
  function factorial(n) {
    if (n < 0) return NaN;
    if (factMemo[n] !== undefined) return factMemo[n];

    let lastIndex = factMemo.length - 1;
    let res = factMemo[lastIndex];

    for (let i = lastIndex + 1; i <= n; i++) {
      res *= i;
      factMemo[i] = res;
    }
    return factMemo[n];
  }

  // Bessel J_n(x)
  function besselJ(n, x) {
    let sign = 1;
    if (n < 0) {
      const k = -n;
      sign = (k % 2 === 0) ? 1 : -1;
      n = k;
    }

    const maxM = 50;
    const x2 = x / 2.0;
    let sum = 0;

    for (let m = 0; m < maxM; m++) {
      const num = Math.pow(-1, m) * Math.pow(x2, 2 * m + n);
      const denom = factorial(m) * factorial(m + n);
      const term = num / denom;
      sum += term;
      if (Math.abs(term) < 1e-15) break;
    }

    return sign * sum;
  }

  function truncateToDecimals(x, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.trunc(x * factor) / factor;
  }

  function formatArrayTruncated(arr, decimals) {
    if (!arr || arr.length === 0) return "[]";
    return "[" + arr
      .map(x => truncateToDecimals(x, decimals).toFixed(decimals))
      .join(", ") + "]";
  }

  // =====================================================
  // MÓDULO DISSONÂNCIA SENSORIAL
  // =====================================================

  function freqToMidi(freq) {
    return 69 + 12 * (Math.log(freq / 440) / Math.log(2));
  }

  function resetDissonanceData() {
    alphaArray = [];
    dissArray = [];
    minimaIndices = [];
    baseFreqs1Global = [];
    baseAmps1Global = [];
    baseFreqs2Global = [];
    baseAmps2Global = [];
    if (minRatiosArea) minRatiosArea.value("");
    if (minMidiArea) minMidiArea.value("");
  }

  function parseNumberList(str) {
    if (!str) return [];
    let cleaned = str.replace(/[\[\]]/g, " ");
    const tokens = cleaned.split(/[\s,]+/);
    const nums = [];
    for (let t of tokens) {
      if (!t) continue;
      const v = parseFloat(t);
      if (isFinite(v)) nums.push(v);
    }
    return nums;
  }

  function computeDissonanceCurve() {
    const midiVal = parseFloat(midiInputDISS.value());
    if (!isFinite(midiVal)) {
      infoPDISS.html("Nota MIDI inválida.");
      resetDissonanceData();
      return;
    }
    fundamentalFreqDISS = midiToFreq(midiVal);

    // Lê o âmbito de razões intervalares
    const rMinVal = parseFloat(ratioMinInput.value());
    const rMaxVal = parseFloat(ratioMaxInput.value());

    if (!isFinite(rMinVal) || !isFinite(rMaxVal)) {
      infoPDISS.html("Razões intervalares mínima/máxima inválidas.");
      resetDissonanceData();
      return;
    }
    if (rMaxVal <= rMinVal) {
      infoPDISS.html("Razão máxima deve ser maior que a mínima.");
      resetDissonanceData();
      return;
    }

    ratioMin = rMinVal;
    ratioMax = rMaxVal;

    // Pega SEMPRE as listas (possivelmente editadas) de ambos timbres
    const ratios1 = parseNumberList(ratiosArea1.value());
    const amps1   = parseNumberList(ampsArea1.value());
    const ratios2 = parseNumberList(ratiosArea2.value());
    const amps2   = parseNumberList(ampsArea2.value());

    if (ratios1.length === 0 || amps1.length === 0 ||
        ratios2.length === 0 || amps2.length === 0) {
      infoPDISS.html("Listas de razões e amplitudes dos dois timbres devem estar preenchidas. Calcule os espectros FM ou ajuste as listas.");
      resetDissonanceData();
      return;
    }
    if (ratios1.length !== amps1.length) {
      infoPDISS.html("Timbre 1: listas de razões e amplitudes devem ter o MESMO tamanho.");
      resetDissonanceData();
      return;
    }
    if (ratios2.length !== amps2.length) {
      infoPDISS.html("Timbre 2: listas de razões e amplitudes devem ter o MESMO tamanho.");
      resetDissonanceData();
      return;
    }

    baseFreqs1Global = ratios1.map(r => fundamentalFreqDISS * r);
    baseAmps1Global  = amps1.slice();
    baseFreqs2Global = ratios2.map(r => fundamentalFreqDISS * r);
    baseAmps2Global  = amps2.slice();

    const rLow = ratioMin;
    const rHigh = ratioMax;
    const nPoints = 600;

    alphaArray = [];
    dissArray = [];

    for (let i = 0; i < nPoints; i++) {
      const alpha = p.map(i, 0, nPoints - 1, rLow, rHigh);

      const freq1 = baseFreqs1Global; // Timbre 1 na fundamental
      const freq2 = baseFreqs2Global.map(f => f * alpha); // Timbre 2 transposto

      const fvec = freq1.concat(freq2);
      const avec = baseAmps1Global.concat(baseAmps2Global);

      const d = dissMeasureSethares(fvec, avec);

      alphaArray.push(alpha);
      dissArray.push(d);
    }

    minimaIndices = [];
    for (let i = 1; i < dissArray.length - 1; i++) {
      if (dissArray[i] < dissArray[i - 1] && dissArray[i] < dissArray[i + 1]) {
        minimaIndices.push(i);
      }
    }

    const minRatios = [];
    const minMidis = [];

    for (let idx of minimaIndices) {
      const alpha = alphaArray[idx];
      const freq = fundamentalFreqDISS * alpha;
      const midiNote = freqToMidi(freq); // microtonal

      minRatios.push(alpha);
      minMidis.push(midiNote);
    }

    minRatiosArea.value(formatArray(minRatios, 4));
    minMidiArea.value(formatArray(minMidis, 4));

    infoPDISS.html(
      "Curva calculada com " + alphaArray.length +
      " pontos. Mínimos locais encontrados: " + minimaIndices.length + ". " +
      "Âmbito de análise: razões de " + ratioMin.toFixed(3) + " a " + ratioMax.toFixed(3) + ". " +
      "Clique no gráfico para ouvir duas notas com timbres distintos."
    );
  }

  function formatArray(arr, decimals) {
    if (arr.length === 0) return "[]";
    return "[" +
      arr.map(x => x.toFixed(decimals)).join(", ") +
      "]";
  }

  // ---------- Modelo de dissonância de Sethares ----------

  function dissMeasureSethares(freqArray, ampArray) {
    const idx = [...freqArray.keys()].sort((i, j) => freqArray[i] - freqArray[j]);
    const fr = idx.map(i => freqArray[i]);
    const am = idx.map(i => ampArray[i]);

    const Dstar = 0.24;
    const S1 = 0.0207;
    const S2 = 18.96;
    const C1 = 5.0;
    const C2 = -5.0;
    const A1 = -3.51;
    const A2 = -5.75;

    let D = 0.0;
    const n = fr.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const f1 = fr[i];
        const f2 = fr[j];
        const a1 = am[i];
        const a2 = am[j];

        const Fmin = Math.min(f1, f2);
        const Fdif = Math.abs(f2 - f1);
        const S = Dstar / (S1 * Fmin + S2);
        const a = Math.min(a1, a2);

        const x = S * Fdif;
        const term = a * (C1 * Math.exp(A1 * x) + C2 * Math.exp(A2 * x));

        D += term;
      }
    }
    return D;
  }

  // =====================================================
  // DESENHO DO GRÁFICO DE DISSONÂNCIA
  // =====================================================

  function drawAxes() {
    p.stroke(0);
    p.strokeWeight(1);

    // Eixos
    p.line(plotX0, plotY1, p.width - 20, plotY1); // eixo X
    p.line(plotX0, plotY1, plotX0, plotY0);       // eixo Y

    // Ticks eixo X: adaptados ao âmbito ratioMin–ratioMax (aprox. 10 divisões)
    p.textSize(11);
    if (ratioMax > ratioMin) {
      const nTicks = 10;
      const step = (ratioMax - ratioMin) / nTicks;
      for (let k = 0; k <= nTicks; k++) {
        const r = ratioMin + step * k;
        const x = p.map(r, ratioMin, ratioMax, plotX0, plotX1);
        p.stroke(200);
        p.line(x, plotY1, x, plotY1 - 5); // pequeno tick para cima
        p.noStroke();
        p.fill(0);
        p.textAlign(p.CENTER, p.TOP);
        p.text(r.toFixed(2), x, plotY1 + 5);
      }
    }

    // Título do eixo X (mais abaixo para não sobrepor a escala)
    p.noStroke();
    p.fill(0);
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    p.text("Razão de frequências (intervalo)", (plotX0 + plotX1) / 2, plotY1 + 28);

    // Título do eixo Y
    p.push();
    p.translate(20, (plotY0 + plotY1) / 2);
    p.rotate(-p.HALF_PI);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("Dissonância sensorial (relativa)", 0, 0);
    p.pop();

    // Ticks eixo Y: passos de 0.1 até o máximo (dinâmico)
    if (dissArray.length > 0) {
      const dMin = Math.min(...dissArray);
      const dMax = Math.max(...dissArray);
      const maxTick = Math.ceil(dMax * 10) / 10;
      const minTick = 0.0;

      p.textSize(11);
      p.textAlign(p.RIGHT, p.CENTER);

      for (let v = minTick; v <= maxTick + 1e-6; v += 0.1) {
        const y = p.map(v, dMin, dMax, plotY1, plotY0);
        if (y < plotY0 || y > plotY1) continue;

        p.stroke(230);
        p.line(plotX0, y, plotX1, y); // linha de grade horizontal

        p.noStroke();
        p.fill(0);
        p.text(v.toFixed(1), plotX0 - 8, y);
      }
    }
  }

  function drawCurve() {
    if (dissArray.length < 2) return;

    const dMin = Math.min(...dissArray);
    const dMax = Math.max(...dissArray);

    p.stroke(50, 80, 200);
    p.strokeWeight(1.5);
    p.noFill();

    p.beginShape();
    for (let i = 0; i < alphaArray.length; i++) {
      const x = p.map(alphaArray[i], ratioMin, ratioMax, plotX0, plotX1);
      const y = p.map(dissArray[i], dMin, dMax, plotY1, plotY0);
      p.vertex(x, y);
    }
    p.endShape();
  }

  function drawMinimaPoints() {
    if (!minimaIndices || minimaIndices.length === 0) return;

    const dMin = Math.min(...dissArray);
    const dMax = Math.max(...dissArray);

    p.noStroke();
    p.fill(255, 140, 0);
    for (let idx of minimaIndices) {
      const alpha = alphaArray[idx];
      const d = dissArray[idx];
      const x = p.map(alpha, ratioMin, ratioMax, plotX0, plotX1);
      const y = p.map(d, dMin, dMax, plotY1, plotY0);
      p.ellipse(x, y, 8, 8);
    }
  }

  function drawHoverTooltip() {
    if (alphaArray.length === 0) return;

    if (p.mouseX < plotX0 || p.mouseX > plotX1 || p.mouseY < plotY0 || p.mouseY > plotY1) return;

    const t = p.constrain((p.mouseX - plotX0) / (plotX1 - plotX0), 0, 1);
    const idx = Math.floor(t * (alphaArray.length - 1));
    const alpha = alphaArray[idx];

    const dMin = Math.min(...dissArray);
    const dMax = Math.max(...dissArray);
    const d = dissArray[idx];

    const x = p.map(alpha, ratioMin, ratioMax, plotX0, plotX1);
    const y = p.map(d, dMin, dMax, plotY1, plotY0);

    // Cálculo da nota MIDI correspondente à razão intervalar
    let midiText = "";
    if (fundamentalFreqDISS > 0) {
      const freq = fundamentalFreqDISS * alpha;
      const midiVal = freqToMidi(freq);
      midiText = "MIDI: " + midiVal.toFixed(2);
    }

    p.stroke(0);
    p.fill(255);
    p.ellipse(x, y, 10, 10);

    const ratioText = "Razão: " + alpha.toFixed(4);
    const dissText = "Dissonância: " + d.toFixed(3);

    const tw = Math.max(
      p.textWidth(ratioText),
      p.textWidth(dissText),
      p.textWidth(midiText || "")
    ) + 10;
    const th = midiText ? 42 : 30;

    let bx = x + 10;
    let by = y - th - 10;
    if (bx + tw > p.width) bx = p.width - tw - 10;
    if (by < 10) by = y + 10;

    p.noStroke();
    p.fill(255, 245);
    p.rect(bx, by, tw, th);

    p.fill(0);
    p.textAlign(p.LEFT, p.TOP);
    p.text(ratioText, bx + 5, by + 3);
    p.text(dissText, bx + 5, by + 15);
    if (midiText) {
      p.text(midiText, bx + 5, by + 27);
    }
  }

  // =====================================================
  // Clique para playback da dissonância (duas notas, 2 timbres)
  // =====================================================
  p.mousePressed = () => {
    if (alphaArray.length === 0) return;

    if (p.mouseX < plotX0 || p.mouseX > plotX1 || p.mouseY < plotY0 || p.mouseY > plotY1) return;
    if (baseFreqs1Global.length === 0 || baseAmps1Global.length === 0 ||
        baseFreqs2Global.length === 0 || baseAmps2Global.length === 0) return;

    const t = p.constrain((p.mouseX - plotX0) / (plotX1 - plotX0), 0, 1);
    const idx = Math.floor(t * (alphaArray.length - 1));
    const alpha = alphaArray[idx];

    playTwoToneAdditive(alpha);
  };

  function playTwoToneAdditive(alpha) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
    } catch (e) {
      infoPDISS.html("Seu navegador não suporta Web Audio API.");
      return;
    }

    const duration = 1.2;
    const now = audioCtx.currentTime;

    const masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);

    let totalAmp = 0;
    baseAmps1Global.forEach(a => totalAmp += a);
    baseAmps2Global.forEach(a => totalAmp += a);
    const totalAmpAll = totalAmp;

    if (totalAmpAll <= 0) {
      masterGain.gain.setValueAtTime(0, now);
      return;
    }

    const scale = 0.7 / totalAmpAll;

    masterGain.gain.setValueAtTime(1.0, now);
    masterGain.gain.setTargetAtTime(0.0, now + duration * 0.7, 0.25);

    // Nota 1: Timbre 1 na fundamental
    baseFreqs1Global.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(baseAmps1Global[i] * scale, now);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + duration);
    });

    // Nota 2: Timbre 2 transposto por alpha
    baseFreqs2Global.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f * alpha, now);
      g.gain.setValueAtTime(baseAmps2Global[i] * scale, now);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + duration);
    });

    infoPDISS.html(
      "Reproduzindo duas notas com timbres distintos: fundamental = " +
      fundamentalFreqDISS.toFixed(2) + " Hz, intervalo razão = " +
      alpha.toFixed(4)
    );
  }
};

new p5(fmDissSketch);
