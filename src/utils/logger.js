import chalk from 'chalk';

class Logger {
  static info(message, data = {}) {
    console.log(
      `${chalk.blue('ℹ INFO')} ${chalk.gray('→')} ${message}`,
      Object.keys(data).length ? chalk.gray(JSON.stringify(data)) : ''
    );
  }

  static success(message, data = {}) {
    console.log(
      `${chalk.green('✔ SUCCESS')} ${chalk.gray('→')} ${message}`,
      Object.keys(data).length ? chalk.gray(JSON.stringify(data)) : ''
    );
  }

  static warn(message, data = {}) {
    console.log(
      `${chalk.yellow('⚠ WARNING')} ${chalk.gray('→')} ${message}`,
      Object.keys(data).length ? chalk.gray(JSON.stringify(data)) : ''
    );
  }

  static error(message, data = {}) {
    console.error(
      `${chalk.red('✖ ERROR')} ${chalk.gray('→')} ${chalk.red(message)}`,
      Object.keys(data).length ? chalk.gray(JSON.stringify(data)) : ''
    );
  }

  static debug(message, data = {}) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `${chalk.magenta('🔍 DEBUG')} ${chalk.gray('→')} ${message}`,
        Object.keys(data).length ? chalk.gray(JSON.stringify(data)) : ''
      );
    }
  }

  static request(method, url, status, time) {
    const color = status >= 500 ? 'red' : status >= 400 ? 'yellow' : 'green';
    console.log(
      `${chalk.cyan('→')} ${chalk.bold(method)} ${url} ${chalk[color](status)} ${chalk.gray(`${time}ms`)}`
    );
  }

  static startup(message) {
    console.log(
      chalk.bold.cyan('\n🚀 SERVER STARTUP\n') +
      chalk.white('------------------------\n') +
      `${chalk.cyan('→')} ${message}\n` +
      chalk.white('------------------------\n')
    );
  }

  static db(message, data = {}) {
    console.log(
      `${chalk.blue('🗄 DB')} ${chalk.gray('→')} ${message}`,
      Object.keys(data).length ? chalk.gray(JSON.stringify(data)) : ''
    );
  }
}

export { Logger };