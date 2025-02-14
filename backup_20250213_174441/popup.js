let isAnalyzing = false;
let selectedModel = 'openai/gpt-4';
let openrouterApiKey = '';
let alpacaApiKey = '';
let tokenCost = 0;
let isDarkMode = false;

document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleAnalysis');
  const statusText = document.getElementById('status');
  const tokenCostDisplay = document.getElementById('tokenCost');
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const modelSelect = document.getElementById('modelSelect');
  const modelOptions = [
    { value: 'openai/gpt-4', label: 'GPT-4' },
    { value: 'openai/gpt-4-vision-preview', label: 'GPT-4 Vision' },
    { value: 'openai/qwen-vision', label: 'Qwen Vision' },
    { value: 'openai/qwen-vision-preview', label: 'Qwen Vision Preview' },
    { value: 'openai/qwen-vision-v2', label: 'Qwen Vision V2' },
    { value: 'openai/qwen-vision-v3', label: 'Qwen Vision V3' },
    { value: 'openai/qwen-vision-v4', label: 'Qwen Vision V4' },
    { value: 'openai/qwen-vision-v5', label: 'Qwen Vision V5' },
    { value: 'meta-llama/llama-3.2-11b-vision-instruc', label: 'LLaMA Vision' },
    { value: 'qwen/qwen2.5-vl-72b-instruct:free', label: 'Qwen 2.5 Vision' },
    { value: 'google/gemini-pro-vision', label: 'Gemini Pro Vision' },
  ];
  const alpacaKeyInput = document.getElementById('alpacaKey');
  const alpacaSecretInput = document.getElementById('alpacaSecret');
  const saveAlpacaKeyButton = document.getElementById('saveAlpacaKey');
  const userInput = document.getElementById('userInput');
  const sendButton = document.getElementById('sendMessage');
  const chatContainer = document.getElementById('chatContainer');
  const previewContainer = document.getElementById('previewContainer');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsContent = document.querySelector('.settings-content');
  const settingsPanel = document.querySelector('.settings-panel');
  const darkModeToggle = document.getElementById('darkModeToggle');

  // Populate model select options
  modelOptions.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    modelSelect.appendChild(optionElement);
  });

  // Load saved keys and settings
  chrome.storage.local.get(['openrouterApiKey', 'alpacaApiKey', 'alpacaSecretKey', 'isDarkMode', 'selectedModel'], (result) => {
    if (result.openrouterApiKey) {
      openrouterApiKey = result.openrouterApiKey;
      apiKeyInput.value = openrouterApiKey;
    }
    if (result.alpacaApiKey) {
      alpacaApiKey = result.alpacaApiKey;
      alpacaKeyInput.value = alpacaApiKey;
    }
    if (result.alpacaSecretKey) {
      alpacaSecretInput.value = result.alpacaSecretKey;
    }
    if (result.isDarkMode) {
      isDarkMode = result.isDarkMode;
      document.body.classList.add('dark-mode');
    }
    if (result.selectedModel) {
      selectedModel = result.selectedModel;
      const selectedOption = modelSelect.querySelector(`option[value="${selectedModel}"]`);
      if (selectedOption) {
        selectedOption.selected = true;
      }
    }
  });

  // Save OpenRouter API key
  saveApiKeyButton.addEventListener('click', () => {
    openrouterApiKey = apiKeyInput.value;
    chrome.storage.local.set({ openrouterApiKey });
    chrome.runtime.sendMessage({ type: 'setApiKey', apiKey: openrouterApiKey });
    addMessage('System', 'OpenRouter API key saved successfully');
  });

  // Save Alpaca API keys
  saveAlpacaKeyButton.addEventListener('click', () => {
    alpacaApiKey = alpacaKeyInput.value;
    const alpacaSecretKey = alpacaSecretInput.value;
    chrome.storage.local.set({ alpacaApiKey, alpacaSecretKey });
    chrome.runtime.sendMessage({ type: 'setAlpacaKey', apiKey: alpacaApiKey, secretKey: alpacaSecretKey });
    addMessage('System', 'Alpaca API keys saved successfully');
  });

  // Set selected model
  modelSelect.addEventListener('change', () => {
    selectedModel = modelSelect.value;
    chrome.storage.local.set({ selectedModel });
    chrome.runtime.sendMessage({ type: 'setModel', model: selectedModel });
    addMessage('System', `Selected model: ${selectedModel}`);
  });

  // Toggle analysis
  toggleButton.addEventListener('click', () => {
    isAnalyzing = !isAnalyzing;
    if (isAnalyzing) {
      chrome.runtime.sendMessage({ type: 'startAnalysis', model: selectedModel });
      toggleButton.textContent = 'Stop Analysis';
      toggleButton.classList.add('stop');
      statusText.textContent = 'Running';
    } else {
      chrome.runtime.sendMessage({ type: 'stopAnalysis' });
      toggleButton.textContent = 'Start Analysis';
      toggleButton.classList.remove('stop');
      statusText.textContent = 'Stopped';
    }
  });

  // Send message
  sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
      addMessage('User', message);
      chrome.runtime.sendMessage({ 
        type: 'userMessage', 
        message,
        model: selectedModel
      });
      userInput.value = '';
    }
  });

  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendButton.click();
    }
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'aiResponse') {
      addMessage('AI', message.content);
    } else if (message.type === 'tokenCost') {
      tokenCost += message.cost;
      tokenCostDisplay.textContent = `Token Cost: $${tokenCost.toFixed(2)}`;
      const modelInfo = modelOptions.find(option => option.value === selectedModel);
      if (modelInfo) {
        tokenCostDisplay.title = `${modelInfo.label} model token cost`;
      }
    } else if (message.type === 'screenshotPreview') {
      const previewPanel = document.getElementById('previewContainer');
      const previewImage = document.querySelector('.preview-image');
      const previewTimestamp = document.querySelector('.preview-timestamp');
      previewImage.src = message.preview;
      previewTimestamp.textContent = `Last Updated: ${new Date().toLocaleString()}`;
      previewPanel.classList.add('scanning');
      
      // Remove scanning class after animation completes
      const scanLine = previewPanel.querySelector('.scan-line');
      scanLine.addEventListener('animationend', () => {
        previewPanel.classList.remove('scanning');
      });
    } else if (message.type === 'aiAnalysis') {
      const analysisData = message.data;
      updateStrategyMonitor(analysisData);
      addMessage('AI', JSON.stringify(analysisData, null, 2), true);
    } else if (message.type === 'strategyUpdate') {
      updateStrategyMonitor(message.details);
    } else if (message.type === 'countdownUpdate') {
      updateCountdownTimer(message.countdown, message.nextAnalysis);
    }
  });

  // Toggle settings panel
    const windowToggle = {
      settingsToggle: document.getElementById('settingsToggle'),
      settingsPanel: document.querySelector('.settings-panel'),
      minimizeButton: document.querySelector('.minimize'),
      expandButton: document.querySelector('.expand'),
      isWindowMinimized: false,

      init() {
        this.settingsToggle.addEventListener('click', () => {
          this.settingsPanel.classList.toggle('open');
          this.settingsToggle.querySelector('i').classList.toggle('fa-chevron-down');
          this.settingsToggle.querySelector('i').classList.toggle('fa-chevron-up');
        });

        this.minimizeButton.addEventListener('click', () => {
          this.isWindowMinimized = true;
          document.body.style.width = '48px';
          document.body.style.height = '48px';
          document.body.style.borderRadius = '50%';
          document.body.style.overflow = 'hidden';
        });

        this.expandButton.addEventListener('click', () => {
          this.isWindowMinimized = false;
          document.body.style.width = '400px';
          document.body.style.height = 'auto';
          document.body.style.borderRadius = '8px';
          document.body.style.overflow = 'auto';
        });
      }
    };

    windowToggle.init();

  const windowPosition = {
    savePosition() {
      const windowRect = document.body.getBoundingClientRect();
      chrome.storage.local.set({
        windowPosition: {
          left: windowRect.left,
          top: windowRect.top,
          width: windowRect.width,
          height: windowRect.height
        }
      });
    },

    loadPosition() {
      chrome.storage.local.get('windowPosition', (data) => {
        if (data.windowPosition) {
          const { left, top, width, height } = data.windowPosition;
          document.body.style.left = `${left}px`;
          document.body.style.top = `${top}px`;
          document.body.style.width = `${width}px`;
          document.body.style.height = `${height}px`;
        }
      });
    }
  };

  window.addEventListener('beforeunload', windowPosition.savePosition);
  windowPosition.loadPosition();

  // Toggle dark mode
  darkModeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    chrome.storage.local.set({ isDarkMode });
  });
});

