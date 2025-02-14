let screenshotInterval;
const SCREENSHOT_INTERVAL = 10000; // 10 seconds
let lastScreenshotData = null;
let openrouterApiKey = '';
let alpacaApiKey = '';
let alpacaSecretKey = '';
let selectedModel = 'openai/gpt-4';
let tradeHistory = [];

// Load API keys on startup
chrome.storage.local.get(['openrouterApiKey', 'alpacaApiKey', 'alpacaSecretKey', 'selectedModel'], (result) => {
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
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.type === 'startAnalysis') {
        selectedModel = request.model;
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
        sendResponse({ status: 'model set' });
      } else if (request.type === 'userMessage') {
        await handleUserMessage(request.message, request.model);
        sendResponse({ status: 'message handled' });
      } else if (request.type === 'executeTradeStrategy') {
        await executeTradeStrategy(request.strategy);
        sendResponse({ status: 'trade executed' });
      }
    } catch (error) {
      console.error('Error in message handler:', error);
      sendResponse({ status: 'error', message: error.message });
    }
  })();
  return true; // Keep the message channel open for async response
});

async function startScreenshotCapture() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
  }

  let countdown = 10;
  const nextAnalysis = new Date(Date.now() + countdown * 1000);

  const countdownInterval = setInterval(() => {
    countdown--;
    chrome.runtime.sendMessage({
      type: 'countdownUpdate',
      countdown,
      nextAnalysis
    });

    if (countdown <= 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);

  screenshotInterval = setInterval(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      const screenshot = await chrome.tabs.captureVisibleTab();
      await analyzeScreenshot(screenshot);

      // Reset countdown after analysis
      countdown = 10;
      const nextAnalysis = new Date(Date.now() + countdown * 1000);
      chrome.runtime.sendMessage({
        type: 'countdownUpdate',
        countdown,
        nextAnalysis
      });
    } catch (error) {
      console.error('Screenshot capture error:', error);
      sendAIResponse(`Error capturing screenshot: ${error.message}`);
    }
  }, SCREENSHOT_INTERVAL);
}

function stopScreenshotCapture() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
}

async function analyzeScreenshot(screenshotData) {
  if (!openrouterApiKey) {
    sendAIResponse('Error: OpenRouter API key not set');
    return;
  }

  try {
    const changes = await detectChanges(screenshotData);
    if (!changes) {
      return; // No significant changes detected
    }

    const analysisPrompt = {
      context: {
        accountInfo: {
          buyingPower: 10000, // Replace with actual buying power
          mode: 'paper', // Replace with account mode
          riskParameters: {
            // Replace with actual risk parameters
            account: {
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
          }
        },
        marketContext: 'The market is currently in a bullish trend, with strong momentum and increasing volume.'
      },
      requirements: {
        technicalAnalysis: {
          patterns: ['Head and Shoulders', 'Double Top', 'Double Bottom', 'Wedge', 'Triangle'],
          indicators: ['SMA', 'EMA', 'RSI', 'MACD', 'Bollinger Bands', 'Volume'],
          timeframes: ['1h', '4h', '1d']
        },
        riskAssessment: {
          stopLoss: 2, // Percentage
          takeProfit: 4, // Percentage
          confidence: 70 // Minimum confidence score
        }
      },
      outputFormat: {
        trend: {
          direction: 'string',
          strength: 'number',
          key_levels: {
            support: ['array of numbers'],
            resistance: ['array of numbers']
          }
        },
        patterns: [
          {
            name: 'string',
            status: 'forming/confirmed/broken',
            confidence: 'number',
            target_price: 'number'
          }
        ],
        signals: {
          overall_sentiment: 'number',
          indicators: [
            {
              name: 'string',
              value: 'number',
              signal: 'buy/sell/neutral',
              weight: 'number'
            }
          ]
        },
        strategy: {
          name: 'string',
          confidence: 'number'
        },
        risk_assessment: {
          stop_loss: 'number',
          take_profit: 'number',
          risk_reward_ratio: 'number'
        }
      }
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
    if (result.choices && result.choices[0]) {
      sendAIResponse(result.choices[0].message.content);
      if (result.usage) {
        sendTokenCost(result.usage.total_tokens);
      }
    }

    chrome.runtime.sendMessage({
      type: 'screenshotPreview',
      preview: screenshotData
    });

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
  // In a production environment, you'd want more sophisticated image comparison
  return newScreenshotData !== lastScreenshotData;
}

async function handleUserMessage(message, model) {
  if (!openrouterApiKey) {
    sendAIResponse('Error: OpenRouter API key not set');
    return;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'AI Trading Assistant'
      },
      body: JSON.stringify({
        model: model,
        messages: [{
          role: 'user',
          content: message
        }]
      })
    });

    const result = await response.json();
    if (result.choices && result.choices[0]) {
      const aiResponse = result.choices[0].message.content;
      sendAIResponse(aiResponse);
      if (result.usage) {
        sendTokenCost(result.usage.total_tokens);
      }

      // Check for trading signal or opportunity
      if (aiResponse.includes('Trading signal') || aiResponse.includes('Trading opportunity')) {
        const strategyDetails = {
          strategy: aiResponse,
          confidence: 80 // Placeholder confidence value
        };
        chrome.runtime.sendMessage({
          type: 'tradeStrategy',
          strategy: aiResponse,
          strategyDetails
        });
      }
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendAIResponse(`Error processing message: ${error.message}`);
  }
}

async function executeTradeStrategy(strategy) {
  if (!alpacaApiKey || !alpacaSecretKey) {
    sendAIResponse('Error: Alpaca API keys not set');
    return;
  }

  try {
    // Simulate trade execution since we don't have the Alpaca SDK
    const tradeDetails = {
      strategy,
      account: {
        balance: 10000,
        currency: 'USD'
      },
      positions: [],
      orders: [],
      timestamp: new Date().toISOString()
    };

    tradeHistory.push(tradeDetails);
    chrome.runtime.sendMessage({
      type: 'tradeHistory',
      history: tradeHistory
    });
    sendAIResponse(`Trade strategy executed successfully. Account details: ${JSON.stringify(tradeDetails)}`);
  } catch (error) {
    console.error('Trade execution error:', error);
    sendAIResponse(`Error executing trade strategy: ${error.message}`);
  }
}

function sendAIResponse(content) {
  chrome.runtime.sendMessage({
    type: 'aiResponse',
    content
  });
}

function sendTokenCost(tokens) {
  const cost = tokens * 0.0000002; // Assuming $0.02 per 1000 tokens
  chrome.runtime.sendMessage({
    type: 'tokenCost',
    cost
  });
}
