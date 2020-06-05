// init program
const { program } = require('commander');
const package = require('./package.json');
program.version(package.version);

// modules
const deployer = require('./src/deploy');

program.command('deploy')
    .description('Deploy production files to server over SFTP automatically.')
    .action(() => {
        deployer.run();
    });