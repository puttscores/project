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
    } else if (message.type === 'aiResponse') {
      const analysisData = message.data;
      updateStrategyMonitor(analysisData);
      addMessage('AI', JSON.stringify(analysisData, null, 2), true);
    } else if (message.type === 'strategyUpdate') {
      updateStrategyMonitor(message.details);
    }
  });

  // Toggle settings panel
    settingsToggle.addEventListener('click', () => {
      settingsPanel.classList.toggle('open');
      settingsToggle.querySelector('i').classList.toggle('fa-chevron-down');
      settingsToggle.querySelector('i').classList.toggle('fa-chevron-up');
    });

  // Toggle dark mode
  darkModeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    chrome.storage.local.set({ isDarkMode });
  });
});

function addMessage(sender, content) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender.toLowerCase()}-message`;
  messageDiv.textContent = `${sender}: ${content}`;
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

function showStrategyDirection(details) {
  const strategyDetails = document.getElementById('strategyDetails');
  strategyDetails.innerHTML = '';

  const strategyDiv = document.createElement('div');
  strategyDiv.className = 'strategy-details';
  strategyDiv.textContent = `${details.strategy} (${details.confidence}% confidence)`;
  strategyDetails.appendChild(strategyDiv);
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
