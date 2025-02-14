document.addEventListener('DOMContentLoaded', () => {
  // Intro panel elements
  const introPanel = document.getElementById('introPanel');
  const introTitle = document.querySelector('.intro-title');
  const introContent = document.querySelector('.intro-content');
  const introSubtext = document.querySelector('.intro-subtext');
  const introItems = document.querySelector('.intro-items');
  const introPrev = document.querySelector('.intro-prev');
  const introNext = document.querySelector('.intro-next');

  // Strategy panel elements
  const strategyPanel = document.getElementById('strategyPanel');
  const confidenceScore = document.getElementById('confidenceScore');
  const potentialProfit = document.getElementById('potentialProfit');
  const entryPrice = document.getElementById('entryPrice');
  const stopLoss = document.getElementById('stopLoss');
  const takeProfit = document.getElementById('takeProfit');
  const executeTradeBtn = document.getElementById('executeTrade');
  const riskReward = document.getElementById('riskReward');
  const strategyType = document.getElementById('strategyType');
  const lastUpdated = document.getElementById('lastUpdated');
  const shareQty = document.getElementById('shareQty');
  const dollarAmount = document.getElementById('dollarAmount');
  const technicalSignals = document.getElementById('technicalSignals');
  const marketStatus = document.getElementById('marketStatus');

  // Control elements
  const toggleButton = document.getElementById('toggleAnalysis');
  const buttonText = toggleButton?.querySelector('.button-text');
  const buttonSpinner = toggleButton?.querySelector('.fa-spinner');
  const statusIndicator = document.querySelector('.status-indicator i');
  const statusText = document.querySelector('.status-text');
  const settingsButton = document.querySelector('.settings-button');
  const settingsOverlay = document.querySelector('.settings-overlay');
  const detailsToggle = document.querySelector('.details-toggle');
  const closeSettingsButton = document.querySelector('.close-settings');

  // Initialize state
  let isAnalyzing = false;
  let autoTrading = false;
  let currentStep = 0;

  if (buttonText) {
    buttonText.textContent = 'Start Trading';
  }

  // Intro steps data
  const introSteps = [
    {
      title: "Welcome to Workbird AI Trading",
      content: "Where AI meets trading, making complex decisions simple! 🚀",
      subtext: "Our goal is to make trading as simple as pressing a button while maintaining educational value."
    },
    {
      title: "Important Tips",
      content: "Before you start, please note:",
      items: [
        "You can only monitor one stock at a time",
        "Keep other Chrome tabs closed during analysis",
        "Risk parameters can be customized in settings",
        "OpenRouter & Alpaca API keys are required"
      ]
    },
    {
      title: "About Workbird",
      content: "Workbird was created to simplify trading through AI-powered analysis, making complex market decisions more accessible.",
      subtext: "We believe trading shouldn't require a PhD in finance!"
    },
    {
      title: "Important Disclaimer",
      content: "Please read and acknowledge:",
      items: [
        "Workbird is for educational and entertainment purposes only",
        "Not a financial advisor - no professional advice given",
        "Real money trading is not recommended",
        "All trading carries significant risks"
      ]
    },
    {
      title: "Terms of Service",
      content: "By continuing, you agree to:",
      items: [
        "Workbird Terms of Service",
        "Privacy Policy",
        "Use for educational purposes only",
        "Accept all trading risks"
      ],
      hasLink: true,
      linkText: "View Terms of Service"
    }
  ];

  // Initialize intro panel
  function showIntroPanel() {
    introPanel.classList.add('visible');
    updateIntroStep();
  }

  // Check if first time opening
  chrome.storage.local.get(['introShown'], (result) => {
    if (!result.introShown) {
      showIntroPanel();
    }
  });

  // Update intro step content
  function updateIntroStep() {
    const step = introSteps[currentStep];
    introTitle.textContent = step.title;
    introContent.textContent = step.content;
    
    if (step.subtext) {
      introSubtext.textContent = step.subtext;
      introSubtext.style.display = 'block';
    } else {
      introSubtext.style.display = 'none';
    }

    if (step.items) {
      introItems.innerHTML = step.items.map(item => `<li>${item}</li>`).join('');
      if (step.hasLink) {
        introItems.innerHTML += `
          <li class="terms-link"><a href="terms.html" target="_blank">${step.linkText}</a></li>
        `;
      }
      introItems.style.display = 'block';
    } else {
      introItems.style.display = 'none';
    }

    introPrev.style.display = currentStep > 0 ? 'flex' : 'none';
    introNext.textContent = currentStep < introSteps.length - 1 ? 'Next' : 'Get Started';
  }

  // Handle intro navigation
  introPrev?.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      updateIntroStep();
    }
  });

  introNext?.addEventListener('click', () => {
    if (currentStep < introSteps.length - 1) {
      currentStep++;
      updateIntroStep();
    } else {
      chrome.storage.local.set({ introShown: true });
      introPanel.classList.remove('visible');
    }
  });

  // Load auto-trading setting
  chrome.storage.local.get(['autoTrading'], (result) => {
    autoTrading = result.autoTrading || false;
  });

  // Handle details toggle
  if (detailsToggle) {
    const priceLevels = document.querySelector('.price-levels');
    detailsToggle.addEventListener('click', () => {
      priceLevels.classList.toggle('collapsed');
      const icon = detailsToggle.querySelector('i');
      icon.style.transform = priceLevels.classList.contains('collapsed') ? 
        'rotate(0deg)' : 'rotate(180deg)';
    });
  }

  // Update technical signals display
  function updateTechnicalSignals(signals) {
    console.log('Updating technical signals:', signals);
    technicalSignals.innerHTML = '';
    
    if (!signals?.indicators) {
      console.log('No indicators found in signals');
      return;
    }

    signals.indicators.forEach(indicator => {
      const signalDiv = document.createElement('div');
      signalDiv.className = 'indicator-item';
      
      const signal = (indicator.signal || 'neutral').toLowerCase();
      const signalClass = signal === 'buy' ? 'bullish' : signal === 'sell' ? 'bearish' : 'neutral';
      
      signalDiv.innerHTML = `
        <div class="indicator-name">${indicator.name}</div>
        <div class="indicator-signal ${signalClass}">
          ${signal.toUpperCase()}
          <div class="indicator-weight">${indicator.weight}%</div>
        </div>
      `;
      
      technicalSignals.appendChild(signalDiv);
    });
  }

  // Update strategy panel display
  function updateStrategyPanel(strategy, analysis) {
    console.log('Updating strategy panel:', { strategy, analysis });

    if (!strategy) {
      console.log('No strategy provided');
      strategyPanel.style.opacity = '0';
      setTimeout(() => strategyPanel.classList.add('hidden'), 200);
      return false;
    }

    const entry = parseFloat(strategy.order_details.limit_price || strategy.order_details.stop_price);
    const target = parseFloat(strategy.risk_management.take_profit.limit_price);
    const stop = parseFloat(strategy.risk_management.stop_loss.stop_price);
    const shares = parseInt(strategy.order_details.qty) || 100;

    // Update confidence and strategy type
    confidenceScore.textContent = `${strategy.confidence}%`;
    strategyType.textContent = strategy.type || 'Pattern Recognition';

    // Update price levels
    entryPrice.textContent = `$${entry.toFixed(2)}`;
    stopLoss.textContent = `$${stop.toFixed(2)}`;
    takeProfit.textContent = `$${target.toFixed(2)}`;

    // Calculate profit metrics with validation
    let potentialProfitValue = '--';
    let riskRewardRatio = '--';
    
    if (!isNaN(target) && !isNaN(entry) && !isNaN(stop) && !isNaN(shares)) {
      const riskValue = Math.abs((stop - entry) * shares);
      const rewardValue = Math.abs((target - entry) * shares);
      
      if (riskValue > 0) {
        riskRewardRatio = (rewardValue / riskValue).toFixed(2);
        potentialProfitValue = rewardValue.toFixed(2);
      }
    }

    // Update displays
    potentialProfit.textContent = potentialProfitValue === '--' ? '--' : `$${potentialProfitValue}`;
    riskReward.textContent = `1:${riskRewardRatio}`;
    shareQty.textContent = `${shares} shares`;
    dollarAmount.textContent = `$${(entry * shares).toFixed(2)}`;
    
    // Update last updated text
    lastUpdated.textContent = 'Last updated: Just now';

    // Show panel with animation
    strategyPanel.classList.remove('hidden');
    setTimeout(() => strategyPanel.style.opacity = '1', 0);

    // Enable/disable trade button
    executeTradeBtn.disabled = !autoTrading;

    return true;
  }

  // Check API keys and update UI
  function checkApiKeys() {
    chrome.storage.local.get([
      'openrouterApiKey',
      'alpacaApiKey',
      'alpacaSecretKey'
    ], (result) => {
      const hasKeys = result.openrouterApiKey && result.alpacaApiKey && result.alpacaSecretKey;
      
      if (!hasKeys) {
        updateStatus('Keys needed', 'error');
        toggleButton.disabled = true;
        settingsButton.classList.add('attention');
      } else {
        toggleButton.disabled = false;
        settingsButton.classList.remove('attention');
        updateStatus('Ready', 'ready');
      }
    });
  }

  // Initial key check
  checkApiKeys();

  // Update status display
  function updateStatus(status, type = 'ready') {
    document.body.removeAttribute('data-status');
    statusText.textContent = status;
    document.body.setAttribute('data-status', type);
    
    if (type === 'processing' && buttonSpinner) {
      buttonSpinner.style.display = 'inline-block';
    } else if (buttonSpinner) {
      buttonSpinner.style.display = 'none';
    }
  }

  // Handle analysis toggle
  toggleButton.addEventListener('click', async () => {
    try {
      toggleButton.disabled = true;
      
      if (isAnalyzing) {
        updateStatus('Ready', 'ready');
        const response = await chrome.runtime.sendMessage({ type: 'stopAnalysis' });
        console.log('Stopping trading...');
        
        if (response.status === 'stopped') {
          isAnalyzing = false;
          buttonText.textContent = 'Start Trading';
          buttonSpinner.style.display = 'none';
          strategyPanel.classList.add('hidden');
        } else {
          throw new Error('Failed to stop trading');
        }
      } else {
        // Verify API keys before starting
        const keys = await new Promise(resolve => {
          chrome.storage.local.get(['openrouterApiKey', 'alpacaApiKey', 'alpacaSecretKey'], resolve);
        });
        
        if (!keys.openrouterApiKey || !keys.alpacaApiKey || !keys.alpacaSecretKey) {
          throw new Error('API keys not configured');
        }
        
        updateStatus('Analyzing', 'processing');
        console.log('Starting trading...');
        console.log('Using model: meta-llama/llama-3.2-90b-vision-instruct');
        
        console.log('Sending startAnalysis message...');
        const response = await chrome.runtime.sendMessage({ 
          type: 'startAnalysis',
          model: 'meta-llama/llama-3.2-90b-vision-instruct'
        });
        console.log('Received startAnalysis response:', response);
        
        if (response.status === 'started') {
          isAnalyzing = true;
          buttonText.textContent = 'Stop Trading';
          lastUpdated.textContent = 'Last updated: Just now';
          buttonSpinner.style.display = 'inline-block';
        } else {
          throw new Error('Failed to start trading');
        }
      }
    } catch (error) {
      console.error('Analysis toggle error:', error);
      isAnalyzing = false;
      buttonText.textContent = 'Start Trading';
      buttonSpinner.style.display = 'none';
      updateStatus('Error', 'error');
      strategyPanel.classList.add('hidden');
    } finally {
      toggleButton.disabled = false;
    }
  });

  // Handle messages from background script
  chrome.runtime.onMessage.addListener((message) => {
    console.log('Received message:', message);
    
    if (message.type === 'aiResponse') {
      console.log('Received AI response:', message.content);

      function extractConfidenceLevel(text) {
        const match = text.match(/Confidence Level:?\s*(\d+)%/i);
        return match ? parseInt(match[1]) : 50;
      }

      try {
        let parsedResponse;
        if (typeof message.content === 'string') {
          // Try to find JSON in the content first
          const jsonMatch = message.content.match(/```json\n([\s\S]*?)\n```/);
          
          if (jsonMatch) {
            // If we found JSON, parse it
            const jsonContent = JSON.parse(jsonMatch[1]);
            parsedResponse = {
              display: {
                signals: {
                  overall_sentiment: jsonContent.technical_indicator_signals.moving_averages.confidence,
                  indicators: [
                    {
                      name: "Moving Averages",
                      signal: jsonContent.technical_indicator_signals.moving_averages["50_day_sma"] < 
                             jsonContent.technical_indicator_signals.moving_averages["200_day_sma"] ? "sell" : "buy",
                      weight: jsonContent.technical_indicator_signals.moving_averages.confidence
                    },
                    {
                      name: "MACD",
                      signal: jsonContent.technical_indicator_signals.macd.signal,
                      weight: jsonContent.technical_indicator_signals.macd.confidence
                    }
                  ]
                }
              },
              full: jsonContent,
              timestamp: new Date().toISOString()
            };
          } else {
            // Handle pure markdown format
            const analysis = {
              display: {
                signals: {
                  overall_sentiment: extractConfidenceLevel(message.content),
                  indicators: []
                }
              },
              full: message.content,
              timestamp: new Date().toISOString()
            };
            parsedResponse = analysis;
          }
        } else {
          parsedResponse = message.content;
        }

        if (parsedResponse.display && parsedResponse.full) {
          const strategy = parsedResponse.full.recommended_trading_strategy;
          
          // Always update signals
          if (parsedResponse.display?.signals?.indicators) {
            updateTechnicalSignals({
              indicators: parsedResponse.display.signals.indicators
            });
          }
          
          // Update strategy panel if we have a valid strategy
          const timestamp = new Date();
          if (strategy) {
            const strategyData = {
              confidence: strategy.confidence || 60,
              type: 'Pattern Recognition',
              order_details: {
                limit_price: parseFloat(strategy.entry_price || 0),
                qty: parseInt(strategy.quantity || 100)
              },
              risk_management: {
                stop_loss: { stop_price: parseFloat(strategy.stop_loss || 0) },
                take_profit: { limit_price: parseFloat(strategy.take_profit || 0) }
              }
            };
            updateStrategyPanel(strategyData, parsedResponse.full);
            
            // Update last updated text with time difference
            setInterval(() => updateLastUpdated(timestamp), 1000);
            
            // Add click handler for trade execution
            executeTradeBtn.onclick = () => {
              chrome.runtime.sendMessage({
                type: 'executeTradeStrategy',
                strategy: parsedResponse.full
              });
              executeTradeBtn.disabled = true;
            };
          } else {
            console.log('No valid trading strategy in response');
            // Try to parse strategy from markdown
            const strategySection = parsedResponse.full.match(/Recommended Trading Strategy[^*]*(?=\*\*|$)/i)?.[0];
            if (strategySection) {
              const stopLossMatch = strategySection.match(/stop loss[^$]*\$(\d+\.?\d*)/i);
              const takeProfitMatch = strategySection.match(/take profit[^$]*\$(\d+\.?\d*)/i);
              const confidenceMatch = strategySection.match(/Confidence:\s*(\d+)%/i);
              
              if (stopLossMatch && takeProfitMatch) {
                const strategyData = {
                  confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 60,
                  type: 'Pattern Recognition',
                  order_details: {
                    limit_price: parseFloat(stopLossMatch[1]),
                    qty: 100
                  },
                  risk_management: {
                    stop_loss: { stop_price: parseFloat(stopLossMatch[1]) },
                    take_profit: { limit_price: parseFloat(takeProfitMatch[1]) }
                  }
                };
                updateStrategyPanel(strategyData, parsedResponse.full);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error handling AI response:', error, '\nContent:', message.content);
      }
    }
    if (message.type === 'settingsUpdated') {
      console.log('Settings updated:', message.settings);
      autoTrading = message.settings.autoTrading;
      checkApiKeys();
    }
  });

  // Function to update the "last updated" text
  function updateLastUpdated(timestamp) {
    const now = new Date();
    const diffSeconds = Math.floor((now - timestamp) / 1000);
    lastUpdated.textContent = `Last updated: ${diffSeconds} seconds ago`;
  }

  // Settings panel handlers
  settingsButton.addEventListener('click', () => {
    document.documentElement.classList.add('dark');
    settingsOverlay.removeAttribute('inert');
    requestAnimationFrame(() => {
      settingsOverlay.style.display = 'block';
      // Force reflow
      settingsOverlay.offsetHeight;
      settingsOverlay.style.opacity = '1';
      settingsOverlay.style.visibility = 'visible';
    });
  });

  closeSettingsButton.addEventListener('click', () => {
    settingsOverlay.style.opacity = '0';
    settingsOverlay.style.visibility = 'hidden';
    setTimeout(() => {
      settingsOverlay.style.display = 'none';
      settingsOverlay.setAttribute('inert', '');
    }, 300);
  });

  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
      settingsOverlay.style.opacity = '0';
      settingsOverlay.style.visibility = 'hidden';
      setTimeout(() => {
        settingsOverlay.style.display = 'none';
        settingsOverlay.setAttribute('inert', '');
      }, 300);
    }
  });

  // Initialize extension with retry mechanism
  async function initializeExtension(retries = 3) {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < retries; i++) {
      try {
        // Set initial model
        await chrome.runtime.sendMessage({ 
          type: 'setModel', 
          model: 'meta-llama/llama-3.2-90b-vision-instruct'
        });
        
        console.log('Extension initialized successfully');
        return;
      } catch (error) {
        console.warn(`Initialization attempt ${i + 1} failed:`, error);
        if (i === retries - 1) {
          console.error('Failed to initialize extension after', retries, 'attempts');
          updateStatus('Error connecting', 'error');
        } else {
          await delay(100); // Short delay between retries
        }
      }
    }
  }

  // Start initialization
  initializeExtension();
});
