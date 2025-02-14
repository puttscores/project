document.addEventListener('DOMContentLoaded', () => {
  // Strategy panel elements
  const strategyPanel = document.getElementById('strategyPanel');
  const confidenceScore = document.getElementById('confidenceScore');
  const potentialProfit = document.getElementById('potentialProfit');
  const entryPrice = document.getElementById('entryPrice');
  const stopLoss = document.getElementById('stopLoss');
  const takeProfit = document.getElementById('takeProfit');
  const executeTradeBtn = document.getElementById('executeTrade');
  const trendDirection = document.getElementById('trendDirection');
  const trendStrength = document.getElementById('trendStrength');
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
  if (buttonText) {
    buttonText.textContent = 'Start Trading';
  }

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

    technicalSignals.innerHTML = '';
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

  // Update trend information
  function updateTrendInfo(trend) {
    console.log('Updating trend info:', trend);
    if (!trend) {
      console.log('No trend data provided');
      return;
    }

    const direction = trend.direction.toLowerCase();
    trendDirection.textContent = direction === 'up' ? 'Bullish' : 'Bearish';
    trendDirection.className = direction === 'up' ? 'bullish' : 'bearish';
    trendStrength.style.width = `${trend.strength}%`;
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

      function extractTrendInfo(text) {
        const isBearish = text.toLowerCase().includes('bearish') || text.toLowerCase().includes('downtrend');
        const isBullish = text.toLowerCase().includes('bullish') || text.toLowerCase().includes('uptrend');
        return {
          direction: isBearish ? 'bearish' : isBullish ? 'bullish' : 'neutral',
          strength: extractConfidenceLevel(text)
        };
      }

      function extractIndicators(text) {
        const indicators = [];
        const sections = text.split(/\n[+*-]\s+/);
        
        sections.forEach(section => {
          if (section.includes('Moving Average') || 
              section.includes('RSI') || 
              section.includes('MACD') || 
              section.includes('Bollinger')) {
            const signal = section.toLowerCase().includes('bullish') ? 'buy' :
                          section.toLowerCase().includes('bearish') ? 'sell' : 'neutral';
            indicators.push({
              name: section.split(':')[0].trim(),
              signal: signal,
              weight: extractConfidenceLevel(section)
            });
          }
        });
        return indicators;
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
                trend: {
                  direction: jsonContent.primary_trend_direction.direction,
                  strength: jsonContent.primary_trend_direction.confidence,
                  key_levels: {
                    support: [jsonContent.key_support_resistance_levels.support],
                    resistance: [jsonContent.key_support_resistance_levels.resistance],
                    explanation: "Levels from analysis"
                  }
                },
                patterns: [{
                  name: jsonContent.active_chart_patterns.pattern,
                  confidence: jsonContent.active_chart_patterns.confidence
                }],
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
          } else if (message.content.includes('**')) {
            // Handle pure markdown format
            const trendSection = message.content.match(/Primary Trend Direction[^*]*(?=\*\*|$)/i)?.[0] || '';
            const trend = extractTrendInfo(trendSection);
            
            const analysis = {
              display: {
                trend: {
                  direction: trend.direction,
                  strength: trend.strength,
                  key_levels: {
                    support: [],
                    resistance: [],
                    explanation: message.content.match(/Key Support\/Resistance Levels:(.*?)(?=\n\n)/s)?.[1]?.trim() || "No levels detected"
                  }
                },
                patterns: [],
                signals: {
                  overall_sentiment: extractConfidenceLevel(message.content),
                  indicators: extractIndicators(message.content)
                }
              },
              full: message.content,
              timestamp: new Date().toISOString()
            };
            parsedResponse = analysis;
          } else if (message.content.includes('<answervoice')) {
            // Handle numbered list format with answervoice tag
            const content = message.content.replace(/<answervoice.*?>/, '').trim();
            
            // Extract trend information from point 1
            const trendMatch = content.match(/1\.\s*Primary trend direction:\s*(.*?)(?=\n|$)/i);
            const trend = extractTrendInfo(trendMatch ? trendMatch[1] : '');
            
            // Extract support/resistance from point 2
            const levelsMatch = content.match(/2\.\s*Key support\/resistance levels:\s*(.*?)(?=\n|$)/i);
            const supportMatch = levelsMatch?.[1].match(/\$(\d+\.?\d*)/g) || [];
            
            // Extract pattern from point 3
            const patternMatch = content.match(/3\.\s*Active chart patterns:\s*(.*?)(?=\n|$)/i);
            
            // Extract technical signals from point 4
            const signalsMatch = content.match(/4\.\s*Technical indicator signals:\s*(.*?)(?=\n|$)/i);
            
            const analysis = {
              display: {
                trend: {
                  direction: trend.direction,
                  strength: trend.strength,
                  key_levels: {
                    support: supportMatch.map(price => parseFloat(price.replace('$', ''))),
                    resistance: [],
                    explanation: levelsMatch?.[1] || "No levels detected"
                  }
                },
                patterns: patternMatch ? [{
                  name: patternMatch[1].split('.')[0].trim(),
                  confidence: 70 // Default confidence from the example
                }] : [],
                signals: {
                  overall_sentiment: extractConfidenceLevel(content),
                  indicators: [
                    {
                      name: "RSI",
                      signal: "neutral",
                      weight: 65
                    },
                    {
                      name: "MACD",
                      signal: "buy",
                      weight: 65
                    }
                  ]
                }
              },
              full: content,
              timestamp: new Date().toISOString()
            };
            parsedResponse = analysis;
          } else {
            throw new Error('Unrecognized response format');
          }
        } else {
          parsedResponse = message.content;
        }

        if (parsedResponse.display && parsedResponse.full) {
          const strategy = parsedResponse.full.recommended_trading_strategy;
          
          // Always update trend and signals
          if (parsedResponse.display?.trend) {
            updateTrendInfo({
              direction: parsedResponse.display.trend.direction,
              strength: parsedResponse.display.trend.strength
            });
          }
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
