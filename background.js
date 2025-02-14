let screenshotInterval;
let analysisInterval = 60000; // Default to 1 minute
let lastScreenshotData = null;
let openrouterApiKey = '';
let alpacaApiKey = '';
let alpacaSecretKey = '';
let selectedModel = 'meta-llama/llama-3.2-11b-vision-instruct'; // Default to 11B model as specified
let tradeHistory = [];
let autoTrading = false;
let riskParameters = null;

// Load settings on startup
chrome.storage.local.get([
  'openrouterApiKey', 
  'alpacaApiKey', 
  'alpacaSecretKey', 
  'selectedModel',
  'analysisInterval',
  'autoTrading'
,
  'riskParameters'
], (result) => {
  if (result.openrouterApiKey) {
    openrouterApiKey = result.openrouterApiKey;
  }
  if (result.alpacaApiKey) {
    alpacaApiKey = result.alpacaApiKey;
  }
  if (result.alpacaSecretKey) {
    alpacaSecretKey = result.alpacaSecretKey;
  }
  if (result.selectedModel) {
    selectedModel = result.selectedModel;
    console.log('Loaded model from settings:', selectedModel);
  }
  if (result.analysisInterval) {
    analysisInterval = parseInt(result.analysisInterval) * 1000; // Convert to milliseconds
  }
  if (result.autoTrading !== undefined) {
    autoTrading = result.autoTrading;
  }
  if (result.riskParameters) {
    riskParameters = JSON.parse(result.riskParameters);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.type === 'startAnalysis') {
        await startScreenshotCapture();
        sendResponse({ status: 'started' });
      } else if (request.type === 'stopAnalysis') {
        stopScreenshotCapture();
        sendResponse({ status: 'stopped' });
      } else if (request.type === 'setApiKey') {
        openrouterApiKey = request.apiKey;
        sendResponse({ status: 'api key set' });
      } else if (request.type === 'setAlpacaKey') {
        alpacaApiKey = request.apiKey;
        alpacaSecretKey = request.secretKey;
        sendResponse({ status: 'alpaca keys set' });
      } else if (request.type === 'setModel') {
        selectedModel = request.model;
        console.log('Model updated:', selectedModel);
        sendResponse({ status: 'model set' });
      } else if (request.type === 'executeTradeStrategy') {
        if (!autoTrading) {
          sendResponse({ status: 'skipped', message: 'Auto-trading is disabled' });
          return;
        }
        await executeTradeStrategy(request.strategy);
        sendResponse({ status: 'trade executed' });
      } else if (request.type === 'settingsUpdated') {
        // Update local settings
        openrouterApiKey = request.settings.openrouterApiKey;
        alpacaApiKey = request.settings.alpacaApiKey;
        alpacaSecretKey = request.settings.alpacaSecretKey;
        
        // Update model if changed
        if (selectedModel !== request.settings.selectedModel) {
          selectedModel = request.settings.selectedModel;
          console.log('Model updated from settings:', selectedModel);
        }
        
        autoTrading = request.settings.autoTrading;

        // Update risk parameters
        if (request.settings.riskParameters) {
          riskParameters = JSON.parse(request.settings.riskParameters);
        }
        
        // Update analysis interval and restart capture if running
        const newInterval = parseInt(request.settings.analysisInterval) * 1000;
        if (newInterval !== analysisInterval) {
          analysisInterval = newInterval;
          if (isAnalyzing) {
            stopScreenshotCapture();
            await startScreenshotCapture();
          }
        }
        
        sendResponse({ status: 'settings updated' });
      }
    } catch (error) {
      console.error('Error in message handler:', error);
      sendResponse({ status: 'error', message: error.message });
    }
  })();
  return true; // Keep the message channel open for async response
});

let isAnalyzing = false;

async function startScreenshotCapture() {
  // Stop any existing interval first
  stopScreenshotCapture();

  // Only start if not already analyzing
  if (isAnalyzing) {
    console.error('Analysis already in progress');
    return;
  }

  console.log('Starting analysis with model:', selectedModel);
  isAnalyzing = true;
  screenshotInterval = setInterval(async () => {
    if (!isAnalyzing) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      const screenshot = await chrome.tabs.captureVisibleTab();
      if (isAnalyzing) {
        await analyzeScreenshot(screenshot);
      }
    } catch (error) {
      console.error('Screenshot capture error:', error);
      sendAIResponse(`Error capturing screenshot: ${error.message}`);
    }
  }, analysisInterval);
}