function addMessage(sender, content, isJson = false) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender.toLowerCase()}-message`;
  if (isJson) {
    const pre = document.createElement('pre');
    pre.textContent = content;
    messageDiv.appendChild(pre);
  } else {
    const contentSpan = document.createElement('span');
    contentSpan.textContent = content;
    messageDiv.appendChild(contentSpan);
  }
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showTradeConfirmation(strategy) {
  const tradeConfirmation = document.getElementById('tradeConfirmation');
  const tradeStrategyDetails = document.getElementById('tradeStrategyDetails');
  const confirmButton = document.getElementById('confirmTrade');
  const cancelButton = document.getElementById('cancelTrade');

  tradeStrategyDetails.textContent = strategy;
  tradeConfirmation.style.display = 'block';

  confirmButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'executeTradeStrategy', strategy });
    tradeConfirmation.style.display = 'none';
  });

  cancelButton.addEventListener('click', () => {
    tradeConfirmation.style.display = 'none';
  });
}

function updateStrategyMonitor(data) {
  const trendDisplay = document.getElementById('trendDirection');
  const trendStrength = document.getElementById('trendStrength');
  const supportLevels = document.getElementById('supportLevels');
  const resistanceLevels = document.getElementById('resistanceLevels');
  const patternDisplay = document.getElementById('activePatterns');
  const indicatorPanel = document.getElementById('indicatorPanel');
  const overallSentiment = document.getElementById('overallSentiment');
  const strategyName = document.getElementById('strategyName');
  const confidenceMeter = document.getElementById('confidenceMeter');
  const stopLoss = document.getElementById('stopLoss');
  const takeProfit = document.getElementById('takeProfit');
  const riskRewardRatio = document.getElementById('riskRewardRatio');

  // Update trend information
  trendDisplay.textContent = `Direction: ${data.trend.direction}`;
  trendStrength.textContent = `Strength: ${data.trend.strength}%`;

  // Update support/resistance levels
  supportLevels.innerHTML = '';
  data.trend.key_levels.support.forEach(level => {
    const li = document.createElement('li');
    li.textContent = level.toFixed(2);
    supportLevels.appendChild(li);
  });

  resistanceLevels.innerHTML = '';
  data.trend.key_levels.resistance.forEach(level => {
    const li = document.createElement('li');
    li.textContent = level.toFixed(2);
    resistanceLevels.appendChild(li);
  });

  // Update patterns
  patternDisplay.innerHTML = '';
  data.patterns.forEach(pattern => {
    const div = document.createElement('div');
    div.className = `pattern-item ${pattern.status.toLowerCase()}`;
    div.innerHTML = `
      <span class="pattern-name">${pattern.name}</span>
      <span class="pattern-status">${pattern.status}</span>
      <span class="pattern-confidence">${pattern.confidence}%</span>
      <span class="pattern-target">Target: ${pattern.target_price}</span>
    `;
    patternDisplay.appendChild(div);
  });

  // Update indicators
  indicatorPanel.innerHTML = '';
  data.signals.indicators.forEach(indicator => {
    const div = document.createElement('div');
    div.className = `indicator-item ${indicator.signal.toLowerCase()}`;
    div.innerHTML = `
      <span class="indicator-name">${indicator.name}</span>
      <span class="indicator-value">${indicator.value}</span>
      <span class="indicator-signal">${indicator.signal}</span>
      <span class="indicator-weight">${indicator.weight}%</span>
    `;
    indicatorPanel.appendChild(div);
  });

  overallSentiment.textContent = `Overall Sentiment: ${data.signals.overall_sentiment}%`;

  // Update strategy
  strategyName.textContent = data.strategy.name;
  confidenceMeter.textContent = `Confidence: ${data.strategy.confidence}%`;

  // Update risk/reward
  stopLoss.textContent = `Stop Loss: ${data.risk_assessment.stop_loss}%`;
  takeProfit.textContent = `Take Profit: ${data.risk_assessment.take_profit}%`;
  riskRewardRatio.textContent = `Risk/Reward: ${data.risk_assessment.risk_reward_ratio.toFixed(2)}`;

  // Add sentiment-based gradient overlay
  const container = document.querySelector('.container');
  const sentiment = data.signals.overall_sentiment;
  const color = sentiment >= 50 ? 'rgba(16, 185, 129, ' : 'rgba(239, 68, 68, ';
  const opacity = Math.abs(sentiment - 50) / 100;
  container.style.background = `linear-gradient(to bottom, ${color}${opacity * 0.2}) 0%, transparent 100%)`;
}

function updateCountdownTimer(countdown, nextAnalysis) {
  const countdownDisplay = document.getElementById('countdownDisplay');
  const nextAnalysisTime = document.getElementById('nextAnalysisTime');
  
  countdownDisplay.textContent = `${countdown} seconds`;
  nextAnalysisTime.textContent = new Date(nextAnalysis).toLocaleTimeString();
}

function renderTradeHistory(history) {
  const tradeHistoryLog = document.getElementById('tradeHistoryLog');
  tradeHistoryLog.innerHTML = '';

  history.forEach(trade => {
    const tradeEntry = document.createElement('div');
    tradeEntry.className = 'trade-entry';

    const timestamp = document.createElement('div');
    timestamp.textContent = `Timestamp: ${trade.timestamp}`;
    tradeEntry.appendChild(timestamp);

    const strategy = document.createElement('div');
    strategy.textContent = `Strategy: ${trade.strategy}`;
    tradeEntry.appendChild(strategy);

    const account = document.createElement('div');
    account.textContent = `Account: ${JSON.stringify(trade.account)}`;
    tradeEntry.appendChild(account);

    const positions = document.createElement('div');
    positions.textContent = `Positions: ${JSON.stringify(trade.positions)}`;
    tradeEntry.appendChild(positions);

    const orders = document.createElement('div');
    orders.textContent = `Orders: ${JSON.stringify(trade.orders)}`;
    tradeEntry.appendChild(orders);

    tradeHistoryLog.appendChild(tradeEntry);
  });
}
