#!/usr/bin/env node
// init program
const { program } = require('commander');
const chalk = require('chalk');
const package = require('./package.json');
program.version(package.version);

// modules
const Deployer = require('./src/deployer');

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
                deployer.create_config();
                break;
        }
    });

program.parse(process.argv);