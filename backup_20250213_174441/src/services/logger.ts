type LogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';

interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

declare global {
  interface Performance {
    memory?: PerformanceMemory;
  }
}

// Console Logger for popup UI
export const ConsoleLogger = {
  container: null as HTMLElement | null,
  maxLines: 100,

  init() {
    this.container = document.getElementById('consoleOutput');
    this.setupClearButton();
  },

  setupClearButton() {
    const clearButton = document.getElementById('clearConsole');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.clear();
      });
    }
  },

  log(type: string, message: string, data: any = '') {
    if (!this.container) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    const dataStr = data ? (typeof data === 'object' ? JSON.stringify(data, null, 2) : data) : '';
    line.textContent = `[${timestamp}] ${message} ${dataStr}`;

    this.container.appendChild(line);
    this.container.scrollTop = this.container.scrollHeight;

    // Limit number of lines
    while (this.container.children.length > this.maxLines) {
      const firstChild = this.container.firstChild;
      if (firstChild) {
        this.container.removeChild(firstChild);
      }
    }

    // Also log to browser console for debugging
    console.log(`[${timestamp}] [${type}] ${message}`, data);
  },

  api(msg: string, data?: any) { 
    this.log('api', msg, data); 
  },

  error(msg: string, data?: any) { 
    this.log('error', msg, data);
    console.error(msg, data); // Also log to browser console
  },

  state(msg: string, data?: any) { 
    this.log('state', msg, data); 
  },

  network(msg: string, data?: any) { 
    this.log('network', msg, data); 
  },

  clear() {
    if (this.container) {
      this.container.innerHTML = '';
      console.log('Console cleared');
    }
  }
};

export const Logger = {
  levels: {
    INFO: 'i️',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    DEBUG: '🔍'
  } as const,

  format(level: LogLevel, component: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      component,
      message,
      data: data || null
    };
  },

  log(level: LogLevel, component: string, message: string, data?: any) {
    const logEntry = this.format(level, component, message, data);
    console.log(
      `%c ${logEntry.timestamp} %c ${this.levels[level]} %c [${component}] %c ${message}`,
      'color: #9ca3af',
      'background: transparent',
      'color: #3b82f6; font-weight: bold',
      'color: inherit',
      data ? data : ''
    );
  },

  info(component: string, message: string, data?: any) {
    this.log('INFO', component, message, data);
  },

  success(component: string, message: string, data?: any) {
    this.log('SUCCESS', component, message, data);
  },

  warning(component: string, message: string, data?: any) {
    this.log('WARNING', component, message, data);
  },

  error(component: string, message: string, data?: any) {
    this.log('ERROR', component, message, data);
  },

  debug(component: string, message: string, data?: any) {
    const isDevelopment = import.meta.env.DEV;
    if (isDevelopment) {
      this.log('DEBUG', component, message, data);
    }
  },

  group(component: string, label: string) {
    console.group(`%c [${component}] ${label}`, 'color: #3b82f6; font-weight: bold');
  },

  groupEnd() {
    console.groupEnd();
  },

  table(data: any[], columns?: string[]) {
    if (columns) {
      console.table(data, columns);
    } else {
      console.table(data);
    }
  },

  performance: {
    timers: new Map<string, number>(),

    start(operation: string) {
      this.timers.set(operation, performance.now());
      Logger.debug('Performance', `Starting ${operation}`);
    },

    end(operation: string) {
      const startTime = this.timers.get(operation);
      if (startTime) {
        const duration = performance.now() - startTime;
        this.timers.delete(operation);
        Logger.debug('Performance', `${operation} completed`, {
          duration: `${duration.toFixed(2)}ms`
        });
        return duration;
      }
      Logger.warning('Performance', `No start time found for ${operation}`);
      return null;
    }
  }
};

type ErrorType = 'NetworkError' | 'AuthenticationError' | 'RateLimitError' | 'ValidationError';

// Error handling integration
export class ErrorHandler {
  static handle(error: Error, component: string) {
    Logger.error(component, error.message, {
      stack: error.stack,
      name: error.name
    });

    // You can add additional error handling logic here
    // like showing notifications or reporting to a service
  }

  static getErrorMessage(error: Error): string {
    // Convert technical error messages to user-friendly ones
    const errorMap: Record<ErrorType, string> = {
      'NetworkError': 'Connection failed. Please check your internet connection.',
      'AuthenticationError': 'Authentication failed. Please check your API keys.',
      'RateLimitError': 'Too many requests. Please try again later.',
      'ValidationError': 'Invalid input. Please check your parameters.'
    };

    return errorMap[error.name as ErrorType] || error.message;
  }
}

// Performance monitoring
export class Performance {
  static async measure<T>(
    operation: string,
    component: string,
    fn: () => Promise<T>
  ): Promise<T> {
    Logger.performance.start(operation);
    try {
      const result = await fn();
      Logger.performance.end(operation);
      return result;
    } catch (error) {
      Logger.performance.end(operation);
      ErrorHandler.handle(error as Error, component);
      throw error;
    }
  }

  static getMemoryUsage(): PerformanceMemory | null {
    if (performance?.memory) {
      return {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize
      };
    }
    return null;
  }
}

// Export ConsoleLogger as default for backward compatibility
export default ConsoleLogger;
