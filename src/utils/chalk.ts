import chalk from "chalk";

export class Logger {
  static success(message: string) {
    console.log(chalk.green.bold("✔ " + message));
  }

  static info(message: string) {
    console.log(chalk.blueBright("ℹ " + message));
  }

  static warning(message: string) {
    console.log(chalk.yellow("⚠ " + message));
  }

  static error(message: string) {
    console.log(chalk.red.bold("✖ " + message));
  }
}
