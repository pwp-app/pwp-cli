#!/usr/bin/env node
const fs = require('fs');
// inquirer
const inquirer = require('inquirer');
// Logger config
const log4js = require('log4js');
const logger = log4js.getLogger();

// SSH
const Client = require('ssh2-sftp-client');
const sftp = new Client();

class Deployer {
    run(skip = false) {
        if (!skip) {
            this.check_config();
            this.read_config();
        }
        this.validate_config(this.config);
        this.check_path();
        this.upload();
    }
    check_config() {
        // Check if pwp-deploy.json is existed.
        logger.info('Checking config file...');
        if (!fs.existsSync('pwp-deploy.json')) {
            logger.error('Cannot find pwp-deploy.json in current path.');
            this.create_config('normal_run');
        }
    }
    create_config(from) {
        inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'Do you wanna create a pwp-deploy config file?',
            default: true
        }]).then(answers => {
            if (answers.confirm) {
                logger.info('Now we need some information for deploying.');
                inquirer.prompt([{
                    name: 'host',
                    message: 'Hostname: ',
                }, {
                    name: 'port',
                    message: 'Port (22): ',
                    default: 22,
                }, {
                    name: 'username',
                    message: 'Login username (root): ',
                    default: 'root'
                }, {
                    name: 'password',
                    message: 'Login password: '
                }, {
                    name: 'local_path',
                    message: 'Local production directory: ',
                }, {
                    name: 'remote_path',
                    message: 'Remote directory: ',
                }]).then(answers => {
                    this.config = answers;
                    fs.writeFileSync('pwp-deploy.json', JSON.stringify(answers));
                    // detect .gitignore
                    if (fs.statSync('.gitignore')) {
                        fs.appendFileSync('.gitignore', '\r\npwp-deploy.json');
                    }
                    logger.info('Config file created.');
                    inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: 'Do you want to deploy your files immediately based on the config file you just created?'
                    }]).then(answers => {
                        if (!answers.confirm) {
                            process.exit();
                        } else {
                            switch(from) {
                                case 'normal_run':
                                    // do nothing, just let the program go
                                    break;
                                case 'directly':
                                    this.run(true);
                                    break;
                            }
                        }
                    });
                });
            } else {
                process.exit();
            }
        });
    }
    read_config() {
        try {
            this.config = JSON.parse(fs.readFileSync('pwp-deploy.json'));
        } catch (err) {
            logger.error('Cannot read config file.');
            process.exit();
        }
        if (!config) {
            logger.error('Cannot read config file.');
            process.exit();
        }
    }
    validate_config(config) {
        // Config file check
        const keys = ['host', 'username', 'password', 'local_path', 'remote_path'];
        for (let key in keys) {
            if (!config[key] || config[key].length < 1) {
                logger.error(`Config file should contains key: ${key}.`);
                process.exit();
            }
        }
    }
    check_path() {
        // Check local path
        if (!fs.existsSync(config.local_path)) {
            logger.error('Local path does not exist, please check your config file.');
            process.exit();
        } else {
            let stat = fs.statSync(config.local_path);
            if (!stat.isDirectory()) {
                logger.error('Local path is not a directory, please check your config file.');
                process.exit();
            }
        }
    }
    upload() {
        // Make connect
        sftp.connect({
            host: config.host,
            port: config.port ? config.port : 22,
            username: config.username,
            password: config.password,
        })
            .then(() => {
                // Check remote directory
                return sftp.exists(config.remote_path);
            })
            .then((res) => {
                if (!res) {
                    // Remote path is not existed
                    inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: 'The remote path does not exist, create the directory?',
                        default: true
                    }]).then(answers => {
                        if (answers.confirm) {
                            // Create a directory
                            return sftp.mkdir(config.remote_path, true);
                        }
                    });
                } else if (res !== 'd') {
                    // Remote path is not a directory, exit
                    logger.error('The remote path exists, but it\'s not a directory.');
                    process.exit();
                } else if (res === 'd') {
                    // Remote path exists and is a directory.
                    inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: 'Do you need to empty the remote directory first?',
                        default: true
                    }]).then(answers => {
                        if (answers.confirm) {
                            // Create a directory
                            return sftp.rmdir(config.remote_path, true);
                        }
                    });
                }
            })
            .then(async () => {
                // Upload
                sftp.on('upload', info => {
                    logger.info(`Uploaded: ${info.source}`);
                });
                return await sftp.uploadDir(config.local_path, config.remote_path);
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