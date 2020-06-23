#!/usr/bin/env node
// init program
const { program, command } = require('commander');
const chalk = require('chalk');
const package = require('./package.json');
program.version(package.version);

// modules
const Deployer = require('./src/deployer');
const Random = require('./src/generator');

// header
console.log(chalk.blue(`pwp-cli (${package.version})`));
console.log(chalk.blue('Created by pwp.app'));

program
    .command('deploy <operation>')
    .description('Deploy production files to server over SFTP automatically.')
    .action((operation) => {
        const deployer = new Deployer();
        switch(operation) {
            case 'run':
                deployer.run();
                break;
            case 'init':
                deployer.create_config('direct');
                break;
        }
    });
program.command('generate <operation>')
    .description('Simply generate things that you will need.')
    .action((operation) => {
        const generator = new Generator();
        switch(operation) {
            case 'string':
                generator.getString();
                break;
        }
    });

program.parse(process.argv);