document.addEventListener("DOMContentLoaded", () => {
    // i18n Translations Dictionary
    const translations = {
      en: {
        hudTitle: "Simulation Stats",
        population: "Population:",
        born: "Total Born:",
        died: "Total Died:",
        gen: "Generation:",
        speed: "Speed:",
        historyTrail: "Show Trail",
        wrapEdges: "Wrap Edges",
        play: "Play",
        pause: "Pause",
        spawn: "Spawn Preset",
        clear: "Clear",
        patterns: {
          random: "Random",
          glider: "Glider",
          gliderGun: "Gosper Glider Gun",
          pulsar: "Pulsar",
          lwss: "Spaceship",
          acorn: "Acorn"
        }
      },
      ko: {
        hudTitle: "시뮬레이션 통계",
        population: "현재 개체 수:",
        born: "총 태어난 수:",
        died: "총 죽은 수:",
        gen: "진행 세대:",
        speed: "속도:",
        historyTrail: "흔적 표시",
        wrapEdges: "화면 연결 (워프)",
        play: "재생",
        pause: "일시정지",
        spawn: "프리셋 생성",
        clear: "초기화",
        patterns: {
          random: "랜덤",
          glider: "글라이더",
          gliderGun: "글라이더 캐논",
          pulsar: "펄서",
          lwss: "경량 우주선",
          acorn: "도토리"
        }
      }
    };

    let currentLang = "en";

    // Canvas & Context
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const langSelect = document.getElementById('langSelect');
    const btnPlay = document.getElementById('btnPlay');
    const btnClear = document.getElementById('btnClear');
    const patternSelect = document.getElementById('patternSelect');
    const btnSpawnPattern = document.getElementById('btnSpawnPattern');
    const speedSlider = document.getElementById('speedSlider');
    const statGenPerSecond = document.getElementById('statGenPerSecond');
    const chkHistory = document.getElementById('chkHistory');
    const chkWrap = document.getElementById('chkWrap');
    const presetSelect = document.getElementById('presetSelect');
    const ruleInput = document.getElementById('ruleInput');
    const bRulesContainer = document.getElementById('bRules');
    const sRulesContainer = document.getElementById('sRules');

    // Text Elements for i18n
    const txtHudTitle = document.getElementById('txtHudTitle');
    const txtPopulation = document.getElementById('txtPopulation');
    const txtBorn = document.getElementById('txtBorn');
    const txtDied = document.getElementById('txtDied');
    const txtGen = document.getElementById('txtGen');
    const txtSpeedLabel = document.getElementById('txtSpeedLabel');
    const txtHistoryTrail = document.getElementById('txtHistoryTrail');
    const txtWrapEdges = document.getElementById('txtWrapEdges');

    const statPopulation = document.getElementById('statPopulation');
    const statBorn = document.getElementById('statBorn');
    const statDied = document.getElementById('statDied');
    const statGen = document.getElementById('statGen');

    // Grid Specs
    const GRID_SIZE = 150;
    const CELL_SIZE = 16;
    let grid = createGrid();
    let historyGrid = createGrid();

    // Slower Multi-step Trail Settings (20단계로 천천히 사라짐)
    const TRAIL_MAX = 20;
    const TRAIL_COLORS = Array.from({ length: TRAIL_MAX }, (_, i) => {
      const ratio = (i + 1) / TRAIL_MAX;
      const r = Math.round(15 + ratio * (2 - 15));
      const g = Math.round(23 + ratio * (132 - 23));
      const b = Math.round(42 + ratio * (199 - 42));
      return `rgb(${r}, ${g}, ${b})`;
    });

    // Patterns Data (Relative Coordinates [row, col])
    const PATTERNS = {
      glider: [
        [0, 1], [1, 2], [2, 0], [2, 1], [2, 2]
      ],
      gliderGun: [
        [4,0],[4,1],[5,0],[5,1],
        [2,12],[2,13],[3,11],[3,15],[4,10],[4,16],[5,10],[5,14],[5,16],[5,17],[6,10],[6,16],[7,11],[7,15],[8,12],[8,13],
        [0,24],[1,22],[1,24],[2,20],[2,21],[3,20],[3,21],[4,20],[4,21],[5,22],[5,24],[6,24],
        [2,34],[2,35],[3,34],[3,35]
      ],
      pulsar: [
        [0,2],[0,3],[0,4],[0,8],[0,9],[0,10],
        [2,0],[2,5],[2,7],[2,12],
        [3,0],[3,5],[3,7],[3,12],
        [4,0],[4,5],[4,7],[4,12],
        [5,2],[5,3],[5,4],[5,8],[5,9],[5,10],
        [7,2],[7,3],[7,4],[7,8],[7,9],[7,10],
        [8,0],[8,5],[8,7],[8,12],
        [9,0],[9,5],[9,7],[9,12],
        [10,0],[10,5],[10,7],[10,12],
        [12,2],[12,3],[12,4],[12,8],[12,9],[12,10]
      ],
      lwss: [
        [0,1],[0,4],[1,0],[2,0],[2,4],[3,0],[3,1],[3,2],[3,3]
      ],
      acorn: [
        [0,1],[1,3],[2,0],[2,1],[2,4],[2,5],[2,6]
      ]
    };

    // Game Rules & Settings
    let birthRules = new Set([3]);
    let survivalRules = new Set([2, 3]);
    let showHistory = true;
    let wrapEdges = true;

    // Statistics
    let stats = {
      population: 0,
      totalBorn: 0,
      totalDied: 0,
      generation: 0
    };

    // Animation & Speed Control
    let isRunning = false;
    let speedValue = 10;
    let stepAccumulator = 0;
    let animationFrameId = null;
    let trailFrameCount = 0;
    const TRAIL_DECAY_INTERVAL = 3;

    // Viewport State (Zoom & Pan)
    let scale = 1.0;
    let offsetX = (window.innerWidth - GRID_SIZE * CELL_SIZE) / 2;
    let offsetY = (window.innerHeight - GRID_SIZE * CELL_SIZE) / 2;

    let isDragging = false;
    let startX = 0, startY = 0;
    let dragDistance = 0;

    function createGrid() {
      return Array.from({ length: GRID_SIZE }, () => new Uint8Array(GRID_SIZE));
    }

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    }
    window.addEventListener('resize', resizeCanvas);

    // Pattern Spawner
    function spawnPattern(key) {
      grid = createGrid();
      historyGrid = createGrid();
      let pop = 0;

      if (key === 'random') {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (Math.random() < 0.25) {
              grid[r][c] = 1;
              historyGrid[r][c] = TRAIL_MAX;
              pop++;
            }
          }
        }
      } else if (PATTERNS[key]) {
        const pattern = PATTERNS[key];
        
        let maxR = 0, maxC = 0;
        pattern.forEach(([r, c]) => {
          if (r > maxR) maxR = r;
          if (c > maxC) maxC = c;
        });

        const startR = Math.floor((GRID_SIZE - maxR) / 2);
        const startC = Math.floor((GRID_SIZE - maxC) / 2);

        pattern.forEach(([r, c]) => {
          const targetR = startR + r;
          const targetC = startC + c;
          if (targetR >= 0 && targetR < GRID_SIZE && targetC >= 0 && targetC < GRID_SIZE) {
            grid[targetR][targetC] = 1;
            historyGrid[targetR][targetC] = TRAIL_MAX;
            pop++;
          }
        });
      }

      stats = { population: pop, totalBorn: pop, totalDied: 0, generation: 0 };
      updateHUD();
      draw();
    }

    // Rule Buttons Initialization
    function initRuleButtons() {
      for (let i = 0; i <= 8; i++) {
        // Birth Buttons
        const bBtn = document.createElement('button');
        bBtn.className = `rule-btn ${birthRules.has(i) ? 'active' : ''}`;
        bBtn.innerText = i;
        bBtn.onclick = () => {
          if (birthRules.has(i)) birthRules.delete(i);
          else birthRules.add(i);
          syncRuleToUI();
        };
        bRulesContainer.appendChild(bBtn);

        // Survival Buttons
        const sBtn = document.createElement('button');
        sBtn.className = `rule-btn ${survivalRules.has(i) ? 'active' : ''}`;
        sBtn.innerText = i;
        sBtn.onclick = () => {
          if (survivalRules.has(i)) survivalRules.delete(i);
          else survivalRules.add(i);
          syncRuleToUI();
        };
        sRulesContainer.appendChild(sBtn);
      }
    }

    function updateRuleUI() {
      Array.from(bRulesContainer.children).forEach((child, idx) => {
        if (idx > 0) child.classList.toggle('active', birthRules.has(idx - 1));
      });
      Array.from(sRulesContainer.children).forEach((child, idx) => {
        if (idx > 0) child.classList.toggle('active', survivalRules.has(idx - 1));
      });
    }

    function syncRuleToUI() {
      updateRuleUI();
      const bStr = Array.from(birthRules).sort((a,b)=>a-b).join('');
      const sStr = Array.from(survivalRules).sort((a,b)=>a-b).join('');
      const ruleStr = `B${bStr}/S${sStr}`;
      ruleInput.value = ruleStr;
      
      let matchedOption = Array.from(presetSelect.options).find(opt => opt.value === ruleStr);
      if (matchedOption) {
        presetSelect.value = ruleStr;
      }
    }

    function parseRuleString(str) {
      const match = str.trim().toUpperCase().match(/^B([0-8]*)\/S([0-8]*)$/);
      if (match) {
        birthRules = new Set(match[1].split('').map(Number));
        survivalRules = new Set(match[2].split('').map(Number));
        updateRuleUI();
        return true;
      }
      return false;
    }

    // Step Execution
    function step() {
      const nextGrid = createGrid();
      let bornThisStep = 0;
      let diedThisStep = 0;
      let currentPop = 0;
      
      const shouldDecayTrail = (trailFrameCount % TRAIL_DECAY_INTERVAL === 0);
      
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const neighbors = countNeighbors(r, c);
          const isAlive = grid[r][c] === 1;
          
          let nextState = isAlive ? (survivalRules.has(neighbors) ? 1 : 0) : (birthRules.has(neighbors) ? 1 : 0);
          nextGrid[r][c] = nextState;
          
          if (nextState === 1) {
            currentPop++;
            historyGrid[r][c] = TRAIL_MAX;
          } else if (historyGrid[r][c] > 0) {
            if (shouldDecayTrail) {
              historyGrid[r][c]--;
            }
          }
          
          if (!isAlive && nextState === 1) bornThisStep++;
          if (isAlive && nextState === 0) diedThisStep++;
        }
      }
      
      trailFrameCount++;
      
      grid = nextGrid;
      stats.population = currentPop;
      stats.totalBorn += bornThisStep;
      stats.totalDied += diedThisStep;
      stats.generation++;
    }

    function countNeighbors(r, c) {
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          
          if (wrapEdges) {
            const nr = (r + dr + GRID_SIZE) % GRID_SIZE;
            const nc = (c + dc + GRID_SIZE) % GRID_SIZE;
            count += grid[nr][nc];
          } else {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              count += grid[nr][nc];
            }
          }
        }
      }
      return count;
    }

    function updateHUD() {
      statPopulation.innerText = stats.population;
      statBorn.innerText = stats.totalBorn;
      statDied.innerText = stats.totalDied;
      statGen.innerText = stats.generation;
    }

    // Main Game Loop
    function gameLoop() {
      if (isRunning) {
        const genPerFrame = speedValue / 60;
        stepAccumulator += genPerFrame;

        while (stepAccumulator >= 1) {
          step();
          stepAccumulator -= 1;
        }

        updateHUD();
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    }

    // Canvas Drawing
    function draw() {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      const totalWidth = GRID_SIZE * CELL_SIZE;
      const totalHeight = GRID_SIZE * CELL_SIZE;

      // Grid Background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // Render Cells & Trails
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (grid[r][c] === 1) {
            // Live Cell
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          } else if (showHistory && historyGrid[r][c] > 0) {
            // Decaying Trail
            const trailVal = historyGrid[r][c];
            ctx.fillStyle = TRAIL_COLORS[trailVal - 1];
            ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }

      // Render Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1 / scale;
      ctx.beginPath();
      for (let x = 0; x <= totalWidth; x += CELL_SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, totalHeight);
      }
      for (let y = 0; y <= totalHeight; y += CELL_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(totalWidth, y);
      }
      ctx.stroke();

      ctx.restore();
    }

    // Update Speed Display
    function updateSpeedDisplay() {
      speedValue = parseInt(speedSlider.value, 10);
      statGenPerSecond.innerText = `${speedValue} / Second`;
    }

    // Language Change Handler
    function changeLanguage(lang) {
      currentLang = lang;
      const t = translations[lang];

      txtHudTitle.innerText = t.hudTitle;
      txtPopulation.innerText = t.population;
      txtBorn.innerText = t.born;
      txtDied.innerText = t.died;
      txtGen.innerText = t.gen;
      txtSpeedLabel.innerText = t.speed;
      txtHistoryTrail.innerText = t.historyTrail;
      txtWrapEdges.innerText = t.wrapEdges;

      btnPlay.innerText = isRunning ? t.pause : t.play;
      btnSpawnPattern.innerText = t.spawn;
      btnClear.innerText = t.clear;

      // Update Pattern Preset Select Labels
      Array.from(patternSelect.options).forEach(opt => {
        if (t.patterns[opt.value]) {
          opt.innerText = t.patterns[opt.value];
        }
      });
    }

    langSelect.onchange = (e) => {
      changeLanguage(e.target.value);
    };

    // Canvas Mouse Events
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - offsetX;
      startY = e.clientY - offsetY;
      dragDistance = 0;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX - offsetX;
      const dy = e.clientY - startY - offsetY;
      dragDistance += Math.abs(dx) + Math.abs(dy);

      offsetX = e.clientX - startX;
      offsetY = e.clientY - startY;
      draw();
    });

    window.addEventListener('mouseup', (e) => {
      if (isDragging && dragDistance < 5) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - offsetX) / scale;
        const mouseY = (e.clientY - rect.top - offsetY) / scale;

        const col = Math.floor(mouseX / CELL_SIZE);
        const row = Math.floor(mouseY / CELL_SIZE);

        if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
          const newState = grid[row][col] ? 0 : 1;
          grid[row][col] = newState;
          
          if (newState === 1) {
            historyGrid[row][col] = TRAIL_MAX;
          } else {
            // 실행 중이 아닐 때 수동으로 셀을 삭제한 경우 흔적도 제거
            historyGrid[row][col] = 0;
          }

          stats.population += newState ? 1 : -1;
          updateHUD();
          draw();
        }
      }
      isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newScale = Math.min(Math.max(0.2, scale * zoomFactor), 5.0);

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
      offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);
      scale = newScale;

      draw();
    }, { passive: false });

    // Event Handlers
    btnPlay.onclick = () => {
      isRunning = !isRunning;
      const t = translations[currentLang];
      btnPlay.innerText = isRunning ? t.pause : t.play;
      btnPlay.classList.toggle('btn-primary', !isRunning);

      if (isRunning) {
        stepAccumulator = 0;
        gameLoop();
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };

    btnSpawnPattern.onclick = () => {
      spawnPattern(patternSelect.value);
    };

    patternSelect.onchange = () => {
      spawnPattern(patternSelect.value);
    };

    speedSlider.oninput = () => {
      updateSpeedDisplay();
    };

    chkHistory.onchange = (e) => {
      showHistory = e.target.checked;
      draw();
    };

    chkWrap.onchange = (e) => {
      wrapEdges = e.target.checked;
    };

    btnClear.onclick = () => {
      if (isRunning) btnPlay.click();
      grid = createGrid();
      historyGrid = createGrid();
      stats = { population: 0, totalBorn: 0, totalDied: 0, generation: 0 };
      updateHUD();
      draw();
    };

    presetSelect.onchange = (e) => {
      const val = e.target.value;
      ruleInput.value = val;
      parseRuleString(val);
    };

    ruleInput.oninput = (e) => {
      parseRuleString(e.target.value);
    };

    // App Initialization
    initRuleButtons();
    updateSpeedDisplay();
    resizeCanvas();
    changeLanguage('en');
    spawnPattern('gliderGun');
});
