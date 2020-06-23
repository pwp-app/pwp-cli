const randomString = require('random-string');
const inquirer = require('inquirer');
const chalk = require('chalk');
const logger = require('./logger')('deployer');

class Generator {
    async getString() {
        let answers = await inquirer.prompt([
            {
                type: 'number',
                name: 'length',
                message: 'Length of string to generate: '
            },
            {
                type: 'confirm',
                name: 'special',
                message: 'Do you need special characters in the string?',
                default: false
            }
        ]);
        if (!answers.length || answers.length < 1) {
            logger.error('Input error, please try again.');
            process.exit();
        }
        let res = randomString({
            length: answers.length,
            numberic: true,
            letters: true,
            special: answers.special,
            exclude: ['l','1','O','0']
        });
        console.log(chalk.green('Here is your string: '))
        console.log(chalk.green(res));
    }-
}

module.exports = Generator;