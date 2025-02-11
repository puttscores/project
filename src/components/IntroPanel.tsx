import React, { useState } from 'react';

const introSteps = [
  {
    title: "Welcome to WorkBird AI Trading",
    content: "Where AI meets trading, and your money meets... well, let's make sure it meets more money! 🚀",
    subtext: "Don't worry, our AI is probably smarter than your last trade decision (no offense)."
  },
  {
    title: "Setup Required",
    content: "Just two things needed:",
    items: [
      "OpenRouter API Key - For our AI's big brain",
      "Alpaca API Keys - For the actual trading magic"
    ]
  },
  {
    title: "Risk Management",
    content: "Because YOLO is not a trading strategy"
  }
];

const IntroPanel = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const { title, content, subtext, items } = introSteps[currentStep];

  return (
    <div className="intro-panel">
      <h2>{title}</h2>
      <p>{content}</p>
      {subtext && <p className="subtext">{subtext}</p>}
      {items && (
        <ul>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      <div className="controls">
        {currentStep > 0 && (
          <button onClick={handlePrevious}>Previous</button>
        )}
        {currentStep < introSteps.length - 1 && (
          <button onClick={handleNext}>Next</button>
        )}
      </div>
    </div>
  );
};

export default IntroPanel;
