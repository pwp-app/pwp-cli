// init program
const { program } = require('commander');
const package = require('./package.json');
program.version(package.version);

// modules
const deployer = require('./src/deployer');

program.command('deploy')
    .description('Deploy production files to server over SFTP automatically.')
    .action(() => {
        deployer.run();
    });

program.command('deploy init')
    .description('Init config file for deployment.')
    .action(() => {
        deployer.create_config('directly');
    });