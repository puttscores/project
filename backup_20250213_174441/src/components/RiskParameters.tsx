import React, { useState } from 'react';

interface RiskParameters {
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

const RiskParametersPanel = () => {
  const [riskParameters, setRiskParameters] = useState<RiskParameters>({
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
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setRiskParameters({
      ...riskParameters,
      [name]: value
    });
  };

  return (
    <div className="risk-parameters">
      <h2>Risk Parameters</h2>
      <div className="account-settings">
        <h3>Account Settings</h3>
        <div className="form-group">
          <label>Mode</label>
          <select name="account.mode" value={riskParameters.account.mode} onChange={handleChange}>
            <option value="paper">Paper Trading</option>
            <option value="live">Live Trading</option>
          </select>
        </div>
        <div className="form-group">
          <label>Max Position Size</label>
          <input
            type="number"
            name="account.maxPositionSize"
            value={riskParameters.account.maxPositionSize}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Max Drawdown</label>
          <input
            type="number"
            name="account.maxDrawdown"
            value={riskParameters.account.maxDrawdown}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Buying Power</label>
          <input
            type="number"
            name="account.buyingPower"
            value={riskParameters.account.buyingPower}
            onChange={handleChange}
          />
        </div>
      </div>
      {/* Add trading and strategy settings */}
    </div>
  );
};

export default RiskParametersPanel;
