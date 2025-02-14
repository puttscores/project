import { Logger } from './logger';

declare const chrome: any;

// Types previously imported from drawing.ts
interface Point {
  x: number;
  y: number;
}

interface LineStyle {
  color: string;
  width: number;
  dash?: number[];
}

interface PatternStyle {
  fillColor: string;
  borderColor: string;
  width: number;
}

export interface RiskParameters {
  account: {
    mode: 'paper' | 'live';
    maxPositionSize: number;
    maxDrawdown: number;
    buyingPower: number;
  };
  trading: {
    maxLossPerTrade: number;
    stopLossPercentage: number;
    takeProfitRatio: number;
    maxOpenPositions: number;
    trailingStopEnabled: boolean;
    trailingStopDistance: number;
  };
  strategy: {
    minConfidenceScore: number;
    requiredSignals: number;
    timeframePreference: string[];
    patternWeight: number;
    indicatorWeight: number;
  };
}

interface AnalysisRequirements {
  technical: {
    patterns: {
      chart_patterns: string[];
      candlestick_patterns: string[];
      trend_lines: {
        support_levels: boolean;
        resistance_levels: boolean;
        trend_channels: boolean;
      };
    };
    indicators: {
      momentum: string[];
      trend: string[];
      volume: string[];
    };
    timeframes: string[];
  };
  drawing_instructions: {
    trend_lines: LineStyle;
    support_resistance: LineStyle;
    pattern_areas: PatternStyle;
  };
  risk_parameters: RiskParameters;
}

export interface AnalysisPrompt {
  system: {
    role: string;
    capabilities: string[];
    output_style: string;
  };
  analysis_requirements: AnalysisRequirements;
  output_format: {
    summary: {
      trend: {
        direction: string;
        strength: number;
        reasoning: string;
      };
      key_levels: {
        support: number[];
        resistance: number[];
        explanation: string;
      };
      patterns: Array<{
        name: string;
        status: 'forming' | 'confirmed' | 'broken';
        confidence: number;
        target: number;
        reasoning: string;
      }>;
      signals: {
        primary: string;
        confidence: number;
        reasoning: string;
        timeframe: string;
      };
    };
    drawing_coordinates: Array<{
      type: 'trend_line' | 'support' | 'resistance' | 'pattern';
      start?: Point;
      end?: Point;
      points?: Point[];
      style: LineStyle | PatternStyle;
    }>;
  };
}

export interface AnalysisResponse {
  quick_summary: string;
  key_points: string[];
  action_items: string[];
  trend: {
    direction: 'up' | 'down' | 'neutral';
    strength: number;
    key_levels: {
      support: number[];
      resistance: number[];
      explanation: string;
    };
  };
  signals: {
    primary: string;
    confidence: number;
    reasoning: string;
    timeframe: string;
    indicators: Array<{
      name: string;
      signal: string;
      weight: number;
    }>;
  };
  drawing_instructions: Array<{
    type: 'trend_line' | 'support' | 'resistance' | 'pattern';
    coordinates: {
      start?: Point;
      end?: Point;
      points?: Point[];
      level?: number;
    };
    style: LineStyle | PatternStyle;
    label?: string;
  }>;
}

