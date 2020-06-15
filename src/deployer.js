#!/usr/bin/env node
const fs = require('fs');
// shell
const shell = require('shelljs');
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
    async run(skip = false) {
        if (!skip) {
            await this.check_config();
            this.read_config();
        }
        this.validate_config();
        this.check_path();
        if (this.config.shell_before_deploy) {
            this.run_shell('before');
        }
        this.upload();
        if (this.config.shell_after_deploy) {
            this.run_shell('after');
        }
    };
    async check_config() {
        // Check if pwp-deploy.json is existed.
        logger.info('Checking config file...');
        if (!fs.existsSync('pwp-deploy.json')) {
            logger.error('Cannot find pwp-deploy.json in current path.');
            await this.create_config('normal_run');
        }
    };
    async create_config(from) {
        if (from !== 'direct') {
            let answers = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Do you wanna create a pwp-deploy config file?',
                    default: true,
                },
            ]);
            if (!answers.confirm) {
                process.exit();
            }
        } else {
            if (fs.existsSync('pwp-deploy.json')) {
                let answers = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: 'Config already exists, do you want to overwrite it?',
                        default: false
                    }
                ]);
                if (!answers.confirm) {
                    process.exit();
                }
            }
        }
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
                type: 'password',
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
            {
                type: 'confirm',
                name: 'always_overwrite',
                message: 'Do you want to always overwrite the remote path with your new files?',
                default: false,
            },
        ]);
        this.config = fields;
        let config_text = JSON.stringify(fields, null, 2);
        fields.password = '*'.repeat(fields.password.length);
        let config_display = JSON.stringify(fields, null, 2);
        console.log(chalk.green('Here is your config: '))
        console.log(config_display);
        let file_check = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Is everything right?',
                default: true
            }
        ]);
        fs.writeFileSync('pwp-deploy.json', config_text);
        // detect .gitignore
        if (fs.statSync('.gitignore')) {
            fs.appendFileSync('.gitignore', '\r\npwp-deploy.json');
        }
        if (!file_check.confirm) {
            process.exit();
        }
        console.log(chalk.green('Config file created.'));
        if (from !== 'direct') {
            let response = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Do you want to deploy your files immediately based on the config file you just created?',
                },
            ]);
            if (!response.confirm) {
                process.exit();
            }
        }
    };
    read_config() {
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
    };
    validate_config() {
        // Config file check
        const keys = ['host', 'username', 'password', 'local_path', 'remote_path'];
        for (let key of keys) {
            if (!this.config[key] || this.config[key].length < 1) {
                logger.error(`Config file should contains key: ${key}.`);
                process.exit();
            }
        }
    };
    check_path() {
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
    };
    run_shell(type) {
        if (type === 'before') {
            if (this.config.shell_before_deploy && Array.isArray(this.config.shell_before_deploy)) {
                for (let cmd of this.config.shell_before_deploy) {
                    logger.info(`Start to run shell [${cmd}]...`);
                    shell.exec(cmd);
                }
            } else {
                logger.error("Cannot parse your shell config.");
            }
        } else if (type === 'after') {
            if (this.config.shell_after_deploy && Array.isArray(this.config.shell_after_deploy)) {
                for (let cmd of this.config.shell_before_deploy) {
                    logger.info(`Start to run shell [${cmd}]...`);
                    shell.exec(cmd);
                }
            } else {
                logger.error("Cannot parse your shell config.");
            }
        }
    };
    upload() {
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
                    } else {
                        process.exit();
                    }
                } else if (res !== 'd') {
                    // Remote path is not a directory, exit
                    logger.error("The remote path exists, but it's not a directory.");
                    process.exit();
                } else if (res === 'd') {
                    // Remote path exists and is a directory.
                    if (!this.config.always_overwrite) {
                        let answers = await inquirer.prompt([
                            {
                                type: 'confirm',
                                name: 'confirm',
                                message: 'Do you need to empty the remote directory first?',
                                default: true,
                            },
                        ]);
                        if (!answers.confirm) {
                            // Create a directory
                            process.exit();
                        }
                    }
                    sftp.rmdir(this.config.remote_path, true);
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
    };
}

module.exports = Deployer;
