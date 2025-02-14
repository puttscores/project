document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const openrouterKeyInput = document.getElementById('openrouterKey');
  const alpacaKeyInput = document.getElementById('alpacaKey');
  const alpacaSecretInput = document.getElementById('alpacaSecret');
  const modelSelect = document.getElementById('modelSelect');
  const analysisInterval = document.getElementById('analysisInterval');
  const autoTradingToggle = document.getElementById('autoTrading');
  const saveButton = document.getElementById('saveSettings');
  const toggleVisibilityButtons = document.querySelectorAll('.toggle-visibility');

  // Cost elements
  const tokenCountElement = document.getElementById('tokenCount');
  const costPerAnalysisElement = document.getElementById('costPerAnalysis');
  const hourlyCostElement = document.getElementById('hourlyCost');

  // Account info elements
  const accountInfoSection = document.querySelector('.account-info');
  const accountBalanceElement = document.getElementById('accountBalance');
  const buyingPowerElement = document.getElementById('buyingPower');

  // Model pricing data (per million tokens)
  const modelPricing = {
    'meta-llama/llama-3.2-11b-vision-instruct': {
      inputCost: 0.055,
      outputCost: 0.055,
      avgTokens: 2000
    },
    'google/gemini-pro-vision': {
      inputCost: 0.5,
      outputCost: 1.5,
      avgTokens: 2000
    },
    'meta-llama/llama-3.2-90b-vision-instruct': {
      inputCost: 0.8,
      outputCost: 1.6,
      avgTokens: 2000
    },
    'qwen/qwen2.5-vl-72b-instruct': {
      inputCost: 0,
      outputCost: 0,
      avgTokens: 2000
    }
  };

  // Function to verify Alpaca keys and fetch account info
  async function verifyAlpacaKeys() {
    if (!alpacaKeyInput.value || !alpacaSecretInput.value) {
      accountInfoSection.classList.add('hidden');
      return false;
    }

    try {
      const response = await fetch('https://paper-api.alpaca.markets/v2/account', {
        headers: {
          'APCA-API-KEY-ID': alpacaKeyInput.value,
          'APCA-API-SECRET-KEY': alpacaSecretInput.value
        }
      });

      if (!response.ok) {
        throw new Error('Invalid Alpaca API keys');
      }

      const account = await response.json();
      
      // Show account info section
      accountInfoSection.classList.remove('hidden');
      
      // Update account info
      accountBalanceElement.textContent = `$${parseFloat(account.equity).toLocaleString()}`;
      buyingPowerElement.textContent = `$${parseFloat(account.buying_power).toLocaleString()}`;

      return true;
    } catch (error) {
      console.error('Alpaca verification failed:', error);
      accountInfoSection.classList.add('hidden');
      return false;
    }
  }

  // Validation state
  let hasValidKeys = false;
  let validationMessages = {};

  function validateKeys() {
    const hasOpenRouter = !!openrouterKeyInput.value.trim();
    const hasAlpaca = !!alpacaKeyInput.value.trim() && !!alpacaSecretInput.value.trim();
    hasValidKeys = hasOpenRouter && hasAlpaca;

    // Update UI based on validation
    autoTradingToggle.disabled = !hasValidKeys;

    // Update input field states
    [openrouterKeyInput, alpacaKeyInput, alpacaSecretInput].forEach(input => {
      const field = input.closest('.input-field');
      const message = field.querySelector('.validation-message');
      if (!message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'validation-message';
        messageElement.style.cssText = 'color: var(--error-color, #ef4444); font-size: 12px; margin-top: 4px;';
        field.appendChild(messageElement);
      }
      
      if (!input.value.trim()) {
        field.classList.add('error');
        field.querySelector('.validation-message').textContent = 'This field is required';
        validationMessages[input.id] = 'This field is required';
        input.style.borderColor = 'var(--error-color, #ef4444)';
      } else {
        field.classList.remove('error');
        field.querySelector('.validation-message').textContent = '';
        delete validationMessages[input.id];
      }
    });

    return hasValidKeys;
  }

  function updateCostEstimates() {
    const selectedModel = modelSelect.value;
    const interval = parseInt(analysisInterval.value);
    const pricing = modelPricing[selectedModel];
    
    // Update token count
    tokenCountElement.textContent = pricing.avgTokens.toLocaleString();

    // Calculate cost per analysis
    const inputTokens = pricing.avgTokens / 2;
    const outputTokens = pricing.avgTokens / 2;
    const costPerAnalysis = (
      (inputTokens * pricing.inputCost / 1000000) + 
      (outputTokens * pricing.outputCost / 1000000)
    );
    costPerAnalysisElement.textContent = `$${costPerAnalysis.toFixed(4)}`;

    // Calculate hourly cost
    const analysesPerHour = 3600 / interval;
    const hourlyCost = costPerAnalysis * analysesPerHour;
    hourlyCostElement.textContent = `$${hourlyCost.toFixed(2)}`;
  }

  // Handle password visibility toggle
  toggleVisibilityButtons.forEach(button => {
    button.addEventListener('click', () => {
      const input = button.parentElement.querySelector('input');
      const icon = button.querySelector('i');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });

  // Helper function to determine if we're running in Chrome extension context
  const isExtensionContext = function() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  };

  // Storage wrapper
  const storage = {
    get: function(keys) {
      if (isExtensionContext()) {
        return new Promise(resolve => chrome.storage.local.get(keys, resolve));
      } else {
        const result = {};
        keys.forEach(key => {
          result[key] = localStorage.getItem(key);
        });
        return Promise.resolve(result);
      }
    },
    set: function(items) {
      if (isExtensionContext()) {
        return chrome.storage.local.set(items);
      } else {
        Object.entries(items).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        return Promise.resolve();
      }
    }
  };

  // Load saved settings
  storage.get([
    'openrouterApiKey',
    'alpacaApiKey',
    'alpacaSecretKey',
    'selectedModel',
    'analysisInterval',
    'autoTrading'
  ]).then(result => {
    openrouterKeyInput.value = result.openrouterApiKey || '';
    alpacaKeyInput.value = result.alpacaApiKey || '';
    alpacaSecretInput.value = result.alpacaSecretKey || '';
    modelSelect.value = result.selectedModel || 'meta-llama/llama-3.2-11b-vision-instruct';
    analysisInterval.value = result.analysisInterval || '60';
    autoTradingToggle.checked = result.autoTrading === 'true';
    
    validateKeys();
    updateCostEstimates();
    verifyAlpacaKeys(); // Verify Alpaca keys on load
  });

  // Input validation and Alpaca verification
  [openrouterKeyInput, alpacaKeyInput, alpacaSecretInput].forEach(input => {
    input.addEventListener('input', validateKeys);
    input.addEventListener('blur', () => {
      validateKeys();
      if (input.id === 'alpacaKey' || input.id === 'alpacaSecret') {
        verifyAlpacaKeys();
      }
    });
  });

  // Update cost estimates when model or interval changes
  modelSelect.addEventListener('change', updateCostEstimates);
  analysisInterval.addEventListener('change', updateCostEstimates);

  // Save settings
  saveButton.addEventListener('click', () => {
    if (!validateKeys()) {
      const errorMessages = Object.values(validationMessages).join('\n');
      if (errorMessages.length > 0) {
        alert('Please fix the following errors:\n' + errorMessages);
      }
      return;
    }

    saveButton.classList.add('saving');
    saveButton.disabled = true;
    const originalContent = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const settings = {
      openrouterApiKey: openrouterKeyInput.value,
      alpacaApiKey: alpacaKeyInput.value,
      alpacaSecretKey: alpacaSecretInput.value,
      selectedModel: modelSelect.value,
      analysisInterval: analysisInterval.value,
      autoTrading: autoTradingToggle.checked
    };

    storage.set(settings)
      .then(() => {
        if (isExtensionContext()) {
          return chrome.runtime.sendMessage({
            type: 'settingsUpdated',
            settings
          });
        }
      })
      .then(() => {
        return storage.get([
          'openrouterApiKey',
          'alpacaApiKey',
          'alpacaSecretKey',
          'selectedModel',
          'analysisInterval',
          'autoTrading'
        ]);
      })
      .then(savedSettings => {
        if (!Object.keys(settings).every(key => savedSettings[key] === settings[key])) {
          throw new Error('Settings verification failed');
        }
        saveButton.innerHTML = '<i class="fas fa-check"></i> Saved!';
        saveButton.style.backgroundColor = 'var(--accent-success)';

        if (isExtensionContext()) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '/assets/icon-48.png',
            title: 'Settings Saved',
            message: 'Your settings have been saved successfully!'
          });
          chrome.tabs.getCurrent(tab => {
            if (tab) {
              chrome.tabs.remove(tab.id);
            }
          });
        } else {
          alert('Settings saved successfully!');
        }
      })
      .catch(error => {
        saveButton.innerHTML = '<i class="fas fa-times"></i> Error!';
        saveButton.style.backgroundColor = 'var(--error-color)';
        alert('Failed to save settings: ' + error.message);
      })
      .finally(() => {
        setTimeout(() => {
          saveButton.classList.remove('saving');
          saveButton.disabled = false;
          saveButton.innerHTML = originalContent;
          saveButton.style.backgroundColor = '';
        }, 2000);
      });
  });
});
