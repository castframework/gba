import chalk from 'chalk';

class ColorLogger {
  private logLevel = 3;
  private logFunc = console.log;

  constructor() {
    const envLevel = process.env.LOG_LEVEL;

    if (envLevel) {
      try {
        this.logLevel = parseInt(envLevel);
      } catch {}
    }
  }

  private log(prefix: string, level: number, color: string, message: string) {
    const toLog = chalk[color](`${prefix} [${this.getDate()}]- ${message}`);
    if (level <= this.logLevel) {
      this.logFunc(toLog);
    }
  }

  public error(message: string) {
    this.log('💥', 0, 'red', message);
  }

  public warning(message: string) {
    this.log('⚡', 1, 'yellow', message);
  }

  public info(message: string) {
    this.log('📜', 2, 'green', message);
  }

  public debug(message: string) {
    this.log('🐛', 3, 'blue', message);
  }

  public trace(message: string) {
    this.log('🤖', 4, 'gray', message);
  }

  private getDate(): string {
    const date = new Date();
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  }
}

export const smpLog = new ColorLogger();