export class AnalysisService {
  private static buildPrompt(screenshot: string, riskParams: RiskParameters): AnalysisPrompt {
    Logger.debug('Analysis', 'Building analysis prompt', { riskParams });

    const requirements: AnalysisRequirements = {
      technical: {
        patterns: {
          chart_patterns: ["Head & Shoulders", "Double Top/Bottom", "Triangles", "Wedges"],
          candlestick_patterns: ["Doji", "Engulfing", "Hammer", "Morning/Evening Star"],
          trend_lines: {
            support_levels: true,
            resistance_levels: true,
            trend_channels: true
          }
        },
        indicators: {
          momentum: ["RSI", "MACD", "Stochastic"],
          trend: ["Moving Averages", "ADX", "Bollinger Bands"],
          volume: ["Volume Profile", "OBV", "Money Flow"]
        },
        timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"]
      },
      drawing_instructions: {
        trend_lines: {
          color: "#3b82f6",
          width: 2,
          dash: [5, 5]
        },
        support_resistance: {
          color: "#059669",
          width: 2
        },
        pattern_areas: {
          fillColor: "rgba(59, 130, 246, 0.1)",
          borderColor: "#3b82f6",
          width: 2
        }
      },
      risk_parameters: riskParams
    };

    return {
      system: {
        role: "expert_analyst",
        capabilities: [
          "pattern_recognition",
          "trend_analysis",
          "support_resistance",
          "indicator_analysis",
          "risk_assessment"
        ],
        output_style: "concise_summary"
      },
      analysis_requirements: requirements,
      output_format: {
        summary: {
          trend: {
            direction: "string",
            strength: 0,
            reasoning: "string"
          },
          key_levels: {
            support: [],
            resistance: [],
            explanation: "string"
          },
          patterns: [],
          signals: {
            primary: "string",
            confidence: 0,
            reasoning: "string",
            timeframe: "string"
          }
        },
        drawing_coordinates: []
      }
    };
  }

  static async analyzeScreenshot(
    screenshot: string,
    riskParams: RiskParameters,
    apiKey: string
  ): Promise<AnalysisResponse> {
    Logger.info('Analysis', 'Starting screenshot analysis');
    
    try {
      const prompt = this.buildPrompt(screenshot, riskParams);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'AI Trading Assistant'
        },
        body: JSON.stringify({
          model: "openai/gpt-4-vision-preview",
          messages: [
            {
              role: 'system',
              content: JSON.stringify(prompt.system)
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(prompt.analysis_requirements)
                },
                {
                  type: 'image_url',
                  image_url: { url: screenshot }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();
      Logger.debug('Analysis', 'Received API response', result);

      // Parse and validate the response
      const analysisResponse = this.parseResponse(result);
      Logger.info('Analysis', 'Analysis completed successfully');

      return analysisResponse;
    } catch (error) {
      Logger.error('Analysis', 'Analysis failed', error);
      throw error;
    }
  }

  private static parseResponse(apiResponse: any): AnalysisResponse {
    try {
      const content = apiResponse.choices[0].message.content;
      let parsed = JSON.parse(content);
      
      // Normalize trend and sentiment data
      const trend = parsed.summary?.trend || {};
      const signals = parsed.summary?.signals || {};
      
      // Helper function to normalize direction
      const normalizeDirection = (dir?: string): 'up' | 'down' | 'neutral' => {
        const direction = dir?.toLowerCase() || '';
        if (direction === 'upward' || direction === 'up') return 'up';
        if (direction === 'downward' || direction === 'down') return 'down';
        return 'neutral';
      };
      
      // Ensure consistent trend direction format
      const normalizedTrend = {
        direction: normalizeDirection(trend.direction),
        strength: trend.strength || 0,
        key_levels: {
          support: Array.isArray(trend.key_levels?.support) ? trend.key_levels.support : [],
          resistance: Array.isArray(trend.key_levels?.resistance) ? trend.key_levels.resistance : [],
          explanation: trend.key_levels?.explanation || ''
        }
      };

      // Validate the response format
      if (!parsed.quick_summary || !Array.isArray(parsed.key_points)) {
        throw new Error('Invalid response format');
      }

      return {
        quick_summary: parsed.quick_summary,
        key_points: parsed.key_points,
        action_items: parsed.action_items || [],
        trend: normalizedTrend,
        signals: {
          primary: signals.primary || '',
          confidence: signals.confidence || 0,
          reasoning: signals.reasoning || '',
          timeframe: signals.timeframe || '',
          indicators: signals.indicators || []
        },
        drawing_instructions: parsed.drawing_instructions || []
      };
    } catch (error) {
      Logger.error('Analysis', 'Failed to parse API response', error);
      throw new Error('Failed to parse analysis response');
    }
  }
}
