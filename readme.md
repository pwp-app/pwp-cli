# pwp-cli

pwp-cli is a useful cli tool for frontend developers, it optimized the development process of web applications under pwp.app by providing some automated scripts.

## Now it can do

- Deploy your files over SFTP

## Usage

### Install

```bash
npm install pwp-cli -g
```

### Deployment

```bash
pwp deploy run
```

When you run this line first time and without any configuration file in your project, the tool will guide you to create a configuration file named "pwp-deploy.json".

Because this file contains sensitive information, such as the server's password, the tool will automatically add it to .gitignore (if it exists).

When you created your configuration, you can deploy your files immediately.

You don't need to ensure that the current path is the root of the project, you just need to configure the relevant paths.

However, it is recommended to **put the configuration file in the project root directory**, as the tool will only look for it in the **current directory**.

Also, you can run the following line to create a configuration file:

```bash
pwp deploy init
```