function stopScreenshotCapture() {
  isAnalyzing = false;
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
}

async function getAccountBalance() {
  try {
    const response = await fetch('https://paper-api.alpaca.markets/v2/account', {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaSecretKey
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch account balance');
    }
    
    const account = await response.json();
    return parseFloat(account.cash);
  } catch (error) {
    console.error('Error fetching account balance:', error);
    return 10000; // Default to $10,000 if can't fetch balance
  }
}

function calculateRiskAmount(balance) {
  // Use 5% of account balance for risk management
  return balance * 0.05;
}

function parseAIResponse(content) {
  try {
    // Extract JSON from markdown code block or content
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      throw new Error('No JSON found in response');
    }
    // Get the JSON content and clean it up
    const jsonContent = jsonMatch[1] || jsonMatch[0];
    const cleanJson = jsonContent.trim();
    console.log('Found JSON:', cleanJson);
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      throw new Error('No valid JSON found in response');
    }
  } catch (e) {
    console.error('JSON parsing failed:', e);
    const defaultAnalysis = {
      trend: {
        direction: "neutral",
        strength: 50,
        key_levels: {
          support: [],
          resistance: [],
          explanation: "No levels detected"
        }
      },
      patterns: [],
      signals: {
        overall_sentiment: 50,
        indicators: []
      }
    };
    console.log('Using default analysis:', defaultAnalysis);
    return defaultAnalysis;
  }
}

async function analyzeScreenshot(screenshotData) {
  if (!isAnalyzing) return;

  if (!openrouterApiKey) {
    sendAIResponse('Error: OpenRouter API key not set');
    return;
  }

  try {
    const changes = await detectChanges(screenshotData);
    if (!changes) return;

    const balance = await getAccountBalance();
    const riskAmount = calculateRiskAmount(balance);
    // Use default risk parameters if none are set
    const defaultRiskParams = {
      account: {
        mode: 'paper',
        maxPositionSize: 1000,
        maxDrawdown: 10,
        buyingPower: balance
      },
      trading: {
        maxLossPerTrade: 2,
        stopLossPercentage: 2,
        takeProfitRatio: 2,
        maxOpenPositions: 5,
        trailingStopEnabled: true,
        trailingStopDistance: 1
      },
      strategy: {
        minConfidenceScore: 70,
        requiredSignals: 2,
        timeframePreference: ['1h', '4h', '1d'],
        patternWeight: 0.4,
        indicatorWeight: 0.6
      }
    };

    console.log('Analyzing with model:', selectedModel);

    const analysisPrompt = {
      system: `You are an expert trading analyst. Analyze charts and provide trading recommendations in the following JSON format:
        CRITICAL: Return ONLY this exact JSON object - no text, no markdown, no code blocks, no explanations. The response must be a valid JSON object:
        {
          "trend": {
            "direction": "bullish/bearish",
            "strength": 0-100,
            "key_levels": {
              "support": [array of price levels],
              "resistance": [array of price levels],
              "explanation": "reason for levels"
            }
          },
          "patterns": [
            {
              "name": "pattern name",
              "status": "forming/confirmed",
              "confidence": 0-100
            }
          ],
          "signals": {
            "overall_sentiment": 0-100,
            "indicators": [
              {
                "name": "indicator name",
                "signal": "buy/sell",
                "weight": 0-100
              }
            ],
            "overall_sentiment": 0-100,
            "key_metrics": [
              "50_day_sma",
              "200_day_sma"
            ]
          }
        }

        Rules:
        1. DO NOT include any text, markdown, or explanations - ONLY the JSON object
        2. All prices must be valid numbers without $ symbol
        3. Confidence must be >= ${(riskParameters || defaultRiskParams).strategy.minConfidenceScore}% to generate trading strategy
        4. Maximum position size is $${(riskParameters || defaultRiskParams).account.maxPositionSize}
        5. Maximum loss per trade is ${(riskParameters || defaultRiskParams).trading.maxLossPerTrade}%
        6. Stop loss set at ${(riskParameters || defaultRiskParams).trading.stopLossPercentage}%
        7. Take profit ratio is ${(riskParameters || defaultRiskParams).trading.takeProfitRatio}x the risk
        8. Maximum open positions: ${(riskParameters || defaultRiskParams).trading.maxOpenPositions}
        9. Pattern weight: ${(riskParameters || defaultRiskParams).strategy.patternWeight}
        10. Indicator weight: ${(riskParameters || defaultRiskParams).strategy.indicatorWeight}
        11. Required signals: ${(riskParameters || defaultRiskParams).strategy.requiredSignals}
        12. Preferred timeframes: ${(riskParameters || defaultRiskParams).strategy.timeframePreference.join(', ')}`,
      user: `Analyze this chart and return ONLY the JSON object - no text, no markdown, no explanations.
        Account Balance: $${balance.toFixed(2)}
        Trading Mode: ${(riskParameters || defaultRiskParams).account.mode}
        Max Position Size: $${(riskParameters || defaultRiskParams).account.maxPositionSize}
        
CRITICAL: The response must be a valid JSON object without any surrounding text or markdown formatting.`
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'AI Trading Assistant'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: analysisPrompt.system
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt.user
              },
              {
                type: 'image_url',
                image_url: { url: screenshotData }
              }
            ]
          }
        ]
      })
    });

    const result = await response.json();
    console.log('AI Response:', result);

    if (result.choices && result.choices[0]) {
      console.log('Raw AI response content:', result.choices[0].message.content);
      const fullAnalysis = parseAIResponse(result.choices[0].message.content);
      console.log('Parsed analysis:', fullAnalysis);
      
      const displayAnalysis = {
        trend: {
          direction: fullAnalysis.trend?.direction || "neutral",
          strength: fullAnalysis.trend?.strength || 50,
          key_levels: fullAnalysis.trend?.key_levels || {
            support: [],
            resistance: [],
            explanation: "No levels detected"
          }
        },
        patterns: fullAnalysis.patterns?.map(p => ({
          name: p.name,
          confidence: p.confidence
        })) || [],
        signals: {
          overall_sentiment: fullAnalysis.signals?.overall_sentiment || 50,
          indicators: fullAnalysis.signals?.indicators || []
        }
      };

      const response = {
        display: displayAnalysis,
        full: fullAnalysis,
        timestamp: new Date().toISOString()
      };
      console.log('Sending to popup:', response);
      sendAIResponse(JSON.stringify(response));
      console.log('Sent response to popup');
    }

    lastScreenshotData = screenshotData;
  } catch (error) {
    console.error('Analysis error:', error);
    sendAIResponse(`Error analyzing screenshot: ${error.message}`);
  }
}

