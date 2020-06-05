#!/usr/bin/env node
const fs = require('fs');
// inquirer
const inquirer = require('inquirer');
// chalk
const chalk = require('chalk');
// Logger
const logger = require('./logger');
// SSH
const Client = require('ssh2-sftp-client');
const sftp = new Client();

class Deployer {
    run = async (skip = false) => {
        if (!skip) {
            await this.check_config();
            this.read_config();
        }
        this.validate_config();
        this.check_path();
        this.upload();
    }
    check_config = async () => {
        // Check if pwp-deploy.json is existed.
        logger.info('Checking config file...');
        if (!fs.existsSync('pwp-deploy.json')) {
            logger.error('Cannot find pwp-deploy.json in current path.');
            await this.create_config('normal_run');
        }
    }
    create_config = async (from) => {
        let answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Do you wanna create a pwp-deploy config file?',
                default: true,
            },
        ]);
        if (answers.confirm) {
            console.log(chalk.blue('Now we need some information for deploying.'));
            let fields = await inquirer.prompt([
                {
                    name: 'host',
                    message: 'Hostname: ',
                },
                {
                    name: 'port',
                    message: 'Port: ',
                    default: 22,
                },
                {
                    name: 'username',
                    message: 'Login username: ',
                    default: 'root',
                },
                {
                    name: 'password',
                    message: 'Login password: ',
                },
                {
                    name: 'local_path',
                    message: 'Local production directory: ',
                },
                {
                    name: 'remote_path',
                    message: 'Remote directory: ',
                },
            ]);
            this.config = fields;
            fs.writeFileSync('pwp-deploy.json', JSON.stringify(fields));
            // detect .gitignore
            if (fs.statSync('.gitignore')) {
                fs.appendFileSync('.gitignore', '\r\npwp-deploy.json');
            }
            console.log(chalk.green('Config file created.'));
            let response = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Do you want to deploy your files immediately based on the config file you just created?',
                },
            ]);
            if (!response.confirm) {
                process.exit();
            } else {
                switch (from) {
                    case 'normal_run':
                        // do nothing, just let the program go
                        break;
                    case 'directly':
                        this.run(true);
                        break;
                }
            }
        } else {
            process.exit();
        }
    }
    read_config = () => {
        try {
            this.config = JSON.parse(fs.readFileSync('pwp-deploy.json'));
        } catch (err) {
            logger.error('Cannot read config file.');
            process.exit();
        }
        if (!this.config) {
            logger.error('Cannot read config file.');
            process.exit();
        }
    }
    validate_config = () => {
        // Config file check
        const keys = ['host', 'username', 'password', 'local_path', 'remote_path'];
        for (let key of keys) {
            if (!this.config[key] || this.config[key].length < 1) {
                logger.error(`Config file should contains key: ${key}.`);
                process.exit();
            }
        }
    }
    check_path = () => {
        // Check local path
        if (!fs.existsSync(this.config.local_path)) {
            logger.error('Local path does not exist, please check your config file.');
            process.exit();
        } else {
            let stat = fs.statSync(this.config.local_path);
            if (!stat.isDirectory()) {
                logger.error('Local path is not a directory, please check your config file.');
                process.exit();
            }
        }
    }
    upload = () => {
        // Make connect
        sftp.connect({
            host: this.config.host,
            port: this.config.port ? this.config.port : 22,
            username: this.config.username,
            password: this.config.password,
        })
            .then(() => {
                // Check remote directory
                return sftp.exists(this.config.remote_path);
            })
            .then(async (res) => {
                if (!res) {
                    // Remote path is not existed
                    let answers = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirm',
                            message: 'The remote path does not exist, create the directory?',
                            default: true,
                        },
                    ]);
                    if (answers.confirm) {
                        // Create a directory
                        return sftp.mkdir(this.config.remote_path, true);
                    }
                } else if (res !== 'd') {
                    // Remote path is not a directory, exit
                    logger.error("The remote path exists, but it's not a directory.");
                    process.exit();
                } else if (res === 'd') {
                    // Remote path exists and is a directory.
                    let answers = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirm',
                            message: 'Do you need to empty the remote directory first?',
                            default: true,
                        },
                    ]);
                    if (answers.confirm) {
                        // Create a directory
                        return sftp.rmdir(this.config.remote_path, true);
                    }
                }
            })
            .then(async () => {
                // Upload
                sftp.on('upload', (info) => {
                    logger.info(`Uploaded: ${info.source}`);
                });
                return await sftp.uploadDir(this.config.local_path, this.config.remote_path);
            })
            .then(() => {
                logger.info('Your files are deployed.');
                sftp.end();
            })
            .catch((error) => {
                logger.error('Something went wrong.');
                logger.error(error);
                process.exit();
            });
    }
}

module.exports = Deployer;