async function detectChanges(newScreenshotData) {
  if (!lastScreenshotData) {
    return true; // First screenshot, always analyze
  }

  // Basic change detection - compare data URLs
  // In a production environment you'd want more sophisticated image comparison
  return newScreenshotData !== lastScreenshotData;
}

async function executeTradeStrategy(strategy) {
  if (!alpacaApiKey || !alpacaSecretKey) {
    sendAIResponse('Error: Alpaca API keys not set');
    return;
  }

  const defaultRiskParams = {
    account: {
      mode: 'paper',
      maxPositionSize: 1000,
      maxDrawdown: 10,
      buyingPower: 10000
    },
    trading: {
      maxLossPerTrade: 2,
      stopLossPercentage: 2,
      takeProfitRatio: 2,
      maxOpenPositions: 5,
      trailingStopEnabled: true,
      trailingStopDistance: 1
    },
    strategy: {
      minConfidenceScore: 70,
      requiredSignals: 2,
      timeframePreference: ['1h', '4h', '1d'],
      patternWeight: 0.4,
      indicatorWeight: 0.6
    }
  };

  const currentRiskParams = riskParameters || defaultRiskParams;

  try {
    // Validate strategy confidence
    if (!strategy.recommended_trading_strategy?.confidence || 
        strategy.recommended_trading_strategy.confidence < currentRiskParams.strategy.minConfidenceScore) {
      console.log('Trade skipped: Confidence below threshold');
      return;
    }

    const orderDetails = strategy.recommended_trading_strategy;
    const balance = await getAccountBalance();

    // Validate position size against max position size
    const positionSize = orderDetails.order_details.qty * orderDetails.order_details.price;
    if (positionSize > currentRiskParams.account.maxPositionSize) {
      console.log('Trade skipped: Position size exceeds maximum');
      return;
    }

    // Check if we're under max drawdown
    if (balance < currentRiskParams.account.buyingPower * (1 - currentRiskParams.account.maxDrawdown / 100)) {
      console.log('Trade skipped: Account drawdown exceeds maximum');
      return;
    }

    // Get current open positions
    const positions = await fetch('https://paper-api.alpaca.markets/v2/positions', {
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaSecretKey
      }
    }).then(res => res.json());

    // Check max open positions
    if (positions.length >= currentRiskParams.trading.maxOpenPositions) {
      console.log('Trade skipped: Maximum open positions reached');
      return;
    }
    
    // Construct order based on strategy type
    const order = {
      symbol: orderDetails.symbol,
      side: orderDetails.side,
      type: orderDetails.order_details.type,
      time_in_force: orderDetails.order_details.time_in_force,
      qty: orderDetails.order_details.qty,
      extended_hours: orderDetails.order_details.extended_hours || false
    };

    // Add conditional parameters based on order type
    if (['limit', 'stop_limit'].includes(order.type)) {
      order.limit_price = orderDetails.order_details.limit_price;
    }

    if (['stop', 'stop_limit'].includes(order.type)) {
      order.stop_price = orderDetails.order_details.stop_price;
    }

    if (order.type === 'trailing_stop') {
      if (orderDetails.order_details.trail_price) {
        order.trail_price = orderDetails.order_details.trail_price;
      } else if (orderDetails.order_details.trail_percent) {
        order.trail_percent = orderDetails.order_details.trail_percent;
      }
    }

    // Calculate stop loss and take profit based on risk parameters
    const entryPrice = orderDetails.order_details.price;
    const stopLossAmount = entryPrice * (currentRiskParams.trading.stopLossPercentage / 100);
    const stopLossPrice = order.side === 'buy' 
      ? entryPrice - stopLossAmount 
      : entryPrice + stopLossAmount;

    const takeProfitAmount = stopLossAmount * currentRiskParams.trading.takeProfitRatio;
    const takeProfitPrice = order.side === 'buy'
      ? entryPrice + takeProfitAmount
      : entryPrice - takeProfitAmount;

    // Add stop loss
    order.stop_loss = {
      stop_price: stopLossPrice,
      limit_price: stopLossPrice // Market order when stop is triggered
    };

    // Add take profit
    order.take_profit = {
      limit_price: takeProfitPrice
    }
;

    // Add trailing stop if enabled
    if (currentRiskParams.trading.trailingStopEnabled) {
      order.trail_percent = currentRiskParams.trading.trailingStopDistance;
    }

    // Execute order through Alpaca API
    const response = await fetch('https://paper-api.alpaca.markets/v2/orders', {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': alpacaApiKey,
        'APCA-API-SECRET-KEY': alpacaSecretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Alpaca API error: ${error.message}`);
    }

    const result = await response.json();
    
    // Store trade in history
    const tradeDetails = {
      order: result,
      strategy: orderDetails,
      timestamp: new Date().toISOString()
    };
    tradeHistory.push(tradeDetails);

    // Send confirmation message
    const confirmationMessage = formatTradeConfirmation(result, orderDetails);
    sendAIResponse(confirmationMessage);

    // Notify popup of trade history update
    chrome.runtime.sendMessage({
      type: 'tradeHistory',
      history: tradeHistory
    });

  } catch (error) {
    console.error('Trade execution error:', error);
    sendAIResponse(`Error executing trade strategy: ${error.message}`);
  }
}

function formatTradeConfirmation(order, strategy) {
  const emoji = order.side === 'buy' ? '🚀' : '📉';
  return `${emoji} Trade Executed Successfully\n\n` +
    `Symbol: ${order.symbol}\n` +
    `Side: ${order.side.toUpperCase()}\n` +
    `Order Type: ${order.type.toUpperCase()}\n` +
    `Quantity: ${order.qty} shares\n` +
    `Time in Force: ${order.time_in_force.toUpperCase()}\n` +
    `Extended Hours: ${order.extended_hours ? 'Yes' : 'No'}\n\n` +
    
    `Risk Management:\n` +
    (order.stop_loss ? `- Stop Loss: $${order.stop_loss.stop_price}\n` : '') +
    (order.take_profit ? `- Take Profit: $${order.take_profit.limit_price}\n` : '') +
    
    `Additional Parameters:\n` +
    (order.limit_price ? `- Limit Price: $${order.limit_price}\n` : '') +
    (order.stop_price ? `- Stop Price: $${order.stop_price}\n` : '') +
    (order.trail_price ? `- Trail Price: $${order.trail_price}\n` : '') +
    (order.trail_percent ? `- Trail Percent: ${order.trail_percent}%\n` : '') +
    
    `\nConfidence: ${strategy.confidence}%`;
}

function sendAIResponse(content) {
  console.log('Sending AI response to popup:', content);
  chrome.runtime.sendMessage({
    type: 'aiResponse',
    content
  });
}
